const { test, expect } = require('@playwright/test');

test('etusivu aukeaa ja päätoiminnot näkyvät', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: /Trading 212 Veroilmoitus/i })).toBeVisible();
  await expect(page.locator('#calculateButton')).toBeVisible();
  await expect(page.locator('#loadDemoButton')).toBeVisible();
});

test('ilman tiedostoa näytetään virhe eikä overlayia', async ({ page }) => {
  await page.goto('/');

  await page.locator('#calculateButton').click();
  await expect(page.locator('#exportReminderOverlay')).not.toHaveClass(/show/);
  await expect(page.locator('#errorMessage')).toContainText('Valitse CSV-tiedosto');
});

test('overlay näkyy ensimmäisellä laskennalla tiedoston kanssa ja laskenta jatkuu', async ({ page }) => {
  await page.goto('/');

  await page.locator('#loadDemoButton').click();
  await expect(page.locator('#exportReminderOverlay')).toHaveClass(/show/);

  await page.locator('#exportReminderContinueBtn').click();
  await expect(page.locator('#exportReminderOverlay')).not.toHaveClass(/show/);
  await expect(page.locator('#results')).toHaveClass(/show/);
});

test('demoaineisto lataa tulokset ja aktivoi exportteja', async ({ page }) => {
  await page.goto('/');

  await page.locator('#loadDemoButton').click();
  await expect(page.locator('#exportReminderOverlay')).toHaveClass(/show/);
  await page.locator('#exportReminderContinueBtn').click();
  await expect(page.locator('#results')).toHaveClass(/show/);

  await expect(page.locator('#exportPdfButton')).toBeEnabled();
  await expect(page.locator('#exportTaxSummaryPdfButton')).toBeEnabled();
  await expect(page.locator('#exportZipButton')).toBeEnabled();
  await expect(page.locator('#exportSalesCsvButton')).toBeEnabled();
});

test('demo laskenta tuottaa oikeat summat', async ({ page }) => {
  await page.goto('/');
  await page.locator('#loadDemoButton').click();
  await page.locator('#exportReminderContinueBtn').click();
  await expect(page.locator('#results')).toHaveClass(/show/);

  await expect(page.locator('#totalGains')).toHaveText('629,59 €');
  await expect(page.locator('#totalLosses')).toHaveText('−205,99 €');
  await expect(page.locator('#netGains')).toHaveText('423,61 €');
  await expect(page.locator('#dividendGross')).toHaveText('4,74 €');
  await expect(page.locator('#interestIncome')).toHaveText('1,35 €');
  await expect(page.locator('#netCapitalIncome')).toHaveText('428,99 €');
  await expect(page.locator('#estimatedTax')).toHaveText('128,70 €');

  // Sales table should have 13 rows (one per sale in tax year 2025)
  await expect(page.locator('#salesTable tbody tr')).toHaveCount(13);
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
