# Visual Mode (Light/Dark/System) — Design Spec

## Overview

Add a global visual mode setting that defaults to the system preference but allows the user to explicitly choose light or dark mode. The choice persists in localStorage and is applied before first paint to prevent flash of wrong theme.

## Architecture

Three layers:

### 1. Inline Head Script (FOUC Prevention)

An inline `<script>` in `<head>` inside `Base.astro`, before any stylesheets or body content:

- Reads `localStorage.getItem("theme")`
- If `"light"` or `"dark"`, sets `document.documentElement.dataset.theme` to that value
- If `"system"` or absent, does not set the attribute — the existing `@media (prefers-color-scheme)` handles it natively

This runs synchronously before paint, preventing any flash.

### 2. CSS Changes (`theme.css`)

Convert the existing `@media (prefers-color-scheme: light)` media query so light-mode variables also activate via a `[data-theme="light"]` selector on `:root`. Add a `[data-theme="dark"]` selector that explicitly sets dark-mode variables (for users who force dark while their OS is in light mode).

Result:
- No `data-theme` attribute → system preference governs (existing behavior)
- `data-theme="light"` → light palette forced
- `data-theme="dark"` → dark palette forced

### 3. Solid.js Toggle Component (`ThemeToggle.tsx`)

A self-contained Solid.js island component:

- **Three-way segmented control**: sun icon | "Auto" | moon icon
- Active segment gets a highlighted pill/background indicator
- Reads initial state from `localStorage.getItem("theme")` (defaulting to `"system"`)
- On click: writes to localStorage and sets `document.documentElement.dataset.theme`
- For "Auto"/"system": removes the `data-theme` attribute so media query takes over
- No Solid context or provider needed — DOM attribute + localStorage is the source of truth

### Placement

- Inside `Base.astro` header, pushed to the far right via `margin-left: auto` or equivalent flex utility
- Visible on all pages

## Data Flow

1. **Page load** → inline head script reads localStorage → sets `html[data-theme]` before paint
2. **User clicks toggle** → Solid component writes localStorage + updates `document.documentElement.dataset.theme`
3. **Subsequent page navigations** → inline head script picks up persisted value again (Astro MPA model)

## localStorage Key

- Key: `"theme"`
- Values: `"light"`, `"dark"`, `"system"`
- Absent key treated as `"system"`

## Icons

- Sun and moon icons as inline SVGs within the component (no external icon library dependency)

## Testing

- Verify no FOUC on page load with each stored preference
- Verify toggle cycles through all three states correctly
- Verify localStorage persistence across page reloads
- Verify "system/auto" mode correctly follows OS preference changes
