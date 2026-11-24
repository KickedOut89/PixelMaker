import { describe, expect, test } from 'vitest';
import { createSurface } from '../../src/core/sprite';
import { copyRect, floodFill, getPixel, linePoints, pasteRect, setPixel, stamp, unionRect } from '../../src/core/pixels';

const RED = 0xff0000ff;
const BLUE = 0x0000ffff;
const count = (s: { data: Uint8ClampedArray }) => {
  let n = 0;
  for (let i = 3; i < s.data.length; i += 4) if (s.data[i]) n++;
  return n;
};

describe('get/set', () => {
  test('round-trips a colour', () => {
    const s = createSurface(16, 16);
    setPixel(s, 3, 4, 0x11223344);
    expect(getPixel(s, 3, 4)).toBe(0x11223344);
  });
  test('ignores out-of-bounds writes and reads transparent', () => {
    const s = createSurface(16, 16);
    setPixel(s, -1, 0, RED);
    setPixel(s, 16, 0, RED);
    expect(s.data.every((v) => v === 0)).toBe(true);
    expect(getPixel(s, 99, 99)).toBe(0);
  });
});

describe('linePoints', () => {
  test('horizontal, diagonal and single point', () => {
    expect(linePoints(0, 0, 3, 0)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0]]);
    expect(linePoints(0, 0, 2, 2)).toEqual([[0, 0], [1, 1], [2, 2]]);
    expect(linePoints(2, 2, 2, 2)).toEqual([[2, 2]]);
  });
});

describe('stamp', () => {
  test('clips to the surface and reports the dirty rect', () => {
    const s = createSurface(16, 16);
    expect(stamp(s, 0, 0, 3, 'square', RED)).toEqual({ x: 0, y: 0, w: 2, h: 2 });
    expect(count(s)).toBe(4);
  });
  test('returns null when entirely outside', () => {
    expect(stamp(createSurface(16, 16), 50, 50, 1, 'square', RED)).toBeNull();
  });
  test('round brush leaves the block corners unset', () => {
    const s = createSurface(16, 16);
    stamp(s, 8, 8, 5, 'round', RED);
    for (const [x, y] of [[6, 6], [10, 6], [6, 10], [10, 10]]) expect(getPixel(s, x, y)).toBe(0);
    expect(getPixel(s, 8, 8)).toBe(RED);
    expect(getPixel(s, 6, 8)).toBe(RED);
  });
});

describe('floodFill', () => {
  const outlined = () => {
    const s = createSurface(8, 8);
    for (let i = 2; i <= 5; i++) {
      setPixel(s, i, 2, RED); setPixel(s, i, 5, RED); setPixel(s, 2, i, RED); setPixel(s, 5, i, RED);
    }
    return s;
  };
  test('contiguous fill stays inside a closed outline', () => {
    const s = outlined();
    floodFill(s, 3, 3, BLUE, true);
    expect(getPixel(s, 3, 3)).toBe(BLUE);
    expect(getPixel(s, 4, 4)).toBe(BLUE);
    expect(getPixel(s, 0, 0)).toBe(0);
    expect(getPixel(s, 2, 2)).toBe(RED);
  });
  test('global fill replaces every matching pixel', () => {
    const s = outlined();
    floodFill(s, 3, 3, BLUE, false);
    expect(getPixel(s, 0, 0)).toBe(BLUE);
    expect(getPixel(s, 4, 4)).toBe(BLUE);
    expect(getPixel(s, 2, 2)).toBe(RED);
  });
  test('filling with the colour already there is a no-op', () => {
    const s = createSurface(4, 4);
    floodFill(s, 0, 0, RED, true);
    expect(floodFill(s, 0, 0, RED, true)).toBeNull();
  });
  test('out-of-bounds start is a no-op', () => {
    expect(floodFill(createSurface(4, 4), -1, 0, RED, true)).toBeNull();
  });
  test('fills a blank 512x512 quickly', () => {
    const s = createSurface(512, 512);
    const t = performance.now();
    expect(floodFill(s, 100, 100, RED, true)).toEqual({ x: 0, y: 0, w: 512, h: 512 });
    expect(performance.now() - t).toBeLessThan(500);
    expect(getPixel(s, 511, 511)).toBe(RED);
  });
});

test('copyRect then pasteRect restores a region', () => {
  const s = createSurface(8, 8);
  const r = { x: 1, y: 1, w: 3, h: 2 };
  stamp(s, 2, 2, 3, 'square', RED);
  const saved = copyRect(s, r);
  const before = s.data.slice();
  s.data.fill(0);
  pasteRect(s, r, saved);
  for (let y = 1; y < 3; y++) for (let x = 1; x < 4; x++) {
    const i = (y * 8 + x) * 4;
    expect(Array.from(s.data.slice(i, i + 4))).toEqual(Array.from(before.slice(i, i + 4)));
  }
});

test('unionRect', () => {
  expect(unionRect(null, null)).toBeNull();
  expect(unionRect({ x: 1, y: 1, w: 1, h: 1 }, null)).toEqual({ x: 1, y: 1, w: 1, h: 1 });
  expect(unionRect({ x: 1, y: 1, w: 1, h: 1 }, { x: 3, y: 0, w: 2, h: 2 })).toEqual({ x: 1, y: 0, w: 4, h: 2 });
});
