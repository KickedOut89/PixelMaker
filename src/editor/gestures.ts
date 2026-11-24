/**
 * Turns raw pointer input into drawing strokes, two-finger pan/zoom, taps and
 * long presses. Knows nothing about the DOM: feed it pointer ids, positions
 * and timestamps.
 */
export type GestureEvent =
  | { type: 'strokeStart' | 'strokeMove'; x: number; y: number }
  | { type: 'strokeEnd' }
  | { type: 'strokeCancel' }
  /** Change since the previous transform event; (cx, cy) is the current midpoint. */
  | { type: 'transform'; dx: number; dy: number; scale: number; cx: number; cy: number }
  | { type: 'transformEnd'; cx: number; cy: number }
  | { type: 'tap2' }
  | { type: 'tap3' }
  | { type: 'longPress'; x: number; y: number };

/** All touch tuning lives here. */
export const GESTURE_DEFAULTS = {
  /** A multi-finger tap must finish within this long of the first finger landing. */
  tapMaxMs: 250,
  /** Fingers moving further than this turn a tap into a pan/zoom. */
  tapMaxMovePx: 10,
  /** Holding one finger still this long is a long press. */
  longPressMs: 500,
  /** Moving further than this cancels the pending long press. */
  longPressMaxMovePx: 8,
};

export interface Timer {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realTimer: Timer = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

interface Pointer {
  x: number;
  y: number;
  downX: number;
  downY: number;
}

type Mode = 'idle' | 'stroke' | 'held' | 'multi';

export class GestureRecognizer {
  private pointers = new Map<number, Pointer>();
  private mode: Mode = 'idle';
  private firstDownTime = 0;
  private longPress: unknown = null;
  // multi-touch state
  private pair: [number, number] | null = null;
  private maxPointers = 0;
  private transformed = false;
  private tapAllowed = true;
  private lastCx = 0;
  private lastCy = 0;
  private lastDist = 0;

  constructor(
    private readonly emit: (e: GestureEvent) => void,
    private readonly opts = GESTURE_DEFAULTS,
    private readonly timer: Timer = realTimer,
  ) {}

  down(id: number, x: number, y: number, t: number): void {
    if (this.pointers.size >= 3 || this.pointers.has(id)) return;
    const p: Pointer = { x, y, downX: x, downY: y };
    if (this.pointers.size === 0 && this.mode === 'idle') {
      this.pointers.set(id, p);
      this.mode = 'stroke';
      this.firstDownTime = t;
      this.emit({ type: 'strokeStart', x, y });
      this.longPress = this.timer.set(() => this.onLongPress(id), this.opts.longPressMs);
      return;
    }
    this.pointers.set(id, p);
    if (this.mode === 'stroke' || this.mode === 'held') {
      if (this.mode === 'stroke') {
        this.disarmLongPress();
        this.emit({ type: 'strokeCancel' });
      }
      this.mode = 'multi';
      this.transformed = false;
      this.tapAllowed = true;
      this.maxPointers = 0;
      // Movement for tap detection is measured from where each finger was
      // when the second one landed, not from where the stroke began.
      for (const q of this.pointers.values()) {
        q.downX = q.x;
        q.downY = q.y;
      }
      const ids = [...this.pointers.keys()];
      this.pair = [ids[0], ids[1]];
      this.measure();
    }
    this.maxPointers = Math.max(this.maxPointers, this.pointers.size);
  }

  move(id: number, x: number, y: number, _t: number): void {
    const p = this.pointers.get(id);
    if (!p) return;
    p.x = x;
    p.y = y;
    if (this.mode === 'stroke') {
      if (Math.hypot(x - p.downX, y - p.downY) > this.opts.longPressMaxMovePx) this.disarmLongPress();
      this.emit({ type: 'strokeMove', x, y });
      return;
    }
    if (this.mode !== 'multi' || !this.pair) return;
    if (!this.transformed) {
      const moved = [...this.pointers.values()].some(
        (q) => Math.hypot(q.x - q.downX, q.y - q.downY) > this.opts.tapMaxMovePx,
      );
      if (!moved) return;
      this.transformed = true;
    }
    const prevCx = this.lastCx;
    const prevCy = this.lastCy;
    const prevDist = this.lastDist;
    this.measure();
    this.emit({
      type: 'transform',
      dx: this.lastCx - prevCx,
      dy: this.lastCy - prevCy,
      scale: prevDist > 0 ? this.lastDist / prevDist : 1,
      cx: this.lastCx,
      cy: this.lastCy,
    });
  }

  up(id: number, t: number): void {
    this.release(id, t, false);
  }

  cancel(id: number): void {
    this.release(id, 0, true);
  }

  private release(id: number, t: number, cancelled: boolean): void {
    if (!this.pointers.delete(id)) return;
    if (this.mode === 'stroke') {
      this.disarmLongPress();
      this.mode = 'idle';
      this.emit({ type: cancelled ? 'strokeCancel' : 'strokeEnd' });
      return;
    }
    if (this.mode === 'held') {
      this.mode = 'idle';
      return;
    }
    if (this.mode !== 'multi') return;
    if (cancelled) this.tapAllowed = false;
    // Once either of the two tracked fingers lifts, stop transforming.
    if (this.pair && this.pair.includes(id)) this.pair = null;
    if (this.pointers.size > 0) return;
    this.mode = 'idle';
    const quick = t - this.firstDownTime <= this.opts.tapMaxMs;
    if (!this.transformed && this.tapAllowed && quick) {
      this.emit({ type: this.maxPointers >= 3 ? 'tap3' : 'tap2' });
    } else {
      this.emit({ type: 'transformEnd', cx: this.lastCx, cy: this.lastCy });
    }
  }

  private onLongPress(id: number): void {
    this.longPress = null;
    const p = this.pointers.get(id);
    if (this.mode !== 'stroke' || !p) return;
    this.mode = 'held';
    this.emit({ type: 'strokeCancel' });
    this.emit({ type: 'longPress', x: p.downX, y: p.downY });
  }

  private disarmLongPress(): void {
    if (this.longPress !== null) {
      this.timer.clear(this.longPress);
      this.longPress = null;
    }
  }

  private measure(): void {
    if (!this.pair) return;
    const a = this.pointers.get(this.pair[0]);
    const b = this.pointers.get(this.pair[1]);
    if (!a || !b) return;
    this.lastCx = (a.x + b.x) / 2;
    this.lastCy = (a.y + b.y) / 2;
    this.lastDist = Math.hypot(a.x - b.x, a.y - b.y);
  }
}
