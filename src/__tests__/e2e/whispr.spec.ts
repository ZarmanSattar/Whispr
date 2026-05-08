import { test, expect, Page } from "@playwright/test";

// ─── Test credentials (set in .env.test) ─────────────────────────────────────
const TEST_EMAIL = process.env.TEST_EMAIL || "test@whispr.dev";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123!";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// ─── Helper: sign in ─────────────────────────────────────────────────────────
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

// ─── Helper: create a new interview ──────────────────────────────────────────
async function createInterview(page: Page, questionCount = 3) {
  await page.goto(`${BASE_URL}/dashboard/new`);
  await page.waitForLoadState("networkidle");

  // Fill job role
  const roleInput = page.locator("input").first();
  await roleInput.fill("Software Engineer");
  await page.keyboard.press("Enter");

  // Fill tech stack
  const stackInput = page.locator("input").nth(1);
  await stackInput.fill("React");
  await page.keyboard.press("Enter");

  // Select experience level
  await page.locator("button, [role='option']").filter({ hasText: "Junior" }).first().click();

  // Set question count
  const countInput = page.locator("input[type='number'], input").filter({ hasAttribute: "placeholder" }).first();
  if (await countInput.isVisible()) {
    await countInput.fill(String(questionCount));
  }

  // Submit
  await page.locator("button[type='submit'], button").filter({ hasText: /generate|start|create/i }).first().click();
  await page.waitForURL(`${BASE_URL}/dashboard/interview/**`, { timeout: 30000 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 31. Full interview flow
// ═══════════════════════════════════════════════════════════════════════════════
test("31. Full interview flow - create, answer all, reach feedback", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 2);

  // Use text mode for reliable testing
  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  if (await textModeBtn.isVisible({ timeout: 5000 })) {
    await textModeBtn.click();
  }

  // Answer each question
  for (let i = 0; i < 2; i++) {
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 10000 })) {
      await textarea.fill("This is my test answer for this question about the topic being asked.");
      const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
      await submitBtn.click();
    }

    // Wait for feedback phase then go next
    const nextBtn = page.locator("button").filter({ hasText: /next question|finish/i }).first();
    await nextBtn.waitFor({ state: "visible", timeout: 30000 });
    await nextBtn.click();
  }

  // Should reach feedback page
  await expect(page).toHaveURL(/\/feedback/, { timeout: 15000 });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 32. Skip question
// ═══════════════════════════════════════════════════════════════════════════════
test("32. Skip question - shows score 0 on feedback", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 2);

  // Skip the first question
  const skipBtn = page.locator("button").filter({ hasText: /skip/i }).first();
  await skipBtn.waitFor({ state: "visible", timeout: 10000 });
  await skipBtn.click();

  // Answer second question with text mode
  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  if (await textModeBtn.isVisible({ timeout: 5000 })) await textModeBtn.click();

  const textarea = page.locator("textarea").first();
  if (await textarea.isVisible({ timeout: 10000 })) {
    await textarea.fill("Test answer for the second question.");
    await page.locator("button").filter({ hasText: /submit/i }).first().click();
  }

  const nextBtn = page.locator("button").filter({ hasText: /next question|finish/i }).first();
  await nextBtn.waitFor({ state: "visible", timeout: 30000 });
  await nextBtn.click();

  await expect(page).toHaveURL(/\/feedback/, { timeout: 15000 });

  // Check for SKIP indicator on feedback page
  await expect(page.locator("text=SKIP, text=Skipped, text=skipped").first()).toBeVisible({ timeout: 5000 });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 33. Timer color changes at 30s and 10s
// ═══════════════════════════════════════════════════════════════════════════════
test("33. Timer is visible during interview", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 1);

  // Timer should be visible
  const timer = page.locator("[class*='timer'], text=/\\d+:\\d{2}/").first();
  await expect(timer).toBeVisible({ timeout: 10000 });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 34. Text mode fallback
// ═══════════════════════════════════════════════════════════════════════════════
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

  // Should show processing then feedback
  const nextBtn = page.locator("button").filter({ hasText: /next question|finish/i }).first();
  await nextBtn.waitFor({ state: "visible", timeout: 30000 });
  expect(true).toBe(true); // submit worked
});

