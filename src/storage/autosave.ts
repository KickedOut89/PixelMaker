import type { Editor } from '../editor/editor';
import { saveSprite, setLastOpenId } from './db';

export const AUTOSAVE_DELAY_MS = 500;

export interface Autosave {
  /** Saves now if there is anything unsaved. Never rejects. */
  flush(): Promise<void>;
  stop(): void;
}

/**
 * Saves the editor's sprite shortly after every change, and immediately when
 * the app is sent to the background. `onStatus(false)` means the last save failed.
 */
export function startAutosave(editor: Editor, alreadySaved: boolean, onStatus: (ok: boolean) => void): Autosave {
  let savedRevision = alreadySaved ? editor.state.revision : -1;
  let savedId = alreadySaved ? editor.state.sprite.id : '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let askedToPersist = false;
  let chain: Promise<void> = Promise.resolve();

  const dirty = () => editor.state.revision !== savedRevision || editor.state.sprite.id !== savedId;

  const save = async () => {
    if (!dirty()) return;
    const { sprite, revision } = editor.state;
    try {
      await saveSprite(sprite);
      await setLastOpenId(sprite.id);
      savedRevision = revision;
      savedId = sprite.id;
      onStatus(true);
      if (!askedToPersist) {
        askedToPersist = true;
        // Ask the browser not to evict our data when the device runs low on space.
        void navigator.storage?.persist?.().catch(() => {});
      }
    } catch {
      onStatus(false);
    }
  };

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    chain = chain.then(save);
    return chain;
  };

  const unsubscribe = editor.subscribe(() => {
    if (!dirty() || timer) return;
    timer = setTimeout(flush, AUTOSAVE_DELAY_MS);
  });
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const onPageHide = () => void flush();
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);

  return {
    flush,
    stop() {
      if (timer) clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    },
  };
}
