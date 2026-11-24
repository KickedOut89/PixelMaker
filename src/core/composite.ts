import type { Sprite } from './sprite';

/** Flattens the visible layers of one frame to straight-alpha RGBA. */
export function compositeFrame(sprite: Sprite, frame: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(sprite.width * sprite.height * 4);
  for (const layer of sprite.layers) {
    const cel = layer.cels[frame];
    if (!layer.visible || !cel || layer.opacity === 0) continue;
    const src = cel.data;
    const op = layer.opacity / 255;
    for (let i = 0; i < out.length; i += 4) {
      const sa = (src[i + 3] / 255) * op;
      if (sa === 0) continue;
      const da = out[i + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) {
        out[i + k] = (src[i + k] * sa + out[i + k] * da * (1 - sa)) / oa;
      }
      out[i + 3] = oa * 255;
    }
  }
  return out;
}
