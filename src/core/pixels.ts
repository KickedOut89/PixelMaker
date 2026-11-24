import type { Color } from './color';
import type { Surface } from './sprite';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getPixel(s: Surface, x: number, y: number): Color {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return 0;
  const i = (y * s.width + x) * 4;
  const d = s.data;
  return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
}

export function setPixel(s: Surface, x: number, y: number, c: Color): void {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return;
  const i = (y * s.width + x) * 4;
  const d = s.data;
  d[i] = c >>> 24;
  d[i + 1] = (c >>> 16) & 255;
  d[i + 2] = (c >>> 8) & 255;
  d[i + 3] = c & 255;
}

/**
 * Paints a brush of `size` pixels whose block's top-left corner is
 * (x - floor(size/2), y - floor(size/2)). Returns the changed area, clipped.
 */
export function stamp(
  s: Surface,
  x: number,
  y: number,
  size: number,
  shape: 'square' | 'round',
  c: Color,
): Rect | null {
  const half = Math.floor(size / 2);
  const left = x - half;
  const top = y - half;
  const x0 = Math.max(0, left);
  const y0 = Math.max(0, top);
  const x1 = Math.min(s.width, left + size);
  const y1 = Math.min(s.height, top + size);
  if (x0 >= x1 || y0 >= y1) return null;
  const r = size / 2;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (shape === 'round') {
        const dx = px - left + 0.5 - r;
        const dy = py - top + 0.5 - r;
        if (dx * dx + dy * dy > r * r) continue;
      }
      setPixel(s, px, py, c);
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Bresenham line, both ends included. */
export function linePoints(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pts: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return pts;
}

/** Returns the changed area, or null if nothing changed. */
export function floodFill(s: Surface, x: number, y: number, c: Color, contiguous: boolean): Rect | null {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return null;
  const target = getPixel(s, x, y);
  if (target === c >>> 0) return null;
  const { width: w, height: h } = s;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  const mark = (px: number, py: number) => {
    setPixel(s, px, py, c);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  };
  if (!contiguous) {
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (getPixel(s, px, py) === target) mark(px, py);
  } else {
    // Scanline fill with an explicit stack of span seeds.
    const stack: number[] = [x, y];
    while (stack.length) {
      const sy = stack.pop()!;
      let sx = stack.pop()!;
      if (getPixel(s, sx, sy) !== target) continue;
      while (sx > 0 && getPixel(s, sx - 1, sy) === target) sx--;
      let above = false;
      let below = false;
      for (let px = sx; px < w && getPixel(s, px, sy) === target; px++) {
        mark(px, sy);
        if (sy > 0) {
          const m = getPixel(s, px, sy - 1) === target;
          if (m && !above) stack.push(px, sy - 1);
          above = m;
        }
        if (sy < h - 1) {
          const m = getPixel(s, px, sy + 1) === target;
          if (m && !below) stack.push(px, sy + 1);
          below = m;
        }
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

export function copyRect(s: Surface, r: Rect): Uint8ClampedArray {
  const out = new Uint8ClampedArray(r.w * r.h * 4);
  for (let row = 0; row < r.h; row++) {
    const start = ((r.y + row) * s.width + r.x) * 4;
    out.set(s.data.subarray(start, start + r.w * 4), row * r.w * 4);
  }
  return out;
}

export function pasteRect(s: Surface, r: Rect, data: Uint8ClampedArray): void {
  for (let row = 0; row < r.h; row++) {
    s.data.set(data.subarray(row * r.w * 4, (row + 1) * r.w * 4), ((r.y + row) * s.width + r.x) * 4);
  }
}
