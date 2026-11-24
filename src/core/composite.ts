import type { Color } from './color';
import type { Sprite } from './sprite';

/**
 * Flattens the visible layers of one frame to straight-alpha RGBA.
 * Pass `out` (sprite-sized) to reuse a buffer instead of allocating one.
 */
export function compositeFrame(sprite: Sprite, frame: number, out?: Uint8ClampedArray): Uint8ClampedArray {
  const size = sprite.width * sprite.height * 4;
  const dst = out && out.length === size ? out : new Uint8ClampedArray(size);
  let empty = true;
  for (const layer of sprite.layers) {
    const cel = layer.cels[frame];
    if (!layer.visible || !cel || layer.opacity === 0) continue;
    const src = cel.data;
    if (empty && layer.opacity === 255) {
      // The lowest visible layer at full opacity is a straight copy.
      dst.set(src);
      empty = false;
      continue;
    }
    if (empty) {
      dst.fill(0);
      empty = false;
    }
    const op = layer.opacity / 255;
    for (let i = 0; i < size; i += 4) {
      const a = src[i + 3];
      if (a === 0) continue;
      if (a === 255 && layer.opacity === 255) {
        dst[i] = src[i];
        dst[i + 1] = src[i + 1];
        dst[i + 2] = src[i + 2];
        dst[i + 3] = 255;
        continue;
      }
      const sa = (a / 255) * op;
      const da = dst[i + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) {
        dst[i + k] = (src[i + k] * sa + dst[i + k] * da * (1 - sa)) / oa;
      }
      dst[i + 3] = oa * 255;
    }
  }
  if (empty) dst.fill(0);
  return dst;
}

/** The visible colour of a single pixel, without flattening the whole frame. */
export function compositePixel(sprite: Sprite, frame: number, x: number, y: number): Color {
  if (x < 0 || y < 0 || x >= sprite.width || y >= sprite.height) return 0;
  const i = (y * sprite.width + x) * 4;
  const px = new Uint8ClampedArray(4);
  for (const layer of sprite.layers) {
    const cel = layer.cels[frame];
    if (!layer.visible || !cel || layer.opacity === 0) continue;
    const src = cel.data;
    const sa = (src[i + 3] / 255) * (layer.opacity / 255);
    if (sa === 0) continue;
    const da = px[3] / 255;
    const oa = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) px[k] = (src[i + k] * sa + px[k] * da * (1 - sa)) / oa;
    px[3] = oa * 255;
  }
  return ((px[0] << 24) | (px[1] << 16) | (px[2] << 8) | px[3]) >>> 0;
}
