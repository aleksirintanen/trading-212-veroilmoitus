const { test, expect } = require('@playwright/test');

test('etusivu aukeaa ja päätoiminnot näkyvät', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /Trading 212 Veroilmoitus/i })).toBeVisible();
  await expect(page.locator('#calculateButton')).toBeVisible();
  await expect(page.locator('#loadDemoButton')).toBeVisible();
});

test('overlay näkyy ensimmäisellä laskennalla ja laskenta jatkuu sen jälkeen', async ({ page }) => {
  await page.goto('/');

  await page.locator('#calculateButton').click();
  await expect(page.locator('#exportReminderOverlay')).toHaveClass(/show/);

  await page.locator('#exportReminderContinueBtn').click();
  await expect(page.locator('#exportReminderOverlay')).not.toHaveClass(/show/);
  await expect(page.locator('#errorMessage')).toContainText('Valitse CSV-tiedosto');
});

test('demoaineisto lataa tulokset ja aktivoi exportteja', async ({ page }) => {
  await page.goto('/');

  await page.locator('#loadDemoButton').click();
  await expect(page.locator('#exportReminderOverlay')).toHaveClass(/show/);
  await page.locator('#exportReminderContinueBtn').click();
  await expect(page.locator('#results')).toHaveClass(/show/);

  await expect(page.locator('#exportPdfButton')).toBeEnabled();
  await expect(page.locator('#exportTaxSummaryPdfButton')).toBeEnabled();
  await expect(page.locator('#exportSalesCsvButton')).toBeEnabled();
});

test('osiot avautuvat näytä/piilota napeista', async ({ page }) => {
  await page.goto('/');
  await page.locator('#loadDemoButton').click();
  await expect(page.locator('#exportReminderOverlay')).toHaveClass(/show/);
  await page.locator('#exportReminderContinueBtn').click();
  await expect(page.locator('#results')).toHaveClass(/show/);

  await page.locator('#toggleSalesButton').click();
  await expect(page.locator('#salesSection')).toHaveClass(/show/);

  await page.locator('#toggleDividendsButton').click();
  await expect(page.locator('#dividendsSection')).toHaveClass(/show/);

  await page.locator('#toggleInterestsButton').click();
  await expect(page.locator('#interestsSection')).toHaveClass(/show/);
});
