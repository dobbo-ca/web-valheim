# Mobile Filter Bottom Sheet

## Summary

On mobile (<768px), the advanced filters open as a slide-up bottom sheet instead of expanding inline. Desktop behavior is unchanged.

## Design

### Behavior

- On screens <768px, clicking "Filters" opens a bottom sheet overlay
- On screens >=768px, clicking "Filters" expands the panel inline (existing behavior, unchanged)
- The `advOpen` signal drives both — same toggle, different rendering based on viewport

### Bottom Sheet Structure

```
┌─────────────────────────┐
│  Filters            ✕   │  ← header (fixed)
├─────────────────────────┤
│                         │
│  <AdvancedFilterPanel>  │  ← scrollable body
│                         │
│  (type chips, tags,     │
│   station levels, etc.) │
│                         │
└─────────────────────────┘
```

- **Overlay backdrop**: fixed inset, `rgba(0,0,0,0.4)`, click to close (same as CartDrawer)
- **Sheet**: fixed to bottom, `max-height: 85vh`, scrollable body
- **Header**: "Filters" title + close button (✕)
- **Body**: renders `<AdvancedFilterPanel>` — same component, no changes
- **Animations**: slide-up on open, slide-down on close (mirrors CartDrawer's pattern)
- **Close triggers**: close button, overlay click, Escape key

### Implementation

**Changes to `src/components/FilterBar.tsx` only:**

- Add `mobile` signal using `window.matchMedia('(max-width: 767px)')`, updated on resize via the `change` event listener
- When `mobile() && advOpen()`: render bottom sheet overlay + sheet with AdvancedFilterPanel inside
- When `!mobile() && advOpen()`: render inline panel (existing behavior)
- The `AdvancedFilterPanel` component is unchanged

**CSS additions to `src/styles/theme.css`:**

- `.filter-sheet__overlay` — fixed overlay backdrop with fade
- `.filter-sheet` — fixed bottom sheet with slide-up animation
- `.filter-sheet--closing` — slide-down animation
- `.filter-sheet__header` — flex header with title + close
- `.filter-sheet__body` — overflow-y auto, padding

### What Stays the Same

- `AdvancedFilterPanel` component — no changes
- Filter state, URL encoding — no changes
- Desktop rendering — no changes
- Toggle button behavior and `adv` URL param — no changes

## Out of Scope

- Swipe-to-dismiss gesture (close button and overlay click are sufficient)
- Filter "apply" button (filters apply immediately as on desktop)
