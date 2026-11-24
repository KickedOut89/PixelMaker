import { useEffect, useState } from 'preact/hooks';
import type { Editor } from '../editor/editor';
import { BottomSheet } from './BottomSheet';

interface Props {
  open: boolean;
  editor: Editor;
  onClose: () => void;
  onNew: () => void;
  onExport: () => void;
}

export function MenuSheet({ open, editor, onClose, onNew, onExport }: Props) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (open) setName(editor.state.sprite.name);
  }, [open]);

  const commit = () => {
    editor.renameSprite(name);
    setName(editor.state.sprite.name);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Sprite" testId="menu-sheet">
      <label class="field wide">
        <span>Name</span>
        <input data-testid="menu-rename" type="text" autoComplete="off" spellcheck={false} maxLength={60} value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      </label>
      <button class="menu-item" data-testid="menu-new" onClick={onNew}>New sprite…</button>
      <button class="menu-item" data-testid="menu-export" onClick={onExport}>Export PNG…</button>
    </BottomSheet>
  );
}
