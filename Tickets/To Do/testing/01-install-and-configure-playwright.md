# Ticket 01: Install and configure Playwright

## Summary
Set up Playwright in the project with a configuration suited for testing the app locally against a running dev server.

## Why
Playwright provides end-to-end browser testing to catch regressions in the UI and API interactions before they reach production.

## Steps

### 1. Initialize Playwright
```bash
npm init playwright@latest
```
When prompted:
- TypeScript or JavaScript: **JavaScript** (matches the project)
- Test folder: **tests/** (default)
- GitHub Actions workflow: **Yes**
- Install browsers: **Yes**

### 2. Update `playwright.config.js`

Set the base URL and webServer option so Playwright auto-starts your dev server:

```js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. Add test scripts to `package.json`
```json
"scripts": {
  "test": "npx playwright test",
  "test:ui": "npx playwright test --ui",
  "test:codegen": "npx playwright codegen localhost:3000"
}
```

### 4. Add to `.gitignore`
```
test-results/
playwright-report/
```

### 5. Verify
```bash
npx playwright test
```
The example test that ships with the scaffold should pass (or you can delete it once ticket 02 is done).

## Notes
- The `webServer` config means you don't need to manually start the server before running tests
- `reuseExistingServer` avoids port conflicts if you already have `npm run dev` running locally
- CI will need a PostgreSQL service — that's covered in ticket 05
