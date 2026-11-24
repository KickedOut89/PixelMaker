import { beforeEach, describe, expect, test } from 'vitest';
import { getPixel } from '../../src/core/pixels';
import { createSprite, getCel } from '../../src/core/sprite';
import { Editor } from '../../src/editor/editor';

const RED = 0xff0000ff;
let ed: Editor;
const cel = () => getCel(ed.state.sprite, 0, 0);
const painted = () => {
  let n = 0;
  const d = cel().data;
  for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
  return n;
};
const stroke = (pts: [number, number][]) => {
  ed.strokeStart(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ed.strokeMove(x, y);
  ed.strokeEnd();
};
const undoDepth = () => {
  let n = 0;
  while (ed.history.canUndo) { ed.undo(); n++; }
  return n;
};

beforeEach(() => {
  ed = new Editor(createSprite('a', 16, 16, [RED, 0x00ff00ff]));
});

describe('defaults', () => {
  test('pencil, first palette colour, white background, 1px square brush', () => {
    expect(ed.state.tool).toBe('pencil');
    expect(ed.state.fg).toBe(RED);
    expect(ed.state.bg).toBe(0xffffffff);
    expect(ed.state.brushSize).toBe(1);
    expect(ed.state.brushShape).toBe('square');
    expect(ed.state.fillContiguous).toBe(true);
  });
  test('falls back to black with an empty palette', () => {
    expect(new Editor(createSprite('a', 4, 4, [])).state.fg).toBe(0x000000ff);
  });
});

describe('pencil', () => {
  test('draws a connected line and is one undo step', () => {
    stroke([[1, 1], [4, 1]]);
    for (let x = 1; x <= 4; x++) expect(getPixel(cel(), x, 1)).toBe(RED);
    expect(painted()).toBe(4);
    expect(ed.history.canUndo).toBe(true);
    ed.undo();
    expect(painted()).toBe(0);
    ed.redo();
    expect(painted()).toBe(4);
  });
  test('brush size 3 paints 9 pixels', () => {
    ed.setBrushSize(3);
    stroke([[8, 8]]);
    expect(painted()).toBe(9);
  });
  test('cancelling a stroke restores the cel and records nothing', () => {
    ed.strokeStart(1, 1);
    ed.strokeMove(6, 6);
    ed.strokeCancel();
    expect(painted()).toBe(0);
    expect(ed.history.canUndo).toBe(false);
  });
  test('a stroke entirely off the canvas does nothing', () => {
    expect(() => stroke([[-5, -5], [-1, -1]])).not.toThrow();
    expect(ed.history.canUndo).toBe(false);
  });
  test('a stroke entering from off-canvas is clipped', () => {
    stroke([[-3, 2], [3, 2]]);
    expect(painted()).toBe(4);
    for (let x = 0; x <= 3; x++) expect(getPixel(cel(), x, 2)).toBe(RED);
  });
  test('a locked layer cannot be drawn on', () => {
    ed.state.sprite.layers[0].locked = true;
    stroke([[1, 1], [4, 1]]);
    expect(painted()).toBe(0);
    expect(ed.history.canUndo).toBe(false);
  });
  test('stray move or end without a start is ignored', () => {
    expect(() => { ed.strokeMove(1, 1); ed.strokeEnd(); ed.strokeCancel(); }).not.toThrow();
    expect(painted()).toBe(0);
  });
});

describe('eraser', () => {
  test('clears drawn pixels in one undo step', () => {
    stroke([[1, 1], [4, 1]]);
    ed.setTool('eraser');
    stroke([[1, 1], [4, 1]]);
    expect(painted()).toBe(0);
    ed.undo();
    expect(painted()).toBe(4);
  });
  test('erasing nothing records nothing', () => {
    ed.setTool('eraser');
    stroke([[1, 1], [4, 1]]);
    expect(ed.history.canUndo).toBe(false);
  });
});

describe('fill', () => {
  test('fills the blank canvas in one step and refilling adds none', () => {
    ed.setTool('fill');
    stroke([[3, 3]]);
    expect(painted()).toBe(256);
    stroke([[3, 3]]);
    expect(undoDepth()).toBe(1);
    expect(painted()).toBe(0);
  });
});

describe('eyedropper', () => {
  test('picks a drawn colour and leaves history alone', () => {
    stroke([[2, 2]]);
    ed.setFg(0x00ff00ff);
    expect(ed.pick(2, 2)).toBe(true);
    expect(ed.state.fg).toBe(RED);
    expect(ed.pick(9, 9)).toBe(false);
    expect(ed.state.fg).toBe(RED);
    expect(undoDepth()).toBe(1);
  });
  test('as the active tool it picks on touch', () => {
    stroke([[2, 2]]);
    ed.setFg(0x00ff00ff);
    ed.setTool('eyedropper');
    stroke([[2, 2]]);
    expect(ed.state.fg).toBe(RED);
    expect(painted()).toBe(1);
  });
});

describe('state', () => {
  test('subscribers are notified until they unsubscribe', () => {
    let n = 0;
    const off = ed.subscribe(() => n++);
    ed.setTool('eraser');
    expect(n).toBe(1);
    off();
    ed.setTool('pencil');
    expect(n).toBe(1);
  });
  test('revision advances when pixels change', () => {
    const r = ed.state.revision;
    stroke([[1, 1]]);
    expect(ed.state.revision).toBeGreaterThan(r);
    const r2 = ed.state.revision;
    ed.undo();
    expect(ed.state.revision).toBeGreaterThan(r2);
  });
  test('loadSprite clears history and swaps the sprite', () => {
    stroke([[1, 1]]);
    const next = createSprite('b', 8, 8, []);
    ed.loadSprite(next);
    expect(ed.state.sprite).toBe(next);
    expect(ed.history.canUndo).toBe(false);
  });
  test('brush size clamps to 1..8', () => {
    ed.setBrushSize(99);
    expect(ed.state.brushSize).toBe(8);
    ed.setBrushSize(0);
    expect(ed.state.brushSize).toBe(1);
  });
  test('swapColors exchanges foreground and background', () => {
    ed.swapColors();
    expect(ed.state.fg).toBe(0xffffffff);
    expect(ed.state.bg).toBe(RED);
  });
  test('palette editing', () => {
    ed.addPaletteColor(0x123456ff);
    ed.addPaletteColor(0x123456ff);
    expect(ed.state.sprite.palette).toEqual([RED, 0x00ff00ff, 0x123456ff]);
    ed.replacePaletteColor(0, 0x000000ff);
    ed.removePaletteColor(1);
    expect(ed.state.sprite.palette).toEqual([0x000000ff, 0x123456ff]);
    ed.setPalette([RED]);
    expect(ed.state.sprite.palette).toEqual([RED]);
  });
});
