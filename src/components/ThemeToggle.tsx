import { createSignal, type Component, For } from 'solid-js';

type Theme = 'light' | 'system' | 'dark';

const options: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'system', label: 'Auto', icon: '' },
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

export const ThemeToggle: Component = () => {
  const [theme, setTheme] = createSignal<Theme>(getStoredTheme());

  function select(value: Theme) {
    setTheme(value);
    applyTheme(value);
  }

  return (
    <div class="theme-toggle" role="radiogroup" aria-label="Color theme">
      <For each={options}>
        {(opt) => (
          <button
            type="button"
            role="radio"
            aria-checked={theme() === opt.value}
            class={`theme-toggle__btn${theme() === opt.value ? ' theme-toggle__btn--active' : ''}`}
            onClick={() => select(opt.value)}
          >
            {opt.icon ? <span aria-hidden="true">{opt.icon}</span> : null}
            {opt.label}
          </button>
        )}
      </For>
    </div>
  );
};