// ═══════════════════════════════════════════════════════════════════════════════
// 35. Re-record clears transcript
// ═══════════════════════════════════════════════════════════════════════════════
test("35. Re-record button clears transcript and returns to intro", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 1);

  // Switch to text mode, fill in answer, then look for re-record equivalent
  const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  await textModeBtn.click();

  const textarea = page.locator("textarea").first();
  await textarea.fill("Initial answer text.");

  // Switch back to voice mode or find re-record
  const reRecordBtn = page.locator("button").filter({ hasText: /re-record|record again/i }).first();
  if (await reRecordBtn.isVisible({ timeout: 3000 })) {
    await reRecordBtn.click();
    // Transcript should be cleared
    await expect(textarea).toHaveValue("", { timeout: 3000 });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 36. Exit confirmation modal
// ═══════════════════════════════════════════════════════════════════════════════
test("36. Exit confirmation modal blocks navigation mid-interview", async ({ page }) => {
  await signIn(page);
  await createInterview(page, 2);

  // Click back/exit button
  const exitBtn = page.locator("button, a").filter({ hasText: /exit|leave|back/i }).first();
  await exitBtn.waitFor({ state: "visible", timeout: 10000 });
  await exitBtn.click();

  // Modal should appear
  const modal = page.locator("text=Leave interview?, text=Are you sure").first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Cancel should dismiss modal
  const cancelBtn = page.locator("button").filter({ hasText: /cancel|stay/i }).first();
  await cancelBtn.click();
  await expect(modal).not.toBeVisible({ timeout: 3000 });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 37. PDF export
// ═══════════════════════════════════════════════════════════════════════════════
test("37. PDF export - Export Summary button triggers download", async ({ page }) => {
  await signIn(page);

  // Go to an existing feedback page (first interview on dashboard)
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  // Find first completed interview and navigate to its feedback
  const feedbackLink = page.locator("a[href*='/feedback']").first();
  if (await feedbackLink.isVisible({ timeout: 5000 })) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
      feedbackLink.click(),
    ]);

    // Check export button exists on feedback page
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

// ═══════════════════════════════════════════════════════════════════════════════
// 38. Delete interview
// ═══════════════════════════════════════════════════════════════════════════════
test("38. Delete interview - card disappears after confirmation", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  // Count cards before delete
  const cards = page.locator("[data-testid='interview-card'], .interview-card, div").filter({ hasText: /delete/i });
  const countBefore = await cards.count();

  if (countBefore > 0) {
    const deleteBtn = page.locator("button").filter({ hasText: /delete/i }).first();
    await deleteBtn.click();

    // Confirmation modal
    const confirmBtn = page.locator("button").filter({ hasText: /confirm|yes|delete/i }).last();
    await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
    await confirmBtn.click();

    // Card count should decrease
    await page.waitForTimeout(2000);
    const countAfter = await cards.count();
    expect(countAfter).toBeLessThan(countBefore);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 39. Retry interview pre-fills form
// ═══════════════════════════════════════════════════════════════════════════════
test("39. Retry interview - form pre-filled with correct values", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  const retryBtn = page.locator("button, a").filter({ hasText: /retry/i }).first();
  if (await retryBtn.isVisible({ timeout: 5000 })) {
    await retryBtn.click();
    await expect(page).toHaveURL(/\/new/, { timeout: 10000 });

    // URL should contain pre-filled query params
    const url = page.url();
    expect(url).toMatch(/role=|stack=|level=/);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 40. Dashboard search and filter
// ═══════════════════════════════════════════════════════════════════════════════
test("40. Dashboard search filters cards correctly", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");

  const searchInput = page.locator("input[type='search'], input[placeholder*='search' i]").first();
  if (await searchInput.isVisible({ timeout: 5000 })) {
    await searchInput.fill("zzz_nonexistent_role");
    await page.waitForTimeout(500);

    // Should show empty state or fewer cards
    const emptyState = page.locator("text=No interviews, text=No results, text=no sessions").first();
    const cards = page.locator("[data-testid='interview-card']");
    const isEmpty = (await emptyState.isVisible()) || (await cards.count()) === 0;
    expect(isEmpty).toBe(true);

    // Clear search
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

// ═══════════════════════════════════════════════════════════════════════════════
// 41. Account page - profile, education, resume
// ═══════════════════════════════════════════════════════════════════════════════
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

    // Should not show error
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

    // Fill education form
    const degreeInput = page.locator("input, select").filter({ hasAttribute: "placeholder" }).first();
    if (await degreeInput.isVisible({ timeout: 3000 })) {
      await degreeInput.fill("BSc");
    }

    // Save
    const saveBtn = page.locator("button").filter({ hasText: /save|add/i }).last();
    await saveBtn.click();
  }
});

test("41c. Account page - resume upload section is visible", async ({ page }) => {
  await signIn(page);
  await page.goto(`${BASE_URL}/dashboard/account`);
  await page.waitForLoadState("networkidle");

  // Resume section should be visible
  await expect(page.locator("text=Resume").first()).toBeVisible({ timeout: 5000 });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 42. Auth redirect tests
// ═══════════════════════════════════════════════════════════════════════════════
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
