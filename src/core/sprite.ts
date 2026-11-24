import type { Color } from './color';

/** RGBA pixels, row-major, 4 bytes per pixel. */
export interface Surface {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** The image at one layer and one frame. Always sprite-sized. */
export type Cel = Surface;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  /** 0–255 */
  opacity: number;
  /** Indexed by frame. */
  cels: (Cel | null)[];
}

export interface Frame {
  /** Milliseconds. */
  duration: number;
}

export interface Tag {
  name: string;
  color: Color;
  from: number;
  to: number;
  direction: 'forward' | 'reverse' | 'pingpong';
}

export interface Sprite {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Bottom layer first. */
  layers: Layer[];
  frames: Frame[];
  tags: Tag[];
  palette: Color[];
}

export const MAX_SIZE = 512;

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function createSurface(width: number, height: number): Surface {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function createSprite(name: string, width: number, height: number, palette: Color[]): Sprite {
  for (const n of [width, height]) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_SIZE) {
      throw new RangeError(`Sprite size must be a whole number from 1 to ${MAX_SIZE}`);
    }
  }
  return {
    id: newId(),
    name,
    width,
    height,
    layers: [
      { id: newId(), name: 'Layer 1', visible: true, locked: false, opacity: 255, cels: [createSurface(width, height)] },
    ],
    frames: [{ duration: 100 }],
    tags: [],
    palette: [...palette],
  };
}

export function getCel(sprite: Sprite, layer: number, frame: number): Cel {
  const l = sprite.layers[layer];
  let cel = l.cels[frame];
  if (!cel) {
    cel = createSurface(sprite.width, sprite.height);
    l.cels[frame] = cel;
  }
  return cel;
}
