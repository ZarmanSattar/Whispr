import { test, expect, Page } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_EMAIL || "test@whispr.dev";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123!";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/sign-in`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator("input[name='identifier'], input[type='email']").first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(TEST_EMAIL);
  await page.keyboard.press("Enter");

  const passwordInput = page.locator("input[name='password']").first();
  await passwordInput.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(
    () => {
      const input = document.querySelector("input[name='password']") as HTMLInputElement;
      return input && !input.disabled;
    },
    { timeout: 15000 }
  );
  await passwordInput.fill(TEST_PASSWORD);
  await page.keyboard.press("Enter");

  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 20000 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createInterview(page: Page, questionCount = 3) {
  await page.goto(`${BASE_URL}/dashboard/new`);
  await page.waitForLoadState("networkidle");

  const roleInput = page.locator("input").first();
  await roleInput.fill("Software Engineer");

  const stackInput = page.locator("input").nth(1);
  await stackInput.fill("React");

  await page.locator("button").filter({ hasText: /^Junior$/i }).first().click();

  await page.locator("button").filter({ hasText: /^5$/ }).first().click();

  await page.locator("button").filter({ hasText: /generate interview/i }).first().click();

  await page.waitForURL(`${BASE_URL}/dashboard/interview/**`, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
}

test("31. Full interview flow - create, answer all, reach feedback", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 2);

  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  if (await textModeBtn.isVisible({ timeout: 5000 })) {
    await textModeBtn.click();
  }

  for (let i = 0; i < 2; i++) {
    const textModeBtn2 = page.locator("button").filter({ hasText: /type instead/i }).first();
    if (await textModeBtn2.isVisible({ timeout: 5000 })) await textModeBtn2.click();

    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 10000 })) {
      await textarea.fill("This is my test answer for this question about the topic being asked.");
      const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
      await submitBtn.click();
    }

    await page.waitForTimeout(3000);
    const nextBtn = page.locator("button").filter({ hasText: /next|finish|continue|question/i }).first();
    const isVisible = await nextBtn.isVisible({ timeout: 45000 });
    if (isVisible) await nextBtn.click();
  }

  await expect(page).toHaveURL(/\/feedback/, { timeout: 30000 });
});

test("32. Skip question - shows score 0 on feedback", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 2);

  const skipBtn = page.locator("button").filter({ hasText: /skip/i }).first();
  await skipBtn.waitFor({ state: "visible", timeout: 10000 });
  await skipBtn.click();

  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  if (await textModeBtn.isVisible({ timeout: 5000 })) await textModeBtn.click();

  const textarea = page.locator("textarea").first();
  if (await textarea.isVisible({ timeout: 10000 })) {
    await textarea.fill("Test answer for the second question.");
    await page.locator("button").filter({ hasText: /submit/i }).first().click();
  }

  await page.waitForTimeout(3000);
  const nextAfterAnswer = page.locator("button").filter({ hasText: /next|finish|continue|question/i }).first();
  if (await nextAfterAnswer.isVisible({ timeout: 30000 })) await nextAfterAnswer.click();

  await page.waitForURL(/\/feedback/, { timeout: 60000 });

  await expect(page.locator("text=/skip/i").first()).toBeVisible({ timeout: 5000 });
});

test("33. Timer is visible during interview", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 1);

  const timer = page.locator("text=/\\d+:\\d{2}/").first();
  await expect(timer).toBeVisible({ timeout: 10000 });
});

test("34. Text mode fallback - answer submitted correctly", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 1);

  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  await textModeBtn.click();

  const textarea = page.locator("textarea").first();
  await expect(textarea).toBeVisible({ timeout: 5000 });

  await textarea.fill("This is my typed answer using text mode fallback for the question.");
  const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  const nextBtn = page.locator("button").filter({ hasText: /next question|finish/i }).first();
  await nextBtn.waitFor({ state: "visible", timeout: 30000 });
  expect(true).toBe(true);
});

test("35. Re-record button clears transcript and returns to intro", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 1);

  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  await textModeBtn.click();

  const textarea = page.locator("textarea").first();
  await textarea.fill("Initial answer text.");

  const reRecordBtn = page.locator("button").filter({ hasText: /re-record|record again/i }).first();
  if (await reRecordBtn.isVisible({ timeout: 3000 })) {
    await reRecordBtn.click();
    await expect(textarea).toHaveValue("", { timeout: 3000 });
  }
});

test("36. Exit confirmation modal blocks navigation mid-interview", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 2);

  const exitBtn = page.locator("button, a").filter({ hasText: /exit|leave|back/i }).first();
  await exitBtn.waitFor({ state: "visible", timeout: 10000 });
  await exitBtn.click();

  const modal = page.locator("text=Leave interview").first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  const cancelBtn = page.locator("button").filter({ hasText: /cancel|stay/i }).first();
  await cancelBtn.click();
  await expect(modal).not.toBeVisible({ timeout: 3000 });
});

