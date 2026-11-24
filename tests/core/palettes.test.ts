import { expect, test } from 'vitest';
import { DEFAULT_PALETTE_ID, PALETTES } from '../../src/core/palettes';

const sizes: Record<string, number> = { pico8: 16, db16: 16, db32: 32, endesga32: 32, sweetie16: 16, gameboy: 4 };

test('bundled palettes have the expected sizes', () => {
  expect(PALETTES.map((p) => p.id).sort()).toEqual(Object.keys(sizes).sort());
  for (const p of PALETTES) expect(p.colors, p.id).toHaveLength(sizes[p.id]);
});

test('palette colours are opaque and unique', () => {
  for (const p of PALETTES) {
    expect(p.colors.every((c) => (c & 255) === 255), p.id).toBe(true);
    expect(new Set(p.colors).size, p.id).toBe(p.colors.length);
  }
});

test('pico8 is the default and has its signature colours', () => {
  expect(DEFAULT_PALETTE_ID).toBe('pico8');
  const pico = PALETTES.find((p) => p.id === 'pico8')!;
  expect(pico.colors[0]).toBe(0x000000ff);
  expect(pico.colors).toContain(0xff004dff);
});
