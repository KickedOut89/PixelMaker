/** screen = sprite * zoom + pan, in CSS pixels relative to the canvas element. */
export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 64;
/** The pixel grid is drawn when zoom is above this. */
export const GRID_ABOVE_ZOOM = 8;
export const FIT_MARGIN = 16;

export function screenToSprite(v: Viewport, sx: number, sy: number): { x: number; y: number } {
  return { x: Math.floor((sx - v.panX) / v.zoom), y: Math.floor((sy - v.panY) / v.zoom) };
}

function setZoom(v: Viewport, zoom: number, sx: number, sy: number): Viewport {
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const k = z / v.zoom;
  return { zoom: z, panX: sx - (sx - v.panX) * k, panY: sy - (sy - v.panY) * k };
}

/** Multiplies the zoom by `factor`, keeping the sprite point under (sx, sy) in place. */
export function zoomAt(v: Viewport, factor: number, sx: number, sy: number): Viewport {
  return setZoom(v, v.zoom * factor, sx, sy);
}

export function panBy(v: Viewport, dx: number, dy: number): Viewport {
  return { zoom: v.zoom, panX: v.panX + dx, panY: v.panY + dy };
}

/** Rounds the zoom to a whole multiple so pixels stay square and crisp. */
export function snapZoom(v: Viewport, sx: number, sy: number): Viewport {
  const z = setZoom(v, Math.round(v.zoom), sx, sy);
  return { zoom: z.zoom, panX: Math.round(z.panX), panY: Math.round(z.panY) };
}

export function fit(spriteW: number, spriteH: number, viewW: number, viewH: number): Viewport {
  const availW = viewW - FIT_MARGIN * 2;
  const availH = viewH - FIT_MARGIN * 2;
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.floor(Math.min(availW / spriteW, availH / spriteH))));
  return {
    zoom,
    panX: Math.round((viewW - spriteW * zoom) / 2),
    panY: Math.round((viewH - spriteH * zoom) / 2),
  };
}
