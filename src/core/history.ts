import { pasteRect, type Rect } from './pixels';
import { getCel, type Sprite } from './sprite';

export interface Command {
  label: string;
  undo(sprite: Sprite): void;
  redo(sprite: Sprite): void;
}

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(private readonly limit = 100) {}

  push(cmd: Command): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo(sprite: Sprite): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;
    cmd.undo(sprite);
    this.redoStack.push(cmd);
    return true;
  }

  redo(sprite: Sprite): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;
    cmd.redo(sprite);
    this.undoStack.push(cmd);
    return true;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}

/** A change to the pixels of one cel, stored as before/after copies of the changed area. */
export function pixelPatch(
  label: string,
  layer: number,
  frame: number,
  rect: Rect,
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
): Command {
  return {
    label,
    undo: (sprite) => pasteRect(getCel(sprite, layer, frame), rect, before),
    redo: (sprite) => pasteRect(getCel(sprite, layer, frame), rect, after),
  };
}
