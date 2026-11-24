import { expect, test } from '@playwright/test';
import { drawLine, openApp, paintedCount, pinch, pixelAt, spritePoint, state, tapPixel, twoFingerTap } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('pencil draws a line where the finger drags', async ({ page }) => {
  const fg = await state<number>(page, 'fg');
  await drawLine(page, [2, 2], [6, 2]);
  for (let x = 2; x <= 6; x++) expect(await pixelAt(page, x, 2)).toBe(fg);
  expect(await pixelAt(page, 7, 2)).toBe(0);
  expect(await paintedCount(page)).toBe(5);
});

test('undo and redo buttons', async ({ page }) => {
  await expect(page.getByTestId('undo')).toBeDisabled();
  await expect(page.getByTestId('redo')).toBeDisabled();
  await drawLine(page, [2, 2], [6, 2]);
  await page.getByTestId('undo').click();
  expect(await paintedCount(page)).toBe(0);
  await page.getByTestId('redo').click();
  expect(await paintedCount(page)).toBe(5);
});

test('eraser clears pixels', async ({ page }) => {
  await drawLine(page, [2, 2], [6, 2]);
  await page.getByTestId('tool-eraser').click();
  await expect(page.getByTestId('tool-eraser')).toHaveAttribute('aria-pressed', 'true');
  await drawLine(page, [2, 2], [6, 2]);
  expect(await paintedCount(page)).toBe(0);
});

test('fill covers the blank sprite', async ({ page }) => {
  const fg = await state<number>(page, 'fg');
  await page.getByTestId('tool-fill').click();
  await tapPixel(page, 10, 10);
  expect(await pixelAt(page, 0, 0)).toBe(fg);
  expect(await pixelAt(page, 31, 31)).toBe(fg);
});

test('two-finger tap undoes', async ({ page }) => {
  await drawLine(page, [2, 2], [6, 2]);
  await twoFingerTap(page, await spritePoint(page, 10, 10), await spritePoint(page, 20, 10));
  expect(await paintedCount(page)).toBe(0);
});

test('pinch zooms without drawing and settles on a whole zoom', async ({ page }) => {
  const before = (await state(page, 'viewport')).zoom;
  await pinch(page, await spritePoint(page, 16, 16), 80, 197);
  const after = (await state(page, 'viewport')).zoom;
  expect(after).toBeGreaterThan(before);
  expect(Number.isInteger(after)).toBe(true);
  expect(await paintedCount(page)).toBe(0);
  await expect(page.getByTestId('undo')).toBeDisabled();
});

test('fit button restores the fitted view after zooming', async ({ page }) => {
  const before = await state(page, 'viewport');
  await pinch(page, await spritePoint(page, 16, 16), 80, 200);
  await page.getByTestId('fit').click();
  expect(await state(page, 'viewport')).toEqual(before);
});

test('tapping the active tool opens options; brush size changes the mark', async ({ page }) => {
  await page.getByTestId('tool-pencil').click();
  await expect(page.getByTestId('tool-options')).toBeVisible();
  await page.getByTestId('brush-inc').click();
  await page.getByTestId('brush-inc').click();
  await expect(page.getByTestId('brush-size')).toHaveText('3');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tool-options')).toBeHidden();
  await tapPixel(page, 10, 10);
  const fg = await state<number>(page, 'fg');
  expect(await pixelAt(page, 9, 9)).toBe(fg);
  expect(await pixelAt(page, 11, 11)).toBe(fg);
  expect(await paintedCount(page)).toBe(9);
});

test('controls are big enough to hit and the page does not scroll sideways', async ({ page }) => {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({ id: b.dataset.testid, r: b.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ id }) => id),
  );
  expect(small).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the canvas takes most of the screen', async ({ page }) => {
  const box = (await page.getByTestId('canvas').boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(box.height / vh).toBeGreaterThan(0.55);
});
