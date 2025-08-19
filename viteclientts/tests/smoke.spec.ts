import { test, expect } from '@playwright/test';

// Basic smoke test for the client UI.
// Note: If your Playwright config doesn't set a baseURL/webServer,
// ensure the app is running at http://localhost:4173 (e.g., `npm run preview`).

test('home renders header and nav', async ({ page }) => {
  await page.goto('/');

  // Header title on the homepage (scope to main to avoid ambiguity)
  const main = page.getByRole('main');
  await expect(
    main.getByRole('heading', { name: 'Villa Anna Bewässerungssystem' })
  ).toBeVisible();

  // Top navigation links (German labels) scoped to navigation landmark
  const nav = page.getByRole('navigation', { name: 'Navigation' });
  await expect(nav.getByRole('link', { name: 'Start' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Bewässerung' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Timer' })).toBeVisible();
});

test('navigate to Bewässerung page', async ({ page }) => {
  await page.goto('/');
  // Click nav link specifically (avoid card link on the home grid)
  await page
    .getByRole('navigation', { name: 'Navigation' })
    .getByRole('link', { name: 'Bewässerung' })
    .click();

  // Confirm navigation and verify page heading within main
  await expect(page).toHaveURL(/\/bewaesserung$/);
  await expect(
    page.getByRole('main').getByRole('heading', { name: /^Bewässerung$/ })
  ).toBeVisible();
});
