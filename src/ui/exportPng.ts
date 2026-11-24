import { compositeFrame } from '../core/composite';
import type { Sprite } from '../core/sprite';

/** Enlarges an RGBA image by a whole factor with hard pixel edges. */
export function scaleNearest(data: Uint8ClampedArray, w: number, h: number, factor: number): Uint8ClampedArray {
  if (factor === 1) return data.slice();
  const ow = w * factor;
  const out = new Uint8ClampedArray(ow * h * factor * 4);
  for (let y = 0; y < h; y++) {
    const rowStart = y * factor * ow * 4;
    for (let x = 0; x < w; x++) {
      const px = data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4);
      for (let k = 0; k < factor; k++) out.set(px, rowStart + (x * factor + k) * 4);
    }
    const row = out.subarray(rowStart, rowStart + ow * 4);
    for (let k = 1; k < factor; k++) out.set(row, rowStart + k * ow * 4);
  }
  return out;
}

export function frameToPngBlob(sprite: Sprite, frame: number, scale: number): Promise<Blob> {
  const w = sprite.width * scale;
  const h = sprite.height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const img = new ImageData(w, h);
  img.data.set(scaleNearest(compositeFrame(sprite, frame), sprite.width, sprite.height, scale));
  canvas.getContext('2d')!.putImageData(img, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the PNG'))), 'image/png'),
  );
}

export function pngFilename(name: string, scale: number): string {
  const safe = name.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'sprite';
  return scale === 1 ? `${safe}.png` : `${safe}@${scale}x.png`;
}

/** Whether this browser can hand a PNG to the system share sheet. */
export function canShareFile(blob: Blob, filename: string): boolean {
  try {
    return !!navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] });
  } catch {
    return false;
  }
}

export async function deliver(blob: Blob, filename: string, mode: 'download' | 'share'): Promise<void> {
  if (mode === 'share') {
    try {
      await navigator.share({ files: [new File([blob], filename, { type: blob.type })] });
    } catch (e) {
      // Closing the share sheet without choosing is not a failure.
      if ((e as DOMException).name !== 'AbortError') throw e;
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
