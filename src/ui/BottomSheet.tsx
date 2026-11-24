import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  testId?: string;
  children: ComponentChildren;
}

/** A panel that slides up from the bottom edge and leaves the canvas visible above it. */
export function BottomSheet({ open, onClose, title, testId, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div class="sheet-layer">
      <div class="sheet-scrim" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} data-testid={testId}>
        <div class="sheet-head">
          <h2>{title}</h2>
          <button class="icon-btn" onClick={onClose} aria-label="Close" data-testid="sheet-close">
            <Icon name="close" />
          </button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}
