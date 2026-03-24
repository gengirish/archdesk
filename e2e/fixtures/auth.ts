import { setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

const CLERK_API = "https://api.clerk.com/v1";

export async function setupAuth(page: Page) {
  await setupClerkTestingToken({ page });
}

/**
 * Signs in by creating a Clerk sign-in token via the Backend API,
 * bypassing the UI entirely (no 2FA, no email verification needed).
 */
export async function signIn(page: Page, email: string, _password: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is required for signIn");

  await setupAuth(page);

  const usersRes = await fetch(
    `${CLERK_API}/users?email_address[]=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  if (!usersRes.ok) {
    throw new Error(
      `Failed to find user: ${usersRes.status} ${await usersRes.text()}`
    );
  }
  const users = await usersRes.json();
  if (!users.length)
    throw new Error(`No Clerk user found with email: ${email}`);

  const userId = users[0].id;

  const tokenRes = await fetch(`${CLERK_API}/sign_in_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to create sign-in token: ${tokenRes.status} ${await tokenRes.text()}`
    );
  }
  const { token } = await tokenRes.json();

  await page.goto(`/sign-in#/?__clerk_ticket=${token}`);

  await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
    timeout: 45_000,
  });
}
