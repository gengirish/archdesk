import { Resend } from "resend";

export type NudgeChannel = "EMAIL" | "WHATSAPP";

export type ClientNudgePayload = {
  projectName: string;
  milestoneName: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  portalUrl: string;
  customMessage?: string;
};

export type NudgeDeliveryResult = {
  provider: string;
  status: "SENT" | "QUEUED" | "FAILED";
  providerMessageId?: string;
  errorMessage?: string;
  idempotencyKey?: string;
};

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function textHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

function buildEmailHtml(payload: ClientNudgePayload): string {
  const note = payload.customMessage?.trim()
    ? `<p style="margin:0 0 16px 0;color:#334155;">${payload.customMessage.trim()}</p>`
    : "";

  return [
    `<div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#0f172a;">`,
    `<p style="margin:0 0 12px 0;">Hi ${payload.clientName},</p>`,
    `<p style="margin:0 0 12px 0;">Your team at ${payload.projectName} is waiting for your decision on <strong>${payload.milestoneName}</strong>.</p>`,
    note,
    `<p style="margin:0 0 16px 0;">Please review and respond in your client portal:</p>`,
    `<p style="margin:0 0 20px 0;"><a href="${payload.portalUrl}" style="background:#0f172a;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:600;">Open Client Portal</a></p>`,
    `<p style="margin:0;color:#64748b;font-size:12px;">This is an automated reminder from ArchDesk.</p>`,
    `</div>`,
  ].join("");
}

function buildEmailText(payload: ClientNudgePayload): string {
  const base = [
    `Hi ${payload.clientName},`,
    ``,
    `Your team at ${payload.projectName} is waiting for your decision on "${payload.milestoneName}".`,
  ];
  if (payload.customMessage?.trim()) {
    base.push("", payload.customMessage.trim());
  }
  base.push("", `Open your client portal: ${payload.portalUrl}`, "", "This is an automated reminder from ArchDesk.");
  return base.join("\n");
}

export async function deliverClientNudge(
  channel: NudgeChannel,
  payload: ClientNudgePayload,
  idempotencySeed: string
): Promise<NudgeDeliveryResult> {
  if (channel === "WHATSAPP") {
    return {
      provider: "whatsapp-provider-stub",
      status: "QUEUED",
    };
  }

  const resend = getResendClient();
  const from = process.env.EMAIL_FROM;
  if (!resend || !from) {
    return {
      provider: "resend",
      status: "FAILED",
      errorMessage: "Resend is not configured (RESEND_API_KEY or EMAIL_FROM missing)",
    };
  }
  if (!payload.clientEmail) {
    return {
      provider: "resend",
      status: "FAILED",
      errorMessage: "Client email is missing",
    };
  }

  const messageHash = textHash(payload.customMessage?.trim() || "");
  const idempotencyKey = `client-nudge/${idempotencySeed}/email/${messageHash}`;

  const { data, error } = await resend.emails.send({
    from,
    to: [payload.clientEmail],
    subject: `Reminder: decision pending for ${payload.milestoneName}`,
    html: buildEmailHtml(payload),
    text: buildEmailText(payload),
  });

  if (error) {
    return {
      provider: "resend",
      status: "FAILED",
      errorMessage: error.message,
      idempotencyKey,
    };
  }

  return {
    provider: "resend",
    status: "SENT",
    providerMessageId: data?.id,
    idempotencyKey,
  };
}
