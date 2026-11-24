import { expect, test, type Page } from '@playwright/test';
import { openApp, pixelAt, state, tapPixel } from './helpers';

const palette = (page: Page) => page.evaluate(() => (window as any).__pm.editor.state.sprite.palette as number[]);
const swatches = (page: Page) => page.locator('[data-testid^="swatch-"]');

async function pickHex(page: Page, hex: string) {
  await page.getByTestId('fg').click();
  await page.getByTestId('hex').fill(hex);
  await page.getByTestId('hex').press('Enter');
  await page.getByTestId('color-ok').click();
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('tapping a swatch selects it for drawing', async ({ page }) => {
  await page.getByTestId('swatch-8').click();
  const expected = (await palette(page))[8];
  expect(await state(page, 'fg')).toBe(expected);
  await expect(page.getByTestId('swatch-8')).toHaveAttribute('aria-pressed', 'true');
  await tapPixel(page, 5, 5);
  expect(await pixelAt(page, 5, 5)).toBe(expected);
});

test('a typed hex colour is used for drawing', async ({ page }) => {
  await pickHex(page, '#123456');
  await expect(page.getByTestId('color-picker')).toBeHidden();
  await tapPixel(page, 5, 5);
  expect(await pixelAt(page, 5, 5)).toBe(0x123456ff);
});

test('closing the picker without confirming keeps the old colour', async ({ page }) => {
  const before = await state(page, 'fg');
  await page.getByTestId('fg').click();
  await page.getByTestId('hex').fill('#abcdef');
  await page.getByTestId('hex').press('Enter');
  await page.getByTestId('sheet-close').click();
  expect(await state(page, 'fg')).toBe(before);
});

test('an invalid hex reverts to the current colour', async ({ page }) => {
  await page.getByTestId('fg').click();
  const before = await page.getByTestId('hex').inputValue();
  await page.getByTestId('hex').fill('nope');
  await page.getByTestId('hex').blur();
  await expect(page.getByTestId('hex')).toHaveValue(before);
});

test('touching the colour square picks from it', async ({ page }) => {
  await page.getByTestId('fg').click();
  await page.getByTestId('hex').fill('#804040');
  await page.getByTestId('hex').press('Enter');
  const box = (await page.getByTestId('sv').boundingBox())!;
  await page.mouse.click(box.x + box.width - 4, box.y + 4);
  // Top-right corner of the square is near full saturation and brightness: almost pure red at hue 0.
  await expect(page.getByTestId('hex')).toHaveValue(/^#f[0-9a-f]0[0-9a-f]0[0-9a-f]$/);
  // The whole picker fits in its sheet without scrolling.
  expect(await page.locator('.sheet-body').evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);
});

test('the alpha slider makes a see-through colour', async ({ page }) => {
  await page.getByTestId('fg').click();
  await page.getByTestId('hex').fill('#ff0000');
  await page.getByTestId('hex').press('Enter');
  const box = (await page.getByTestId('alpha').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const value = await page.getByTestId('hex').inputValue();
  expect(value).toMatch(/^#ff0000[0-9a-f]{2}$/);
  const a = parseInt(value.slice(7), 16);
  expect(a).toBeGreaterThan(110);
  expect(a).toBeLessThan(145);
});

test('choosing a bundled palette replaces the swatches', async ({ page }) => {
  await page.getByTestId('fg').click();
  await page.getByTestId('palette-select').selectOption('gameboy');
  await page.getByTestId('sheet-close').click();
  await expect(swatches(page)).toHaveCount(4);
});

test('adding the current colour to the palette is idempotent', async ({ page }) => {
  const n = await swatches(page).count();
  await pickHex(page, '#123456');
  await page.getByTestId('palette-add').click();
  await expect(swatches(page)).toHaveCount(n + 1);
  await page.getByTestId('palette-add').click();
  await expect(swatches(page)).toHaveCount(n + 1);
});

test('tapping the background chip swaps the two colours', async ({ page }) => {
  const fg = await state(page, 'fg');
  const bg = await state(page, 'bg');
  await page.getByTestId('bg').click();
  expect(await state(page, 'fg')).toBe(bg);
  expect(await state(page, 'bg')).toBe(fg);
});

test('the eyedropper picks a drawn colour', async ({ page }) => {
  await page.getByTestId('swatch-8').click();
  const drawn = await state(page, 'fg');
  await tapPixel(page, 5, 5);
  await page.getByTestId('swatch-12').click();
  await page.getByTestId('tool-eyedropper').click();
  await tapPixel(page, 5, 5);
  expect(await state(page, 'fg')).toBe(drawn);
});

test('holding a swatch offers edit and remove', async ({ page }) => {
  const n = await swatches(page).count();
  const second = (await palette(page))[1];
  const box = (await page.getByTestId('swatch-0').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await page.getByTestId('swatch-remove').click();
  await expect(swatches(page)).toHaveCount(n - 1);
  expect((await palette(page))[0]).toBe(second);
});

test('editing a swatch replaces that palette colour', async ({ page }) => {
  const box = (await page.getByTestId('swatch-2').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await page.getByTestId('swatch-edit').click();
  await page.getByTestId('hex').fill('#0a0b0c');
  await page.getByTestId('hex').press('Enter');
  await page.getByTestId('color-ok').click();
  expect((await palette(page))[2]).toBe(0x0a0b0cff);
});
