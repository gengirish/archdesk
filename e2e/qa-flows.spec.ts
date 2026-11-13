/**
 * QA E2E flows from the QA fix sprint brief. THESE TESTS WRITE DATA.
 *
 * Run them only against a NON-PRODUCTION database (e.g. a Neon branch) with a
 * dedicated Clerk test user whose firm is on the Enterprise plan, so drawings,
 * site tracker, leads and the client portal are all enabled. They are skipped
 * unless you opt in explicitly:
 *
 *   E2E_ALLOW_WRITES=1 \
 *   E2E_CLERK_USER_EMAIL=<test user> CLERK_SECRET_KEY=<clerk dev secret> \
 *   DATABASE_URL=<neon branch> BLOB_READ_WRITE_TOKEN=<test blob store> \
 *   npx playwright test e2e/qa-flows.spec.ts
 *
 * Drawing uploads need a Vercel Blob token. Every record created is prefixed
 * "QA-" and uses only gen.girish+qa@gmail.com / 9876543210.
 *
 * The tests run serially: tests 2, 3, 5 and 6 reuse the client and project
 * created in test 1.
 */
import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./fixtures/auth";
import {
  expectToast,
  HAS_AUTH,
  projectIdFromUrl,
  QA_EMAIL,
  QA_PHONE,
  qaName,
  TEST_EMAIL,
  TEST_PASSWORD,
  TINY_PNG,
  WRITES_ALLOWED,
} from "./fixtures/qa";

test.describe.configure({ mode: "serial" });

