import { useRef, useState } from 'preact/hooks';
import { unpack, type Color } from '../core/color';
import type { Editor } from '../editor/editor';
import { BottomSheet } from './BottomSheet';
import { ColorPickerSheet } from './ColorPickerSheet';
import { Icon } from './icons';
import { useEditor } from './useEditor';

const HOLD_MS = 500;

const css = (c: Color) => {
  const [r, g, b, a] = unpack(c);
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
};

type Picker = { kind: 'fg' } | { kind: 'swatch'; index: number } | null;

export function PaletteStrip({ editor }: { editor: Editor }) {
  const state = useEditor(editor);
  const [picker, setPicker] = useState<Picker>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const palette = state.sprite.palette;

  const startHold = (i: number) => {
    held.current = false;
    hold.current = setTimeout(() => {
      held.current = true;
      setMenuFor(i);
    }, HOLD_MS);
  };
  const endHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };

  const initial = picker?.kind === 'swatch' ? palette[picker.index] ?? state.fg : state.fg;

  return (
    <section class="palette" aria-label="Colours">
      <div class="chips">
        <button class="chip fg" data-testid="fg" aria-label="Edit foreground colour" onClick={() => setPicker({ kind: 'fg' })}>
          <span class="swatch-fill" style={{ background: css(state.fg) }} />
        </button>
        <button class="chip bg" data-testid="bg" aria-label="Swap foreground and background colours" onClick={() => editor.swapColors()}>
          <span class="swatch-fill" style={{ background: css(state.bg) }} />
        </button>
      </div>
      <div class="swatches">
        {palette.map((c, i) => (
          <button
            key={`${i}-${c}`}
            class="swatch"
            data-testid={`swatch-${i}`}
            aria-label={`Colour ${i + 1}`}
            aria-pressed={c === state.fg}
            onPointerDown={() => startHold(i)}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (!held.current) editor.setFg(c);
              held.current = false;
            }}
          >
            <span class="swatch-fill" style={{ background: css(c) }} />
          </button>
        ))}
      </div>
      <button class="icon-btn" data-testid="palette-add" aria-label="Add current colour to palette" onClick={() => editor.addPaletteColor(state.fg)}>
        <Icon name="plus" />
      </button>

      <BottomSheet open={menuFor !== null} onClose={() => setMenuFor(null)} title="Palette colour" testId="swatch-menu">
        <button class="menu-item" data-testid="swatch-edit" onClick={() => { setPicker({ kind: 'swatch', index: menuFor! }); setMenuFor(null); }}>
          Edit colour
        </button>
        <button class="menu-item danger" data-testid="swatch-remove" onClick={() => { editor.removePaletteColor(menuFor!); setMenuFor(null); }}>
          Remove from palette
        </button>
      </BottomSheet>

      <ColorPickerSheet
        open={picker !== null}
        initial={initial}
        title={picker?.kind === 'swatch' ? 'Edit palette colour' : 'Colour'}
        editor={editor}
        onClose={() => setPicker(null)}
        onConfirm={(c) => {
          if (picker?.kind === 'swatch') editor.replacePaletteColor(picker.index, c);
          editor.setFg(c);
          setPicker(null);
        }}
      />
    </section>
  );
}
