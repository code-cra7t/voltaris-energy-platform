import { expect, test, type Page } from "@playwright/test";

const command = process.env.PW_COMMAND_URL || "http://127.0.0.1:3000";
const margin = process.env.PW_MARGIN_URL || "http://127.0.0.1:3001";
const email = process.env.PW_REVIEWER_EMAIL;
const password = process.env.PW_REVIEWER_PASSWORD;

test.beforeAll(() => {
  if (!email || !password) throw new Error("PW_REVIEWER_EMAIL and PW_REVIEWER_PASSWORD are required");
});

async function signIn(page: Page, base: string) {
  await page.goto(base);
  if (!page.url().includes("/login")) return;
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(`${base}/`);
}

test("reviewer completes a real Command to Margin shift and resets it", async ({ browser }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("dialog", dialog => void dialog.accept());
  await signIn(page, command);
  await expect(page.getByRole("heading", { name: /Command center/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Start with the incoming charger fault/i })).toBeVisible();
  await page.getByRole("button", { name: "Restore shift state" }).click();
  await expect(page.getByText(/Shift workspace restored/i)).toBeVisible();
  await page.getByRole("button", { name: "Open incoming fault" }).click();
  await expect(page.getByText("VC-HAN-001").first()).toBeVisible();
  await page.getByRole("button", { name: "Analyze incident" }).click();
  await expect(page.getByText("Evidence-backed assessment")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Build proposal" }).click();
  await expect(page.getByText("Needs approval")).toBeVisible();
  // Sign in at the Margin origin before reading its API.
  const marginPage = await context.newPage();
  await signIn(marginPage, margin);
  const backlog = () => marginPage.evaluate(async () => {
    const response = await fetch("/api/backlog?region=Hannover", { credentials: "include" });
    return { status: response.status, body: await response.json() };
  });
  const initial = await backlog();
  expect(initial.status).toBe(200);
  expect(initial.body.openCount).toBe(1);
  await page.getByRole("button", { name: "Approve & schedule" }).click();
  await expect(page.getByText(/Approved and scheduled/i)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Scheduled work")).toBeVisible();
  const after = await backlog();
  expect(after.body.openCount).toBe(2);
  await marginPage.getByRole("button", { name: "View Hannover backlog" }).click();
  await expect(marginPage.getByRole("heading", { name: "Service backlog" })).toBeVisible();
  await expect(marginPage.getByText("Open work orders")).toBeVisible();
  await page.getByRole("button", { name: "Restore shift state" }).click();
  await expect(page.getByText(/Shift workspace restored/i)).toBeVisible();
  const restored = await backlog();
  expect(restored.body.openCount).toBe(1);
  await context.close();
});

test("unauthenticated visitors cannot read business records", async ({ request }) => {
  expect((await request.get(`${command}/api/incidents`)).status()).toBe(401);
  expect((await request.get(`${margin}/api/dashboard`)).status()).toBe(401);
});

test("read-only staff cannot dispatch or reset the main workspace", async ({ browser }) => {
  const managerEmail = process.env.PW_MANAGER_EMAIL;
  const managerPassword = process.env.PW_MANAGER_PASSWORD;
  if (!managerEmail || !managerPassword) test.skip();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${command}/login`);
  await page.getByLabel(/email/i).fill(managerEmail!);
  await page.getByLabel(/password/i).fill(managerPassword!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(`${command}/`);
  const denial = await page.evaluate(async () => {
    const analyze = await fetch("/api/incidents/00000000-0000-0000-0000-000000000000/analyze", { method: "POST", credentials: "include" });
    const reset = await fetch("/api/workspace/reset", { method: "POST", credentials: "include" });
    return [analyze.status, reset.status];
  });
  expect(denial).toEqual([403, 403]);
  await context.close();
});