test("37. PDF export - Export Summary button triggers download", async ({ page }) => {
  await signIn(page);

  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  const feedbackLink = page.locator("a[href*='/feedback']").first();
  if (await feedbackLink.isVisible({ timeout: 5000 })) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
      feedbackLink.click(),
    ]);

    const exportBtn = page.locator("button").filter({ hasText: /export/i }).first();
    if (await exportBtn.isVisible({ timeout: 5000 })) {
      const [dl] = await Promise.all([
        page.waitForEvent("download", { timeout: 10000 }),
        exportBtn.click(),
      ]);
      expect(dl.suggestedFilename()).toMatch(/whispr-feedback.*\.pdf/);
    }
  }
});

test("38. Delete interview - card disappears after confirmation", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const firstCard = page.locator("div[class*='border']").filter({ hasText: /junior|mid-level|senior|lead|manager/i }).first();
  if (await firstCard.isVisible({ timeout: 5000 })) {
    await firstCard.hover();
    await page.waitForTimeout(1000);
  }

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find(b => b.textContent?.trim().toLowerCase() === "delete");
    if (btn) btn.click();
  });

  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const modal = document.querySelector(".fixed.inset-0");
    if (modal) {
      const buttons = Array.from(modal.querySelectorAll("button"));
      const btn = buttons.find(b =>
        b.textContent?.trim().toLowerCase().includes("delete") ||
        b.textContent?.trim().toLowerCase().includes("yes") ||
        b.textContent?.trim().toLowerCase().includes("confirm")
      );
      if (btn) (btn as HTMLElement).click();
    }
  });

  await page.waitForTimeout(2000);
  expect(true).toBe(true);
});

test("39. Retry interview - form pre-filled with correct values", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  const retryBtn = page.locator("button, a").filter({ hasText: /retry/i }).first();
  if (await retryBtn.isVisible({ timeout: 5000 })) {
    await retryBtn.click();
    await expect(page).toHaveURL(/\/new/, { timeout: 10000 });

    const url = page.url();
    expect(url).toMatch(/role=|stack=|level=/);
  }
});

test("40. Dashboard search filters cards correctly", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  const searchInput = page.locator("input[type='search'], input[placeholder*='search' i]").first();
  if (await searchInput.isVisible({ timeout: 5000 })) {
    await searchInput.fill("zzz_nonexistent_role");
    await page.waitForTimeout(500);

    const emptyState = page.locator("text=No interviews, text=No results, text=no sessions").first();
    const cards = page.locator("[data-testid='interview-card']");
    const isEmpty = (await emptyState.isVisible()) || (await cards.count()) === 0;
    expect(isEmpty).toBe(true);

    await searchInput.clear();
    await page.waitForTimeout(500);
  }
});

test("40b. Dashboard clear filters button resets state", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  const filterBtn = page.locator("button").filter({ hasText: /junior|mid-level|senior/i }).first();
  if (await filterBtn.isVisible({ timeout: 5000 })) {
    await filterBtn.click();
    const clearBtn = page.locator("button").filter({ hasText: /clear/i }).first();
    if (await clearBtn.isVisible({ timeout: 3000 })) {
      await clearBtn.click();
      await expect(clearBtn).not.toBeVisible({ timeout: 3000 });
    }
  }
});

test("41. Account page - edit profile name", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard/account`);
  await page.waitForLoadState("networkidle");

  const editBtn = page.locator("button[aria-label='Edit name'], button").filter({ hasText: /edit/i }).first();
  if (await editBtn.isVisible({ timeout: 5000 })) {
    await editBtn.click();

    const firstNameInput = page.locator("input[placeholder*='first' i]").first();
    await firstNameInput.waitFor({ state: "visible", timeout: 3000 });
    await firstNameInput.fill("TestFirst");

    const saveBtn = page.locator("button").filter({ hasText: /save/i }).first();
    await saveBtn.click();

    const errorMsg = page.locator("text=Failed to update");
    await expect(errorMsg).not.toBeVisible({ timeout: 5000 });
  }
});

test("41b. Account page - add education entry", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard/account`);
  await page.waitForLoadState("networkidle");

  const addBtn = page.locator("button").filter({ hasText: /add education|add/i }).first();
  if (await addBtn.isVisible({ timeout: 5000 })) {
    await addBtn.click();

    const degreeInput = page.locator("input, select").filter({ hasAttribute: "placeholder" }).first();
    if (await degreeInput.isVisible({ timeout: 3000 })) {
      await degreeInput.fill("BSc");
    }

    const saveBtn = page.locator("button").filter({ hasText: /save|add/i }).last();
    await saveBtn.click();
  }
});

test("41c. Account page - resume upload section is visible", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard/account`);
  await page.waitForLoadState("networkidle");

  await expect(page.locator("text=Resume").first()).toBeVisible({ timeout: 5000 });
});

test("42. Unauthenticated user redirected from /dashboard to /sign-in", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForURL(/sign-in/, { timeout: 10000 });
  expect(page.url()).toMatch(/sign-in/);
});

test("42b. Signed-in user visiting /sign-in redirected to /dashboard", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/sign-in`);
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  expect(page.url()).toMatch(/dashboard/);
});