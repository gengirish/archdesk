import { Resend } from "resend";
import type { Mailer, SendEmailInput, SendEmailResult } from "@/lib/email/types";

const PROVIDER = "resend";

/**
 * Resend adapter for the `Mailer` interface. Kept as a fallback so
 * deployments that only have RESEND_API_KEY + EMAIL_FROM keep working
 * while AgentMail is rolled out.
 */
export class ResendMailer implements Mailer {
  readonly provider = PROVIDER;
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  isConfigured(): boolean {
    return Boolean(this.from);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (input.to.length === 0) {
      return { ok: false, error: "no recipients", provider: PROVIDER, retryable: false };
    }
    try {
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        reply_to: input.replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      if (error) {
        return { ok: false, error: error.message, provider: PROVIDER, retryable: false };
      }
      if (!data?.id) {
        return { ok: false, error: "resend accepted but returned no id", provider: PROVIDER, retryable: false };
      }
      return { ok: true, messageId: data.id, provider: PROVIDER };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `resend network error: ${message}`, provider: PROVIDER, retryable: true };
    }
  }
}
