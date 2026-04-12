# Unified Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge station upgrades into the recipe table as "building" type, add advanced filters with tag categories and per-station ceilings, add item upgrade quality levels with stats, and integrate upgrades into the cart.

**Architecture:** Extend the existing single-table architecture rather than adding new pages. The loader generates building pseudo-recipes from station data. FilterState grows to include tags and per-station ceilings. Cart keys use a `+N` suffix for upgrade entries. The FilterBar becomes search + toggle, with an expandable AdvancedFilterPanel below.

**Tech Stack:** Astro 6, Solid.js, TypeScript, Zod, Vitest, Playwright

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/schema.ts` | Add `'building'` to RecipeTypeSchema, add DamageStatsSchema, ItemStatsSchema, ItemUpgradeSchema, stats/upgrades to RecipeSchema |
| Modify | `src/lib/types.ts` | Export new types (DamageStats, ItemStats, ItemUpgrade) |
| Modify | `src/lib/loader.ts` | Generate building pseudo-recipes from station upgrades in `loadAll` |
| Modify | `src/lib/filter.ts` | Add `tags`, `stationCeilings` to FilterState; apply tag filtering (OR within group, AND between) and per-station ceiling logic |
| Modify | `src/lib/url-state.ts` | Encode/decode `tags`, `stn-{id}`, `adv` URL params |
| Modify | `src/lib/cart.ts` | Handle `+N` suffix keys in `aggregateGroceryList` |
| Create | `src/components/AdvancedFilterPanel.tsx` | Type chips, tag categories, per-station level inputs |
| Modify | `src/components/FilterBar.tsx` | Reduce to search box + "Advanced Filters" toggle |
| Modify | `src/components/RecipeRow.tsx` | Compact stats in row, full stats table + upgrade buttons in expanded detail |
| Modify | `src/components/RecipeTable.tsx` | Wire advanced filter state, pass upgrade cart handlers to RecipeRow |
| Modify | `src/components/CartDrawer.tsx` | Display upgrade entries as "Item +N" |
| Modify | `src/pages/index.astro` | Revert to recipe table (remove landing page) |
| Modify | `src/layouts/Base.astro` | Revert to original inline header (remove Nav) |
| Modify | `src/styles/theme.css` | Remove nav/landing CSS, add advanced filter + stats table CSS |
| Remove | `src/pages/recipes.astro` | No longer needed (index.astro has the table) |
| Remove | `src/pages/stations.astro` | Merged into main table |
| Remove | `src/components/Nav.tsx` | Single-page, no nav needed |
| Remove | `src/components/StationUpgradeTable.tsx` | Merged into RecipeTable |
| Remove | `src/lib/station-filter.ts` | Logic moved to loader |
| Remove | `src/lib/station-url-state.ts` | No separate station URL state |
| Modify | `tests/filter.test.ts` | Add tests for tags, stationCeilings, building type |
| Modify | `tests/url-state.test.ts` | Add tests for tags, stationCeilings, adv params |
| Create | `tests/cart-upgrades.test.ts` | Test +N suffix handling in aggregateGroceryList |
| Modify | `tests/e2e/smoke.spec.ts` | Revert to single page, add advanced filter + building type tests |

---

### Task 1: Schema + Types — Building Type and Item Stats/Upgrades

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Update RecipeTypeSchema and add stats/upgrade schemas**

In `src/lib/schema.ts`, make these changes:

Change the RecipeTypeSchema line from:
```typescript
export const RecipeTypeSchema = z.enum(['crafting', 'cooking']);
```
to:
```typescript
export const RecipeTypeSchema = z.enum(['crafting', 'cooking', 'building']);
```

Add the following new schemas before `RecipeSchema`:

```typescript
export const DamageStatsSchema = z.object({
  slash: z.number().nonnegative().optional(),
  pierce: z.number().nonnegative().optional(),
  blunt: z.number().nonnegative().optional(),
  fire: z.number().nonnegative().optional(),
  frost: z.number().nonnegative().optional(),
  lightning: z.number().nonnegative().optional(),
  poison: z.number().nonnegative().optional(),
  spirit: z.number().nonnegative().optional(),
});

export const ItemStatsSchema = z.object({
  damage: DamageStatsSchema.optional(),
  armor: z.number().nonnegative().optional(),
  block: z.number().nonnegative().optional(),
  parry: z.number().nonnegative().optional(),
  knockback: z.number().nonnegative().optional(),
  backstab: z.number().nonnegative().optional(),
  durability: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  movementPenalty: z.number().optional(),
});

export const ItemUpgradeSchema = z.object({
  quality: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  stats: ItemStatsSchema.optional(),
});
```

Add `stats` and `upgrades` to RecipeSchema:
```typescript
export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: RecipeTypeSchema,
  station: z.string().min(1),
  stationLevel: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  yields: IngredientRefSchema.optional(),
  skill: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  food: FoodStatsSchema.optional(),
  stats: ItemStatsSchema.optional(),
  upgrades: z.array(ItemUpgradeSchema).optional(),
});
```

- [ ] **Step 2: Export new types**

In `src/lib/types.ts`, add:
```typescript
import type {
  ItemSchema,
  StationSchema,
  RecipeSchema,
  FoodStatsSchema,
  IngredientRefSchema,
  RecipeTypeSchema,
  ItemCategorySchema,
  DamageStatsSchema,
  ItemStatsSchema,
  ItemUpgradeSchema,
} from './schema';

export type Item = z.infer<typeof ItemSchema>;
export type Station = z.infer<typeof StationSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type FoodStats = z.infer<typeof FoodStatsSchema>;
export type IngredientRef = z.infer<typeof IngredientRefSchema>;
export type RecipeType = z.infer<typeof RecipeTypeSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type DamageStats = z.infer<typeof DamageStatsSchema>;
export type ItemStats = z.infer<typeof ItemStatsSchema>;
export type ItemUpgrade = z.infer<typeof ItemUpgradeSchema>;
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/schema.test.ts`
Expected: PASS (existing schema tests still work, building type is additive)

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS. The `'building'` type addition and new optional fields don't break anything.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts src/lib/types.ts
git commit -m "feat: add building type, item stats, and upgrade schemas"
```

---

### Task 2: Loader — Generate Building Pseudo-Recipes

