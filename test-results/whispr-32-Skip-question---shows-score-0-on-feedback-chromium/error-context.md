# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: whispr.spec.ts >> 32. Skip question - shows score 0 on feedback
- Location: src\__tests__\e2e\whispr.spec.ts:81:5

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
        - generic [ref=e16]: 1:20
      - heading "You are building a React application that requires users to log in before accessing certain features. Walk me through a situation where you would implement authentication and authorization in your application, including any relevant security considerations" [level=1] [ref=e17]
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
  31  | // eslint-disable-next-line @typescript-eslint/no-unused-vars
  32  | async function createInterview(page: Page, questionCount = 3) {
  33  |   await page.goto(`${BASE_URL}/dashboard/new`);
  34  |   await page.waitForLoadState("networkidle");
  35  | 
  36  |   const roleInput = page.locator("input").first();
  37  |   await roleInput.fill("Software Engineer");
  38  | 
  39  |   const stackInput = page.locator("input").nth(1);
  40  |   await stackInput.fill("React");
  41  | 
  42  |   await page.locator("button").filter({ hasText: /^Junior$/i }).first().click();
  43  | 
  44  |   await page.locator("button").filter({ hasText: /^5$/ }).first().click();
  45  | 
  46  |   await page.locator("button").filter({ hasText: /generate interview/i }).first().click();
  47  | 
  48  |   await page.waitForURL(`${BASE_URL}/dashboard/interview/**`, { timeout: 60000 });
  49  |   await page.waitForLoadState("networkidle");
  50  | }
  51  | 
  52  | test("31. Full interview flow - create, answer all, reach feedback", async ({ page }) => {
  53  |   await signIn(page);
  54  |   await createInterview(page, 2);
  55  | 
  56  |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  57  |   if (await textModeBtn.isVisible({ timeout: 5000 })) {
  58  |     await textModeBtn.click();
  59  |   }
  60  | 
  61  |   for (let i = 0; i < 2; i++) {
  62  |     const textModeBtn2 = page.locator("button").filter({ hasText: /type instead/i }).first();
  63  |     if (await textModeBtn2.isVisible({ timeout: 5000 })) await textModeBtn2.click();
  64  | 
  65  |     const textarea = page.locator("textarea").first();
  66  |     if (await textarea.isVisible({ timeout: 10000 })) {
  67  |       await textarea.fill("This is my test answer for this question about the topic being asked.");
  68  |       const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
  69  |       await submitBtn.click();
  70  |     }
  71  | 
  72  |     await page.waitForTimeout(3000);
  73  |     const nextBtn = page.locator("button").filter({ hasText: /next|finish|continue|question/i }).first();
  74  |     const isVisible = await nextBtn.isVisible({ timeout: 45000 });
  75  |     if (isVisible) await nextBtn.click();
  76  |   }
  77  | 
  78  |   await expect(page).toHaveURL(/\/feedback/, { timeout: 30000 });
  79  | });
  80  | 
  81  | test("32. Skip question - shows score 0 on feedback", async ({ page }) => {
  82  |   await signIn(page);
  83  |   await createInterview(page, 2);
  84  | 
  85  |   const skipBtn = page.locator("button").filter({ hasText: /skip/i }).first();
  86  |   await skipBtn.waitFor({ state: "visible", timeout: 10000 });
  87  |   await skipBtn.click();
  88  | 
  89  |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  90  |   if (await textModeBtn.isVisible({ timeout: 5000 })) await textModeBtn.click();
  91  | 
  92  |   const textarea = page.locator("textarea").first();
  93  |   if (await textarea.isVisible({ timeout: 10000 })) {
  94  |     await textarea.fill("Test answer for the second question.");
  95  |     await page.locator("button").filter({ hasText: /submit/i }).first().click();
  96  |   }
  97  | 
  98  |   await page.waitForTimeout(3000);
  99  |   const nextAfterAnswer = page.locator("button").filter({ hasText: /next|finish|continue|question/i }).first();
  100 |   if (await nextAfterAnswer.isVisible({ timeout: 30000 })) await nextAfterAnswer.click();
  101 | 
> 102 |   await page.waitForURL(/\/feedback/, { timeout: 60000 });
      |              ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  103 | 
  104 |   await expect(page.locator("text=/skip/i").first()).toBeVisible({ timeout: 5000 });
  105 | });
  106 | 
  107 | test("33. Timer is visible during interview", async ({ page }) => {
  108 |   await signIn(page);
  109 |   await createInterview(page, 1);
  110 | 
  111 |   const timer = page.locator("text=/\\d+:\\d{2}/").first();
  112 |   await expect(timer).toBeVisible({ timeout: 10000 });
  113 | });
  114 | 
  115 | test("34. Text mode fallback - answer submitted correctly", async ({ page }) => {
  116 |   await signIn(page);
  117 |   await createInterview(page, 1);
  118 | 
  119 |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  120 |   await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  121 |   await textModeBtn.click();
  122 | 
  123 |   const textarea = page.locator("textarea").first();
  124 |   await expect(textarea).toBeVisible({ timeout: 5000 });
  125 | 
  126 |   await textarea.fill("This is my typed answer using text mode fallback for the question.");
  127 |   const submitBtn = page.locator("button").filter({ hasText: /submit/i }).first();
  128 |   await expect(submitBtn).toBeVisible();
  129 |   await submitBtn.click();
  130 | 
  131 |   const nextBtn = page.locator("button").filter({ hasText: /next question|finish/i }).first();
  132 |   await nextBtn.waitFor({ state: "visible", timeout: 30000 });
  133 |   expect(true).toBe(true);
  134 | });
  135 | 
  136 | test("35. Re-record button clears transcript and returns to intro", async ({ page }) => {
  137 |   await signIn(page);
  138 |   await createInterview(page, 1);
  139 | 
  140 |   const textModeBtn = page.locator("button").filter({ hasText: /type instead/i }).first();
  141 |   await textModeBtn.waitFor({ state: "visible", timeout: 10000 });
  142 |   await textModeBtn.click();
  143 | 
  144 |   const textarea = page.locator("textarea").first();
  145 |   await textarea.fill("Initial answer text.");
  146 | 
  147 |   const reRecordBtn = page.locator("button").filter({ hasText: /re-record|record again/i }).first();
  148 |   if (await reRecordBtn.isVisible({ timeout: 3000 })) {
  149 |     await reRecordBtn.click();
  150 |     await expect(textarea).toHaveValue("", { timeout: 3000 });
  151 |   }
  152 | });
  153 | 
  154 | test("36. Exit confirmation modal blocks navigation mid-interview", async ({ page }) => {
  155 |   await signIn(page);
  156 |   await createInterview(page, 2);
  157 | 
  158 |   const exitBtn = page.locator("button, a").filter({ hasText: /exit|leave|back/i }).first();
  159 |   await exitBtn.waitFor({ state: "visible", timeout: 10000 });
  160 |   await exitBtn.click();
  161 | 
  162 |   const modal = page.locator("text=Leave interview").first();
  163 |   await expect(modal).toBeVisible({ timeout: 5000 });
  164 | 
  165 |   const cancelBtn = page.locator("button").filter({ hasText: /cancel|stay/i }).first();
  166 |   await cancelBtn.click();
  167 |   await expect(modal).not.toBeVisible({ timeout: 3000 });
  168 | });
  169 | 
  170 | test("37. PDF export - Export Summary button triggers download", async ({ page }) => {
  171 |   await signIn(page);
  172 | 
  173 |   await page.goto(`${BASE_URL}/dashboard`);
  174 |   await page.waitForLoadState("networkidle");
  175 | 
  176 |   const feedbackLink = page.locator("a[href*='/feedback']").first();
  177 |   if (await feedbackLink.isVisible({ timeout: 5000 })) {
  178 |     // eslint-disable-next-line @typescript-eslint/no-unused-vars
  179 |     const [_download] = await Promise.all([
  180 |       page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
  181 |       feedbackLink.click(),
  182 |     ]);
  183 | 
  184 |     const exportBtn = page.locator("button").filter({ hasText: /export/i }).first();
  185 |     if (await exportBtn.isVisible({ timeout: 5000 })) {
  186 |       const [dl] = await Promise.all([
  187 |         page.waitForEvent("download", { timeout: 10000 }),
  188 |         exportBtn.click(),
  189 |       ]);
  190 |       expect(dl.suggestedFilename()).toMatch(/whispr-feedback.*\.pdf/);
  191 |     }
  192 |   }
  193 | });
  194 | 
  195 | test("38. Delete interview - card disappears after confirmation", async ({ page }) => {
  196 |   await signIn(page);
  197 |   await page.goto(`${BASE_URL}/dashboard`);
  198 |   await page.waitForLoadState("networkidle");
  199 |   await page.waitForTimeout(2000);
  200 | 
  201 |   const firstCard = page.locator("div[class*='border']").filter({ hasText: /junior|mid-level|senior|lead|manager/i }).first();
  202 |   if (await firstCard.isVisible({ timeout: 5000 })) {
```