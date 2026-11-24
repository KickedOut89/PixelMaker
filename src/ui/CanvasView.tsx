import { useEffect, useRef } from 'preact/hooks';
import { compositeFrame } from '../core/composite';
import type { Editor } from '../editor/editor';
import { GestureRecognizer, type GestureEvent } from '../editor/gestures';
import { GRID_ABOVE_ZOOM, panBy, screenToSprite, snapZoom, zoomAt } from '../editor/viewport';

const WORKSPACE = '#14141a';
const CHECK_A = '#9c9ca8';
const CHECK_B = '#80808c';

export function CanvasView({ editor }: { editor: Editor }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d')!;
    let cssW = 0;
    let cssH = 0;
    let raf = 0;
    let paintedRevision = -1;
    let paintedSprite: unknown = null;

    const draw = () => {
      raf = 0;
      const { sprite, frame, viewport: v, revision } = editor.state;
      const dpr = window.devicePixelRatio || 1;
      if (paintedRevision !== revision || paintedSprite !== sprite) {
        if (off.width !== sprite.width || off.height !== sprite.height) {
          off.width = sprite.width;
          off.height = sprite.height;
        }
        const img = new ImageData(sprite.width, sprite.height);
        img.data.set(compositeFrame(sprite, frame));
        offCtx.putImageData(img, 0, 0);
        paintedRevision = revision;
        paintedSprite = sprite;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = WORKSPACE;
      ctx.fillRect(0, 0, cssW, cssH);
      const w = sprite.width * v.zoom;
      const h = sprite.height * v.zoom;

      // Transparency checkerboard, aligned to sprite pixels.
      ctx.save();
      ctx.beginPath();
      ctx.rect(v.panX, v.panY, w, h);
      ctx.clip();
      ctx.fillStyle = CHECK_A;
      ctx.fillRect(v.panX, v.panY, w, h);
      ctx.fillStyle = CHECK_B;
      const cell = v.zoom * Math.max(1, Math.round(8 / v.zoom));
      const x0 = Math.max(0, Math.floor(-v.panX / cell));
      const y0 = Math.max(0, Math.floor(-v.panY / cell));
      const x1 = Math.min(Math.ceil(w / cell), Math.ceil((cssW - v.panX) / cell));
      const y1 = Math.min(Math.ceil(h / cell), Math.ceil((cssH - v.panY) / cell));
      for (let cy = y0; cy < y1; cy++) {
        for (let cx = x0 + ((x0 + cy) % 2 === 0 ? 1 : 0); cx < x1; cx += 2) {
          ctx.fillRect(v.panX + cx * cell, v.panY + cy * cell, cell, cell);
        }
      }
      ctx.restore();

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, v.panX, v.panY, w, h);

      if (v.zoom > GRID_ABOVE_ZOOM) {
        ctx.beginPath();
        const gx0 = Math.max(0, Math.floor(-v.panX / v.zoom));
        const gx1 = Math.min(sprite.width, Math.ceil((cssW - v.panX) / v.zoom));
        const gy0 = Math.max(0, Math.floor(-v.panY / v.zoom));
        const gy1 = Math.min(sprite.height, Math.ceil((cssH - v.panY) / v.zoom));
        for (let x = gx0; x <= gx1; x++) {
          const sx = Math.round(v.panX + x * v.zoom) + 0.5;
          ctx.moveTo(sx, Math.max(0, v.panY));
          ctx.lineTo(sx, Math.min(cssH, v.panY + h));
        }
        for (let y = gy0; y <= gy1; y++) {
          const sy = Math.round(v.panY + y * v.zoom) + 0.5;
          ctx.moveTo(Math.max(0, v.panX), sy);
          ctx.lineTo(Math.min(cssW, v.panX + w), sy);
        }
        ctx.strokeStyle = 'rgba(20, 20, 26, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(v.panX) - 0.5, Math.round(v.panY) - 0.5, Math.round(w) + 1, Math.round(h) + 1);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      editor.setViewSize(cssW, cssH);
      schedule();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const unsubscribe = editor.subscribe(schedule);

    const onGesture = (e: GestureEvent) => {
      const v = editor.state.viewport;
      switch (e.type) {
        case 'strokeStart': {
          const p = screenToSprite(v, e.x, e.y);
          editor.strokeStart(p.x, p.y);
          break;
        }
        case 'strokeMove': {
          const p = screenToSprite(v, e.x, e.y);
          editor.strokeMove(p.x, p.y);
          break;
        }
        case 'strokeEnd':
          editor.strokeEnd();
          break;
        case 'strokeCancel':
          editor.strokeCancel();
          break;
        case 'transform':
          editor.moveViewport(zoomAt(panBy(v, e.dx, e.dy), e.scale, e.cx, e.cy));
          break;
        case 'transformEnd':
          editor.setViewport(snapZoom(v, e.cx, e.cy));
          break;
        case 'tap2':
          editor.undo();
          break;
        case 'tap3':
          editor.redo();
          break;
        case 'longPress': {
          const p = screenToSprite(v, e.x, e.y);
          editor.pick(p.x, p.y);
          break;
        }
      }
    };
    const gestures = new GestureRecognizer(onGesture);
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Synthetic pointers cannot be captured; drawing still works.
      }
      const p = local(e);
      gestures.down(e.pointerId, p.x, p.y, e.timeStamp);
    };
    const move = (e: PointerEvent) => {
      const p = local(e);
      gestures.move(e.pointerId, p.x, p.y, e.timeStamp);
    };
    const up = (e: PointerEvent) => gestures.up(e.pointerId, e.timeStamp);
    const cancel = (e: PointerEvent) => gestures.cancel(e.pointerId);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const v = editor.state.viewport;
      const next = v.zoom + (e.deltaY < 0 ? 1 : -1);
      editor.moveViewport(snapZoom(zoomAt(v, next / v.zoom, e.clientX - r.left, e.clientY - r.top), e.clientX - r.left, e.clientY - r.top));
    };
    const noMenu = (e: Event) => e.preventDefault();
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('contextmenu', noMenu);

    return () => {
      ro.disconnect();
      unsubscribe();
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('contextmenu', noMenu);
    };
  }, [editor]);

  return <canvas ref={ref} class="canvas" data-testid="canvas" aria-label="Drawing canvas" />;
}
