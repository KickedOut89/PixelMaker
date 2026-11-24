import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MAX_SIZE } from '../core/sprite';
import { BottomSheet } from './BottomSheet';

const PRESETS = [16, 32, 48, 64, 128];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Resolves false if the current sprite could not be saved first (and `discard` was not set). */
  onCreate: (name: string, width: number, height: number, discard: boolean) => Promise<boolean>;
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
  const [unsaved, setUnsaved] = useState(false);
  const busy = useRef(false);

  // Before paint, so the reset can never land after the user's first keystroke.
  useLayoutEffect(() => {
    if (open) {
      setName('sprite');
      setW('32');
      setH('32');
      setUnsaved(false);
    }
  }, [open]);

  // Create reads the fields themselves: state can lag a keystroke behind.
  const nameRef = useRef<HTMLInputElement>(null);
  const wRef = useRef<HTMLInputElement>(null);
  const hRef = useRef<HTMLInputElement>(null);

  const size = (testId: string, label: string, value: string, set: (v: string) => void, ref: typeof wRef) => (
    <label class="field">
      <span>{label}</span>
      <input ref={ref} data-testid={testId} type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={value}
        onInput={(e) => set((e.target as HTMLInputElement).value)}
        onBlur={(e) => {
          const clamped = String(clampSize((e.target as HTMLInputElement).value));
          (e.target as HTMLInputElement).value = clamped;
          set(clamped);
        }} />
    </label>
  );

  const create = async (discard: boolean) => {
    if (busy.current) return; // a second tap while the first is still saving
    busy.current = true;
    try {
      const ok = await onCreate(
        (nameRef.current?.value ?? name).trim() || 'sprite',
        clampSize(wRef.current?.value ?? w),
        clampSize(hRef.current?.value ?? h),
        discard,
      );
      if (!ok) setUnsaved(true);
    } finally {
      busy.current = false;
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="New sprite" testId="new-sheet">
      <label class="field wide">
        <span>Name</span>
        <input ref={nameRef} data-testid="new-name" type="text" autoComplete="off" spellcheck={false} maxLength={60} value={name}
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
        {size('new-w', 'Width (px)', w, setW, wRef)}
        {size('new-h', 'Height (px)', h, setH, hRef)}
      </div>
      {unsaved ? (
        <>
          <p class="error" role="alert" data-testid="new-unsaved">
            Your current sprite couldn't be saved on this device. Close this and export it first, or it will be lost.
          </p>
          <div class="actions">
            <button class="secondary danger" data-testid="new-discard" onClick={() => create(true)}>Discard it and create</button>
            <button class="primary" data-testid="new-keep" onClick={onClose}>Keep my sprite</button>
          </div>
        </>
      ) : (
        <>
          <p class="hint">Any size from 1 to {MAX_SIZE} pixels. Your current sprite is saved first.</p>
          <button class="primary" data-testid="new-create" onClick={() => create(false)}>Create sprite</button>
        </>
      )}
    </BottomSheet>
  );
}