**Files:**
- Modify: `src/lib/loader.ts`
- Modify: `tests/loader.test.ts`
- Modify: `tests/fixtures/valid/stations.yaml`

- [ ] **Step 1: Add upgrade fixtures to valid stations.yaml**

Replace `tests/fixtures/valid/stations.yaml` with:
```yaml
- id: forge
  name: Forge
  maxLevel: 7
  upgrades:
    - level: 2
      name: Forge Bellows
      requires:
        - { itemId: deer-hide, qty: 5 }
- id: cauldron
  name: Cauldron
  maxLevel: 5
  upgrades: []
```

Also add `deer-hide` to `tests/fixtures/valid/items.yaml`. Read the file first, then append:
```yaml
- id: deer-hide
  name: Deer Hide
  category: material
```

- [ ] **Step 2: Write failing tests for building pseudo-recipes**

Add to `tests/loader.test.ts`:
```typescript
it('generates building pseudo-recipes from station upgrades', async () => {
  const data = await loadAll(fixtureRoot('valid'));
  const building = data.recipes.filter((r) => r.type === 'building');
  expect(building.length).toBe(1);
  expect(building[0]).toMatchObject({
    id: 'upgrade-forge-2',
    name: 'Forge Bellows',
    type: 'building',
    station: 'forge',
    stationLevel: 2,
    tags: ['station-upgrade'],
  });
  expect(building[0].ingredients).toEqual([{ itemId: 'deer-hide', qty: 5 }]);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/loader.test.ts`
Expected: FAIL — no building recipes found

- [ ] **Step 4: Implement building recipe generation in loader**

In `src/lib/loader.ts`, after `const data: DataSet = { items, stations, recipes };` and before `validateCrossReferences(data);`, add:

```typescript
  // Generate building pseudo-recipes from station upgrades
  for (const station of stations) {
    for (const upgrade of station.upgrades) {
      recipes.push({
        id: `upgrade-${station.id}-${upgrade.level}`,
        name: upgrade.name ?? `${station.name} Level ${upgrade.level}`,
        type: 'building',
        station: station.id,
        stationLevel: upgrade.level,
        ingredients: upgrade.requires,
        tags: ['station-upgrade'],
      });
    }
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/loader.test.ts`
Expected: All PASS

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/loader.ts tests/loader.test.ts tests/fixtures/valid/stations.yaml tests/fixtures/valid/items.yaml
git commit -m "feat: generate building pseudo-recipes from station upgrades"
```

---

### Task 3: Filter State — Tags and Per-Station Ceilings

**Files:**
- Modify: `src/lib/filter.ts`
- Modify: `tests/filter.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/filter.test.ts` — add a building recipe to the `sample` array:

```typescript
const sample: Recipe[] = [
  // ... existing iron-sword, bronze-sword, queens-jam ...
  {
    id: 'upgrade-forge-2',
    name: 'Forge Bellows',
    type: 'building',
    station: 'forge',
    stationLevel: 2,
    ingredients: [{ itemId: 'wood', qty: 5 }],
    tags: ['station-upgrade'],
  },
];
```

Add these test cases:

```typescript
it('filters by building type', () => {
  expect(
    filterRecipes(sample, { ...empty, type: 'building' }).map((r) => r.id),
  ).toEqual(['upgrade-forge-2']);
});

it('filters by tags (OR within selection)', () => {
  expect(
    filterRecipes(sample, { ...empty, tags: ['sword'] }).map((r) => r.id),
  ).toEqual(['iron-sword', 'bronze-sword']);
});

it('filters by multiple tags (OR — matches any)', () => {
  expect(
    filterRecipes(sample, { ...empty, tags: ['sword', 'station-upgrade'] }).map((r) => r.id),
  ).toEqual(['iron-sword', 'bronze-sword', 'upgrade-forge-2']);
});

it('filters by per-station ceiling', () => {
  expect(
    filterRecipes(sample, { ...empty, stationCeilings: { forge: 1 } }).map((r) => r.id),
  ).toEqual(['bronze-sword', 'queens-jam']);
});

