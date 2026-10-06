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

test('mobile navigation and numeric timer inputs remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: path === '/api/decisionCheck' ? { skip: false } : {} });
  });
  await page.goto('/bewaesserung');

  const menuButton = page.getByRole('button', { name: 'Menü öffnen' });
  await menuButton.focus();
  await page.keyboard.press('Enter');
  const timerItem = page.getByRole('menuitem', { name: 'Timer', exact: true });
  await timerItem.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/countdown$/);
  await expect(page.getByRole('menu')).toBeHidden();
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Bewässerungs-Timer' })).toBeVisible();

  const hours = main.getByRole('textbox', { name: 'Stunde', exact: true });
  const minutes = main.getByRole('textbox', { name: 'Minute', exact: true });
  for (const input of [hours, minutes]) {
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await expect(input).toHaveAttribute('pattern', '[0-9]*');
  }
  await hours.fill('2');
  await minutes.focus();
  await expect(hours).toHaveValue('02');
  await minutes.fill('7');
  await hours.focus();
  await expect(minutes).toHaveValue('07');
});
