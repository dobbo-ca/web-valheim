import { createSignal, For, Show, type Component, onCleanup } from 'solid-js';

type TextSize = 'small' | 'medium' | 'large';

const options: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

function getStoredSize(): TextSize {
  if (typeof window === 'undefined') return 'medium';
  const stored = localStorage.getItem('text-size');
  if (stored === 'small' || stored === 'medium' || stored === 'large') return stored;
  return 'medium';
}

function applySize(size: TextSize): void {
  if (typeof window === 'undefined') return;
  document.documentElement.dataset.textSize = size;
  localStorage.setItem('text-size', size);
}

export const TextSizeToggle: Component = () => {
  const [size, setSize] = createSignal<TextSize>(getStoredSize());
  const [open, setOpen] = createSignal(false);

  // Apply on mount
  applySize(size());

  function select(value: TextSize) {
    setSize(value);
    applySize(value);
    setOpen(false);
  }

  function handleClickOutside(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (!el.closest('.text-size-toggle')) {
      setOpen(false);
    }
  }

  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    onCleanup(() => document.removeEventListener('click', handleClickOutside));
  }

  return (
    <div class="text-size-toggle">
      <button
        type="button"
        class="text-size-toggle__trigger"
        aria-label="Text size"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
      >
        Aa
      </button>
      <Show when={open()}>
        <div class="text-size-toggle__menu" role="radiogroup" aria-label="Text size">
          <For each={options}>
            {(opt) => (
              <button
                type="button"
                role="radio"
                aria-checked={size() === opt.value}
                class={`text-size-toggle__option${size() === opt.value ? ' text-size-toggle__option--active' : ''}`}
                onClick={() => select(opt.value)}
              >
                {opt.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
