/**
 * 400px-wide smoke test across every sidebar page (read-only).
 *
 * Needs an authenticated Clerk test user whose firm is on the Enterprise plan
 * (so every page is unlocked). Skipped without auth:
 *
 *   E2E_CLERK_USER_EMAIL=<test user> CLERK_SECRET_KEY=<clerk dev secret> \
 *   npx playwright test e2e/mobile-smoke.spec.ts
 *
 * Checks, per page: no horizontal page overflow, no uncaught page errors, and
 * no console errors (apart from a small allow-list of browser/dev noise).
 */
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { signIn } from "./fixtures/auth";
import { HAS_AUTH, TEST_EMAIL, TEST_PASSWORD } from "./fixtures/qa";

/** Mirrors NAV_ITEMS in components/layout/Sidebar.tsx, plus Settings. */
const SIDEBAR_ROUTES: { label: string; href: string }[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Clients", href: "/clients" },
  { label: "Drawings", href: "/drawings" },
  { label: "Billing", href: "/billing" },
  { label: "Site Tracker", href: "/site-tracker" },
  { label: "Leads", href: "/leads" },
  { label: "Vendors", href: "/vendors" },
  { label: "AI Estimator", href: "/ai-estimator" },
  { label: "3D Studio", href: "/3d-studio" },
  { label: "Analytics", href: "/analytics" },
  { label: "Settings", href: "/settings" },
];

/** Console noise that isn't an app bug. */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Download the React DevTools/i,
  /Clerk has been loaded with development keys/i,
  /ResizeObserver loop/i,
  // Resource 4xx/5xx are covered by the page assertions; WebGL may be missing in headless.
  /Failed to load resource/i,
  /WebGL/i,
];

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });
  return errors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: (document.scrollingElement ?? document.documentElement).scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `page is ${scrollWidth}px wide in a ${innerWidth}px viewport`).toBeLessThanOrEqual(
    innerWidth + 1
  );
}

test.describe("Mobile smoke (400px)", () => {
  test.skip(!HAS_AUTH, "Set E2E_CLERK_USER_EMAIL and CLERK_SECRET_KEY to run authenticated tests");
  test.use({ viewport: { width: 400, height: 844 } });
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  });

  for (const route of SIDEBAR_ROUTES) {
    test(`${route.label} (${route.href}) fits 400px without errors`, async ({ page }) => {
      const errors = trackErrors(page);
      const response = await page.goto(route.href);
      expect(response?.status() ?? 200).toBeLessThan(400);
      await expect(page).toHaveURL(new RegExp(route.href.replace("/", "\\/")));
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
      // Let client data load and layout settle before measuring.
      await page.waitForLoadState("load");
      await page.waitForTimeout(1_000);
      await expectNoHorizontalOverflow(page);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }

  test("hamburger opens the navigation and navigates", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/dashboard");
    // The desktop sidebar is hidden at this width.
    const menu = page.getByRole("button", { name: "Open navigation menu" });
    await expect(menu).toBeVisible();
    await menu.click();
    const nav = page.getByRole("dialog");
    await expect(nav).toBeVisible();
    for (const { label } of SIDEBAR_ROUTES) {
      await expect(nav.getByRole("link", { name: label }).first()).toBeVisible();
    }
    await nav.getByRole("link", { name: "Projects" }).first().click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(nav).toBeHidden();
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
