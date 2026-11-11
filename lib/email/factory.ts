/**
 * Picks the `Mailer` for the running process.
 *
 * Order of resolution:
 *   1. AgentMail when `AGENTMAIL_API_KEY` and `AGENTMAIL_FROM_INBOX_ID` are set.
 *   2. Resend when `RESEND_API_KEY` and `EMAIL_FROM` are set (legacy fallback).
 *   3. `null`: email is not configured. Callers record the send as FAILED
 *      instead of pretending it went out.
 *
 * Memoised process-wide; the mailers hold no per-request state.
 */

import { AgentMailMailer } from "@/lib/email/agentmail";
import { ResendMailer } from "@/lib/email/resend";
import type { Mailer } from "@/lib/email/types";

let cached: Mailer | null | undefined;

export function getDefaultMailer(): Mailer | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.AGENTMAIL_API_KEY?.trim();
  const fromInbox = process.env.AGENTMAIL_FROM_INBOX_ID?.trim();
  if (apiKey && fromInbox) {
    const timeoutMs = Number.parseInt(process.env.AGENTMAIL_TIMEOUT_MS ?? "", 10);
    cached = new AgentMailMailer({
      apiKey,
      fromInboxId: fromInbox,
      baseUrl: process.env.AGENTMAIL_BASE_URL?.trim() || undefined,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
    });
    return cached;
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (resendKey && from) {
    cached = new ResendMailer(resendKey, from);
    return cached;
  }

  cached = null;
  return cached;
}

/** Test seam — clears the memoised mailer. */
export function _resetMailerCache() {
  cached = undefined;
}
