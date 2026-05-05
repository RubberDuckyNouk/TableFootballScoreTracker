# Ticket 04: Test team game submission

## Summary
Write an E2E test that fills in the team game form (winner attack/defense, loser attack/defense) and submits it.

## Why
Team games have more input fields and a different API endpoint — testing them separately ensures both paths work.

## Steps

### 1. Create `tests/team-game.spec.js`

```js
const { test, expect } = require('@playwright/test');

test('submit a team game result', async ({ page }) => {
  await page.goto('/');

  // Select team game mode (adjust selector as needed)
  await page.getByText(/team/i).click();

  // Fill in all four players
  await page.getByPlaceholder(/winner.*attack/i).fill('TestAttacker1');
  await page.getByPlaceholder(/winner.*defen/i).fill('TestDefender1');
  await page.getByPlaceholder(/loser.*attack/i).fill('TestAttacker2');
  await page.getByPlaceholder(/loser.*defen/i).fill('TestDefender2');

  // Submit
  await page.getByRole('button', { name: /save|submit/i }).click();

  // Verify success feedback
  await expect(page.getByText(/saved|success|recorded/i)).toBeVisible();
});
```

### 2. Run the test
```bash
npx playwright test tests/team-game.spec.js
```

## Notes
- Same considerations as ticket 03 regarding test data cleanup
- Locators are placeholder guesses — use codegen to get the real selectors
