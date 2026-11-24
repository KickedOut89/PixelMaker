import { expect, test } from 'vitest';
import { fit, panBy, screenToSprite, snapZoom, zoomAt } from '../../src/editor/viewport';

test('screenToSprite floors into pixel cells', () => {
  const v = { zoom: 8, panX: 10, panY: 20 };
  expect(screenToSprite(v, 10, 20)).toEqual({ x: 0, y: 0 });
  expect(screenToSprite(v, 17.9, 27.9)).toEqual({ x: 0, y: 0 });
  expect(screenToSprite(v, 18, 28)).toEqual({ x: 1, y: 1 });
  expect(screenToSprite(v, 9, 19)).toEqual({ x: -1, y: -1 });
});

test('zoomAt keeps the point under the anchor fixed', () => {
  const v = { zoom: 4, panX: 13, panY: -7 };
  const z = zoomAt(v, 1.7, 100, 150);
  expect((100 - z.panX) / z.zoom).toBeCloseTo((100 - v.panX) / v.zoom, 6);
  expect((150 - z.panY) / z.zoom).toBeCloseTo((150 - v.panY) / v.zoom, 6);
  expect(z.zoom).toBeCloseTo(6.8, 6);
});

test('zoom clamps to 1 and 64', () => {
  expect(zoomAt({ zoom: 2, panX: 0, panY: 0 }, 0.01, 0, 0).zoom).toBe(1);
  expect(zoomAt({ zoom: 32, panX: 0, panY: 0 }, 100, 0, 0).zoom).toBe(64);
});

test('panBy shifts the pan', () => {
  expect(panBy({ zoom: 2, panX: 1, panY: 2 }, 3, -4)).toEqual({ zoom: 2, panX: 4, panY: -2 });
});

test('snapZoom rounds to a whole multiple, never below 1', () => {
  expect(snapZoom({ zoom: 7.6, panX: 0, panY: 0 }, 50, 50).zoom).toBe(8);
  expect(snapZoom({ zoom: 0.4, panX: 0, panY: 0 }, 50, 50).zoom).toBe(1);
});

test('fit picks the largest whole zoom inside the margin and centres', () => {
  expect(fit(16, 16, 360, 500)).toEqual({ zoom: 20, panX: 20, panY: 90 });
  expect(fit(512, 512, 360, 500).zoom).toBe(1);
});
