# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: whispr.spec.ts >> 32. Skip question - shows score 0 on feedback
- Location: src\__tests__\e2e\whispr.spec.ts:80:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - main [ref=e3]:
    - navigation [ref=e4]:
      - link "Whispr" [ref=e5] [cursor=pointer]:
        - /url: /
      - generic [ref=e6]:
        - generic [ref=e7]: Question 3 of 5
        - button "Exit" [ref=e8] [cursor=pointer]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Question 3
          - generic [ref=e15]: Medium
        - generic [ref=e16]: 1:18
      - heading "You're building a React application that needs to display a list of items fetched from an API. However, the API returns a large amount of data, and you want to improve performance by limiting the amount of data rendered at once. What approach would you take?" [level=1] [ref=e17]
      - button "Show Hint" [ref=e19] [cursor=pointer]:
        - img [ref=e20]
        - text: Show Hint
      - generic [ref=e22]:
        - paragraph [ref=e23]: Take a moment to gather your thoughts, then record your answer. Recording stops automatically after 8 seconds of silence.
        - generic [ref=e24]:
          - textbox "Type your answer here..." [ref=e25]
          - generic [ref=e26]:
            - button "Submit answer" [disabled] [ref=e27]
            - button "Use voice instead" [ref=e28] [cursor=pointer]
      - button "Skip Question" [ref=e30] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | const TEST_EMAIL = process.env.TEST_EMAIL || "test@whispr.dev";
  4   | const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123!";
  5   | const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  6   | 
  7   | async function signIn(page: Page) {
  8   |   await page.goto(`${BASE_URL}/sign-in`);
  9   |   await page.waitForLoadState("networkidle");
  10  | 
  11  |   const emailInput = page.locator("input[name='identifier'], input[type='email']").first();
  12  |   await emailInput.waitFor({ state: "visible", timeout: 15000 });
  13  |   await emailInput.fill(TEST_EMAIL);
  14  |   await page.keyboard.press("Enter");
  15  | 
  16  |   const passwordInput = page.locator("input[name='password']").first();
  17  |   await passwordInput.waitFor({ state: "visible", timeout: 15000 });
  18  |   await page.waitForFunction(
  19  |     () => {
  20  |       const input = document.querySelector("input[name='password']") as HTMLInputElement;
  21  |       return input && !input.disabled;
  22  |     },
  23  |     { timeout: 15000 }
  24  |   );
  25  |   await passwordInput.fill(TEST_PASSWORD);
  26  |   await page.keyboard.press("Enter");
  27  | 
  28  |   await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 20000 });
  29  | }
  30  | 
  31  | async function createInterview(page: Page, questionCount = 3) {
  32  |   await page.goto(`${BASE_URL}/dashboard/new`);
  33  |   await page.waitForLoadState("networkidle");
  34  | 
  35  |   const roleInput = page.locator("input").first();
  36  |   await roleInput.fill("Software Engineer");
  37  | 
  38  |   const stackInput = page.locator("input").nth(1);
  39  |   await stackInput.fill("React");
  40  | 
  41  |   await page.locator("button").filter({ hasText: /^Junior$/i }).first().click();
  42  | 
  43  |   await page.locator("button").filter({ hasText: /^5$/ }).first().click();
  44  | 
  45  |   await page.locator("button").filter({ hasText: /generate interview/i }).first().click();
  46  | 
  47  |   await page.waitForURL(`${BASE_URL}/dashboard/interview/**`, { timeout: 60000 });
  48  |   await page.waitForLoadState("networkidle");
  49  | }
  50  | 
  51  | test("31. Full interview flow - create, answer all, reach feedback", async ({ page }) => {
  52  |   await signIn(page);
  53  |   await createInterview(page, 2);
  54  | 
  55  |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  56  |   if (await textModeBtn.isVisible({ timeout: 5000 })) {
  57  |     await textModeBtn.click();
  58  |   }
  59  | 
  60  |   for (let i = 0; i < 2; i++) {
  61  |     const textModeBtn2 = page.locator("button").filter({ hasText: /type instead/i }).first();
  62  |     if (await textModeBtn2.isVisible({ timeout: 5000 })) await textModeBtn2.click();
  63  | 
  64  |     const textarea = page.locator("textarea").first();
  65  |     if (await textarea.isVisible({ timeout: 10000 })) {
  66  |       await textarea.fill("This is my test answer for this question about the topic being asked.");
  67  |       const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
  68  |       await submitBtn.click();
  69  |     }
  70  | 
  71  |     await page.waitForTimeout(3000);
  72  |     const nextBtn = page.locator("button").filter({ hasText: /next|finish|continue|question/i }).first();
  73  |     const isVisible = await nextBtn.isVisible({ timeout: 45000 });
  74  |     if (isVisible) await nextBtn.click();
  75  |   }
  76  | 
  77  |   await expect(page).toHaveURL(/\/feedback/, { timeout: 30000 });
  78  | });
  79  | 
  80  | test("32. Skip question - shows score 0 on feedback", async ({ page }) => {
  81  |   await signIn(page);
  82  |   await createInterview(page, 2);
  83  | 
  84  |   const skipBtn = page.locator("button").filter({ hasText: /skip/i }).first();
  85  |   await skipBtn.waitFor({ state: "visible", timeout: 10000 });
  86  |   await skipBtn.click();
  87  | 
  88  |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  89  |   if (await textModeBtn.isVisible({ timeout: 5000 })) await textModeBtn.click();
  90  | 
  91  |   const textarea = page.locator("textarea").first();
  92  |   if (await textarea.isVisible({ timeout: 10000 })) {
  93  |     await textarea.fill("Test answer for the second question.");
  94  |     await page.locator("button").filter({ hasText: /submit/i }).first().click();
  95  |   }
  96  | 
  97  |   await page.waitForTimeout(3000);
  98  |   const nextAfterAnswer = page.locator("button").filter({ hasText: /next|finish|continue|question/i }).first();
  99  |   if (await nextAfterAnswer.isVisible({ timeout: 30000 })) await nextAfterAnswer.click();
  100 | 
> 101 |   await page.waitForURL(/\/feedback/, { timeout: 60000 });
      |              ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  102 | 
  103 |   await expect(page.locator("text=/skip/i").first()).toBeVisible({ timeout: 5000 });
  104 | });
  105 | 
  106 | test("33. Timer is visible during interview", async ({ page }) => {
  107 |   await signIn(page);
  108 |   await createInterview(page, 1);
  109 | 
  110 |   const timer = page.locator("text=/\\d+:\\d{2}/").first();
  111 |   await expect(timer).toBeVisible({ timeout: 10000 });
  112 | });
  113 | 
  114 | test("34. Text mode fallback - answer submitted correctly", async ({ page }) => {
  115 |   await signIn(page);
  116 |   await createInterview(page, 1);
  117 | 
  118 |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  119 |   await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  120 |   await textModeBtn.click();
  121 | 
  122 |   const textarea = page.locator("textarea").first();
  123 |   await expect(textarea).toBeVisible({ timeout: 5000 });
  124 | 
  125 |   await textarea.fill("This is my typed answer using text mode fallback for the question.");
  126 |   const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
  127 |   await expect(submitBtn).toBeVisible();
  128 |   await submitBtn.click();
  129 | 
  130 |   const nextBtn = page.locator("button").filter({ hasText: /next question|finish/i }).first();
  131 |   await nextBtn.waitFor({ state: "visible", timeout: 30000 });
  132 |   expect(true).toBe(true);
  133 | });
  134 | 
  135 | test("35. Re-record button clears transcript and returns to intro", async ({ page }) => {
  136 |   await signIn(page);
  137 |   await createInterview(page, 1);
  138 | 
  139 |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  140 |   await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  141 |   await textModeBtn.click();
  142 | 
  143 |   const textarea = page.locator("textarea").first();
  144 |   await textarea.fill("Initial answer text.");
  145 | 
  146 |   const reRecordBtn = page.locator("button").filter({ hasText: /re-record|record again/i }).first();
  147 |   if (await reRecordBtn.isVisible({ timeout: 3000 })) {
  148 |     await reRecordBtn.click();
  149 |     await expect(textarea).toHaveValue("", { timeout: 3000 });
  150 |   }
  151 | });
  152 | 
  153 | test("36. Exit confirmation modal blocks navigation mid-interview", async ({ page }) => {
  154 |   await signIn(page);
  155 |   await createInterview(page, 2);
  156 | 
  157 |   const exitBtn = page.locator("button, a").filter({ hasText: /exit|leave|back/i }).first();
  158 |   await exitBtn.waitFor({ state: "visible", timeout: 10000 });
  159 |   await exitBtn.click();
  160 | 
  161 |   const modal = page.locator("text=Leave interview").first();
  162 |   await expect(modal).toBeVisible({ timeout: 5000 });
  163 | 
  164 |   const cancelBtn = page.locator("button").filter({ hasText: /cancel|stay/i }).first();
  165 |   await cancelBtn.click();
  166 |   await expect(modal).not.toBeVisible({ timeout: 3000 });
  167 | });
  168 | 
  169 | test("37. PDF export - Export Summary button triggers download", async ({ page }) => {
  170 |   await signIn(page);
  171 | 
  172 |   await page.goto(`${BASE_URL}/dashboard`);
  173 |   await page.waitForLoadState("networkidle");
  174 | 
  175 |   const feedbackLink = page.locator("a[href*='/feedback']").first();
  176 |   if (await feedbackLink.isVisible({ timeout: 5000 })) {
  177 |     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  178 |     const [_download] = await Promise.all([
  179 |       page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
  180 |       feedbackLink.click(),
  181 |     ]);
  182 | 
  183 |     const exportBtn = page.locator("button").filter({ hasText: /export/i }).first();
  184 |     if (await exportBtn.isVisible({ timeout: 5000 })) {
  185 |       const [dl] = await Promise.all([
  186 |         page.waitForEvent("download", { timeout: 10000 }),
  187 |         exportBtn.click(),
  188 |       ]);
  189 |       expect(dl.suggestedFilename()).toMatch(/whispr-feedback.*\.pdf/);
  190 |     }
  191 |   }
  192 | });
  193 | 
  194 | test("38. Delete interview - card disappears after confirmation", async ({ page }) => {
  195 |   await signIn(page);
  196 |   await page.goto(`${BASE_URL}/dashboard`);
  197 |   await page.waitForLoadState("networkidle");
  198 |   await page.waitForTimeout(2000);
  199 | 
  200 |   const firstCard = page.locator("div[class*='border']").filter({ hasText: /junior|mid-level|senior|lead|manager/i }).first();
  201 |   if (await firstCard.isVisible({ timeout: 5000 })) {
```