import { expect, test, type Page } from '@playwright/test';
import { openApp, state } from './helpers';

/**
 * Types into a field and acts on it within the same browser task, before the
 * UI has had a chance to re-render. Fast typists, paste-then-Enter and slow
 * phones all produce this ordering.
 */
function typeThen(page: Page, testId: string, text: string, then: 'enter' | 'blur' | { click: string }) {
  return page.evaluate(([id, value, action]) => {
    const input = document.querySelector<HTMLInputElement>(`[data-testid="${id}"]`)!;
    input.focus();
    input.value = value as string;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (action === 'enter') input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    else if (action === 'blur') input.blur();
    else document.querySelector<HTMLElement>(`[data-testid="${(action as { click: string }).click}"]`)!.click();
  }, [testId, text, then] as const);
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('rename applies text typed just before Enter', async ({ page }) => {
  await page.getByTestId('menu').click();
  await typeThen(page, 'menu-rename', 'hero_run', 'enter');
  await expect(page.getByTestId('sprite-name')).toContainText('hero_run');
});

test('hex applies text typed just before Enter', async ({ page }) => {
  await page.getByTestId('fg').click();
  await typeThen(page, 'hex', '#123456', 'enter');
  await page.getByTestId('color-ok').click();
  expect(await state(page, 'fg')).toBe(0x123456ff);
});

test('hex typed just before confirming is used', async ({ page }) => {
  await page.getByTestId('fg').click();
  await typeThen(page, 'hex', '#654321', { click: 'color-ok' });
  expect(await state(page, 'fg')).toBe(0x654321ff);
});

test('invalid hex typed just before leaving the field reverts', async ({ page }) => {
  await page.getByTestId('fg').click();
  const before = await page.getByTestId('hex').inputValue();
  await typeThen(page, 'hex', 'nope', 'blur');
  await expect(page.getByTestId('hex')).toHaveValue(before);
});

test('new sprite uses a name and size typed just before Create', async ({ page }) => {
  await page.getByTestId('menu').click();
  await page.getByTestId('menu-new').click();
  await typeThen(page, 'new-w', '24', 'blur');
  await typeThen(page, 'new-h', '9999', 'blur');
  await typeThen(page, 'new-name', 'coin', { click: 'new-create' });
  await expect(page.getByTestId('sprite-name')).toContainText('coin');
  const sprite = await state(page, 'sprite');
  expect([sprite.width, sprite.height]).toEqual([24, 512]);
});
