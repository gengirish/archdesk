import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON, WebhookEvent } from "@clerk/backend";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { displayName, provisionUser } from "@/lib/provision-user";

function primaryEmail(data: UserJSON): string {
  return data.email_addresses[0]?.email_address ?? `user_${data.id}@pending.archdesk.local`;
}

function primaryPhone(data: UserJSON): string {
  return data.phone_numbers[0]?.phone_number ?? "";
}

async function handleUserCreated(data: UserJSON) {
  await provisionUser({
    clerkId: data.id,
    email: primaryEmail(data),
    phone: primaryPhone(data),
    firstName: data.first_name,
    lastName: data.last_name,
    imageUrl: data.image_url || null,
  });
}

async function handleUserUpdated(data: UserJSON) {
  const clerkId = data.id;
  const email = primaryEmail(data);
  const phone = primaryPhone(data);
  const name = displayName(data.first_name, data.last_name, email);

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
