import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { setPixel } from '../../src/core/pixels';
import { createSprite } from '../../src/core/sprite';
import { deleteSprite, getLastOpenId, listSprites, loadSprite, saveSprite, setLastOpenId } from '../../src/storage/db';
import { scaleNearest } from '../../src/ui/exportPng';

test('a saved sprite loads back identical', async () => {
  const s = createSprite('hero', 8, 4, [0xff0000ff, 0x00ff00ff]);
  setPixel(s.layers[0].cels[0]!, 3, 2, 0x11223344);
  await saveSprite(s);
  const back = (await loadSprite(s.id))!;
  expect(back.name).toBe('hero');
  expect([back.width, back.height]).toEqual([8, 4]);
  expect(back.palette).toEqual([0xff0000ff, 0x00ff00ff]);
  expect(back.frames).toEqual(s.frames);
  expect(Array.from(back.layers[0].cels[0]!.data)).toEqual(Array.from(s.layers[0].cels[0]!.data));
  expect('updatedAt' in back).toBe(false);
});

test('loading an unknown id gives null', async () => {
  expect(await loadSprite('missing')).toBeNull();
});

test('listSprites is newest first and saving again updates in place', async () => {
  const a = createSprite('a', 2, 2, []);
  const b = createSprite('b', 3, 5, []);
  await saveSprite(a);
  await new Promise((r) => setTimeout(r, 5));
  await saveSprite(b);
  let names = (await listSprites()).map((s) => s.name).filter((n) => n === 'a' || n === 'b');
  expect(names).toEqual(['b', 'a']);
  await new Promise((r) => setTimeout(r, 5));
  await saveSprite(a);
  const list = await listSprites();
  names = list.map((s) => s.name).filter((n) => n === 'a' || n === 'b');
  expect(names).toEqual(['a', 'b']);
  const sb = list.find((s) => s.id === b.id)!;
  expect([sb.width, sb.height]).toEqual([3, 5]);
});

test('deleteSprite removes it', async () => {
  const s = createSprite('gone', 2, 2, []);
  await saveSprite(s);
  await deleteSprite(s.id);
  expect(await loadSprite(s.id)).toBeNull();
});

test('last-open id round-trips', async () => {
  await setLastOpenId('abc');
  expect(await getLastOpenId()).toBe('abc');
});

test('scaleNearest repeats each pixel', () => {
  const R = [255, 0, 0, 255];
  const B = [0, 0, 255, 255];
  const out = scaleNearest(new Uint8ClampedArray([...R, ...B]), 2, 1, 2);
  expect(Array.from(out)).toEqual([...R, ...R, ...B, ...B, ...R, ...R, ...B, ...B]);
});

test('a connection the browser closed is reopened on the next use', async () => {
  const s = createSprite('reopen', 2, 2, []);
  await saveSprite(s);
  const { connectionForTest } = await import('../../src/storage/db');
  (await connectionForTest()).close(); // what Chrome does under storage pressure
  expect((await loadSprite(s.id))?.name).toBe('reopen');
  await saveSprite(s);
});
