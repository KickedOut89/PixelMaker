import { expect, test } from 'vitest';
import { compositeFrame, compositePixel } from '../../src/core/composite';
import { setPixel } from '../../src/core/pixels';
import { createSprite, createSurface, type Sprite } from '../../src/core/sprite';

const RED = 0xff0000ff;
const BLUE = 0x0000ffff;

function twoLayers(): Sprite {
  const s = createSprite('a', 2, 2, []);
  s.layers.push({ id: 'top', name: 'Layer 2', visible: true, locked: false, opacity: 255, cels: [createSurface(2, 2)] });
  setPixel(s.layers[0].cels[0]!, 0, 0, BLUE);
  setPixel(s.layers[1].cels[0]!, 0, 0, RED);
  return s;
}
const px = (d: Uint8ClampedArray) => Array.from(d.slice(0, 4));

test('opaque top pixel wins', () => {
  expect(px(compositeFrame(twoLayers(), 0))).toEqual([255, 0, 0, 255]);
});
test('hidden layer is skipped', () => {
  const s = twoLayers();
  s.layers[1].visible = false;
  expect(px(compositeFrame(s, 0))).toEqual([0, 0, 255, 255]);
});
test('layer opacity blends', () => {
  const s = twoLayers();
  s.layers[1].opacity = 128;
  const [r, g, b, a] = px(compositeFrame(s, 0));
  expect(Math.abs(r - 128)).toBeLessThanOrEqual(1);
  expect(g).toBe(0);
  expect(Math.abs(b - 127)).toBeLessThanOrEqual(1);
  expect(a).toBe(255);
});
test('missing cel is skipped', () => {
  const s = twoLayers();
  s.layers[1].cels[0] = null;
  expect(px(compositeFrame(s, 0))).toEqual([0, 0, 255, 255]);
});

test('an output buffer is reused and fully overwritten', () => {
  const s = twoLayers();
  const out = new Uint8ClampedArray(16).fill(77);
  expect(compositeFrame(s, 0, out)).toBe(out);
  expect(px(out)).toEqual([255, 0, 0, 255]);
  expect(Array.from(out.slice(4, 8))).toEqual([0, 0, 0, 0]);
});
test('compositePixel matches compositeFrame', () => {
  const s = twoLayers();
  s.layers[1].opacity = 128;
  const d = compositeFrame(s, 0);
  expect(compositePixel(s, 0, 0, 0)).toBe(((d[0] << 24) | (d[1] << 16) | (d[2] << 8) | d[3]) >>> 0);
  expect(compositePixel(s, 0, 1, 1)).toBe(0);
  expect(compositePixel(s, 0, -1, 0)).toBe(0);
});
