# Ticket 02: Test that the homepage loads

## Summary
Write a basic smoke test that verifies the main page loads and displays the expected UI elements.

## Why
A smoke test catches deployment or build issues immediately. It's also a good first test to confirm Playwright is working correctly with the project.

## Steps

### 1. Create `tests/homepage.spec.js`

```js
const { test, expect } = require('@playwright/test');

test('homepage loads and shows game mode buttons', async ({ page }) => {
  await page.goto('/');

  // Check page title or heading is visible
  await expect(page.locator('h1, h2, .title')).toBeVisible();

  // Check that the single and team game options are present
  await expect(page.getByText(/single/i)).toBeVisible();
  await expect(page.getByText(/team/i)).toBeVisible();
});
```

### 2. Run the test
```bash
npx playwright test tests/homepage.spec.js
```

### 3. Adjust locators
The exact locators above may need tweaking based on the actual DOM. Use codegen to find the right selectors:
```bash
npx playwright codegen localhost:3000
```

## Notes
- This test doesn't need any database data — it just checks the page renders
- Adjust selectors to match the actual text/elements in `public/index.html`
