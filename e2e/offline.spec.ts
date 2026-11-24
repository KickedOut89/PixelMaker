import { expect, test } from '@playwright/test';
import { drawLine, openApp, paintedCount } from './helpers';

test('the app opens and draws with no network once it has been visited', async ({ page, context }) => {
  await openApp(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Give the worker a moment to finish caching the app files.
  await page.waitForFunction(async () => (await caches.keys()).length > 0);
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await openApp(page);
  await drawLine(page, [2, 2], [6, 2]);
  expect(await paintedCount(page)).toBe(5);
});

test('the manifest makes it installable as a standalone app', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(new URL(href!, page.url()).toString());
  const manifest = await res.json();
  expect(manifest.name).toBe('PixelMaker');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/PixelMaker/');
  expect(manifest.scope).toBe('/PixelMaker/');
  expect(manifest.icons).toHaveLength(3);
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const r = await request.get(new URL(icon.src, new URL(href!, page.url())).toString());
    expect(r.ok(), icon.src).toBe(true);
    expect(r.headers()['content-type']).toContain('image/png');
  }
});
