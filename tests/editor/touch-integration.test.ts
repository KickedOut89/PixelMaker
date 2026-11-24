import { beforeEach, describe, expect, test } from 'vitest';
import { createSprite, getCel } from '../../src/core/sprite';
import { Editor, type ToolId } from '../../src/editor/editor';
import { GestureRecognizer, GESTURE_DEFAULTS, type Timer } from '../../src/editor/gestures';

/** The recognizer wired to the editor the way the canvas does it, at 1 screen px per sprite px. */
const RED = 0xff0000ff;
const GREEN = 0x00ff00ff;
let ed: Editor;
let g: GestureRecognizer;
let fire: () => void;

const painted = () => {
  let n = 0;
  const d = getCel(ed.state.sprite, 0, 0).data;
  for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  return n;
};

beforeEach(() => {
  ed = new Editor(createSprite('a', 16, 16, [RED, GREEN]));
  let pending: (() => void) | null = null;
  const timer: Timer = { set: (fn) => (pending = fn), clear: () => (pending = null) };
  fire = () => { const f = pending; pending = null; f?.(); };
  g = new GestureRecognizer((e) => {
    switch (e.type) {
      case 'strokeStart': ed.strokeStart(e.x, e.y); break;
      case 'strokeMove': ed.strokeMove(e.x, e.y); break;
      case 'strokeEnd': ed.strokeEnd(); break;
      case 'strokeCancel': ed.strokeCancel(); break;
      case 'tap2': ed.undo(); break;
      case 'tap3': ed.redo(); break;
      case 'longPress': ed.pick(e.x, e.y); break;
    }
  }, GESTURE_DEFAULTS, timer);
  // One earlier pencil stroke of 3 pixels to undo/redo against.
  g.down(1, 1, 1, 0); g.move(1, 3, 1, 5); g.up(1, 10);
});

const tap2 = (t: number) => { g.down(1, 5, 5, t); g.down(2, 12, 5, t + 5); g.up(1, t + 50); g.up(2, t + 55); };
const tap3 = (t: number) => { g.down(1, 5, 5, t); g.down(2, 9, 5, t + 5); g.down(3, 13, 5, t + 8); g.up(1, t + 50); g.up(2, t + 55); g.up(3, t + 58); };
const pinch = (t: number) => { g.down(1, 5, 8, t); g.down(2, 10, 8, t + 5); g.move(2, 60, 8, t + 20); g.up(1, t + 400); g.up(2, t + 410); };

describe.each<ToolId>(['pencil', 'eraser', 'fill', 'eyedropper'])('with the %s tool', (tool) => {
  beforeEach(() => {
    ed.setTool(tool);
    ed.setFg(GREEN);
  });

  test('two-finger tap undoes the previous stroke and nothing else', () => {
    tap2(100);
    expect(painted()).toBe(0);
    expect(ed.history.canUndo).toBe(false);
    expect(ed.history.canRedo).toBe(true);
    expect(ed.state.fg).toBe(GREEN);
  });

  test('three-finger tap redoes', () => {
    ed.undo();
    tap3(100);
    expect(painted()).toBe(3);
    expect(ed.history.canRedo).toBe(false);
    expect(ed.state.fg).toBe(GREEN);
  });

  test('a pinch leaves the sprite, the colour and the history alone', () => {
    pinch(100);
    expect(painted()).toBe(3);
    expect(ed.state.fg).toBe(GREEN);
    ed.undo();
    expect(painted()).toBe(0);
    expect(ed.history.canUndo).toBe(false);
  });

  test('a cancelled touch leaves the sprite, the colour and the history alone', () => {
    g.down(1, 8, 8, 100);
    g.cancel(1);
    expect(painted()).toBe(3);
    expect(ed.state.fg).toBe(GREEN);
    ed.undo();
    expect(ed.history.canUndo).toBe(false);
  });
});

test('fill happens when the finger lifts', () => {
  ed.setTool('fill');
  ed.setFg(GREEN);
  g.down(1, 8, 8, 100);
  expect(painted()).toBe(3);
  g.up(1, 150);
  expect(painted()).toBe(256);
});

test('long press with the fill tool picks the colour without filling', () => {
  ed.setTool('fill');
  ed.setFg(GREEN);
  g.down(1, 2, 1, 100);
  fire();
  g.up(1, 900);
  expect(ed.state.fg).toBe(RED);
  expect(painted()).toBe(3);
});

test('the eyedropper picks while dragging and keeps the pick on release', () => {
  ed.setTool('eyedropper');
  ed.setFg(GREEN);
  g.down(1, 8, 8, 100);
  g.move(1, 2, 1, 120);
  g.up(1, 150);
  expect(ed.state.fg).toBe(RED);
});

test('reset abandons a stuck touch so the next finger can draw', () => {
  g.down(7, 8, 8, 100); // this finger's "up" is never delivered
  g.reset();
  expect(painted()).toBe(3);
  g.down(1, 10, 10, 5000);
  g.move(1, 12, 10, 5010);
  g.up(1, 5020);
  expect(painted()).toBe(6);
});

test('a pinch that starts on a painted pixel does not change the colour with the eyedropper', () => {
  ed.setTool('eyedropper');
  ed.setFg(GREEN);
  g.down(1, 2, 1, 100);
  g.down(2, 10, 8, 105);
  g.move(2, 60, 8, 120);
  g.up(1, 400);
  g.up(2, 410);
  expect(ed.state.fg).toBe(GREEN);
});
