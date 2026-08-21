const { test, expect } = require('@playwright/test');

test('homepage loads and shows game mode buttons', async ({ page }) => {
    await page.goto('/');

    // Check page title or heading is visible (only works if element only on page once)
    await expect(page.locator('h1')).toBeVisible();

    // Check that the single and team game options are present
    await expect(page.getByText(/single/i)).toBeVisible();
    await expect(page.getByText(/team/i)).toBeVisible();
});