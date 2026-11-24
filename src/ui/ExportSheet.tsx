import { useEffect, useState } from 'preact/hooks';
import type { Editor } from '../editor/editor';
import { BottomSheet } from './BottomSheet';
import { canShareFile, deliver, frameToPngBlob, pngFilename } from './exportPng';

const SCALES = [1, 2, 4, 8];

export function ExportSheet({ open, editor, onClose }: { open: boolean; editor: Editor; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [shareable, setShareable] = useState(false);
  const [error, setError] = useState('');
  const { sprite, frame } = editor.state;
  const filename = pngFilename(sprite.name, scale);

  useEffect(() => {
    if (!open) return;
    setError('');
    // The share button only appears where the system can actually take a PNG.
    setShareable(canShareFile(new Blob([], { type: 'image/png' }), filename));
  }, [open, filename]);

  const send = async (mode: 'download' | 'share') => {
    try {
      await deliver(await frameToPngBlob(sprite, frame, scale), filename, mode);
      onClose();
    } catch {
      setError(mode === 'share' ? 'Sharing did not work. Try Download instead.' : 'The PNG could not be saved. Try a smaller scale.');
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Export PNG" testId="export-sheet">
      <div class="row">
        <span class="row-label">Scale</span>
        <div class="segmented">
          {SCALES.map((s) => (
            <button key={s} data-testid={`scale-${s}`} aria-pressed={scale === s} onClick={() => setScale(s)}>×{s}</button>
          ))}
        </div>
      </div>
      <div class="row">
        <span class="row-label">Image size</span>
        <span data-testid="export-size">{sprite.width * scale} × {sprite.height * scale} px</span>
      </div>
      <div class="row">
        <span class="row-label">File name</span>
        <span class="filename">{filename}</span>
      </div>
      {error && <p class="error" role="alert">{error}</p>}
      <div class="actions">
        {shareable && <button class="secondary" data-testid="export-share" onClick={() => send('share')}>Share</button>}
        <button class="primary" data-testid="export-download" onClick={() => send('download')}>Download</button>
      </div>
    </BottomSheet>
  );
}
