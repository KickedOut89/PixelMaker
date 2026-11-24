import { beforeEach, expect, test } from 'vitest';
import { GestureRecognizer, GESTURE_DEFAULTS, type GestureEvent, type Timer } from '../../src/editor/gestures';

let events: GestureEvent[];
let pending: (() => void) | null;
let g: GestureRecognizer;
const timer: Timer = {
  set(fn) { pending = fn; return fn; },
  clear() { pending = null; },
};
const fire = () => { const f = pending; pending = null; f?.(); };
const types = () => events.map((e) => e.type);

beforeEach(() => {
  events = [];
  pending = null;
  g = new GestureRecognizer((e) => events.push(e), GESTURE_DEFAULTS, timer);
});

test('one finger draws a stroke', () => {
  g.down(1, 10, 10, 0);
  g.move(1, 30, 12, 20);
  g.up(1, 40);
  expect(events).toEqual([
    { type: 'strokeStart', x: 10, y: 10 },
    { type: 'strokeMove', x: 30, y: 12 },
    { type: 'strokeEnd' },
  ]);
});

test('a second finger landing mid-stroke cancels the stroke', () => {
  g.down(1, 10, 10, 0);
  g.move(1, 30, 10, 20);
  g.down(2, 100, 100, 30);
  expect(types()).toEqual(['strokeStart', 'strokeMove', 'strokeCancel']);
  g.move(1, 31, 10, 40);
  g.move(2, 101, 100, 40);
  expect(types()).toEqual(['strokeStart', 'strokeMove', 'strokeCancel']);
  g.up(1, 400);
  g.up(2, 410);
  expect(types()).not.toContain('strokeEnd');
});

test('two-finger tap', () => {
  g.down(1, 10, 10, 0);
  g.down(2, 100, 100, 10);
  g.up(1, 80);
  g.up(2, 90);
  expect(types()).toEqual(['strokeStart', 'strokeCancel', 'tap2']);
});

test('three-finger tap', () => {
  g.down(1, 10, 10, 0);
  g.down(2, 100, 100, 10);
  g.down(3, 200, 100, 20);
  g.up(1, 80);
  g.up(3, 85);
  g.up(2, 90);
  expect(types()).toEqual(['strokeStart', 'strokeCancel', 'tap3']);
});

test('a slow two-finger touch is not a tap', () => {
  g.down(1, 10, 10, 0);
  g.down(2, 100, 100, 10);
  g.up(1, 800);
  g.up(2, 900);
  expect(types()).not.toContain('tap2');
});

test('pinch emits transforms whose scales multiply to the distance ratio', () => {
  g.down(1, 100, 100, 0);
  g.down(2, 200, 100, 10);
  g.move(2, 220, 100, 20);
  g.move(2, 250, 100, 30);
  g.move(1, 90, 100, 40);
  g.up(1, 50);
  g.up(2, 60);
  const transforms = events.filter((e) => e.type === 'transform');
  expect(transforms.length).toBeGreaterThan(0);
  const scale = transforms.reduce((p, e) => p * (e.type === 'transform' ? e.scale : 1), 1);
  expect(scale).toBeCloseTo(160 / 100, 6);
  expect(types()).not.toContain('tap2');
  expect(types()[types().length - 1]).toBe('transformEnd');
});

test('two-finger drag reports the midpoint movement', () => {
  g.down(1, 100, 100, 0);
  g.down(2, 200, 100, 10);
  g.move(1, 100, 150, 20);
  g.move(2, 200, 150, 30);
  const t = events.filter((e) => e.type === 'transform');
  const dy = t.reduce((p, e) => p + (e.type === 'transform' ? e.dy : 0), 0);
  const dx = t.reduce((p, e) => p + (e.type === 'transform' ? e.dx : 0), 0);
  expect(dy).toBeCloseTo(50, 6);
  expect(dx).toBeCloseTo(0, 6);
});

test('fingers left down after a pinch never draw', () => {
  g.down(1, 100, 100, 0);
  g.down(2, 200, 100, 10);
  g.move(2, 260, 100, 20);
  g.up(2, 30);
  const before = events.length;
  g.move(1, 150, 150, 40);
  g.move(1, 160, 160, 50);
  expect(types().slice(before).filter((t) => t.startsWith('stroke'))).toEqual([]);
  g.up(1, 60);
  g.down(3, 5, 5, 100);
  expect(types()[types().length - 1]).toBe('strokeStart');
});

test('holding still triggers a long press and cancels the stroke', () => {
  g.down(1, 10, 10, 0);
  fire();
  expect(events.slice(1)).toEqual([{ type: 'strokeCancel' }, { type: 'longPress', x: 10, y: 10 }]);
  g.move(1, 50, 50, 600);
  g.up(1, 700);
  expect(events).toHaveLength(3);
});

test('moving away disarms the long press', () => {
  g.down(1, 10, 10, 0);
  g.move(1, 30, 10, 20);
  expect(pending).toBeNull();
  g.up(1, 40);
  expect(types()).toEqual(['strokeStart', 'strokeMove', 'strokeEnd']);
});

test('pointer cancel rolls the stroke back and the next touch draws', () => {
  g.down(1, 10, 10, 0);
  g.move(1, 30, 10, 20);
  g.cancel(1);
  expect(types()).toEqual(['strokeStart', 'strokeMove', 'strokeCancel']);
  g.down(2, 5, 5, 100);
  expect(types()[types().length - 1]).toBe('strokeStart');
});

test('pointer cancel during multi-touch is not a tap', () => {
  g.down(1, 10, 10, 0);
  g.down(2, 100, 100, 10);
  g.cancel(1);
  g.cancel(2);
  expect(types()).not.toContain('tap2');
});
