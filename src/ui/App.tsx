import { useMemo } from 'preact/hooks';
import { compositeFrame } from '../core/composite';
import { DEFAULT_PALETTE_ID, PALETTES } from '../core/palettes';
import { createSprite } from '../core/sprite';
import { Editor } from '../editor/editor';
import { CanvasView } from './CanvasView';
import { ToolRow } from './ToolRow';
import { TopBar } from './TopBar';

function defaultSprite() {
  const palette = PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID)!;
  return createSprite('sprite', 32, 32, palette.colors);
}

export function App() {
  const editor = useMemo(() => {
    const ed = new Editor(defaultSprite());
    // Handle for automated tests and for poking at the app from the console.
    (window as unknown as Record<string, unknown>).__pm = {
      editor: ed,
      pixel(x: number, y: number): number {
        const { sprite, frame } = ed.state;
        const d = compositeFrame(sprite, frame);
        const i = (y * sprite.width + x) * 4;
        return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
      },
    };
    return ed;
  }, []);

  return (
    <div data-testid="app" class="app">
      <TopBar editor={editor} onMenu={() => {}} />
      <main class="stage">
        <CanvasView editor={editor} />
      </main>
      <ToolRow editor={editor} />
    </div>
  );
}
