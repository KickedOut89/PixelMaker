import type { Page } from '@playwright/test';

export interface Pt { x: number; y: number }

/** Opens the app and waits until the canvas has been fitted to the screen. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('./');
  await page.getByTestId('canvas').waitFor();
  await page.waitForFunction(() => (window as any).__pm?.editor.state.viewport.zoom > 1);
}

/** Screen position of the centre of sprite pixel (x, y). */
export function spritePoint(page: Page, x: number, y: number): Promise<Pt> {
  return page.evaluate(([px, py]) => {
    const v = (window as any).__pm.editor.state.viewport;
    const r = document.querySelector('[data-testid="canvas"]')!.getBoundingClientRect();
    return { x: r.left + v.panX + (px + 0.5) * v.zoom, y: r.top + v.panY + (py + 0.5) * v.zoom };
  }, [x, y]);
}

/** Visible colour of sprite pixel (x, y) as 0xRRGGBBAA. */
export function pixelAt(page: Page, x: number, y: number): Promise<number> {
  return page.evaluate(([px, py]) => (window as any).__pm.pixel(px, py), [x, y]);
}

export function state<T = any>(page: Page, key: string): Promise<T> {
  return page.evaluate((k) => (window as any).__pm.editor.state[k], key);
}

type PType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel';

/** Dispatches a raw touch pointer event on the canvas. */
export function pointer(page: Page, type: PType, id: number, p: Pt): Promise<void> {
  return page.evaluate(([t, i, x, y]) => {
    const el = document.querySelector('[data-testid="canvas"]')!;
    el.dispatchEvent(new PointerEvent(t as string, {
      pointerId: i as number, pointerType: 'touch', isPrimary: i === 1,
      clientX: x as number, clientY: y as number, bubbles: true, cancelable: true,
      buttons: t === 'pointerup' || t === 'pointercancel' ? 0 : 1,
    }));
  }, [type, id, p.x, p.y] as const);
}

export async function drag(page: Page, from: Pt, to: Pt, steps = 5): Promise<void> {
  await pointer(page, 'pointerdown', 1, from);
  for (let i = 1; i <= steps; i++) {
    await pointer(page, 'pointermove', 1, { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
  }
  await pointer(page, 'pointerup', 1, to);
}

export async function tap(page: Page, p: Pt): Promise<void> {
  await pointer(page, 'pointerdown', 1, p);
  await pointer(page, 'pointerup', 1, p);
}

/** Draws from sprite pixel a to sprite pixel b with one finger. */
export async function drawLine(page: Page, a: [number, number], b: [number, number]): Promise<void> {
  await drag(page, await spritePoint(page, a[0], a[1]), await spritePoint(page, b[0], b[1]));
}

export async function tapPixel(page: Page, x: number, y: number): Promise<void> {
  await tap(page, await spritePoint(page, x, y));
}

export async function twoFingerTap(page: Page, a: Pt, b: Pt): Promise<void> {
  await pointer(page, 'pointerdown', 1, a);
  await pointer(page, 'pointerdown', 2, b);
  await pointer(page, 'pointerup', 1, a);
  await pointer(page, 'pointerup', 2, b);
}

/** Two fingers centred on c, moving from startDist apart to endDist apart. */
export async function pinch(page: Page, c: Pt, startDist: number, endDist: number, steps = 6): Promise<void> {
  const at = (d: number, side: -1 | 1): Pt => ({ x: c.x + (side * d) / 2, y: c.y });
  await pointer(page, 'pointerdown', 1, at(startDist, -1));
  await pointer(page, 'pointerdown', 2, at(startDist, 1));
  for (let i = 1; i <= steps; i++) {
    const d = startDist + ((endDist - startDist) * i) / steps;
    await pointer(page, 'pointermove', 1, at(d, -1));
    await pointer(page, 'pointermove', 2, at(d, 1));
  }
  await pointer(page, 'pointerup', 1, at(endDist, -1));
  await pointer(page, 'pointerup', 2, at(endDist, 1));
}

/** How many sprite pixels are not fully transparent. */
export function paintedCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const pm = (window as any).__pm;
    const { width, height } = pm.editor.state.sprite;
    let n = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pm.pixel(x, y) & 255) n++;
    return n;
  });
}
