import type { JSX } from 'preact';

const PATHS: Record<string, JSX.Element> = {
  pencil: <path d="M4 20l1-5L16 4l4 4L9 19l-5 1zM14 6l4 4" />,
  eraser: <path d="M8 20h12M5 14l8-9 7 6-8 9H8l-3-3a2 2 0 0 1 0-3zM10 9l7 6" />,
  fill: <path d="M5 13l7-8 7 7-7 8a2 2 0 0 1-3 0l-4-4a2 2 0 0 1 0-3zM4 13h15M20 17c1 1.5 1.5 2.4 1.5 3a1.5 1.5 0 0 1-3 0c0-.6.5-1.5 1.500-3z" />,
  eyedropper: <path d="M14 6l4 4M12 8l4 4-7 7H5v-4l7-7zM15 5l1-1a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3l-1 1" />,
  undo: <path d="M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12h-1" transform="translate(0 -3)" />,
  redo: <path d="M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 12h1" transform="translate(0 -3)" />,
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 9h6v6H9z" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  swap: <path d="M7 4L3 8l4 4M3 8h13M17 12l4 4-4 4M21 16H8" />,
};

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