test.describe("QA flows (writes data)", () => {
  test.skip(
    !WRITES_ALLOWED || !HAS_AUTH,
    "Opt-in: set E2E_ALLOW_WRITES=1, E2E_CLERK_USER_EMAIL and CLERK_SECRET_KEY (non-production DB only)"
  );
  test.setTimeout(180_000);

  const clientName = qaName("Client");
  const projectName = qaName("Project");
  const milestoneName = qaName("Retainer");
  const approvedDrawing = qaName("Approved-Plan");
  const revisionDrawing = qaName("Revision-Plan");
  let projectId = "";

  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  });

  async function openProject(page: Page) {
    expect(projectId, "project from test 1").not.toBe("");
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible({ timeout: 20_000 });
  }

  async function addMilestone(page: Page, name: string, amount: string) {
    await page.getByRole("tab", { name: /Milestones/ }).click();
    await page.getByRole("button", { name: "Add milestone" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#ms-name").fill(name);
    await dialog.locator("#ms-amount").fill(amount);
    await dialog.getByRole("button", { name: "Add milestone" }).click();
    await expectToast(page, "Milestone added");
    await expect(page.getByText(name).first()).toBeVisible();
  }

  async function portalUrl(page: Page): Promise<string> {
    const link = page.getByLabel("Client portal link");
    await expect(link).not.toHaveValue("", { timeout: 15_000 });
    return link.inputValue();
  }

  test("1. create client → project → milestone", async ({ page }) => {
    // Client
    await page.goto("/clients");
    await page.getByRole("button", { name: "Add Client", exact: true }).click();
    const clientDialog = page.getByRole("dialog");
    await clientDialog.locator("#client-name").fill(clientName);
    await clientDialog.locator("#client-phone").fill(QA_PHONE);
    await clientDialog.locator("#client-email").fill(QA_EMAIL);
    await clientDialog.getByRole("button", { name: "Add client", exact: true }).click();
    await expectToast(page, "Client added");
    await expect(page.getByText(clientName).first()).toBeVisible();

    // Project
    await page.goto("/projects");
    await page.getByRole("button", { name: "New Project" }).click();
    const projectDialog = page.getByRole("dialog");
    await projectDialog.locator("#project-name").fill(projectName);
    await page.locator("#project-client").click();
    await page.getByRole("option", { name: clientName }).click();
    await projectDialog.locator("#project-budget").fill("500000");
    await projectDialog.getByRole("button", { name: "Create Project" }).click();
    await expectToast(page, "Project created");

    await page.getByRole("link", { name: new RegExp(projectName) }).first().click();
    await page.waitForURL(/\/projects\/[^/]+$/);
    projectId = projectIdFromUrl(page.url());
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

    // Milestone
    await addMilestone(page, milestoneName, "50000");
  });

  test("2. drawings: approve one, request revision on another → portal shows only the approved one", async ({
    page,
    context,
  }) => {
    await openProject(page);
    await page.getByRole("tab", { name: /Drawings/ }).click();

    for (const name of [approvedDrawing, revisionDrawing]) {
      await page.getByRole("button", { name: "Upload drawing" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("#drawing-name").fill(name);
      await dialog.locator("#drawing-file").setInputFiles({
        name: `${name}.png`,
        mimeType: "image/png",
        buffer: TINY_PNG,
      });
      await dialog.getByRole("button", { name: "Upload", exact: true }).click();
      await expectToast(page, "Drawing uploaded");
      await expect(dialog).toBeHidden();
    }

    async function setDrawingStatus(name: string, action: "Approve" | "Request revision", toast: string) {
      await page.getByRole("button", { name: new RegExp(name) }).first().click();
      const details = page.getByRole("dialog");
      await details.getByRole("button", { name: action, exact: true }).click();
      await expectToast(page, toast);
      await page.keyboard.press("Escape");
      await expect(details).toBeHidden();
    }
    await setDrawingStatus(approvedDrawing, "Approve", "Drawing approved");
    await setDrawingStatus(revisionDrawing, "Request revision", "Revision requested");

    const url = await portalUrl(page);
    const portal = await context.newPage();
    await portal.goto(url);
    const approvedSection = portal.locator("section").filter({
      has: portal.getByRole("heading", { name: "Approved drawings" }),
    });
    await expect(approvedSection.getByText(approvedDrawing)).toBeVisible();
    await expect(approvedSection.getByText(revisionDrawing)).toHaveCount(0);
    await expect(portal.getByText(revisionDrawing)).toHaveCount(0);
    await portal.close();
  });

  test("3. generate invoice PDF", async ({ page }) => {
    await openProject(page);
    await page.getByRole("tab", { name: /Milestones/ }).click();

    const [response, download] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/invoices/generate") && r.request().method() === "POST"),
      page.waitForEvent("download"),
      page.getByRole("button", { name: `Invoice PDF for ${milestoneName}` }).click(),
    ]);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const invoiceNo: string = body?.data?.invoice?.invoiceNo ?? body?.invoice?.invoiceNo;
    expect(invoiceNo).toMatch(/^[A-Z]{3}-\d{4}-\d{3,}$/);
    expect(download.suggestedFilename()).toBe(`${invoiceNo}.pdf`);
    await expectToast(page, invoiceNo);

    // Clicking again re-downloads the same invoice instead of using up a number.
    const [again] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: `Invoice PDF for ${milestoneName}` }).click(),
    ]);
    expect(again.suggestedFilename()).toBe(`${invoiceNo}.pdf`);
  });

  test("4. lead New → Won → convert to project", async ({ page }) => {
    const leadName = qaName("Lead");
    await page.goto("/leads");
    await page.getByRole("button", { name: "Add Lead" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill(leadName);
    await dialog.getByLabel("Mobile").fill(QA_PHONE);
    await dialog.getByLabel("Email").fill(QA_EMAIL);
    await dialog.getByRole("button", { name: "Create lead" }).click();
    await expectToast(page, "Lead created");

    // Lands in the New column.
    const newColumn = page.getByRole("region", { name: "New column" });
    await expect(newColumn.getByText(leadName)).toBeVisible();

    await page.getByRole("button", { name: `Mark ${leadName} as won` }).click();
    await expectToast(page, new RegExp(`${leadName}: .* → Won`));

    // Open it from the Won section (the card button's name starts with the lead name).
    await page.getByRole("button", { name: new RegExp(`^${leadName}`) }).first().click();
    await page.getByRole("button", { name: "Convert to project" }).click();
    await expectToast(page, /Project (and client )?created/);
    await page.getByRole("link", { name: "View project" }).click();
    await page.waitForURL(/\/projects\/[^/]+$/);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("5. site issue lifecycle Open → In Progress → Resolved", async ({ page }) => {
    const title = qaName("Seepage");
    await page.goto("/site-tracker");
    await page.getByRole("button", { name: "Report issue" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#issue-project").click();
    await page.getByRole("option", { name: projectName }).click();
    await dialog.locator("#issue-title").fill(title);
    await dialog.getByRole("radio", { name: "High" }).click();
    await dialog.getByRole("button", { name: "Report issue" }).click();
    await expectToast(page, "Issue reported");

    const card = page.getByRole("listitem").filter({ hasText: title });
    await expect(card.getByText("Open", { exact: true })).toBeVisible();
    await expect(card.getByText("High", { exact: true })).toBeVisible();

    await card.getByRole("button", { name: "Start work" }).click();
    await expectToast(page, `“${title}” is now In Progress`);
    await expect(card.getByText("In Progress", { exact: true })).toBeVisible();

    await card.getByRole("button", { name: "Mark resolved" }).click();
    await expectToast(page, `“${title}” is now Resolved`);

    // Resolved issues are tucked behind "Show resolved (n)".
    await page.getByRole("button", { name: /Show resolved/ }).click();
    await expect(card.getByText("Resolved", { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Reopen" })).toBeVisible();
  });

  test("6. portal approve/reject is reflected in Billing and Analytics", async ({ page, context }) => {
    const rejectName = qaName("Design-Fee");
    await openProject(page);
    await addMilestone(page, rejectName, "75000");

    for (const name of [milestoneName, rejectName]) {
      await page.getByRole("button", { name: `More actions for ${name}` }).click();
      await page.getByRole("menuitem", { name: "Ask client to decide" }).click();
      await expectToast(page, "Decision request sent to portal");
    }

    const url = await portalUrl(page);
    const portal = await context.newPage();
    await portal.goto(url);
    async function decide(name: string, outcome: "Approve" | "Reject") {
      const card = portal.getByRole("listitem").filter({ hasText: name }).filter({
        has: portal.getByRole("button", { name: outcome }),
      });
      await card.getByPlaceholder("Add your decision note (required)").fill(`QA ${outcome.toLowerCase()} note`);
      await card.getByRole("button", { name: outcome }).click();
      await expect(card).toHaveCount(0, { timeout: 15_000 });
    }
    await decide(milestoneName, "Approve");
    await decide(rejectName, "Reject");
    const recent = portal.locator("section").filter({ has: portal.getByRole("heading", { name: "Recent decisions" }) });
    await expect(recent.getByText(`${milestoneName} · Approved`)).toBeVisible();
    await expect(recent.getByText(`${rejectName} · Rejected`)).toBeVisible();
    await portal.close();

    // Billing shows the client's outcome on each milestone.
    await page.goto(`/billing?projectId=${projectId}`);
    const approvedRow = page.getByRole("listitem").filter({ hasText: milestoneName });
    await expect(approvedRow.getByText(/Client approved/)).toBeVisible({ timeout: 20_000 });
    const rejectedRow = page.getByRole("listitem").filter({ hasText: rejectName });
    await expect(rejectedRow.getByText(/Client rejected/)).toBeVisible();

    // Analytics decision KPIs render (counts depend on other data in the firm).
    await page.goto("/analytics");
    await expect(page.getByText("Client Decision Insights")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Approved: \d+/)).toBeVisible();
    await expect(page.getByText(/Rejected: [1-9]\d*/)).toBeVisible();
  });
});
