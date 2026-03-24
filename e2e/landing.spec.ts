import { test, expect } from "@playwright/test";
import { LANDING_FEATURES, INDIAN_MARKET_ITEMS } from "./fixtures/test-data";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders nav with logo and auth links", async ({ page }) => {
    await expect(page.getByText("ArchDesk").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();
  });

  test("renders hero section with headline and CTAs", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /run your architecture firm/i })
    ).toBeVisible();
    await expect(page.getByText("from one desk")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /start free trial/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign In", exact: true })
    ).toBeVisible();
  });

  test("renders the Hubbali badge", async ({ page }) => {
    await expect(
      page.getByText("Built for architects in Hubbali, Karnataka")
    ).toBeVisible();
  });

  test("renders all 6 feature cards", async ({ page }) => {
    for (const feature of LANDING_FEATURES) {
      await expect(page.getByText(feature).first()).toBeVisible();
    }
  });

  test("renders Indian market section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /made for indian architects/i })
    ).toBeVisible();

    for (const item of INDIAN_MARKET_ITEMS) {
      await expect(page.getByText(item)).toBeVisible();
    }
  });

  test("renders footer", async ({ page }) => {
    await expect(page.getByText("Built for Tier-2 India")).toBeVisible();
  });

  test("nav Sign in link navigates to /sign-in", async ({ page }) => {
    await page
      .getByRole("link", { name: "Sign in", exact: true })
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("Get Started link navigates to /sign-up", async ({ page }) => {
    await page.getByRole("link", { name: "Get Started" }).click();
    await expect(page).toHaveURL(/\/sign-up/);
  });
});
