import { useEffect, useState } from 'preact/hooks';
import type { Editor, EditorState } from '../editor/editor';

/** Re-renders the calling component whenever the editor reports a change. */
export function useEditor(editor: Editor): EditorState {
  const [, bump] = useState(0);
  useEffect(() => editor.subscribe(() => bump((n) => n + 1)), [editor]);
  return editor.state;
}