it('per-station ceiling overrides maxStationLevel when lower', () => {
  expect(
    filterRecipes(sample, { ...empty, maxStationLevel: 7, stationCeilings: { forge: 1 } }).map((r) => r.id),
  ).toEqual(['bronze-sword', 'queens-jam']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/filter.test.ts`
Expected: FAIL — `tags` and `stationCeilings` don't exist on FilterState

- [ ] **Step 3: Update FilterState and filterRecipes**

In `src/lib/filter.ts`:

```typescript
import type { Recipe, RecipeType } from './types';

export interface FilterState {
  type: RecipeType | 'all';
  station: string;
  minStationLevel: number;
  maxStationLevel: number;
  ingredientIds: string[];
  query: string;
  tags: string[];
  stationCeilings: Record<string, number>;
}

export const emptyFilterState: FilterState = {
  type: 'all',
  station: 'all',
  minStationLevel: 1,
  maxStationLevel: Number.POSITIVE_INFINITY,
  ingredientIds: [],
  query: '',
  tags: [],
  stationCeilings: {},
};

export function filterRecipes(recipes: Recipe[], state: FilterState): Recipe[] {
  const q = state.query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (state.type !== 'all' && r.type !== state.type) return false;
    if (state.station !== 'all' && r.station !== state.station) return false;
    if (r.stationLevel < state.minStationLevel) return false;

    // Per-station ceiling overrides global max when lower
    const ceiling = state.stationCeilings[r.station];
    const effectiveMax = ceiling != null
      ? Math.min(ceiling, Number.isFinite(state.maxStationLevel) ? state.maxStationLevel : ceiling)
      : state.maxStationLevel;
    if (r.stationLevel > effectiveMax) return false;

    // Tag filtering: OR logic — recipe must have at least one of the selected tags
    if (state.tags.length > 0) {
      const recipeTags = r.tags ?? [];
      if (!state.tags.some((t) => recipeTags.includes(t))) return false;
    }

    if (state.ingredientIds.length > 0) {
      const ingIds = new Set(r.ingredients.map((i) => i.itemId));
      if (!state.ingredientIds.every((id) => ingIds.has(id))) return false;
    }

    if (q.length > 0) {
      const haystacks: string[] = [
        r.name.toLowerCase(),
        ...(r.tags ?? []).map((t) => t.toLowerCase()),
        ...r.ingredients.map((i) => i.itemId.toLowerCase()),
      ];
      if (!haystacks.some((h) => h.includes(q))) return false;
    }

    return true;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/filter.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts tests/filter.test.ts
git commit -m "feat: add tags and per-station ceiling filters"
```

---

### Task 4: URL State — Tags, Station Ceilings, Advanced Panel Toggle

**Files:**
- Modify: `src/lib/url-state.ts`
- Modify: `tests/url-state.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `tests/url-state.test.ts`:

```typescript
it('encodes tags', () => {
  const params = encodeFilterState({ ...emptyFilterState, tags: ['sword', 'one-handed'] });
  expect(params.get('tags')).toBe('sword,one-handed');
});

it('omits empty tags', () => {
  const params = encodeFilterState({ ...emptyFilterState, tags: [] });
  expect(params.get('tags')).toBeNull();
});

it('decodes tags', () => {
  const state = decodeFilterState(new URLSearchParams('tags=sword,axe'));
  expect(state.tags).toEqual(['sword', 'axe']);
});

it('encodes station ceilings', () => {
  const params = encodeFilterState({
    ...emptyFilterState,
    stationCeilings: { forge: 3, workbench: 2 },
  });
  expect(params.get('stn-forge')).toBe('3');
  expect(params.get('stn-workbench')).toBe('2');
});

it('decodes station ceilings', () => {
  const state = decodeFilterState(new URLSearchParams('stn-forge=3&stn-workbench=2'));
  expect(state.stationCeilings).toEqual({ forge: 3, workbench: 2 });
});

it('round-trips tags and station ceilings', () => {
  const original: FilterState = {
    ...emptyFilterState,
    tags: ['sword'],
    stationCeilings: { forge: 5 },
  };
  expect(decodeFilterState(encodeFilterState(original))).toEqual(original);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/url-state.test.ts`
Expected: FAIL

- [ ] **Step 3: Update encode/decode functions**

In `src/lib/url-state.ts`:

```typescript
import type { FilterState } from './filter';
import type { RecipeType } from './types';

export function encodeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.type !== 'all') params.set('type', state.type);
  if (state.station !== 'all') params.set('station', state.station);
  if (state.minStationLevel > 1) params.set('minlvl', String(state.minStationLevel));
  if (Number.isFinite(state.maxStationLevel)) {
    params.set('lvl', String(state.maxStationLevel));
  }
  if (state.ingredientIds.length > 0) {
    params.set('ing', state.ingredientIds.join(','));
  }
  if (state.query.trim().length > 0) {
    params.set('q', state.query.trim());
  }
  if (state.tags.length > 0) {
    params.set('tags', state.tags.join(','));
  }
  for (const [stationId, level] of Object.entries(state.stationCeilings)) {
    params.set(`stn-${stationId}`, String(level));
  }
  return params;
}

const recipeTypes: RecipeType[] = ['crafting', 'cooking', 'building'];

export function decodeFilterState(params: URLSearchParams): FilterState {
  const rawType = params.get('type');
  const type: FilterState['type'] =
    rawType && (recipeTypes as string[]).includes(rawType)
      ? (rawType as RecipeType)
      : 'all';

  const station = params.get('station') ?? 'all';

  const minLvlRaw = params.get('minlvl');
  const minLvlParsed = minLvlRaw == null ? NaN : Number.parseInt(minLvlRaw, 10);
  const minStationLevel = Number.isFinite(minLvlParsed) ? minLvlParsed : 1;

  const lvlRaw = params.get('lvl');
  const lvlParsed = lvlRaw == null ? NaN : Number.parseInt(lvlRaw, 10);
  const maxStationLevel = Number.isFinite(lvlParsed)
    ? lvlParsed
    : Number.POSITIVE_INFINITY;

  const ingRaw = params.get('ing');
  const ingredientIds = ingRaw
    ? ingRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const query = params.get('q') ?? '';

  const tagsRaw = params.get('tags');
  const tags = tagsRaw
    ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const stationCeilings: Record<string, number> = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith('stn-')) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        stationCeilings[key.slice(4)] = parsed;
      }
    }
  }

  return { type, station, minStationLevel, maxStationLevel, ingredientIds, query, tags, stationCeilings };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/url-state.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-state.ts tests/url-state.test.ts
git commit -m "feat: encode/decode tags and station ceilings in URL state"
```

---

### Task 5: Cart — Upgrade Entry Support (+N Suffix)

**Files:**
- Modify: `src/lib/cart.ts`
- Create: `tests/cart-upgrades.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/cart-upgrades.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { aggregateGroceryList } from '../src/lib/cart';
import type { Recipe, Item } from '../src/lib/types';

const recipes: Recipe[] = [
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 2,
    ingredients: [
      { itemId: 'iron', qty: 40 },
      { itemId: 'wood', qty: 2 },
    ],
    upgrades: [
      { quality: 2, ingredients: [{ itemId: 'iron', qty: 10 }, { itemId: 'wood', qty: 2 }] },
      { quality: 3, ingredients: [{ itemId: 'iron', qty: 20 }, { itemId: 'wood', qty: 4 }] },
    ],
  },
];

const items: Item[] = [
  { id: 'iron', name: 'Iron', category: 'material' },
  { id: 'wood', name: 'Wood', category: 'material' },
];

const recipesById = new Map(recipes.map((r) => [r.id, r]));
const itemsById = new Map(items.map((i) => [i.id, i]));

describe('cart upgrade entries', () => {
  it('aggregates base recipe ingredients normally', () => {
    const list = aggregateGroceryList({ 'iron-sword': 1 }, recipesById, itemsById);
    expect(list).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 40 },
      { itemId: 'wood', name: 'Wood', qty: 2 },
    ]);
  });

  it('aggregates upgrade entry ingredients via +N suffix', () => {
    const list = aggregateGroceryList({ 'iron-sword+2': 1 }, recipesById, itemsById);
    expect(list).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 10 },
      { itemId: 'wood', name: 'Wood', qty: 2 },
    ]);
  });

  it('aggregates base + all upgrades together', () => {
    const cart = { 'iron-sword': 1, 'iron-sword+2': 1, 'iron-sword+3': 1 };
    const list = aggregateGroceryList(cart, recipesById, itemsById);
    expect(list).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 70 }, // 40 + 10 + 20
      { itemId: 'wood', name: 'Wood', qty: 8 },  // 2 + 2 + 4
    ]);
  });

  it('ignores upgrade entries for non-existent quality', () => {
    const list = aggregateGroceryList({ 'iron-sword+9': 1 }, recipesById, itemsById);
    expect(list).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cart-upgrades.test.ts`
Expected: FAIL — +N entries not resolved

- [ ] **Step 3: Update aggregateGroceryList to handle +N suffix**

In `src/lib/cart.ts`, replace the `aggregateGroceryList` function:

```typescript
/**
 * Parse a cart key into base recipe ID and optional upgrade quality.
 * "iron-sword" → { baseId: "iron-sword", quality: undefined }
 * "iron-sword+2" → { baseId: "iron-sword", quality: 2 }
 */
function parseCartKey(key: string): { baseId: string; quality?: number } {
  const plusIdx = key.lastIndexOf('+');
  if (plusIdx === -1) return { baseId: key };
  const suffix = key.slice(plusIdx + 1);
  const quality = Number.parseInt(suffix, 10);
  if (!Number.isFinite(quality) || quality <= 1) return { baseId: key };
  return { baseId: key.slice(0, plusIdx), quality };
}

/**
 * Aggregate all recipe ingredients (multiplied by cart qty) into a sorted
 * list of GroceryItems. Handles upgrade entries with +N suffix.
 */
export function aggregateGroceryList(
  cart: Cart,
  recipesById: Map<string, Recipe>,
  itemsById: Map<string, Item>,
): GroceryItem[] {
  const totals = new Map<string, { name: string; qty: number }>();

  for (const [cartKey, cartQty] of Object.entries(cart)) {
    const { baseId, quality } = parseCartKey(cartKey);
    const recipe = recipesById.get(baseId);
    if (!recipe) continue;

    let ingredients: { itemId: string; qty: number }[];
    if (quality != null) {
      const upgrade = recipe.upgrades?.find((u) => u.quality === quality);
      if (!upgrade) continue;
      ingredients = upgrade.ingredients;
    } else {
      ingredients = recipe.ingredients;
    }

    for (const { itemId, qty } of ingredients) {
      const item = itemsById.get(itemId);
      if (!item) continue;

      const existing = totals.get(itemId);
      if (existing) {
        existing.qty += qty * cartQty;
      } else {
        totals.set(itemId, { name: item.name, qty: qty * cartQty });
      }
    }
  }

  return Array.from(totals.entries())
    .map(([itemId, { name, qty }]) => ({ itemId, name, qty }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

Also export `parseCartKey` for use by CartDrawer:
```typescript
export { parseCartKey };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cart-upgrades.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/cart.ts tests/cart-upgrades.test.ts
git commit -m "feat: support upgrade +N suffix in cart grocery aggregation"
```

---

### Task 6: Revert to Single Page

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/theme.css`
- Remove: `src/pages/recipes.astro`
- Remove: `src/pages/stations.astro`
- Remove: `src/components/Nav.tsx`
- Remove: `src/components/StationUpgradeTable.tsx`
- Remove: `src/lib/station-filter.ts`
- Remove: `src/lib/station-url-state.ts`
- Remove: `tests/station-filter.test.ts`
- Remove: `tests/station-url-state.test.ts`

- [ ] **Step 1: Restore index.astro as recipe table**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import { getDataSet } from '../lib/data';
import { getIconSet } from '../lib/icons';
import { RecipeTable } from '../components/RecipeTable';
import { resolve } from 'node:path';

const data = await getDataSet();
const base = import.meta.env.BASE_URL;
const iconDir = resolve(process.cwd(), 'public/icons/items');
const iconIds = [...getIconSet(iconDir)];
---
<Base title="Valheim Recipes">
  <h1>Recipes</h1>
  <p class="subtitle">Filterable crafting + cooking + building reference. Click a row to expand; click an ingredient to reverse-lookup.</p>
  <RecipeTable client:load data={data} baseHref={base} iconIds={iconIds} />
</Base>
```

- [ ] **Step 2: Restore Base.astro to original inline header**

Replace `src/layouts/Base.astro` with:

```astro
---
import '../styles/theme.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Valheim helper — recipes, stations, reverse lookup.' } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <link rel="icon" href={`${base}favicon.svg`} type="image/svg+xml" />
    <title>{title}</title>
  </head>
  <body>
    <header class="site-header">
      <div class="site-header-inner">
        <a href={base} class="brand">⚔ Valheim Helper</a>
      </div>
    </header>
    <main class="container">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 3: Update theme.css — remove nav/landing CSS, restore site-header**

In `src/styles/theme.css`:

Delete the entire nav section (`.nav-hamburger` through the `@media (min-width: 768px)` block, approximately lines 101-235).

Delete the entire landing page section (`.landing` through `.section-card-desc`, approximately lines 857-935).

Add back the site-header CSS where the nav section was:

```css
.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  padding: 14px 20px;
}
.site-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20px;
}
.site-header .brand {
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.5px;
}
```

- [ ] **Step 4: Remove unused files**

```bash
rm src/pages/recipes.astro src/pages/stations.astro src/components/Nav.tsx src/components/StationUpgradeTable.tsx src/lib/station-filter.ts src/lib/station-url-state.ts tests/station-filter.test.ts tests/station-url-state.test.ts
```

- [ ] **Step 5: Update [slug].astro back link**

In `src/pages/recipes/[slug].astro`, change the back link from `${base}recipes/` back to `${base}`:

```astro
<p><a href={base}>← Back to all recipes</a></p>
```

Also revert the ingredient link from `${base}recipes/?ing=` back to `${base}?ing=`:

```astro
<a href={`${base}?ing=${i.itemId}`}>
```

- [ ] **Step 6: Verify build**

Run: `npx astro build`
Expected: Build succeeds

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All PASS (removed test files no longer counted)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: revert to single-page layout, remove nav/landing/stations page"
```

---

### Task 7: AdvancedFilterPanel Component

**Files:**
- Create: `src/components/AdvancedFilterPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/AdvancedFilterPanel.tsx`:

```tsx
import { For, Show, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station } from '../lib/types';

interface TagGroup {
  label: string;
  tags: string[];
}

const tagGroups: TagGroup[] = [
  { label: 'Weapons', tags: ['sword', 'axe', 'mace', 'spear', 'knife', 'atgeir', 'sledge', 'battleaxe', 'club'] },
  { label: 'Ranged', tags: ['bow', 'crossbow', 'arrow', 'bolt', 'staff'] },
  { label: 'Armor', tags: ['helmet', 'chest', 'legs', 'cape', 'shield', 'tower-shield'] },
];

const standaloneTags = ['tool', 'station-upgrade', 'utility', 'magic', 'elemental', 'building'];

interface Props {
  state: FilterState;
  stations: Station[];
  onChange: (next: FilterState) => void;
}

export const AdvancedFilterPanel: Component<Props> = (props) => {
  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  const typeChips: Array<{ value: FilterState['type']; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'crafting', label: 'Crafting' },
    { value: 'cooking', label: 'Cooking' },
    { value: 'building', label: 'Building' },
  ];

  const toggleTag = (tag: string) => {
    const current = props.state.tags;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    update({ tags: next });
  };

  const stationsWithUpgrades = () =>
    props.stations.filter((s) => s.upgrades.length > 0);

  const setCeiling = (stationId: string, level: number) => {
    const next = { ...props.state.stationCeilings, [stationId]: level };
    update({ stationCeilings: next });
  };

  const clearCeiling = (stationId: string) => {
    const next = { ...props.state.stationCeilings };
    delete next[stationId];
    update({ stationCeilings: next });
  };

  const getCeiling = (station: Station): number =>
    props.state.stationCeilings[station.id] ?? station.maxLevel;

  return (
    <div class="adv-filter">
      {/* Type chips */}
      <div class="adv-filter__section">
        <span class="adv-filter__label">Type</span>
        <div class="filter-bar__chips" role="group" aria-label="Recipe type">
          <For each={typeChips}>
            {(chip) => (
              <button
                type="button"
                class="filter-chip"
                classList={{ 'filter-chip--active': props.state.type === chip.value }}
                onClick={() => update({ type: chip.value })}
              >
                {chip.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Station dropdown */}
      <div class="adv-filter__section">
        <span class="adv-filter__label">Station</span>
        <select
          aria-label="Station"
          value={props.state.station}
          onChange={(e) => update({ station: e.currentTarget.value })}
        >
          <option value="all">All stations</option>
          <For each={props.stations}>
            {(s) => <option value={s.id}>{s.name}</option>}
          </For>
        </select>
      </div>

      {/* Level range */}
      <div class="adv-filter__section">
        <span class="adv-filter__label">Level Range</span>
        <div class="adv-filter__level-range">
          <input
            type="number"
            min="1"
            max="7"
            value={props.state.minStationLevel}
            class="adv-filter__level-input"
            aria-label="Minimum level"
            onInput={(e) => {
              const val = Math.max(1, Math.min(7, Number.parseInt(e.currentTarget.value, 10) || 1));
              const max = Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7;
              update({ minStationLevel: Math.min(val, max) });
            }}
          />
          <span class="adv-filter__level-sep">–</span>
          <input
            type="number"
            min="1"
            max="7"
            value={Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7}
            class="adv-filter__level-input"
            aria-label="Maximum level"
            onInput={(e) => {
              const val = Math.max(1, Math.min(7, Number.parseInt(e.currentTarget.value, 10) || 7));
              update({ maxStationLevel: Math.max(val, props.state.minStationLevel) });
            }}
          />
        </div>
      </div>

      {/* Tag categories */}
      <div class="adv-filter__section">
        <span class="adv-filter__label">Categories</span>
        <For each={tagGroups}>
          {(group) => (
            <div class="adv-filter__tag-group">
              <span class="adv-filter__tag-group-label">{group.label}</span>
              <div class="adv-filter__tags">
                <For each={group.tags}>
                  {(tag) => (
                    <button
                      type="button"
                      class="filter-chip filter-chip--sm"
                      classList={{ 'filter-chip--active': props.state.tags.includes(tag) }}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <div class="adv-filter__tags">
          <For each={standaloneTags}>
            {(tag) => (
              <button
                type="button"
                class="filter-chip filter-chip--sm"
                classList={{ 'filter-chip--active': props.state.tags.includes(tag) }}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Per-station level ceilings */}
      <div class="adv-filter__section">
        <span class="adv-filter__label">Station Levels</span>
        <div class="adv-filter__station-levels">
          <For each={stationsWithUpgrades()}>
            {(station) => (
              <div class="adv-filter__station-level">
                <span class="adv-filter__station-name">{station.name}</span>
                <input
                  type="number"
                  min="1"
                  max={station.maxLevel}
                  value={getCeiling(station)}
                  class="adv-filter__level-input"
                  aria-label={`${station.name} level ceiling`}
                  onInput={(e) => {
                    const val = Number.parseInt(e.currentTarget.value, 10);
                    if (Number.isFinite(val) && val >= 1 && val <= station.maxLevel) {
                      if (val === station.maxLevel) {
                        clearCeiling(station.id);
                      } else {
                        setCeiling(station.id, val);
                      }
                    }
                  }}
                />
                <span class="adv-filter__station-max">/ {station.maxLevel}</span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx astro build`
Expected: Build succeeds (component not yet wired)

- [ ] **Step 3: Commit**

```bash
git add src/components/AdvancedFilterPanel.tsx
git commit -m "feat: add AdvancedFilterPanel component"
```

---

### Task 8: FilterBar Restructure

**Files:**
- Modify: `src/components/FilterBar.tsx`

- [ ] **Step 1: Restructure FilterBar to search + toggle**

Replace `src/components/FilterBar.tsx`:

```tsx
import { Show, createSignal, onMount, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station } from '../lib/types';
import { AdvancedFilterPanel } from './AdvancedFilterPanel';

interface Props {
  state: FilterState;
  stations: Station[];
  onChange: (next: FilterState) => void;
}

export const FilterBar: Component<Props> = (props) => {
  const [advOpen, setAdvOpen] = createSignal(false);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('adv') === '1') setAdvOpen(true);
  });

  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  const toggleAdv = () => {
    const next = !advOpen();
    setAdvOpen(next);
    // Persist adv panel state in URL
    const params = new URLSearchParams(window.location.search);
    if (next) {
      params.set('adv', '1');
    } else {
      params.delete('adv');
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const hasActiveFilters = () =>
    props.state.type !== 'all' ||
    props.state.station !== 'all' ||
    props.state.tags.length > 0 ||
    Object.keys(props.state.stationCeilings).length > 0 ||
    props.state.minStationLevel > 1 ||
    Number.isFinite(props.state.maxStationLevel);

  return (
    <div class="filter-bar">
      <input
        type="search"
        class="filter-bar__search"
        placeholder="Search recipes, ingredients, tags…"
        value={props.state.query}
        onInput={(e) => update({ query: e.currentTarget.value })}
      />
      <button
        type="button"
        class="filter-bar__adv-toggle"
        classList={{ 'filter-bar__adv-toggle--active': advOpen() || hasActiveFilters() }}
        onClick={toggleAdv}
        aria-expanded={advOpen()}
        aria-controls="advanced-filters"
      >
        {advOpen() ? '▾ Filters' : '▸ Filters'}
      </button>

      <Show when={advOpen()}>
        <div id="advanced-filters" class="filter-bar__adv-panel">
          <AdvancedFilterPanel
            state={props.state}
            stations={props.stations}
            onChange={props.onChange}
          />
        </div>
      </Show>
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: restructure FilterBar with search + advanced toggle"
```

---

### Task 9: RecipeRow — Stats Display and Upgrade Buttons

**Files:**
- Modify: `src/components/RecipeRow.tsx`

- [ ] **Step 1: Update RecipeRow with stats and upgrade cart integration**

In `src/components/RecipeRow.tsx`, add these new props to the interface:

```typescript
interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  inCart: boolean;
  onToggle: (recipeId: string) => void;
  onIngredientClick: (itemId: string) => void;
  onAddToCart: (recipeId: string) => void;
  onOpenCart: () => void;
  iconIds?: Set<string>;
  iconBase?: string;
  upgradeKeysInCart: Set<string>;
  onAddUpgradeToCart: (cartKey: string) => void;
  onAddMaxUpgrades: (recipeId: string) => void;
}
```

Add a helper function for compact stat summary:

```typescript
function formatStatSummary(recipe: Recipe): string | null {
  if (!recipe.stats) return null;
  if (recipe.stats.damage) {
    const parts = Object.entries(recipe.stats.damage)
      .filter(([, v]) => v != null && v > 0)
      .map(([type, val]) => `${val} ${type}`);
    if (parts.length > 0) return parts.join(' / ');
  }
  if (recipe.stats.armor != null) return `${recipe.stats.armor} armor`;
  return null;
}
```

In the collapsed row, after the ingredients span, add the stat summary:

```tsx
<Show when={!props.expanded}>
  <span class="recipe-row__ings">
    {formatIngredients(props.recipe, props.itemsById)}
    <Show when={formatStatSummary(props.recipe)}>
      {(stat) => <span class="recipe-row__stat-badge">{stat()}</span>}
    </Show>
  </span>
</Show>
```

In the expanded detail section, after the existing ingredients/food/notes sections and before the permalink, add the stats table and upgrade section:

```tsx
<Show when={props.recipe.stats}>
  {(stats) => (
    <div class="recipe-row__section">
      <span class="label">Stats</span>
      <div class="stats-table">
        <Show when={stats().damage}>
          {(dmg) => (
            <For each={Object.entries(dmg()).filter(([, v]) => v != null && v > 0)}>
              {([type, val]) => (
                <div class="stats-table__row">
                  <span class="stats-table__key">{type}</span>
                  <span class="stats-table__val">{val}</span>
                </div>
              )}
            </For>
          )}
        </Show>
        <Show when={stats().armor != null}>
          <div class="stats-table__row">
            <span class="stats-table__key">armor</span>
            <span class="stats-table__val">{stats().armor}</span>
          </div>
        </Show>
        <Show when={stats().block != null}>
          <div class="stats-table__row">
            <span class="stats-table__key">block</span>
            <span class="stats-table__val">{stats().block}</span>
          </div>
        </Show>
        <Show when={stats().parry != null}>
          <div class="stats-table__row">
            <span class="stats-table__key">parry</span>
            <span class="stats-table__val">{stats().parry}</span>
          </div>
        </Show>
        <Show when={stats().durability != null}>
          <div class="stats-table__row">
            <span class="stats-table__key">durability</span>
            <span class="stats-table__val">{stats().durability}</span>
          </div>
        </Show>
        <Show when={stats().weight != null}>
          <div class="stats-table__row">
            <span class="stats-table__key">weight</span>
            <span class="stats-table__val">{stats().weight}</span>
          </div>
        </Show>
      </div>
    </div>
  )}
</Show>

<Show when={props.recipe.upgrades && props.recipe.upgrades.length > 0}>
  <div class="recipe-row__section">
    <span class="label">Upgrades</span>
    <div class="upgrade-list">
      <For each={props.recipe.upgrades!}>
        {(upgrade) => {
          const cartKey = `${props.recipe.id}+${upgrade.quality}`;
          const inCart = () => props.upgradeKeysInCart.has(cartKey);
          return (
            <div class="upgrade-list__entry">
              <div class="upgrade-list__header">
                <span class="upgrade-list__quality">★{upgrade.quality}</span>
                <div class="chips">
                  <For each={upgrade.ingredients}>
                    {(ing) => (
                      <IngredientChip
                        itemId={ing.itemId}
                        label={props.itemsById.get(ing.itemId)?.name ?? ing.itemId}
                        qty={ing.qty}
                        onClick={props.onIngredientClick}
                        hasIcon={props.iconIds?.has(ing.itemId) ?? false}
                        iconBase={props.iconBase ?? '/icons/items'}
                      />
                    )}
                  </For>
                </div>
                <button
                  type="button"
                  class="add-to-cart-btn add-to-cart-btn--sm"
                  classList={{ 'add-to-cart-btn--in-cart': inCart() }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inCart()) {
                      props.onOpenCart();
                    } else {
                      props.onAddUpgradeToCart(cartKey);
                    }
                  }}
                  aria-label={inCart() ? `${props.recipe.name} +${upgrade.quality - 1} in cart` : `Add ${props.recipe.name} +${upgrade.quality - 1} to cart`}
                >
                  {inCart() ? '✓' : '+'}
                </button>
              </div>
              <Show when={upgrade.stats}>
                {(uStats) => (
                  <div class="upgrade-list__stats">
                    <Show when={uStats().damage}>
                      {(dmg) => (
                        <For each={Object.entries(dmg()).filter(([, v]) => v != null && v > 0)}>
                          {([type, val]) => <span class="upgrade-list__stat">{val} {type}</span>}
                        </For>
                      )}
                    </Show>
                    <Show when={uStats().armor != null}>
                      <span class="upgrade-list__stat">{uStats().armor} armor</span>
                    </Show>
                    <Show when={uStats().durability != null}>
                      <span class="upgrade-list__stat">{uStats().durability} dur</span>
                    </Show>
                  </div>
                )}
              </Show>
            </div>
          );
        }}
      </For>
      <button
        type="button"
        class="add-to-cart-btn upgrade-list__max-btn"
        onClick={(e) => {
          e.stopPropagation();
          props.onAddMaxUpgrades(props.recipe.id);
        }}
        aria-label={`Add all upgrades for ${props.recipe.name}`}
      >
        + Max Upgrades
      </button>
    </div>
  </div>
</Show>
```

Import `For` if not already imported (it should be).

- [ ] **Step 2: Verify build**

Run: `npx astro build`
Expected: May fail — RecipeTable doesn't pass the new props yet. That's OK, proceed to Task 10.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecipeRow.tsx
git commit -m "feat: add stats display and upgrade buttons to RecipeRow"
```

---

### Task 10: RecipeTable — Wire Advanced Filters and Upgrade Cart

**Files:**
- Modify: `src/components/RecipeTable.tsx`
- Modify: `src/components/CartDrawer.tsx`

- [ ] **Step 1: Update RecipeTable to pass upgrade props**

In `src/components/RecipeTable.tsx`, add computed sets and handlers:

After the existing `cartKeys` memo, add:

```typescript
const upgradeKeysInCart = createMemo(() => {
  const set = new Set<string>();
  for (const key of cartKeys()) {
    if (key.includes('+')) set.add(key);
  }
  return set;
});

const handleAddUpgradeToCart = (cartKey: string) => {
  const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
  setCart(reconcile(addToCart(snapshot, cartKey)));
};

const handleAddMaxUpgrades = (recipeId: string) => {
  const recipe = recipesById().get(recipeId);
  if (!recipe?.upgrades) return;
  let snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
  for (const upgrade of recipe.upgrades) {
    // Respect station ceilings from current filter state
    const ceiling = state().stationCeilings[recipe.station];
    if (ceiling != null && upgrade.quality > ceiling) continue;
    const key = `${recipeId}+${upgrade.quality}`;
    snapshot = addToCart(snapshot, key);
  }
  setCart(reconcile(snapshot));
};
```

In the `RecipeRow` component usage, add the new props:

```tsx
<RecipeRow
  recipe={recipe}
  itemsById={itemsById()}
  stationsById={stationsById()}
  expanded={expandedId() === recipe.id}
  baseHref={props.baseHref}
  inCart={recipe.id in cart}
  onToggle={toggleRow}
  onIngredientClick={addIngredient}
  onAddToCart={handleAddToCart}
  onOpenCart={() => setDrawerOpen(true)}
  iconIds={iconSet()}
  iconBase={`${props.baseHref}icons/items`}
  upgradeKeysInCart={upgradeKeysInCart()}
  onAddUpgradeToCart={handleAddUpgradeToCart}
  onAddMaxUpgrades={handleAddMaxUpgrades}
/>
```

- [ ] **Step 2: Update CartDrawer to display upgrade entries with +N naming**

In `src/components/CartDrawer.tsx`, import `parseCartKey`:

```typescript
import { formatGroceryList, parseCartKey } from '../lib/cart';
```

Update the `CartEntry` interface isn't needed — the `recipeName` already comes from RecipeTable. But RecipeTable needs to format the name with the upgrade suffix. Update the `cartEntries` memo in `RecipeTable.tsx`:

```typescript
const cartEntries = createMemo(() =>
  cartKeys().map((cartKey) => {
    const { baseId, quality } = parseCartKey(cartKey);
    const baseName = recipesById().get(baseId)?.name ?? baseId;
    const displayName = quality != null ? `${baseName} +${quality - 1}` : baseName;
    return {
      recipeId: cartKey,
      recipeName: displayName,
      qty: cart[cartKey],
    };
  }),
);
```

Import `parseCartKey` in `RecipeTable.tsx`:

```typescript
import {
  addToCart,
  removeFromCart,
  setQty,
  clearCart,
  aggregateGroceryList,
  encodeCartUrl,
  decodeCartUrl,
  parseCartKey,
} from '../lib/cart';
```

- [ ] **Step 3: Verify build**

Run: `npx astro build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/RecipeTable.tsx src/components/CartDrawer.tsx
git commit -m "feat: wire upgrade cart support and advanced filters into RecipeTable"
```

---

### Task 11: CSS — Advanced Filter Panel and Stats Table Styles

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Add advanced filter and stats CSS**

Append to `src/styles/theme.css`:

```css
/* ===== Advanced filter panel ===== */
.filter-bar__adv-toggle {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-soft);
  padding: 8px 14px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.filter-bar__adv-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.filter-bar__adv-toggle--active {
  border-color: var(--accent);
  color: var(--accent);
}
.filter-bar__adv-panel {
  flex-basis: 100%;
}

.adv-filter {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.adv-filter__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.adv-filter__label {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.adv-filter select {
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 6px 10px;
  font: inherit;
  font-size: 12px;
  max-width: 200px;
}
.adv-filter__level-range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.adv-filter__level-input {
  width: 40px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  padding: 4px;
  -moz-appearance: textfield;
}
.adv-filter__level-input::-webkit-inner-spin-button,
.adv-filter__level-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.adv-filter__level-sep {
  color: var(--muted);
}
.adv-filter__tag-group {
  margin-bottom: 4px;
}
.adv-filter__tag-group-label {
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}
.adv-filter__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.filter-chip--sm {
  padding: 4px 10px;
  font-size: 11px;
}
.adv-filter__station-levels {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.adv-filter__station-level {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.adv-filter__station-name {
  color: var(--text);
  font-weight: 500;
  min-width: 80px;
}
.adv-filter__station-max {
  color: var(--muted);
  font-size: 11px;
}

/* ===== Stats table (expanded row) ===== */
.stats-table {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px 16px;
}
.stats-table__row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.stats-table__key {
  color: var(--muted);
  text-transform: capitalize;
}
.stats-table__val {
  color: var(--text);
  font-weight: 600;
}

/* ===== Stat badge (compact row) ===== */
.recipe-row__stat-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  background: color-mix(in oklch, var(--info) 18%, transparent);
  border: 1px solid var(--info);
  border-radius: var(--radius-sm);
  font-size: 10px;
  color: var(--info);
  font-weight: 500;
}

/* ===== Upgrade list (expanded row) ===== */
.upgrade-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.upgrade-list__entry {
  padding: 8px;
  background: color-mix(in oklch, var(--bg) 50%, var(--surface));
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
}
.upgrade-list__header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.upgrade-list__quality {
  color: var(--accent);
  font-weight: 600;
  font-size: 12px;
  min-width: 24px;
}
.upgrade-list__stats {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  font-size: 11px;
}
.upgrade-list__stat {
  color: var(--text-soft);
}
.add-to-cart-btn--sm {
  padding: 2px 8px;
  font-size: 11px;
  min-width: 28px;
  margin-left: auto;
}
.upgrade-list__max-btn {
  align-self: flex-start;
}
```

- [ ] **Step 2: Verify build**

Run: `npx astro build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add advanced filter panel, stats table, and upgrade list CSS"
```

---

### Task 12: E2E Test Updates

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Rewrite E2E tests for single-page + building type**

Replace `tests/e2e/smoke.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('recipe table', () => {
  test('loads and shows recipes including building type', async ({ page }) => {
    await page.goto('/valheim/');
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await page.goto('/valheim/?q=iron+sword');
    await expect(page.getByText('Iron Sword')).toBeVisible();
  });

  test('search filters the table', async ({ page }) => {
    await page.goto('/valheim/?q=chopping+block');
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('expanding a row reveals ingredient chips', async ({ page }) => {
    await page.goto('/valheim/?q=iron+sword');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await expect(page.getByRole('button', { name: /Iron ×60/ })).toBeVisible();
  });

  test('clicking an ingredient chip reverse-filters', async ({ page }) => {
    await page.goto('/valheim/?q=iron+sword');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await page.getByRole('button', { name: /Iron ×60/ }).click();
    await expect(page.getByText('Uses ingredient:')).toBeVisible();
    await expect(page.getByText('Queens Jam')).not.toBeVisible();
  });

  test('URL state survives reload', async ({ page }) => {
    await page.goto('/valheim/?type=cooking');
    // Open advanced filters to use the type filter
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Cooking' }).click();
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('detail page is reachable', async ({ page }) => {
    await page.goto('/valheim/recipes/iron-sword/');
    await expect(page.getByRole('heading', { name: 'Iron Sword' })).toBeVisible();
    await expect(page.getByText(/Used as ingredient in|Ingredients/)).toBeVisible();
  });
});

test.describe('advanced filters', () => {
  test('toggle opens and closes the panel', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByText('Type')).toBeVisible();
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByText('Type')).not.toBeVisible();
  });

  test('building type filter shows station upgrades', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'Building' }).click();
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('station-upgrade tag filter works', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Filters/ }).click();
    await page.getByRole('button', { name: 'station-upgrade' }).click();
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Forge Bellows')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run unit tests**

Run: `npx vitest run`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: update e2e tests for unified table with advanced filters"
```

---

### Task 13: Sample Upgrade Data

**Files:**
- Modify: `src/data/recipes/crafting.yaml`

- [ ] **Step 1: Add sample upgrade data to a few recipes**

Add `stats` and `upgrades` to 3 representative recipes in `crafting.yaml` to verify the feature works end-to-end. Choose: Iron Sword (weapon), Iron Plate Cuirass or equivalent (armor), and Iron Pickaxe (tool).

For the Iron Sword entry, add:

```yaml
- id: iron-sword
  name: Iron Sword
  type: crafting
  station: forge
  stationLevel: 2
  ingredients:
    - { itemId: iron, qty: 60 }
    - { itemId: wood, qty: 2 }
    - { itemId: leather-scraps, qty: 2 }
  tags: [sword, one-handed, tier-3]
  stats:
    damage: { slash: 35 }
    block: 15
    parry: 30
    knockback: 40
    backstab: 3
    durability: 200
    weight: 1.6
  upgrades:
    - quality: 2
      ingredients:
        - { itemId: iron, qty: 10 }
        - { itemId: wood, qty: 2 }
        - { itemId: leather-scraps, qty: 2 }
      stats:
        damage: { slash: 41 }
        block: 15
        parry: 30
        durability: 250
    - quality: 3
      ingredients:
        - { itemId: iron, qty: 20 }
        - { itemId: wood, qty: 4 }
        - { itemId: leather-scraps, qty: 4 }
      stats:
        damage: { slash: 47 }
        block: 15
        parry: 30
        durability: 300
    - quality: 4
      ingredients:
        - { itemId: iron, qty: 30 }
        - { itemId: wood, qty: 6 }
        - { itemId: leather-scraps, qty: 6 }
      stats:
        damage: { slash: 53 }
        block: 15
        parry: 30
        durability: 350
```

Note: Find the existing iron-sword entry in crafting.yaml and replace it with this expanded version. Repeat for 1-2 more items (Iron Pickaxe, an armor piece) with data from the Valheim wiki.

- [ ] **Step 2: Verify build and data loads**

Run: `npx astro build`
Expected: Build succeeds with no schema validation errors

- [ ] **Step 3: Commit**

```bash
git add src/data/recipes/crafting.yaml
git commit -m "data: add sample stats and upgrade data for iron sword"
```

---

### Task 14: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Build**

Run: `npx astro build`
Expected: Build succeeds

- [ ] **Step 3: Typecheck**

Run: `npx astro check && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Manual spot check**

Run: `npx astro dev`

Verify:
- `/valheim/` shows unified recipe table (no landing page, no nav)
- Search works across all types including building
- "Filters" toggle opens advanced panel
- Type chips (All/Crafting/Cooking/Building) work
- Tag category chips filter correctly
- Per-station level ceilings hide appropriate recipes
- Iron Sword row shows "35 slash" stat badge in compact view
- Expanding Iron Sword shows full stats table + upgrade list with ★2/★3/★4
- Each upgrade has a "+" cart button
- "Max Upgrades" button adds all upgrades
- Cart drawer shows "Iron Sword +1", "Iron Sword +2" etc. for upgrade entries
- Grocery list correctly aggregates base + upgrade ingredients
