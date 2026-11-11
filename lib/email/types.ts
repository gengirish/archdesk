/**
 * Mailer abstraction.
 *
 * Anything that can deliver a transactional email implements `Mailer`.
 * Concrete impls live alongside (`agentmail.ts`, `resend.ts`) and the
 * factory (`factory.ts`) picks one based on environment.
 *
 * Why an interface instead of importing AgentMail directly:
 *   - Tests inject a recording stub without network.
 *   - Providers are drop-ins: client nudges and SLA automation never
 *     import a provider SDK directly.
 *   - If AgentMail's wire format changes, only `agentmail.ts` updates;
 *     callers consume the stable `Mailer` shape.
 */

export type SendEmailInput = {
  /** One or more RFC 5322 addresses. AgentMail caps to+cc+bcc at 50. */
  to: string[];
  subject: string;
  /** Both `text` and `html` should be supplied for deliverability. */
  text: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  /** Optional provider-side labels (e.g. ["client-nudge"]). */
  labels?: string[];
  /** Stable key to dedupe identical sends across retries. */
  idempotencyKey?: string;
  /**
   * Optional per-call sending inbox override (e.g. a per-firm AgentMail
   * inbox). Other mailers ignore it.
   */
  fromInboxId?: string;
};

export type SendEmailResult =
  | { ok: true; messageId: string; provider: string }
  | { ok: false; error: string; provider: string; retryable?: boolean };

export interface Mailer {
  /** Provider id ("agentmail" | "resend" | …). Used in audit log details. */
  readonly provider: string;
  /** Returns `false` if the mailer isn't actually wired (e.g. no env). */
  isConfigured(): boolean;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
