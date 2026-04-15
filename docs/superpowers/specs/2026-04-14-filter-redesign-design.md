# Filter Redesign Design

## Overview

Redesign the recipe filter system from additive OR-based tag chips to a structured category hierarchy with single-select top-level categories, contextual sub-type chips, and contextual sub-filters that appear only when relevant to the selected category. Includes data migrations to clean up tag naming, move biome from a field to a tag, and integrate consumable categories (food, mead).

## Top-Level Categories

Eight mutually exclusive classification tags. Every recipe gets exactly one:

| Tag | Label | Description |
|-----|-------|-------------|
| `melee` | Melee | Swords, axes, maces, fists, knives, spears, pickaxes |
| `ranged` | Ranged | Bows, crossbows, staffs |
| `ammo` | Ammo | Arrows, bolts, missiles |
| `armor` | Armor | Helmets, chests, legs, capes, bucklers, shields, towers |
| `tool` | Tools | Tools, bait |
| `build` | Building | Building recipes and station upgrades |
| `food` | Food | All food items (raw, cooked, baked, feasts) |
| `mead` | Mead | All meads (healing, stamina, eitr, resistance, utility) |

Selecting a category filters to recipes with that tag. Clicking the active category deselects it (shows all items, paginated). Single-select — clicking one deselects the previous and clears its sub-type selection.

## Category → Sub-type Mapping

```typescript
const categories = [
  { label: 'Melee',    tag: 'melee',  subtypes: ['sword', 'axe', 'mace', 'fists', 'knife', 'spear', 'pickaxe'] },
  { label: 'Ranged',   tag: 'ranged', subtypes: ['bow', 'crossbow', 'staff'] },
  { label: 'Ammo',     tag: 'ammo',   subtypes: ['arrow', 'bolt', 'missile'] },
  { label: 'Armor',    tag: 'armor',  subtypes: ['helmet', 'chest', 'legs', 'cape', 'buckler', 'shield', 'tower'] },
  { label: 'Tools',    tag: 'tool',   subtypes: ['bait'] },
  { label: 'Building', tag: 'build',  subtypes: [] },
  { label: 'Food',     tag: 'food',   subtypes: ['raw', 'cooked', 'baked', 'feast'] },
  { label: 'Mead',     tag: 'mead',   subtypes: ['healing', 'stamina', 'eitr', 'resistance', 'utility'] },
];
```

Sub-type chips appear below the categories when a category is selected. Single-select within the row. Clicking refines within the category (AND). Clicking again deselects.

## Contextual Sub-filters

Sub-filter rows appear only when relevant to the selected category. All sub-filters AND with category and sub-type selections.

### Sub-filter visibility matrix

| Category | Handedness | Biome | Stat Focus | Modifiers | Found |
|----------|-----------|-------|------------|-----------|-------|
| None (all) | — | ✓ | — | — | — |
| Melee | ✓ * | ✓ | — | ✓ | — |
| Ranged | ✓ * | ✓ | — | ✓ | — |
| Ammo | — | ✓ | — | ✓ | — |
| Armor | — | ✓ | — | — | — |
| Tools | — | ✓ | — | — | — |
| Building | — | ✓ | — | — | ✓ |
| Food | — | ✓ | ✓ | — | ✓ |
| Mead | — | ✓ | — | — | — |

\* Handedness only shown if the selected sub-type has both 1h and 2h variants.

### Sub-filter details

**Handedness (1h/2h):** Single-select, mutually exclusive. Only shown for Melee/Ranged, and only when the selected sub-type (or category as a whole) contains items with both handedness values.

**Biome:** Single-select across 9 values: Meadows, Black Forest, Swamp, Mountain, Plains, Mistlands, Ashlands, Ocean, Deep North. An item can only be in one biome. Always visible regardless of category.

**Stat Focus:** Single-select. Shown for Food only. Values in display order: HP, Balanced, Stamina, Eitr. Order reflects game progression — balanced foods appear early/mid game before eitr becomes available.

**Modifiers (elemental, magic):** Multi-select. Shown for Melee, Ranged, Ammo.

**Found:** Single-select toggle. Cross-category modifier for foraged/found items (e.g. raw food, rocks, wood). Shown for Food and Building. May expand to other categories in the future as found items are added.

### Interaction rules

**Top-level categories:** Single-select radio behavior. Clicking one deselects the previous category and clears its sub-type selection. Clicking the active category deselects it (shows all).

**Sub-type chips:** Appear below the categories when a category is selected. Single-select within the row. Clicking refines within the category (AND). Clicking again deselects.

**Advanced section:** Collapsed by default. Contains station dropdown and per-station level sliders. Moved from inline to collapsible to reduce visual noise.

## Data Migrations

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

### Classification tag assignment

Remove the `weapon` tag entirely. Replace with `melee` or `ranged` per item. Add `food` tag to all food items, `mead` tag to all mead items. Every recipe must have exactly one of the 8 classification tags.

### Mead tag simplification

Replace granular mead effect tags with broad sub-type categories:

| Old tags | New tag |
|----------|---------|
| `instant-heal`, `minor-healing`, `medium-healing` | `healing` |
| `instant-stamina`, `lingering-stamina` | `stamina` |
| `instant-eitr`, `lingering-eitr` | `eitr` |
| `poison-resistance`, `fire-resistance`, `frost-resistance` | `resistance` |
| `berserkir-mead`, other utility meads | `utility` |

Users differentiate between specific meads via stats displayed in the list view and detail pages.

### Food stat focus tags

Add a stat focus tag to each food item based on its primary stat contribution:

