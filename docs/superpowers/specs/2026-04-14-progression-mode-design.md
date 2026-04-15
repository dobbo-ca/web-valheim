# Progression Mode Design

## Overview

A spoiler-aware progression system that lets users set their current game progression (by biome or manual station levels) and filters items accordingly. Stored in localStorage, persisted across sessions. Built after the filter redesign.

## First Visit Flow

On first page load (no localStorage preference set), show an inline prompt at the top of the page:

> "Want to avoid spoilers? Set your progression to only see items you can currently craft."
> `[Show Everything]` `[Set My Progression]`

- **Show Everything** — dismisses prompt, saves `progression-mode: off` to localStorage. Full catalog visible.
- **Set My Progression** — opens progression modal. After saving, saves `progression-mode: on` and station levels to localStorage.

On subsequent visits, the preference is loaded from localStorage. No prompt shown.

## Header Button

A button in the top header row (alongside text size/style controls). Displays current state at a glance:

- **Progression active:** Shows icon + current biome label (e.g. "🛡 Mountain")
- **Show everything mode:** Shows icon + "All" (e.g. "🛡 All")

Clicking opens the progression modal.

## Progression Modal

Single modal with three sections:

### 1. Mode Toggle

At the top of the modal. Two options: "Use Progression" / "Show Everything."

When switching from progression to show everything, display a warning: "This will show items from all biomes and stations, including potential spoilers. Are you sure?"

### 2. Quick-Set Biome Buttons

Row of biome buttons in progression order: Meadows → Black Forest → Swamp → Mountain → Plains → Mistlands → Ashlands.

**Cumulative behavior:** Clicking "Mountain" means "I've progressed through Meadows, Black Forest, Swamp, and Mountain." Sets all stations to their highest level available up to and including that biome.

Active biome is visually highlighted. Deep North and Ocean are omitted from quick-set (Ocean items are available via other biome stations; Deep North has no content yet).

### 3. Manual Station Overrides

Individual station level controls below the biome buttons. Pre-filled from the biome quick-set selection. User can adjust any station independently (e.g. "I'm in Mountain but rushed Forge 6").

Changing a station level manually does not change the biome quick-set selection — it becomes a custom configuration.

Stations shown: Workbench, Forge, Cauldron, and any other stations with level tiers.

## localStorage Schema

```typescript
interface ProgressionState {
  mode: 'progression' | 'everything';
  biome: string | null;             // quick-set biome, null if custom
  stationLevels: Record<string, number>;  // per-station level overrides
}
```

Key: `valheim-progression`

## Filtering Behavior

When progression mode is active:

- Items whose station level requirement exceeds the user's set level are hidden by default
- Items from stations the user hasn't unlocked yet are hidden
- The category/sub-type/biome filters from the filter panel operate within the visible set (AND with progression)

When "Show Everything" is active:

- No progression filtering applied
- All items visible regardless of station levels
- Filter panel works on full catalog

## Biome → Station Level Mapping

A data mapping defines the maximum station level available at each biome tier. Example structure:

```typescript
const biomeProgression: Record<string, Record<string, number>> = {
  meadows:      { workbench: 2, forge: 0, cauldron: 0 },
  'black-forest': { workbench: 3, forge: 2, cauldron: 1 },
  swamp:        { workbench: 4, forge: 3, cauldron: 2 },
  mountain:     { workbench: 4, forge: 4, cauldron: 3 },
  plains:       { workbench: 5, forge: 7, cauldron: 5 },
  mistlands:    { workbench: 5, forge: 7, cauldron: 6 },
  ashlands:     { workbench: 5, forge: 7, cauldron: 6 },
};
```

Exact values TBD — need to verify against game data for each biome tier.

## Relationship to Filter Redesign

The filter redesign spec removes station level ceilings from the filter panel's Advanced section. This progression modal is where station-level filtering moves to. The filter panel retains a station dropdown for filtering by station name, but level-based filtering is handled entirely by progression mode.

## Components

- `ProgressionButton.tsx` — header button showing current state
- `ProgressionModal.tsx` — modal with mode toggle, biome buttons, station sliders
- `progression.ts` — localStorage read/write, biome-to-station mapping, filtering logic
- Update `filterRecipes` to apply progression constraints when mode is active

## Out of Scope

- Per-item "lock" visual treatment (dimmed/locked items) — may add later
- Syncing progression across devices
- Automatic progression detection from game saves
