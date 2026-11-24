import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../src/storage/db', () => ({
  saveSprite: vi.fn(async () => {}),
  setLastOpenId: vi.fn(async () => {}),
}));

import { createSprite } from '../../src/core/sprite';
import { Editor } from '../../src/editor/editor';
import { startAutosave } from '../../src/storage/autosave';
import { saveSprite } from '../../src/storage/db';

const save = vi.mocked(saveSprite);
let ed: Editor;

beforeEach(() => {
  vi.useFakeTimers();
  save.mockClear();
  save.mockImplementation(async () => {});
  const noop = () => {};
  vi.stubGlobal('document', { addEventListener: noop, removeEventListener: noop, visibilityState: 'visible' });
  vi.stubGlobal('window', { addEventListener: noop, removeEventListener: noop });
  ed = new Editor(createSprite('a', 8, 8, [0xff0000ff]));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('saves once, half a second after the last change', async () => {
  startAutosave(ed, true, () => {});
  ed.strokeStart(1, 1); ed.strokeEnd();
  await vi.advanceTimersByTimeAsync(300);
  ed.strokeStart(2, 2); ed.strokeEnd();
  await vi.advanceTimersByTimeAsync(300);
  expect(save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(250);
  expect(save).toHaveBeenCalledTimes(1);
});

test('does not save in the middle of a stroke', async () => {
  startAutosave(ed, true, () => {});
  ed.strokeStart(1, 1);
  ed.strokeMove(5, 1);
  await vi.advanceTimersByTimeAsync(2000);
  expect(save).not.toHaveBeenCalled();
  ed.strokeEnd();
  await vi.advanceTimersByTimeAsync(600);
  expect(save).toHaveBeenCalledTimes(1);
});

test('flush reports whether the sprite is safely stored', async () => {
  const status: boolean[] = [];
  const auto = startAutosave(ed, true, (ok) => status.push(ok));
  expect(await auto.flush()).toBe(true);
  ed.strokeStart(1, 1); ed.strokeEnd();
  save.mockImplementation(async () => { throw new Error('quota'); });
  expect(await auto.flush()).toBe(false);
  expect(status).toEqual([false]);
  save.mockImplementation(async () => {});
  expect(await auto.flush()).toBe(true);
  expect(status).toEqual([false, true]);
});

test('a failed save is tried again without another edit', async () => {
  startAutosave(ed, true, () => {});
  save.mockImplementation(async () => { throw new Error('quota'); });
  ed.strokeStart(1, 1); ed.strokeEnd();
  await vi.advanceTimersByTimeAsync(600);
  expect(save).toHaveBeenCalledTimes(1);
  save.mockImplementation(async () => {});
  await vi.advanceTimersByTimeAsync(6000);
  expect(save).toHaveBeenCalledTimes(2);
});
