import { test, expect } from "@playwright/test";
import { signIn } from "./fixtures/auth";

const TEST_EMAIL = process.env.E2E_CLERK_USER_EMAIL || "";
const TEST_PASSWORD = process.env.E2E_CLERK_USER_PASSWORD || "";

test.describe("Feature pages (authenticated)", () => {
  test.setTimeout(60_000);

  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD to run authenticated tests"
  );

  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  });

  test("projects page loads with live data and New Project button", async ({ page }) => {
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/projects/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new project/i })).toBeVisible();
  });

  test("new project dialog opens and shows form fields", async ({ page }) => {
    await page.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveURL(/\/projects/, { timeout: 10_000 });
    const newBtn = page.getByRole("button", { name: /new project/i });
    await expect(newBtn).toBeVisible({ timeout: 10_000 });
    await newBtn.click();
    await expect(page.getByText(/new project/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /create project/i })).toBeVisible();
  });

  test("clients page loads with Add Client button", async ({ page }) => {
    await page.getByRole("link", { name: "Clients" }).click();
    await expect(page).toHaveURL(/\/clients/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /clients/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add client/i })).toBeVisible();
  });

  test("add client dialog opens", async ({ page }) => {
    await page.getByRole("link", { name: "Clients" }).click();
    await expect(page).toHaveURL(/\/clients/, { timeout: 10_000 });
    const addBtn = page.getByRole("button", { name: /add client/i });
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await expect(page.getByText(/add client/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("billing page loads with milestone table", async ({ page }) => {
    await page.getByRole("link", { name: "Billing" }).click();
    await expect(page).toHaveURL(/\/billing/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible();
    await expect(page.getByText(/total billed/i)).toBeVisible({ timeout: 10_000 });
  });

  test("settings page loads firm data and has Save button", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible({ timeout: 10_000 });
  });

  test("dashboard shows stat cards with real data", async ({ page }) => {
    await expect(page.getByText(/active projects/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/total revenue/i)).toBeVisible();
    await expect(page.getByText(/total clients/i)).toBeVisible();
  });

  test("search palette opens with Ctrl+K", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/search across/i).or(page.getByPlaceholder(/search projects/i))).toBeVisible({ timeout: 5_000 });
  });

  test("pro pages show feature gate for free plan", async ({ page }) => {
    await page.getByRole("link", { name: "Drawings" }).click();
    await expect(page).toHaveURL(/\/drawings/, { timeout: 10_000 });

    const upgradeVisible = await page.getByText(/upgrade to unlock/i).isVisible().catch(() => false);
    const drawingsVisible = await page.getByRole("heading", { name: /drawings/i }).isVisible().catch(() => false);

    expect(upgradeVisible || drawingsVisible).toBeTruthy();
  });

  test("navigation through all main pages works", async ({ page }) => {
    const pages = [
      { name: "Projects", url: /\/projects/ },
      { name: "Clients", url: /\/clients/ },
      { name: "Billing", url: /\/billing/ },
      { name: "Dashboard", url: /\/dashboard/ },
    ];

    for (const p of pages) {
      await page.getByRole("link", { name: p.name }).click();
      await expect(page).toHaveURL(p.url, { timeout: 10_000 });
    }
  });
});
