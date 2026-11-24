import { useState } from 'preact/hooks';
import { MAX_BRUSH, MIN_BRUSH, type Editor, type ToolId } from '../editor/editor';
import { BottomSheet } from './BottomSheet';
import { Icon } from './icons';
import { useEditor } from './useEditor';

const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'pencil', label: 'Pencil', icon: 'pencil' },
  { id: 'eraser', label: 'Eraser', icon: 'eraser' },
  { id: 'fill', label: 'Fill', icon: 'fill' },
  { id: 'eyedropper', label: 'Pick colour', icon: 'eyedropper' },
];

export function ToolRow({ editor }: { editor: Editor }) {
  const state = useEditor(editor);
  const [options, setOptions] = useState(false);
  const current = TOOLS.find((t) => t.id === state.tool)!;
  const hasBrush = state.tool === 'pencil' || state.tool === 'eraser';

  return (
    <nav class="toolrow" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          class="tool-btn"
          data-testid={`tool-${t.id}`}
          aria-label={t.label}
          aria-pressed={state.tool === t.id}
          onClick={() => (state.tool === t.id ? setOptions(true) : editor.setTool(t.id))}
        >
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}

      <BottomSheet open={options} onClose={() => setOptions(false)} title={`${current.label} options`} testId="tool-options">
        {hasBrush && (
          <>
            <div class="row">
              <span class="row-label">Brush size</span>
              <div class="stepper">
                <button class="icon-btn" data-testid="brush-dec" aria-label="Smaller brush"
                  disabled={state.brushSize <= MIN_BRUSH} onClick={() => editor.setBrushSize(state.brushSize - 1)}>
                  <Icon name="minus" />
                </button>
                <output data-testid="brush-size">{state.brushSize}</output>
                <button class="icon-btn" data-testid="brush-inc" aria-label="Larger brush"
                  disabled={state.brushSize >= MAX_BRUSH} onClick={() => editor.setBrushSize(state.brushSize + 1)}>
                  <Icon name="plus" />
                </button>
              </div>
            </div>
            <div class="row">
              <span class="row-label">Brush shape</span>
              <div class="segmented">
                {(['square', 'round'] as const).map((s) => (
                  <button key={s} data-testid={`brush-${s}`} aria-pressed={state.brushShape === s} onClick={() => editor.setBrushShape(s)}>
                    {s === 'square' ? 'Square' : 'Round'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {state.tool === 'fill' && (
          <div class="row">
            <span class="row-label">Fill</span>
            <div class="segmented">
              <button data-testid="fill-contiguous" aria-pressed={state.fillContiguous} onClick={() => editor.setFillContiguous(true)}>
                Connected area
              </button>
              <button data-testid="fill-global" aria-pressed={!state.fillContiguous} onClick={() => editor.setFillContiguous(false)}>
                Every match
              </button>
            </div>
          </div>
        )}
        {state.tool === 'eyedropper' && (
          <p class="hint">Touch the canvas to pick up a colour. You can also hold a finger still on the canvas with any tool.</p>
        )}
      </BottomSheet>
    </nav>
  );
}
