import { useEffect, useState } from 'preact/hooks';
import { MAX_SIZE } from '../core/sprite';
import { BottomSheet } from './BottomSheet';

const PRESETS = [16, 32, 48, 64, 128];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, width: number, height: number) => void;
}

const clampSize = (text: string): number => {
  const n = Math.round(Number(text));
  if (!Number.isFinite(n)) return 32;
  return Math.min(MAX_SIZE, Math.max(1, n));
};

export function NewSpriteSheet({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('sprite');
  const [w, setW] = useState('32');
  const [h, setH] = useState('32');

  useEffect(() => {
    if (open) {
      setName('sprite');
      setW('32');
      setH('32');
    }
  }, [open]);

  const size = (testId: string, label: string, value: string, set: (v: string) => void) => (
    <label class="field">
      <span>{label}</span>
      <input data-testid={testId} type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={value}
        onInput={(e) => set((e.target as HTMLInputElement).value)}
        onBlur={() => set(String(clampSize(value)))} />
    </label>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="New sprite" testId="new-sheet">
      <label class="field wide">
        <span>Name</span>
        <input data-testid="new-name" type="text" autoComplete="off" spellcheck={false} maxLength={60} value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)} />
      </label>
      <div class="presets" role="group" aria-label="Square size presets">
        {PRESETS.map((p) => (
          <button key={p} data-testid={`preset-${p}`} aria-pressed={w === String(p) && h === String(p)}
            onClick={() => { setW(String(p)); setH(String(p)); }}>
            {p}
          </button>
        ))}
      </div>
      <div class="picker-row">
        {size('new-w', 'Width (px)', w, setW)}
        {size('new-h', 'Height (px)', h, setH)}
      </div>
      <p class="hint">Any size from 1 to {MAX_SIZE} pixels. Your current sprite is saved first.</p>
      <button class="primary" data-testid="new-create" onClick={() => onCreate(name.trim() || 'sprite', clampSize(w), clampSize(h))}>
        Create sprite
      </button>
    </BottomSheet>
  );
}
