import { expect, test } from '@playwright/test';

test('app loads and does not scroll sideways', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('app')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(overflow).toBe(true);
});
