import type { Editor } from '../editor/editor';
import { Icon } from './icons';
import { useEditor } from './useEditor';

export function TopBar({ editor, onMenu }: { editor: Editor; onMenu: () => void }) {
  const state = useEditor(editor);
  return (
    <header class="topbar">
      <button class="icon-btn" data-testid="menu" aria-label="Menu" onClick={onMenu}>
        <Icon name="menu" />
      </button>
      <div class="title" data-testid="sprite-name">
        <span class="name">{state.sprite.name}</span>
        <span class="dims">{state.sprite.width}×{state.sprite.height} · {state.viewport.zoom}×</span>
      </div>
      <button class="icon-btn" data-testid="undo" aria-label="Undo" disabled={!editor.history.canUndo} onClick={() => editor.undo()}>
        <Icon name="undo" />
      </button>
      <button class="icon-btn" data-testid="redo" aria-label="Redo" disabled={!editor.history.canRedo} onClick={() => editor.redo()}>
        <Icon name="redo" />
      </button>
      <button class="icon-btn" data-testid="fit" aria-label="Fit sprite to screen" onClick={() => editor.fitView()}>
        <Icon name="fit" />
      </button>
    </header>
  );
}
