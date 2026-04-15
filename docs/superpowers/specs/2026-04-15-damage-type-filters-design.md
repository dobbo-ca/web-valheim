# Damage Type Filters

Replace the overlapping `elemental` and `magic` modifier filters with specific damage type filters.

## Problem

The current filter panel has two modifier concepts — "Elemental" (melee/ammo) and "Modifiers" (ranged, offering Elemental + Magic) — that overlap confusingly. A fire-damage mace and a fire staff are both "elemental," but the filter treats them differently based on weapon category. Meanwhile "Magic" is redundant: staffs are inherently magic, and eitr armor is already findable via the armor category.

The `damage` field on every weapon already contains the specific damage types. The filter should expose those directly.

## Design

### Damage types exposed as filters

Six non-physical damage types become filterable tags:

- `fire`
- `frost`
- `lightning`
- `poison`
- `spirit`
- `pure`

Physical types (slash, pierce, blunt) and utility types (chop, pickaxe) are excluded — they're on nearly every weapon and don't help narrow results.

### Data changes (`src/data/recipes/crafting.yaml`)

- **Remove** all `elemental` tags (~28 occurrences).
- **Remove** all `magic` tags (~18 occurrences).
- **Add** specific damage type tags derived from each recipe's `damage` field. A weapon with `damage: {slash: 75, frost: 40}` gets the tag `frost`. A weapon with `damage: {blunt: 120, fire: 120}` gets the tag `fire`. Only the six non-physical types above are added as tags.
- Recipes that only have physical damage types get no new tags.

### Filter config changes (`src/lib/filter-categories.ts`)

- **Add** `damageTypes` array:
  ```ts
  export const damageTypes = [
    { label: 'Fire',      tag: 'fire' },
    { label: 'Frost',     tag: 'frost' },
    { label: 'Lightning', tag: 'lightning' },
    { label: 'Poison',    tag: 'poison' },
    { label: 'Spirit',    tag: 'spirit' },
    { label: 'Pure',      tag: 'pure' },
  ] as const;
  ```
- **Remove** `modifiers` array (was `[{Elemental, elemental}, {Magic, magic}]`).
- **Replace** `SubFilterKey` members `'modifiers'` and `'elemental'` with a single `'damageType'`.
- **Update** `categorySubFilters`:
  - `melee`: `['handedness', 'biome', 'damageType']` (was `elemental`)
  - `ranged`: `['handedness', 'biome', 'damageType']` (was `modifiers`)
  - `ammo`: `['biome', 'damageType']` (was `elemental`)

### Panel changes (`src/components/AdvancedFilterPanel.tsx`)

- **Remove** the "Modifiers" section (`<Show when={isSubFilterVisible('modifiers')}>`) and the standalone "Elemental" section (`<Show when={isSubFilterVisible('elemental')}>`).
- **Add** a single "Damage Type" section visible when `isSubFilterVisible('damageType')`:
  ```tsx
  <Show when={isSubFilterVisible('damageType')}>
    <div class="adv-filter__section">
      <span class="adv-filter__label">Damage Type</span>
      <div class="adv-filter__tags" role="group" aria-label="Damage type">
        <For each={damageTypes}>
          {(d) => (
            <button ...>
              <FilterIcon name={d.tag} />
              {d.label}
            </button>
          )}
        </For>
      </div>
    </div>
  </Show>
  ```
- Damage type selection uses multi-toggle (like modifiers did) — user can select multiple damage types.

### Icon wiring

Damage type icons already exist at `public/icons/damage/{type}.svg` (fire, frost, lightning, poison, spirit, pure — all 48x48 pixel art SVGs).

Two options for getting them into the filter sprite:

**Option A (recommended):** Update `scripts/generate-sprite.ts` to also scan `public/icons/damage/` with prefix `filter-`. This avoids duplicating SVG files.

**Option B:** Copy the 6 relevant SVGs into `public/icons/filters/` as `fire.svg`, `frost.svg`, etc. Simple but duplicates files.

### Tag display names

Add entries to `tagDisplayNames` if any damage type needs a display override. Current labels match the tag names (capitalized), so no overrides needed.

### What's removed entirely

- `modifiers` array export
- `elemental` tag from all recipe data
- `magic` tag from all recipe data
- `'modifiers'` and `'elemental'` sub-filter keys
- The two corresponding UI sections in the panel

## Files changed

| File | Change |
|------|--------|
| `src/data/recipes/crafting.yaml` | Remove `elemental`/`magic` tags, add damage type tags |
| `src/lib/filter-categories.ts` | Add `damageTypes`, remove `modifiers`, update sub-filter keys |
| `src/components/AdvancedFilterPanel.tsx` | Replace modifier sections with damage type section |
| `scripts/generate-sprite.ts` | Add `damage/` directory to icon sources (Option A) |

## Testing

- Filter by each damage type and verify correct recipes appear.
- Verify melee, ranged, and ammo categories all show the damage type sub-filter.
- Verify armor, tool, build, food, mead do NOT show damage type sub-filter.
- Verify no references to `elemental` or `magic` remain in filter code or tags.
