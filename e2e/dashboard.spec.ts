import { test, expect } from "@playwright/test";
import { signIn } from "./fixtures/auth";
import { SIDEBAR_ITEMS } from "./fixtures/test-data";

const TEST_EMAIL = process.env.E2E_CLERK_USER_EMAIL || "";
const TEST_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD || "";

test.describe("Dashboard (authenticated)", () => {
  test.setTimeout(60_000);

  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD to run authenticated tests"
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test("dashboard page renders after sign-in", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /dashboard/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows all nav items", async ({ page }) => {
    for (const item of SIDEBAR_ITEMS) {
      await expect(
        page.getByRole("link", { name: item })
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test("sidebar shows Settings link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Settings" })
    ).toBeVisible();
  });

  test("TopBar shows search input", async ({ page }) => {
    await expect(
      page.getByPlaceholder("Search projects, clients...")
    ).toBeVisible();
  });

  test("TopBar shows user avatar button", async ({ page }) => {
    await expect(
      page.locator("button.cl-userButtonTrigger, .cl-userButtonBox, [data-clerk-component] button").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("clicking Projects nav goes to /projects", async ({ page }) => {
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/projects/, { timeout: 10_000 });
  });

  test("clicking Clients nav goes to /clients", async ({ page }) => {
    await page.getByRole("link", { name: "Clients" }).click();
    await expect(page).toHaveURL(/\/clients/, { timeout: 10_000 });
  });

  test("clicking Billing nav goes to /billing", async ({ page }) => {
    await page.getByRole("link", { name: "Billing" }).click();
    await expect(page).toHaveURL(/\/billing/, { timeout: 10_000 });
  });
});
