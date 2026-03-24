import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON, WebhookEvent } from "@clerk/backend";
import { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

function displayName(data: UserJSON, email: string): string {
  const fromParts = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  if (fromParts) return fromParts;
  const local = email.split("@")[0];
  if (local) return local;
  return "Architect";
}

function primaryEmail(data: UserJSON): string {
  return data.email_addresses[0]?.email_address ?? `user_${data.id}@pending.archdesk.local`;
}

function primaryPhone(data: UserJSON): string {
  return data.phone_numbers[0]?.phone_number ?? "";
}

async function handleUserCreated(data: UserJSON) {
  const clerkId = data.id;
  const email = primaryEmail(data);
  const phone = primaryPhone(data);
  const name = displayName(data, email);
  const firmName = `${name}'s Firm`;

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return;

  await db.$transaction(async (tx) => {
    const firm = await tx.firm.create({
      data: {
        name: firmName,
        email,
        phone: phone || "—",
      },
    });

    await tx.user.create({
      data: {
        clerkId,
        firmId: firm.id,
        name,
        email,
        phone: phone || null,
        role: UserRole.OWNER,
        avatar: data.image_url || null,
      },
    });
  });
}

async function handleUserUpdated(data: UserJSON) {
  const clerkId = data.id;
  const email = primaryEmail(data);
  const phone = primaryPhone(data);
  const name = displayName(data, email);

  await db.user.updateMany({
    where: { clerkId },
    data: {
      name,
      email,
      phone: phone || null,
      avatar: data.image_url || null,
    },
  });
}

async function handleUserDeleted(data: { id?: string }) {
  const clerkId = data.id;
  if (!clerkId) return;
  await db.user.deleteMany({ where: { clerkId } });
}

export async function POST(req: NextRequest) {
  let evt: WebhookEvent;

  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Webhook verification failed", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "user.created":
        await handleUserCreated(evt.data);
        break;
      case "user.updated":
        await handleUserUpdated(evt.data);
        break;
      case "user.deleted":
        await handleUserDeleted(evt.data);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[clerk-webhook]", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
