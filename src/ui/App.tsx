import { useEffect, useRef, useState } from 'preact/hooks';
import { compositeFrame } from '../core/composite';
import { DEFAULT_PALETTE_ID, PALETTES } from '../core/palettes';
import { createSprite, type Sprite } from '../core/sprite';
import { Editor } from '../editor/editor';
import { startAutosave, type Autosave } from '../storage/autosave';
import { getLastOpenId, loadSprite } from '../storage/db';
import { CanvasView } from './CanvasView';
import { ExportSheet } from './ExportSheet';
import { MenuSheet } from './MenuSheet';
import { NewSpriteSheet } from './NewSpriteSheet';
import { PaletteStrip } from './PaletteStrip';
import { ToolRow } from './ToolRow';
import { TopBar } from './TopBar';

function defaultSprite(): Sprite {
  const palette = PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID)!;
  return createSprite('sprite', 32, 32, palette.colors);
}

/** Handle for automated tests and for poking at the app from the console. */
function expose(editor: Editor): void {
  (window as unknown as Record<string, unknown>).__pm = {
    editor,
    pixel(x: number, y: number): number {
      const { sprite, frame } = editor.state;
      const d = compositeFrame(sprite, frame);
      const i = (y * sprite.width + x) * 4;
      return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
    },
  };
}

type Sheet = 'menu' | 'new' | 'export' | null;

export function App() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);
  const autosave = useRef<Autosave | null>(null);

  useEffect(() => {
    let stopped = false;
    void (async () => {
      let saved: Sprite | null = null;
      try {
        const id = await getLastOpenId();
        if (id) saved = await loadSprite(id);
      } catch {
        setStorageOk(false);
      }
      if (stopped) return;
      const ed = new Editor(saved ?? defaultSprite());
      expose(ed);
      autosave.current = startAutosave(ed, saved !== null, setStorageOk);
      setEditor(ed);
    })();
    return () => {
      stopped = true;
      autosave.current?.stop();
    };
  }, []);

  if (!editor) return <div data-testid="app" class="app" />;

  /** Returns false, changing nothing, if the current sprite could not be saved and `discard` is not set. */
  const createNew = async (name: string, width: number, height: number, discard: boolean): Promise<boolean> => {
    // Make sure the sprite being left is safely stored before it is replaced.
    const stored = (await autosave.current?.flush()) ?? false;
    if (!stored && !discard) return false;
    editor.loadSprite(createSprite(name, width, height, editor.state.sprite.palette));
    setSheet(null);
    return true;
  };

  return (
    <div data-testid="app" class="app">
      <TopBar editor={editor} onMenu={() => setSheet('menu')} />
      {!storageOk && (
        <p class="banner" role="status" data-testid="storage-warning">
          Can't save on this device right now. Export your sprite to keep it.
        </p>
      )}
      <main class="stage">
        <CanvasView editor={editor} />
      </main>
      <PaletteStrip editor={editor} />
      <ToolRow editor={editor} />
      <MenuSheet open={sheet === 'menu'} editor={editor} onClose={() => setSheet(null)}
        onNew={() => setSheet('new')} onExport={() => setSheet('export')} />
      <NewSpriteSheet open={sheet === 'new'} onClose={() => setSheet(null)} onCreate={createNew} />
      <ExportSheet open={sheet === 'export'} editor={editor} onClose={() => setSheet(null)} />
    </div>
  );
}
