import { test, expect } from "@playwright/test";
import { setupAuth } from "./fixtures/auth";

test.describe("Authentication", () => {
  test("sign-in page renders Clerk form", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/sign-in");

    await expect(page).toHaveURL(/\/sign-in/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("input").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("sign-up page renders Clerk form", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/sign-up");

    await expect(page).toHaveURL(/\/sign-up/);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("input").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("unauthenticated user is redirected from dashboard to sign-in", async ({
    page,
  }) => {
    await setupAuth(page);
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });

  test("unauthenticated user is redirected from projects to sign-in", async ({
    page,
  }) => {
    await setupAuth(page);
    await page.goto("/projects");

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });

  test("sign-in page has email/identifier input", async ({ page }) => {
    await setupAuth(page);
    await page.goto("/sign-in");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("input").first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
