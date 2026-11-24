import { TRANSPARENT, rgba, type Color } from '../core/color';
import { compositePixel } from '../core/composite';
import { History, pixelPatch } from '../core/history';
import { copyRect, floodFill, linePoints, stamp, unionRect, type Rect } from '../core/pixels';
import { getCel, type Cel, type Sprite } from '../core/sprite';
import { fit, type Viewport } from './viewport';

export type ToolId = 'pencil' | 'eraser' | 'fill' | 'eyedropper';

export const MIN_BRUSH = 1;
export const MAX_BRUSH = 8;

export interface EditorState {
  sprite: Sprite;
  layer: number;
  frame: number;
  tool: ToolId;
  fg: Color;
  bg: Color;
  brushSize: number;
  brushShape: 'square' | 'round';
  fillContiguous: boolean;
  viewport: Viewport;
  /** Goes up whenever the sprite's pixels or structure change. */
  revision: number;
}

interface ActiveStroke {
  tool: 'pencil' | 'eraser';
  cel: Cel;
  snapshot: Uint8ClampedArray;
  dirty: Rect | null;
  lastX: number;
  lastY: number;
}

const LABELS: Record<ToolId, string> = { pencil: 'Pencil', eraser: 'Eraser', fill: 'Fill', eyedropper: 'Pick colour' };

/** The editing session for one sprite: current tool and colours, drawing, undo. */
export class Editor {
  readonly state: EditorState;
  readonly history = new History(100);
  private listeners = new Set<() => void>();
  private stroke: ActiveStroke | null = null;
  /** Where a fill will happen if the touch ends normally. */
  private pendingFill: { x: number; y: number } | null = null;
  /** The foreground colour to put back if an eyedropper touch is cancelled. */
  private pickRestore: Color | null = null;
  private viewW = 0;
  private viewH = 0;
  private autoFit = true;

