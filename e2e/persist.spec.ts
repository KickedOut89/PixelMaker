import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { drawLine, openApp, paintedCount, state } from './helpers';

test('drawing survives a reload', async ({ page }) => {
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  await page.waitForTimeout(800);
  await page.reload();
  await openApp(page);
  expect(await paintedCount(page)).toBe(5);
  await expect(page.getByTestId('storage-warning')).toHaveCount(0);
});

test('work is saved at once when the app goes to the background', async ({ page }) => {
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(150);
  await page.reload();
  await openApp(page);
  expect(await paintedCount(page)).toBe(5);
});

test('a new sprite from a preset replaces the canvas and is remembered', async ({ page }) => {
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-new').click();
  await page.getByTestId('new-name').fill('coin');
  await page.getByTestId('preset-16').click();
  await page.getByTestId('new-create').click();
  await expect(page.getByTestId('new-sheet')).toBeHidden();
  expect((await state(page, 'sprite')).width).toBe(16);
  expect(await paintedCount(page)).toBe(0);
  await expect(page.getByTestId('undo')).toBeDisabled();
  await expect(page.getByTestId('sprite-name')).toContainText('coin');
  await page.waitForTimeout(800);
  await page.reload();
  await openApp(page);
  const sprite = await state(page, 'sprite');
  expect([sprite.name, sprite.width, sprite.height]).toEqual(['coin', 16, 16]);
});

test('new sprite sizes are clamped to 1..512', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-new').click();
  await page.getByTestId('new-w').fill('9999');
  await page.getByTestId('new-w').blur();
  await expect(page.getByTestId('new-w')).toHaveValue('512');
  await page.getByTestId('new-h').fill('0');
  await page.getByTestId('new-h').blur();
  await expect(page.getByTestId('new-h')).toHaveValue('1');
  await page.getByTestId('new-create').click();
  await expect(page.getByTestId('new-sheet')).toBeHidden();
  const sprite = await state(page, 'sprite');
  expect([sprite.width, sprite.height]).toEqual([512, 1]);
});

test('rename changes the title', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-rename').fill('hero_run');
  await page.getByTestId('menu-rename').press('Enter');
  await expect(page.getByTestId('sprite-name')).toContainText('hero_run');
});

test('export downloads a scaled PNG', async ({ page }) => {
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-export').click();
  await page.getByTestId('scale-4').click();
  await expect(page.getByTestId('export-size')).toHaveText('128 × 128 px');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-download').click()]);
  expect(download.suggestedFilename()).toBe('sprite@4x.png');
  const png = readFileSync(await download.path());
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([128, 128]);
});

test('export at 1x has a plain filename', async ({ page }) => {
  await openApp(page);
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-export').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-download').click()]);
  expect(download.suggestedFilename()).toBe('sprite.png');
});

test('the app still works and says so when storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: { open() { throw new Error('storage is disabled'); } },
    });
  });
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  expect(await paintedCount(page)).toBe(5);
  await expect(page.getByTestId('storage-warning')).toBeVisible();
  const canvas = (await page.getByTestId('canvas').boundingBox())!;
  expect(canvas.height / page.viewportSize()!.height).toBeGreaterThan(0.5);
});

test('new sprite does not silently throw away a drawing that could not be saved', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: { open() { throw new Error('storage is disabled'); } },
    });
  });
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-new').click();
  await page.getByTestId('preset-16').click();
  await page.getByTestId('new-create').click();
  await expect(page.getByTestId('new-unsaved')).toBeVisible();
  expect((await state(page, 'sprite')).width).toBe(32);
  expect(await paintedCount(page)).toBe(5);
  await page.getByTestId('new-discard').click();
  await expect(page.getByTestId('new-sheet')).toBeHidden();
  expect((await state(page, 'sprite')).width).toBe(16);
});
