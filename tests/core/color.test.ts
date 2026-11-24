import { describe, expect, test } from 'vitest';
import { hsvToRgb, parseHex, rgbToHsv, rgba, toHex, unpack } from '../../src/core/color';

describe('color', () => {
  test('rgba packs as 0xRRGGBBAA with opaque default', () => {
    expect(rgba(255, 0, 0)).toBe(0xff0000ff);
  });
  test('unpack splits channels', () => {
    expect(unpack(0x11223344)).toEqual([0x11, 0x22, 0x33, 0x44]);
  });
  test('parseHex accepts short, long and alpha forms', () => {
    expect(parseHex('#f00')).toBe(0xff0000ff);
    expect(parseHex('FF0000')).toBe(0xff0000ff);
    expect(parseHex('#ff0000ff')).toBe(0xff0000ff);
    expect(parseHex('#ff000080')).toBe(0xff000080);
  });
  test('parseHex rejects malformed input', () => {
    expect(parseHex('zzz')).toBeNull();
    expect(parseHex('')).toBeNull();
    expect(parseHex('#ff00')).toBeNull();
  });
  test('toHex omits alpha only when opaque', () => {
    expect(toHex(0xff0000ff)).toBe('#ff0000');
    expect(toHex(0xff000080)).toBe('#ff000080');
  });
  test('hsv conversions', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual([255, 0, 0]);
    expect(hsvToRgb(120, 1, 1)).toEqual([0, 255, 0]);
    expect(rgbToHsv(0, 0, 255)).toEqual([240, 1, 1]);
    const [h, s, v] = rgbToHsv(12, 200, 77);
    const back = hsvToRgb(h, s, v);
    [12, 200, 77].forEach((c, i) => expect(Math.abs(back[i] - c)).toBeLessThanOrEqual(1));
  });
});
