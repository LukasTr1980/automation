import { test, expect } from '@playwright/test';

// Basic smoke test for the client UI.
// Note: If your Playwright config doesn't set a baseURL/webServer,
// ensure the app is running at http://localhost:4173 (e.g., `npm run preview`).

test('home renders header and nav', async ({ page }) => {
  await page.goto('/');

  // Header title on the homepage
  await expect(
    page.getByRole('heading', { name: 'Villa Anna Bewässerungssystem' })
  ).toBeVisible();

  // Top navigation links (German labels)
  await expect(page.getByRole('link', { name: 'Start' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Bewässerung' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Timer' })).toBeVisible();
});

test('navigate to Bewässerung page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Bewässerung' }).click();
  await expect(page.getByRole('heading', { name: 'Bewässerung' })).toBeVisible();
});
