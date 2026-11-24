import { useEffect, useRef, useState } from 'preact/hooks';
import { hsvToRgb, parseHex, rgbToHsv, rgba, toHex, unpack, type Color } from '../core/color';
import { PALETTES } from '../core/palettes';
import type { Editor } from '../editor/editor';
import { BottomSheet } from './BottomSheet';

interface Props {
  open: boolean;
  /** The colour shown when the sheet opens. */
  initial: Color;
  title: string;
  editor: Editor;
  onConfirm: (c: Color) => void;
  onClose: () => void;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const css = (c: Color) => {
  const [r, g, b, a] = unpack(c);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
};

/** Calls `onPoint` with the pointer's 0–1 position inside the element while it is pressed or dragged. */
function usePad(onPoint: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onPoint);
  cb.current = onPoint;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = false;
    const report = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      cb.current(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height));
    };
    const down = (e: PointerEvent) => {
      active = true;
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      report(e);
    };
    const move = (e: PointerEvent) => active && report(e);
    const up = () => { active = false; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);
  return ref;
}

interface SliderProps {
  testId: string;
  label: string;
  value: number;
  max: number;
  background: string;
  onChange: (v: number) => void;
}

function Slider({ testId, label, value, max, background, onChange }: SliderProps) {
  const ref = usePad((x) => onChange(x * max));
  const key = (e: KeyboardEvent) => {
    const step = max / 100;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, value - step));
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(max, value + step));
    else return;
    e.preventDefault();
  };
  return (
    <div class="slider" ref={ref} data-testid={testId} role="slider" tabIndex={0} aria-label={label}
      aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} onKeyDown={key}>
      <div class="slider-track" style={{ background }} />
      <div class="slider-thumb" style={{ left: `${(value / max) * 100}%` }} />
    </div>
  );
}

/** The saturation/brightness square. A component of its own so its pointer handling attaches when the sheet opens. */
function SvPad({ hue, s, v, thumb, onChange }: { hue: number; s: number; v: number; thumb: string; onChange: (s: number, v: number) => void }) {
  const ref = usePad((x, y) => onChange(x, 1 - y));
  return (
    <div class="sv" ref={ref} data-testid="sv" aria-label="Saturation and brightness"
      style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))` }}>
      <div class="sv-thumb" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: thumb }} />
    </div>
  );
}

export function ColorPickerSheet({ open, initial, title, editor, onConfirm, onClose }: Props) {
  const [hsv, setHsv] = useState<[number, number, number]>([0, 0, 0]);
  const [alpha, setAlpha] = useState(255);
  const [hexText, setHexText] = useState('');
  const [paletteId, setPaletteId] = useState('');
  // True while the hex field holds typing that has not been applied yet.
  const hexDirty = useRef(false);

  const color = rgba(...hsvToRgb(hsv[0], hsv[1], hsv[2]), alpha);

  const load = (c: Color, keepHue = hsv[0]) => {
    const [r, g, b, a] = unpack(c);
    const next = rgbToHsv(r, g, b);
    // Greys have no hue of their own; keep the slider where it was.
    if (next[1] === 0 || next[2] === 0) next[0] = keepHue;
    setHsv(next);
    setAlpha(a);
    setHexText(toHex(c));
    hexDirty.current = false;
  };
  const update = (h: number, s: number, v: number, a: number) => {
    setHsv([h, s, v]);
    setAlpha(a);
    setHexText(toHex(rgba(...hsvToRgb(h, s, v), a)));
    hexDirty.current = false;
  };

  useEffect(() => {
    if (open) {
      load(initial, 0);
      setPaletteId('');
    }
  }, [open, initial]);

  const commitHex = () => {
    // Leaving the field by touching a slider must not undo that slider's change.
    if (!hexDirty.current) return;
    const parsed = parseHex(hexText);
    if (parsed === null) setHexText(toHex(color));
    else load(parsed);
  };

  const [pr, pg, pb] = hsvToRgb(hsv[0], hsv[1], hsv[2]);
  return (
    <BottomSheet open={open} onClose={onClose} title={title} testId="color-picker">
      <SvPad hue={hsv[0]} s={hsv[1]} v={hsv[2]} thumb={`rgb(${pr}, ${pg}, ${pb})`} onChange={(sat, val) => update(hsv[0], sat, val, alpha)} />
      <Slider testId="hue" label="Hue" value={hsv[0]} max={359.99}
        background="linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
        onChange={(h) => update(h, hsv[1], hsv[2], alpha)} />
      <Slider testId="alpha" label="Opacity" value={alpha} max={255}
        background={`linear-gradient(to right, rgba(${pr}, ${pg}, ${pb}, 0), rgb(${pr}, ${pg}, ${pb})), repeating-conic-gradient(#9c9ca8 0% 25%, #80808c 0% 50%) 0 0 / 12px 12px`}
        onChange={(a) => update(hsv[0], hsv[1], hsv[2], Math.round(a))} />

      <div class="picker-row">
        <div class="preview" aria-hidden="true">
          <span style={{ background: css(initial) }} />
          <span style={{ background: css(color) }} />
        </div>
        <label class="field">
          <span>Hex</span>
          <input data-testid="hex" type="text" inputMode="text" autoCapitalize="off" autoComplete="off" spellcheck={false}
            maxLength={9} placeholder="#rrggbb" value={hexText}
            onInput={(e) => { hexDirty.current = true; setHexText((e.target as HTMLInputElement).value); }}
            onBlur={commitHex}
            onKeyDown={(e) => { if (e.key === 'Enter') commitHex(); }} />
        </label>
      </div>

      <label class="field wide">
        <span>Swap palette</span>
        <select data-testid="palette-select" value={paletteId}
          onChange={(e) => {
            const id = (e.target as HTMLSelectElement).value;
            const p = PALETTES.find((q) => q.id === id);
            setPaletteId(id);
            if (p) editor.setPalette(p.colors);
          }}>
          <option value="" disabled>Choose a palette…</option>
          {PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.colors.length})</option>)}
        </select>
      </label>

      <button class="primary" data-testid="color-ok" onClick={() => onConfirm(color)}>Use colour</button>
    </BottomSheet>
  );
}
