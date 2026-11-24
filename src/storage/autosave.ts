import type { Editor } from '../editor/editor';
import { saveSprite, setLastOpenId } from './db';

export const AUTOSAVE_DELAY_MS = 500;
/** How long to wait before trying again after a save fails. */
export const AUTOSAVE_RETRY_MS = 5000;

export interface Autosave {
  /** Saves now if there is anything unsaved. Resolves true when the sprite is safely stored. */
  flush(): Promise<boolean>;
  stop(): void;
}

/**
 * Saves the editor's sprite half a second after the last change (never in the
 * middle of a stroke), and immediately when the app is sent to the background.
 * `onStatus(false)` means the last save failed.
 */
export function startAutosave(editor: Editor, alreadySaved: boolean, onStatus: (ok: boolean) => void): Autosave {
  let savedRevision = alreadySaved ? editor.state.revision : -1;
  let savedId = alreadySaved ? editor.state.sprite.id : '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let askedToPersist = false;
  let failed = false;
  let stopped = false;
  let chain: Promise<boolean> = Promise.resolve(true);

  const dirty = () => editor.state.revision !== savedRevision || editor.state.sprite.id !== savedId;

  const schedule = (ms: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (editor.isStroking) schedule(AUTOSAVE_DELAY_MS);
      else void flush();
    }, ms);
  };

  const save = async (): Promise<boolean> => {
    if (!dirty()) return !failed;
    const { sprite, revision } = editor.state;
    try {
      await saveSprite(sprite);
      await setLastOpenId(sprite.id);
      savedRevision = revision;
      savedId = sprite.id;
      failed = false;
      onStatus(true);
      if (!askedToPersist) {
        askedToPersist = true;
        // Ask the browser not to evict our data when the device runs low on space.
        void navigator.storage?.persist?.().catch(() => {});
      }
      return true;
    } catch {
      failed = true;
      onStatus(false);
      schedule(AUTOSAVE_RETRY_MS);
      return false;
    }
  };

  function flush(): Promise<boolean> {
    if (timer) clearTimeout(timer);
    timer = null;
    chain = chain.then(save);
    return chain;
  }

  const unsubscribe = editor.subscribe(() => {
    if (dirty()) schedule(AUTOSAVE_DELAY_MS);
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
      stopped = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    },
  };
}
