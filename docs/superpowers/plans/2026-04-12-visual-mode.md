# Visual Mode (Light/Dark/System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a three-way theme toggle (Light / Auto / Dark) to the site header that persists in localStorage and applies before first paint.

**Architecture:** Inline `<script>` in `<head>` reads localStorage and sets `data-theme` on `<html>` before CSS loads, preventing FOUC. CSS selectors `[data-theme="light"]` and `[data-theme="dark"]` override the media-query-based defaults. A self-contained Solid.js toggle component in the header manages the setting.

**Tech Stack:** Astro, Solid.js, CSS custom properties, localStorage

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/styles/theme.css` | Modify | Add `[data-theme="light"]` and `[data-theme="dark"]` selectors |
| `src/components/ThemeToggle.tsx` | Create | Solid.js three-way segmented toggle component |
| `src/layouts/Base.astro` | Modify | Add inline head script + mount ThemeToggle in header |

---

### Task 1: CSS — Add explicit theme selectors

**Files:**
- Modify: `src/styles/theme.css:1-37`

- [ ] **Step 1: Add `[data-theme="dark"]` selector**

After the existing `:root` dark palette block (lines 1-17), add a duplicate that forces dark mode when the attribute is set. Insert this between line 17 and line 19:

```css
/* ===== Palette — dark (forced via toggle) ===== */
:root[data-theme="dark"] {
  --bg-dark: oklch(0.1 0.025 264);
  --bg: oklch(0.15 0.025 264);
  --bg-light: oklch(0.2 0.025 264);
  --text: oklch(0.96 0.05 264);
  --text-muted: oklch(0.76 0.05 264);
  --highlight: oklch(0.5 0.05 264);
  --border: oklch(0.4 0.05 264);
  --border-muted: oklch(0.3 0.05 264);
  --primary: oklch(0.76 0.1 264);
  --secondary: oklch(0.76 0.1 84);
  --danger: oklch(0.7 0.05 30);
  --warning: oklch(0.7 0.05 100);
  --success: oklch(0.7 0.05 160);
  --info: oklch(0.7 0.05 260);
}
```

- [ ] **Step 2: Add `[data-theme="light"]` selector**

After the media query block (line ~37 after the insertion), add:

```css
/* ===== Palette — light (forced via toggle) ===== */
:root[data-theme="light"] {
  --bg-dark: oklch(0.92 0.025 264);
  --bg: oklch(0.96 0.025 264);
  --bg-light: oklch(1 0.025 264);
  --text: oklch(0.15 0.05 264);
  --text-muted: oklch(0.4 0.05 264);
  --highlight: oklch(1 0.05 264);
  --border: oklch(0.6 0.05 264);
  --border-muted: oklch(0.7 0.05 264);
  --primary: oklch(0.4 0.1 264);
  --secondary: oklch(0.4 0.1 84);
  --danger: oklch(0.5 0.05 30);
  --warning: oklch(0.5 0.05 100);
  --success: oklch(0.5 0.05 160);
  --info: oklch(0.5 0.05 260);
}
```

These attribute selectors have higher specificity than the media query, so they win when set.

- [ ] **Step 3: Verify CSS manually**

Run: `npx astro build 2>&1 | tail -5`
Expected: Build succeeds with no CSS errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add data-theme attribute selectors for forced light/dark mode"
```

---

### Task 2: Inline head script — FOUC prevention

**Files:**
- Modify: `src/layouts/Base.astro:12-17` (inside `<head>`)

- [ ] **Step 1: Add inline theme script to `<head>`**

In `src/layouts/Base.astro`, add this `<script is:inline>` as the first child of `<head>`, before the `<meta>` tags:

```astro
<head>
    <script is:inline>
      (function() {
        var t = localStorage.getItem("theme");
        if (t === "dark" || t === "light") {
          document.documentElement.dataset.theme = t;
        }
      })();
    </script>
    <meta charset="utf-8" />
```

Key details:
- `is:inline` prevents Astro from bundling/deferring the script — it runs synchronously
- Uses `var` for max compat (no strict-mode issues in inline scripts)
- Only sets attribute for explicit "dark"/"light"; absent or "system" leaves it unset

- [ ] **Step 2: Verify no FOUC**

Run the dev server and test:
```bash
npx astro dev --port 4322 &
```
Open browser, set `localStorage.setItem("theme", "light")` in console, reload. Page should render in light mode with no dark flash.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: add inline head script for flash-free theme persistence"
```

---

### Task 3: ThemeToggle Solid.js component

**Files:**
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the ThemeToggle component**

Create `src/components/ThemeToggle.tsx`:

```tsx
import { createSignal, type Component, For } from 'solid-js';

type Theme = 'light' | 'system' | 'dark';

const options: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'system', label: 'Auto', icon: '' },
  { value: 'dark', label: 'Dark', icon: '☽' },
];

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

function applyTheme(theme: Theme): void {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "feat: add ThemeToggle solid component with three-way light/auto/dark control"
```

---

### Task 4: Style the ThemeToggle

**Files:**
- Modify: `src/styles/theme.css` (append at end)

- [ ] **Step 1: Add toggle styles to theme.css**

Append to `src/styles/theme.css`:

```css
/* ===== Theme toggle ===== */
.theme-toggle {
  display: flex;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  margin-left: auto;
}
.theme-toggle__btn {
  background: transparent;
  border: 0;
  color: var(--text-soft);
  padding: 6px 10px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.theme-toggle__btn:hover {
  color: var(--text);
}
.theme-toggle__btn--active {
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add theme toggle segmented control styles"
```

---

### Task 5: Mount ThemeToggle in Base.astro header

**Files:**
- Modify: `src/layouts/Base.astro:20-28`

- [ ] **Step 1: Import and mount the component**

In `src/layouts/Base.astro`, add the import at the top of the frontmatter:

```astro
---
import '../styles/theme.css';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
```

Then add the component inside the `.site-header-inner` div, after the `<nav>`:

```astro
      <div class="site-header-inner">
        <a href={base} class="brand">⚔ Valheim Helper</a>
        <nav>
          <a href={base}>Recipes</a>
          <a href={`${base}about/`}>About</a>
        </nav>
        <ThemeToggle client:load />
      </div>
```

`client:load` ensures it hydrates immediately (needed to read localStorage and bind click handlers).

- [ ] **Step 2: Verify end-to-end**

Run: `npx astro dev --port 4322`

Check:
1. Toggle appears in header, far right
2. Clicking Light/Auto/Dark changes theme immediately
3. Reload preserves the choice
4. "Auto" follows OS preference
5. No FOUC on any setting

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: mount ThemeToggle in site header"
```

---

### Task 6: Final build verification

- [ ] **Step 1: Run production build**

```bash
npx astro build 2>&1 | tail -10
```

Expected: Clean build, no errors.

- [ ] **Step 2: Preview production build**

```bash
npx astro preview --port 4322
```

Verify toggle works in the production build (inline script present, component hydrated, localStorage persists).

- [ ] **Step 3: Commit any remaining changes if needed**

If all is clean, no additional commit needed.