- `hp` — primarily restores health
- `balanced` — boosts multiple stats roughly equally (e.g. boar jerky, wolf jerky)
- `stamina` — primarily restores stamina
- `eitr` — primarily restores eitr

### Found tag

Add `found` tag to all items that are foraged/found rather than crafted: raw food items (raspberries, mushroom, honey, etc.) and potentially building materials (rock, stone, wood) in the future.

### Biome field → tag

The `biome` field on recipes is converted to a tag. Remove the `biome` field from `RecipeSchema` and add the biome value (e.g. `plains`, `meadows`) as a tag on each recipe. The `BiomeSchema` enum values become valid tags. Update `filterRecipes` to filter biomes via tags instead of the dedicated `biomes` field on `FilterState`.

### Additional data fixes

- **Butcher knife**: reclassify from `melee` to `tool` (it's a tool, not a combat weapon)
- **Ocean biome**: add `ocean` to the biome tag values (for ocean-sourced items like Abyssal Razor, Chitin)
- **Elemental tag cleanup**: remove the `elemental` tag from any items that are not actually elemental variants
- **Buckler tag**: items currently tagged only `shield` that are bucklers should get `buckler` tag instead
- **Bait**: reclassify from food-related to `tool` category with `bait` sub-type

### Greatswords

No `greatsword` tag. Two-handed swords are filtered by selecting Melee → Sword + 2h sub-filter.

## Filter Panel Layout

```
── Categories (single-select) ─────────────────────────────
[Melee]  [Ranged]  [Ammo]  [Armor]  [Tools]  [Building]  [Food]  [Mead]

── Sub-types (shown for selected category) ────────────────
  e.g. for Food: [raw] [cooked] [baked] [feast]

── Sub-filters (contextual, shown when relevant) ──────────
  Handedness:  [1h]  [2h]                              (Melee/Ranged only, when applicable)
  Biome:       [Meadows] [Black Forest] [Swamp] [Mountain] [Plains] [Mistlands] [Ashlands] [Ocean] [Deep North]
  Stat focus:  [HP] [Balanced] [Stamina] [Eitr]        (Food only)
  Modifiers:   [Elemental] [Magic]                      (Melee/Ranged/Ammo only)
  Found:       [Found]                                  (Food/Building only)

▸ Advanced ────────────────────────────────────────────────
  Station:     [All stations ▾]
  (Station level filtering deferred to progression modal — see progression-mode spec)
```

## Filter State

Current `FilterState`:
```typescript
interface FilterState {
  type: RecipeType | 'all' | 'found';
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
  tags: string[];                          // category, sub-type, biome, modifiers, handedness, found, stat-focus
  ingredientIds: string[];
  station: string;                         // advanced section
  stationCeilings: Record<string, number>; // advanced section
}
```

Removed:
- `type` — kept on `RecipeSchema` for rendering logic, removed from filter state. Categories replace it for filtering.
- `minStationLevel` / `maxStationLevel` — station ceilings are sufficient
- `biomes` — biome is now a tag

The `filterRecipes` function simplifies: AND all tags in `state.tags` against recipe tags. No special biome or type handling.

### `type` field on RecipeSchema

The `type` field (`crafting`, `cooking`, `building`) remains on `RecipeSchema` as an internal discriminator for rendering logic (which columns to show, which detail view to render). It is not exposed in the filter UI.

**Follow-up:** Consider removing `type` entirely in a future iteration, deriving rendering behavior from tags/stat presence instead.

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
| `hp` | HP |
| `balanced` | Balanced |

## URL State

Tag-based filtering means URL encoding stays simple: `?tags=food,cooked,hp,plains`. The URL encodes exactly what's in `state.tags`. No special handling needed for categories vs sub-filters — they're all just tags.

## Validation Tests

Update `tests/real-data.test.ts`:

1. Every recipe has exactly one classification tag: `melee`, `ranged`, `ammo`, `armor`, `tool`, `build`, `food`, `mead`
2. Every `melee` or `ranged` item has exactly one of `1h`, `2h`
3. Every recipe has at most one biome tag
4. No recipe has removed tags: `weapon`, `club`, `battleaxe`, `sledge`, `tower-shield`, `building`, `one-handed`, `two-handed`
5. Every `food` item has exactly one stat focus tag: `hp`, `balanced`, `stamina`, `eitr`
6. Every `mead` item has exactly one mead sub-type tag: `healing`, `stamina`, `eitr`, `resistance`, `utility`
7. Every `found` item also has a classification tag (`food`, `build`, etc.)

## Components Changed

- `AdvancedFilterPanel.tsx` — rewrite: category chips, sub-type chips, contextual sub-filters, collapsible advanced section
- `FilterBar.tsx` — update props (remove biome/type handling)
- `filter.ts` — simplify `filterRecipes` and `FilterState`
- `url-state.ts` — update encode/decode for new state shape
- `schema.ts` — remove `biome` field from `RecipeSchema`, update `BiomeSchema` usage
- `crafting.yaml` — tag migrations for weapons/armor
- `cooking.yaml` / `spit.yaml` / `raw.yaml` / `feasts.yaml` / `food-table.yaml` — tag migrations for consumables
- `real-data.test.ts` — new validation tests
- `filter.test.ts` — update for new filter logic

## Out of Scope

- Progression mode modal and localStorage (separate spec, built after filter redesign)
- Station level ceiling sliders (moving to progression modal)
- Building sub-categories (deferred)
- Damage type sub-filters within elemental (deferred)
- Additional `found` items for building/crafting categories (rock, stone, wood)
- Search within filtered results (already works, no changes needed)
