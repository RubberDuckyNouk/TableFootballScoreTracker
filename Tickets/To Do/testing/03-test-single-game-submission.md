# Ticket 03: Test single game submission

## Summary
Write an E2E test that fills in the single game form (winner and loser names) and submits it, verifying success.

## Why
This is the primary user flow — confirming it works end-to-end prevents regressions in form handling, API calls, and database inserts.

## Steps

### 1. Create `tests/single-game.spec.js`

```js
const { test, expect } = require('@playwright/test');

test('submit a single game result', async ({ page }) => {
  await page.goto('/');

  // Select single game mode (adjust selector as needed)
  await page.getByText(/single/i).click();

  // Fill in winner and loser
  await page.getByPlaceholder(/winner/i).fill('TestPlayerA');
  await page.getByPlaceholder(/loser/i).fill('TestPlayerB');

  // Submit
  await page.getByRole('button', { name: /save|submit/i }).click();

  // Verify success feedback (adjust based on actual UI response)
  await expect(page.getByText(/saved|success|recorded/i)).toBeVisible();
});
```

### 2. Run the test
```bash
npx playwright test tests/single-game.spec.js
```

### 3. Adjust locators and assertions
Use codegen to determine the correct selectors for your inputs, buttons, and success messages.

## Notes
- This test writes to the local database — consider using test-specific player names (prefixed with "Test") so they're easy to identify/clean up
- A future ticket could add database cleanup in a global teardown
