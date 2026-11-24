import { expect, test } from 'vitest';
import { createSprite, getCel } from '../../src/core/sprite';

test('createSprite makes one layer, one 100 ms frame and a blank cel', () => {
  const s = createSprite('a', 16, 16, []);
  expect(s.layers).toHaveLength(1);
  expect(s.layers[0].name).toBe('Layer 1');
  expect(s.frames).toEqual([{ duration: 100 }]);
  const cel = s.layers[0].cels[0]!;
  expect(cel.data.length).toBe(1024);
  expect(cel.data.every((v) => v === 0)).toBe(true);
});

test('createSprite rejects sizes outside 1..512 and non-integers', () => {
  expect(() => createSprite('a', 0, 16, [])).toThrow(RangeError);
  expect(() => createSprite('a', 513, 1, [])).toThrow(RangeError);
  expect(() => createSprite('a', 1.5, 1, [])).toThrow(RangeError);
});

test('getCel creates a blank cel where there is none', () => {
  const s = createSprite('a', 4, 4, []);
  s.layers[0].cels[0] = null;
  const cel = getCel(s, 0, 0);
  expect(cel.data.length).toBe(64);
  expect(s.layers[0].cels[0]).toBe(cel);
});
