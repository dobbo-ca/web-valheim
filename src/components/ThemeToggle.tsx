import { createSignal, Show, For, type Component, onCleanup } from 'solid-js';

type Theme = 'light' | 'system' | 'dark';

const options: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'system', label: 'Auto', icon: '◑' },
  { value: 'dark', label: 'Dark', icon: '☽' },
];

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  localStorage.setItem('theme', theme);
}

function iconFor(theme: Theme): string {
  return options.find((o) => o.value === theme)!.icon;
}

export const ThemeToggle: Component = () => {
  const [theme, setTheme] = createSignal<Theme>(getStoredTheme());
  const [open, setOpen] = createSignal(false);

  function select(value: Theme) {
    setTheme(value);
    applyTheme(value);
    setOpen(false);
  }

  function handleClickOutside(e: MouseEvent) {
    const el = e.target as HTMLElement;
    if (!el.closest('.theme-toggle')) {
      setOpen(false);
    }
  }

  if (typeof window !== 'undefined') {
    document.addEventListener('click', handleClickOutside);
    onCleanup(() => document.removeEventListener('click', handleClickOutside));
  }

  return (
    <div class="theme-toggle">
      <button
        type="button"
        class="theme-toggle__trigger"
        aria-label="Color theme"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
      >
        {iconFor(theme())}
      </button>
      <Show when={open()}>
        <div class="theme-toggle__menu" role="radiogroup" aria-label="Color theme">
          <For each={options}>
            {(opt) => (
              <button
                type="button"
                role="radio"
                aria-checked={theme() === opt.value}
                class={`theme-toggle__option${theme() === opt.value ? ' theme-toggle__option--active' : ''}`}
                onClick={() => select(opt.value)}
              >
                <span aria-hidden="true">{opt.icon}</span>
                {opt.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
