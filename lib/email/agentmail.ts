/**
 * AgentMail v0 HTTP client.
 *
 * Endpoint reference (verified against the live OpenAPI spec at
 * https://docs.agentmail.to/openapi.json):
 *
 *   POST https://api.agentmail.to/v0/inboxes/{inbox_id}/messages/send
 *   Headers:
 *     Authorization: Bearer ${AGENTMAIL_API_KEY}
 *     Content-Type:  application/json
 *   Body (SendMessageRequest):
 *     { to, subject, text, html?, cc?, bcc?, reply_to?, labels?,
 *       attachments?, headers? }
 *   Response (SendMessageResponse):
 *     { message_id: string, thread_id: string }
 *
 * Idempotency note:
 *   AgentMail's send endpoint does NOT expose request-level idempotency
 *   in the documented v0 contract — `client_id` is only honoured by
 *   `inboxes.create`. We still emit an `Idempotency-Key` header when
 *   callers supply one, on the chance that AgentMail adds header-based
 *   idempotency later, but you should NOT rely on it. ArchDesk
 *   instead relies on the per-milestone nudge cooldown (ClientNudge rows)
 *   to prevent repeat sends.
 *
 * Configuration (env):
 *   AGENTMAIL_API_KEY        — required to actually send.
 *   AGENTMAIL_FROM_INBOX_ID  — default sending inbox. In AgentMail's v0
 *                              API the inbox id IS the email address
 *                              (e.g. `alerts@yourdomain.com`), NOT an
 *                              opaque `am_us_inbox_*` identifier — the
 *                              latter form does not appear anywhere in
 *                              the v0 path/parameter spec. Callers can
 *                              override per send via `fromInboxId`.
 *   AGENTMAIL_BASE_URL       — overrides the API host (defaults to
 *                              api.agentmail.to). Use api.agentmail.eu
 *                              for the EU region; useful for staging
 *                              and contract tests.
 *   AGENTMAIL_TIMEOUT_MS     — request timeout (default 8000).
 *
 * `isConfigured()` returns false when either the API key or the default
 * sending inbox is missing — `getDefaultMailer()` then falls back to
 * Resend (or null), so boot never fails because of a missing email env.
 *
 * Failure modes:
 *   - Network / timeout         → `{ ok: false, retryable: true }`
 *   - 4xx (auth, validation)    → `{ ok: false, retryable: false }`
 *   - 5xx                       → `{ ok: false, retryable: true }`
 *   - 2xx without messageId     → `{ ok: false, retryable: false }`
 */

import type { Mailer, SendEmailInput, SendEmailResult } from "@/lib/email/types";

const PROVIDER = "agentmail";
const DEFAULT_BASE_URL = "https://api.agentmail.to";
const DEFAULT_TIMEOUT_MS = 8_000;

export type AgentMailConfig = {
  apiKey: string;
  /** Default sending inbox; per-call `fromInboxId` overrides it. */
  fromInboxId: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** Test seam — defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
};

export class AgentMailMailer implements Mailer {
  readonly provider = PROVIDER;
  private readonly cfg: Required<Pick<AgentMailConfig, "apiKey" | "fromInboxId">> & {
    baseUrl: string;
    timeoutMs: number;
    fetchImpl: typeof fetch;
  };

  constructor(cfg: AgentMailConfig) {
    this.cfg = {
      apiKey: cfg.apiKey,
      fromInboxId: cfg.fromInboxId,
      baseUrl: cfg.baseUrl ?? DEFAULT_BASE_URL,
      timeoutMs: cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      fetchImpl: cfg.fetchImpl ?? globalThis.fetch.bind(globalThis),
    };
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.apiKey && this.cfg.fromInboxId);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return { ok: false, error: "agentmail not configured", provider: PROVIDER, retryable: false };
    }
    const inbox = input.fromInboxId ?? this.cfg.fromInboxId;
    if (!inbox) {
      return { ok: false, error: "missing inbox id", provider: PROVIDER, retryable: false };
    }
    if (input.to.length === 0) {
      return { ok: false, error: "no recipients", provider: PROVIDER, retryable: false };
    }
    if (input.to.length + (input.cc?.length ?? 0) + (input.bcc?.length ?? 0) > 50) {
      return { ok: false, error: "too many recipients (max 50)", provider: PROVIDER, retryable: false };
    }

    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`;
    const body = buildPayload(input);

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs);
    try {
      const res = await this.cfg.fetchImpl(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.cfg.apiKey}`,
          "content-type": "application/json",
          ...(input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      const text = await res.text();
      if (!res.ok) {
        return {
          ok: false,
          error: `agentmail ${res.status}: ${truncate(text, 500)}`,
          provider: PROVIDER,
          retryable: res.status >= 500,
        };
      }

      const messageId = extractMessageId(text);
      if (!messageId) {
        return {
          ok: false,
          error: `agentmail accepted but no message id in response: ${truncate(text, 200)}`,
          provider: PROVIDER,
          retryable: false,
        };
      }
      return { ok: true, messageId, provider: PROVIDER };
    } catch (e) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      const message = e instanceof Error ? e.message : String(e);
      return {
        ok: false,
        error: isAbort ? "agentmail request timed out" : `agentmail network error: ${message}`,
        provider: PROVIDER,
        retryable: true,
      };
    } finally {
      clearTimeout(t);
    }
  }
}

/** Build the JSON body. Exported for unit-testing the wire shape. */
export function buildPayload(input: SendEmailInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  };
  if (input.cc?.length) payload.cc = input.cc;
  if (input.bcc?.length) payload.bcc = input.bcc;
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.labels?.length) payload.labels = input.labels;
  return payload;
}

/**
 * AgentMail's response shape isn't formally documented for v0; the SDK
 * returns an object with a stable `message_id` field. We accept either
 * `message_id` or `id` to insulate ourselves from minor drift.
 */
export function extractMessageId(rawJson: string): string | null {
  if (!rawJson) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const candidates = [obj.message_id, obj.messageId, obj.id];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}
