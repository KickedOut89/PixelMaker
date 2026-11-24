import { expect, test } from 'vitest';
import { History, pixelPatch, type Command } from '../../src/core/history';
import { copyRect, getPixel, setPixel } from '../../src/core/pixels';
import { createSprite, getCel } from '../../src/core/sprite';

const RED = 0xff0000ff;
const noop = (label: string): Command => ({ label, undo() {}, redo() {} });

test('pixelPatch undo and redo swap the rect contents', () => {
  const s = createSprite('a', 8, 8, []);
  const cel = getCel(s, 0, 0);
  const rect = { x: 2, y: 2, w: 2, h: 2 };
  const before = copyRect(cel, rect);
  setPixel(cel, 2, 2, RED);
  setPixel(cel, 3, 3, RED);
  const after = copyRect(cel, rect);
  const h = new History();
  h.push(pixelPatch('draw', 0, 0, rect, before, after));
  expect(h.undo(s)).toBe(true);
  expect(getPixel(cel, 2, 2)).toBe(0);
  expect(getPixel(cel, 3, 3)).toBe(0);
  expect(h.redo(s)).toBe(true);
  expect(getPixel(cel, 2, 2)).toBe(RED);
  expect(getPixel(cel, 3, 3)).toBe(RED);
});

test('undo and redo on empty history do nothing', () => {
  const s = createSprite('a', 2, 2, []);
  const h = new History();
  expect(h.undo(s)).toBe(false);
  expect(h.redo(s)).toBe(false);
  expect(h.canUndo).toBe(false);
  expect(h.canRedo).toBe(false);
});

test('pushing after an undo discards the redo stack', () => {
  const s = createSprite('a', 2, 2, []);
  const h = new History();
  h.push(noop('a'));
  h.undo(s);
  expect(h.canRedo).toBe(true);
  h.push(noop('b'));
  expect(h.canRedo).toBe(false);
});

test('history keeps only the newest entries up to its limit', () => {
  const s = createSprite('a', 2, 2, []);
  const h = new History(3);
  for (let i = 0; i < 4; i++) h.push(noop(String(i)));
  let n = 0;
  while (h.undo(s)) n++;
  expect(n).toBe(3);
});

test('clear empties both stacks', () => {
  const s = createSprite('a', 2, 2, []);
  const h = new History();
  h.push(noop('a'));
  h.push(noop('b'));
  h.undo(s);
  h.clear();
  expect(h.canUndo).toBe(false);
  expect(h.canRedo).toBe(false);
});
