import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentMailMailer, buildPayload, extractMessageId } from "@/lib/email/agentmail";
import { _resetMailerCache, getDefaultMailer } from "@/lib/email/factory";

const input = {
  to: ["client@example.com"],
  subject: "Reminder",
  text: "hello",
  html: "<p>hello</p>",
  replyTo: "studio@example.com",
  labels: ["client-nudge"],
};

function mailerWith(fetchImpl: typeof fetch) {
  return new AgentMailMailer({ apiKey: "am_key", fromInboxId: "archdesk@agentmail.to", fetchImpl });
}

describe("AgentMailMailer", () => {
  it("posts to the inbox send endpoint with bearer auth and snake_case body", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message_id: "m_1", thread_id: "t_1" })));
    const result = await mailerWith(fetchImpl as unknown as typeof fetch).send(input);

    expect(result).toEqual({ ok: true, messageId: "m_1", provider: "agentmail" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.agentmail.to/v0/inboxes/archdesk%40agentmail.to/messages/send");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer am_key");
    expect(JSON.parse(init.body as string)).toEqual({
      to: ["client@example.com"],
      subject: "Reminder",
      text: "hello",
      html: "<p>hello</p>",
      reply_to: "studio@example.com",
      labels: ["client-nudge"],
    });
  });

  it("marks 4xx as non-retryable and 5xx as retryable", async () => {
    const r4 = await mailerWith((async () => new Response("bad", { status: 401 })) as typeof fetch).send(input);
    const r5 = await mailerWith((async () => new Response("down", { status: 503 })) as typeof fetch).send(input);
    expect(r4).toMatchObject({ ok: false, retryable: false });
    expect(r5).toMatchObject({ ok: false, retryable: true });
  });

  it("rejects empty and oversized recipient lists without calling the API", async () => {
    const fetchImpl = vi.fn();
    const mailer = mailerWith(fetchImpl as unknown as typeof fetch);
    expect(await mailer.send({ ...input, to: [] })).toMatchObject({ ok: false });
    expect(await mailer.send({ ...input, to: Array(51).fill("a@b.co") })).toMatchObject({ ok: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("omits empty optional fields and tolerates id drift", () => {
    expect(buildPayload({ to: ["a@b.co"], subject: "s", text: "t", html: "h" })).toEqual({
      to: ["a@b.co"],
      subject: "s",
      text: "t",
      html: "h",
    });
    expect(extractMessageId('{"id":"x"}')).toBe("x");
    expect(extractMessageId("not json")).toBeNull();
  });
});

describe("getDefaultMailer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    _resetMailerCache();
  });

  it("prefers AgentMail, falls back to Resend, else null", () => {
    vi.stubEnv("AGENTMAIL_API_KEY", "");
    vi.stubEnv("AGENTMAIL_FROM_INBOX_ID", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    expect(getDefaultMailer()).toBeNull();

    _resetMailerCache();
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("EMAIL_FROM", "ArchDesk <noreply@example.com>");
    expect(getDefaultMailer()?.provider).toBe("resend");

    _resetMailerCache();
    vi.stubEnv("AGENTMAIL_API_KEY", "am_key");
    vi.stubEnv("AGENTMAIL_FROM_INBOX_ID", "archdesk@agentmail.to");
    expect(getDefaultMailer()?.provider).toBe("agentmail");
  });
});