  constructor(sprite: Sprite) {
    this.state = {
      sprite,
      layer: 0,
      frame: 0,
      tool: 'pencil',
      fg: sprite.palette[0] ?? rgba(0, 0, 0),
      bg: rgba(255, 255, 255),
      brushSize: 1,
      brushShape: 'square',
      fillContiguous: true,
      viewport: { zoom: 1, panX: 0, panY: 0 },
      revision: 0,
    };
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of [...this.listeners]) fn();
  }

  private changed(): void {
    this.state.revision++;
    this.notify();
  }

  setTool(t: ToolId): void {
    this.strokeCancel();
    this.state.tool = t;
    this.notify();
  }
  setFg(c: Color): void {
    this.state.fg = c >>> 0;
    this.notify();
  }
  setBg(c: Color): void {
    this.state.bg = c >>> 0;
    this.notify();
  }
  swapColors(): void {
    [this.state.fg, this.state.bg] = [this.state.bg, this.state.fg];
    this.notify();
  }
  setBrushSize(n: number): void {
    this.state.brushSize = Math.min(MAX_BRUSH, Math.max(MIN_BRUSH, Math.round(n)));
    this.notify();
  }
  setBrushShape(s: 'square' | 'round'): void {
    this.state.brushShape = s;
    this.notify();
  }
  setFillContiguous(b: boolean): void {
    this.state.fillContiguous = b;
    this.notify();
  }
  setViewport(v: Viewport): void {
    this.state.viewport = v;
    this.notify();
  }

  /** A pan or zoom made by the user; stops the view from re-fitting itself. */
  moveViewport(v: Viewport): void {
    this.autoFit = false;
    this.setViewport(v);
  }

  /** Tells the editor how big the on-screen canvas area is, in CSS pixels. */
  setViewSize(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
    if (this.autoFit) this.applyFit();
  }

  /** Centres the sprite at the largest whole zoom that fits. */
  fitView(): void {
    this.autoFit = true;
    this.applyFit();
  }

  private applyFit(): void {
    if (this.viewW <= 0 || this.viewH <= 0) return;
    this.setViewport(fit(this.state.sprite.width, this.state.sprite.height, this.viewW, this.viewH));
  }

  private drawable(): boolean {
    const layer = this.state.sprite.layers[this.state.layer];
    return !!layer && layer.visible && !layer.locked;
  }

  /** Coordinates are sprite pixels and may lie outside the canvas. */
  strokeStart(x: number, y: number): void {
    this.strokeCancel();
    const st = this.state;
    if (st.tool === 'eyedropper') {
      this.pickRestore = st.fg;
      this.pick(x, y);
      return;
    }
    if (!this.drawable()) return;
    if (st.tool === 'fill') {
      // Fill waits for the finger to lift, so a touch that turns out to be the
      // start of a pinch or a multi-finger tap never fills anything.
      this.pendingFill = { x, y };
      return;
    }
    const cel = getCel(st.sprite, st.layer, st.frame);
    this.stroke = { tool: st.tool, cel, snapshot: cel.data.slice(), dirty: null, lastX: x, lastY: y };
    this.paint(x, y, x, y);
  }

  strokeMove(x: number, y: number): void {
    if (this.state.tool === 'eyedropper') {
      this.pick(x, y);
      return;
    }
    const s = this.stroke;
    if (!s || (x === s.lastX && y === s.lastY)) return;
    this.paint(s.lastX, s.lastY, x, y);
    s.lastX = x;
    s.lastY = y;
  }

  private paint(x0: number, y0: number, x1: number, y1: number): void {
    const s = this.stroke!;
    const st = this.state;
    const color = s.tool === 'eraser' ? TRANSPARENT : st.fg;
    let dirty: Rect | null = null;
    for (const [px, py] of linePoints(x0, y0, x1, y1)) {
      dirty = unionRect(dirty, stamp(s.cel, px, py, st.brushSize, st.brushShape, color));
    }
    if (dirty) {
      s.dirty = unionRect(s.dirty, dirty);
      this.changed();
    }
  }

  private fillAt(x: number, y: number): void {
    const st = this.state;
    const cel = getCel(st.sprite, st.layer, st.frame);
    const before = cel.data.slice();
    const rect = floodFill(cel, x, y, st.fg, st.fillContiguous);
    if (!rect) return;
    this.history.push(
      pixelPatch(LABELS.fill, st.layer, st.frame, rect, copyRect({ ...cel, data: before }, rect), copyRect(cel, rect)),
    );
    this.changed();
  }

  /** True while a finger is down and drawing. */
  get isStroking(): boolean {
    return this.stroke !== null;
  }

  strokeEnd(): void {
    this.pickRestore = null;
    if (this.pendingFill) {
      const { x, y } = this.pendingFill;
      this.pendingFill = null;
      this.fillAt(x, y);
      return;
    }
    const s = this.stroke;
    if (!s) return;
    this.stroke = null;
    if (!s.dirty) return;
    const before = copyRect({ ...s.cel, data: s.snapshot }, s.dirty);
    const after = copyRect(s.cel, s.dirty);
    if (before.every((v, i) => v === after[i])) return;
    this.history.push(pixelPatch(LABELS[s.tool], this.state.layer, this.state.frame, s.dirty, before, after));
    this.notify();
  }

  /** Abandons the stroke in progress and puts the pixels back. */
  strokeCancel(): void {
    this.pendingFill = null;
    if (this.pickRestore !== null) {
      const restore = this.pickRestore;
      this.pickRestore = null;
      this.setFg(restore);
    }
    const s = this.stroke;
    if (!s) return;
    this.stroke = null;
    if (!s.dirty) return;
    s.cel.data.set(s.snapshot);
    this.changed();
  }

  /** Sets the foreground colour from what is visible at (x, y). */
  pick(x: number, y: number): boolean {
    const { sprite, frame } = this.state;
    if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) return false;
    const c = compositePixel(sprite, frame, x, y);
    if ((c & 255) === 0) return false;
    if (c !== this.state.fg) this.setFg(c);
    return true;
  }

  undo(): void {
    this.strokeCancel();
    if (this.history.undo(this.state.sprite)) this.changed();
  }

  redo(): void {
    this.strokeCancel();
    if (this.history.redo(this.state.sprite)) this.changed();
  }

  loadSprite(s: Sprite): void {
    this.stroke = null;
    this.state.sprite = s;
    this.state.layer = 0;
    this.state.frame = 0;
    this.history.clear();
    this.autoFit = true;
    this.applyFit();
    this.changed();
  }

  renameSprite(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed === this.state.sprite.name) return;
    this.state.sprite.name = trimmed;
    this.changed();
  }

  setPalette(colors: Color[]): void {
    this.state.sprite.palette = [...colors];
    this.changed();
  }
  addPaletteColor(c: Color): void {
    if (this.state.sprite.palette.includes(c >>> 0)) return;
    this.state.sprite.palette.push(c >>> 0);
    this.changed();
  }
  removePaletteColor(i: number): void {
    this.state.sprite.palette.splice(i, 1);
    this.changed();
  }
  replacePaletteColor(i: number, c: Color): void {
    this.state.sprite.palette[i] = c >>> 0;
    this.changed();
  }
}
