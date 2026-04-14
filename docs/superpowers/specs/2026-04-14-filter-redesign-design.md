# Filter Redesign Design

## Overview

Redesign the recipe filter system from additive OR-based tag chips to a structured category hierarchy with single-select top-level categories, sub-type chips, and always-visible sub-filters. Includes data migrations to clean up tag naming and move biome from a field to a tag.

## Data Migrations

### Classification tag changes

Remove the `weapon` tag entirely. Replace with `melee` or `ranged` per item.

New mutually exclusive classification tags (every recipe gets exactly one):
- `melee` — swords, axes, maces, fists, knives, spears, pickaxes
- `ranged` — bows, crossbows, staffs
- `ammo` — arrows, bolts, missiles
- `armor` — helmets, chests, legs, capes, bucklers, shields, towers
- `tool` — tools
- `build` — building recipes and station upgrades

### Tag renames

| Old tag | New tag | Reason |
|---------|---------|--------|
| `club` | `mace` | Club is a mace-type weapon |
| `battleaxe` | `axe` | Battleaxe is an axe-type weapon |
| `sledge` | `mace` | Sledge is a mace-type weapon |
| `tower-shield` | `tower` | Shorter, UI displays "Tower Shield" |
| `building` | `build` | Consistent short tag |
| `one-handed` | `1h` | Shorter tag, UI displays "One-Handed" |
| `two-handed` | `2h` | Shorter tag, UI displays "Two-Handed" |
| `weapon` | removed | Replaced by `melee` / `ranged` |

### Additional data fixes

- **Butcher knife**: reclassify from `melee` to `tool` (it's a tool, not a combat weapon)
- **Ocean biome**: add `ocean` to the biome tag values (for ocean-sourced items like Abyssal Razor, Chitin)
- **Elemental tag cleanup**: remove the `elemental` tag from any items that are not actually elemental variants (audit all items currently tagged `elemental` and remove false positives)
- **Buckler tag**: items currently tagged only `shield` that are bucklers should get `buckler` tag instead. Buckler is a distinct sub-type under Armor, not a synonym for shield.

### Biome field → tag

The `biome` field on recipes is converted to a tag. Remove the `biome` field from `RecipeSchema` and add the biome value (e.g. `plains`, `meadows`) as a tag on each recipe. The `BiomeSchema` enum values become valid tags. Update `filterRecipes` to filter biomes via tags instead of the dedicated `biomes` field on `FilterState`.

### Greatswords

No `greatsword` tag. Two-handed swords are filtered by selecting "Sword" + "2h" sub-filter.

## Filter Panel Layout

```
── Categories (single-select) ─────────────────────────────
[Melee]  [Ranged]  [Ammo]  [Armor]  [Tools]  [Building]

── Sub-types (shown for selected category) ────────────────
  e.g. for Melee: [sword] [axe] [mace] [fists] [knife] [spear] [pickaxe]

── Sub-filters (always visible, AND with above) ───────────
  Handedness:  [1h]  [2h]                    (single-select, mutually exclusive)
  Biome:       [Meadows] [Black Forest] [Swamp] [Mountain] [Plains] [Mistlands] [Ashlands] [Ocean]  (single-select)
  Modifiers:   [Elemental] [Magic]           (multi-select)

▸ Advanced ────────────────────────────────────────────────
  Station:     [All stations ▾]
  Station levels: Workbench [5]/5  Forge [7]/7  ...
```

### Interaction rules

**Top-level categories:** Single-select radio behavior. Clicking one deselects the previous category and clears its sub-type selection. Clicking the active category deselects it (shows all).

**Sub-type chips:** Appear below the categories when a category is selected. Single-select within the row. Clicking refines within the category (AND). Clicking again deselects.

**Handedness (1h/2h):** Single-select, mutually exclusive toggle. Deselect to show all. Only meaningful for melee/ranged but always visible.

**Biome:** Single-select. An item can only be in one biome. Clicking a biome chip filters to that biome. Clicking again deselects.

**Modifiers (elemental, magic):** Multi-select. AND with everything else.

**Advanced section:** Collapsed by default. Contains station dropdown and per-station level sliders. Moved from inline to collapsible to reduce visual noise.

## Filter State Changes

Current `FilterState`:
```typescript
interface FilterState {
  type: RecipeType | 'all';
  station: string;
  minStationLevel: number;
  maxStationLevel: number;
  ingredientIds: string[];
  query: string;
  tags: string[];
  stationCeilings: Record<string, number>;
  biomes: string[];
}
```

New `FilterState`:
```typescript
interface FilterState {
  query: string;
  tags: string[];               // all filtering via tags (category, sub-type, biome, modifiers, handedness)
  ingredientIds: string[];
  station: string;              // moved to advanced
  stationCeilings: Record<string, number>;  // moved to advanced
}
```

Remove:
- `type` — replaced by category tags (`melee`, `ranged`, etc. cover crafting/cooking distinction)
- `minStationLevel` / `maxStationLevel` — station ceilings are sufficient
- `biomes` — biome is now a tag

The `filterRecipes` function simplifies: just AND all tags in `state.tags` against recipe tags. No special biome or type handling.

## Tag Display Mapping

The UI displays human-readable labels for short tags:

| Tag | Display |
|-----|---------|
| `1h` | One-Handed |
| `2h` | Two-Handed |
| `tower` | Tower Shield |
| `build` | Building |
| `melee` | Melee |
| `ranged` | Ranged |
| `ammo` | Ammo |

## Category → Sub-type Mapping

```typescript
const categories = [
  { label: 'Melee', tag: 'melee', subtypes: ['sword', 'axe', 'mace', 'fists', 'knife', 'spear', 'pickaxe'] },
  { label: 'Ranged', tag: 'ranged', subtypes: ['bow', 'crossbow', 'staff'] },
  { label: 'Ammo', tag: 'ammo', subtypes: ['arrow', 'bolt', 'missile'] },
  { label: 'Armor', tag: 'armor', subtypes: ['helmet', 'chest', 'legs', 'cape', 'buckler', 'shield', 'tower'] },
  { label: 'Tools', tag: 'tool', subtypes: [] },
  { label: 'Building', tag: 'build', subtypes: [] },
];
```

## Validation Tests

Update `tests/real-data.test.ts`:

1. Every recipe has exactly one classification tag: `melee`, `ranged`, `ammo`, `armor`, `tool`, `build`
2. Every `melee` or `ranged` item has exactly one of `1h`, `2h`
3. Every recipe has at most one biome tag
4. No recipe has the removed tags: `weapon`, `club`, `battleaxe`, `sledge`, `tower-shield`, `building`, `one-handed`, `two-handed`

## URL State

Tag-based filtering means URL encoding stays simple: `?tags=melee,sword,1h,plains`. The URL encodes exactly what's in `state.tags`. No special handling needed for categories vs sub-filters — they're all just tags.

## Components Changed

- `AdvancedFilterPanel.tsx` — rewrite: category chips, sub-type chips, sub-filters, collapsible advanced section
- `FilterBar.tsx` — update props (remove biome/type handling)
- `filter.ts` — simplify `filterRecipes` and `FilterState`
- `url-state.ts` — update encode/decode for new state shape
- `schema.ts` — remove `biome` field from `RecipeSchema`, update `BiomeSchema` usage
- `crafting.yaml` — tag migrations
- `real-data.test.ts` — new validation tests
- `filter.test.ts` — update for new filter logic

## Out of Scope

- Building sub-categories (deferred)
- Damage type sub-filters within elemental (deferred)
- Search within filtered results (already works, no changes needed)
