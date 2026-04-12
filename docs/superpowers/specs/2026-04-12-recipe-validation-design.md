# Recipe Data Validation & Expansion — Design Spec

**Date:** 2026-04-12
**Branch:** `feat/recipe-data-validation`
**Goal:** Verify recipe completeness against the Valheim wiki, add yield quantities, stack sizes, mead recipes, and surface station upgrade names — then update the UI to display all of it.

---

## Approach

Two-phase, data-first:

1. **Phase 1 — Data:** Scrape wiki, produce diff report, update YAML + schema. Team reviews data accuracy before any UI work.
2. **Phase 2 — UI:** Display yields, stack sizes, upgrade names, mead fermenter flow in components.

---

## Phase 1: Data Validation & Expansion

### 1.1 Wiki Scraper & Diff Report

Python scraper that:

- Fetches crafting recipe lists from the wiki by station (Workbench, Forge, Black Forge, Galdr Table, Artisan Table, Stonecutter).
- Fetches cooking recipe lists (Cauldron by level) and mead base recipes.
- Extracts per recipe: name, station, station level, ingredients + quantities, yield quantity.
- Extracts per item: stack size.
- Compares against current YAML data and outputs a markdown diff report:
  - **Missing recipes** — in wiki but not in our data.
  - **Extra recipes** — in our data but not on wiki.
  - **Ingredient mismatches** — wrong quantities or ingredients.
  - **Yield gaps** — recipes producing >1 item that lack a `yields` field.
  - **Station level mismatches** — our `stationLevel` vs. wiki.

The report is saved to `docs/` for team review. The scraper builds on the pattern from the earlier expansion plan (`/tmp/scraper.py`).

### 1.2 Schema Changes

**`ItemSchema` (schema.ts)** — add optional `stackSize`:

```typescript
export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ItemCategorySchema,
  stackSize: z.number().int().positive().optional(),
});
```

**`RecipeSchema` (schema.ts)** — add optional `mead` field:

```typescript
export const MeadInfoSchema = z.object({
  baseName: z.string(),
  fermenterDuration: z.number().int().positive(), // in-game seconds (2400 = 2 in-game days)
});

export const RecipeSchema = z.object({
  // ... existing fields ...
  mead: MeadInfoSchema.optional(),
});
```

The existing `yields: IngredientRefSchema.optional()` field is already in the schema but unused. No schema change needed for yields — just data population.

### 1.3 Data Updates

**`items.yaml`:**

- Add `stackSize` to every item (e.g., `stackSize: 100` for arrows, `stackSize: 50` for ores, `stackSize: 10` for food).
- Add any missing items discovered by the scraper (e.g., dandelion, blood clot, anglerfish, etc. if meads or missing recipes reference them).

**`recipes/crafting.yaml`:**

- Add any missing crafting recipes found in the diff.
- Populate `yields` on all recipes that produce >1 (arrows ×20, bolts ×20, etc.).

**`recipes/cooking.yaml`:**

- Add any missing cooking recipes found in the diff.
- Populate `yields` on food recipes that produce >1 (e.g., Salad ×3).
- Add mead base recipes with the `mead` field:

```yaml
- id: minor-healing-mead
  name: Minor Healing Mead
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: blueberries, qty: 5 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: dandelion, qty: 1 }
  yields: { itemId: minor-healing-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Minor Healing"
    fermenterDuration: 2400
  tags: [mead, heal, tier-1]
```

The list shows the final product name. Ingredients are for the mead base. The `mead` field signals the two-stage flow for the detail view.

**`stations.yaml`:**

- Verify station level assignments match wiki data (scraper validates this).
- Add Fermenter as a station if needed for future reference, though meads don't use it as a `station` field — the fermenter step is informational only.

### 1.4 Validation

- All changes must keep `pnpm test` green (real-data.test validates cross-references).
- Scraper diff report reviewed by team before proceeding to Phase 2.

---

## Phase 2: UI Changes

### 2.1 Yield Display

**Recipe table row:** Show a yield badge next to recipe name when `yields.qty > 1`:

```
Wood Arrow  ×20    [Workbench]    wood ×8
```

**Cart integration:** Divide desired quantity by yield per craft, round up:

```
Want 60 Wood Arrows → 20 per craft → 3 crafts → wood ×24
```

### 2.2 Stack Size Display

**Detail pane:** Show "Stack: 100" in the item stats area. Must-have.

**List row expansion:** Show stack size if space allows. Nice-to-have.

### 2.3 Station Upgrade Names

Replace numeric station levels with human-readable upgrade names, resolved at render time from `stations.yaml`:

- "Cauldron Lv 2" → "Cauldron — Spice Rack"
- "Forge Lv 3" → "Forge — Anvils"

Priority: cooking recipes first (most useful for players), then all stations.

### 2.4 Mead Detail View

**In the list:** Mead recipes appear like any cooking recipe with a "Mead" tag/badge. Ingredients shown are for the mead base.

**In the detail pane / expansion:** Additional section explaining the intermediate step:

> Brew the **Mead Base: Minor Healing** at a Cauldron, then place in a **Fermenter** for 2 in-game days. Produces 6× Minor Healing Mead.

---

## Out of Scope

- Building pieces / structural recipes (separate "Building" session).
- Fermenter as a full crafting station (meads use cauldron as station; fermenter is informational).
- Recipe upgrade costs (upgrading existing gear to higher quality).
- Combined crafting + building cart (being explored in a separate session).

---

## Data Model Summary

```
items.yaml          + stackSize per item
recipes/*.yaml      + yields field on multi-output recipes
                    + mead field on mead recipes
                    + any missing recipes from wiki diff
schema.ts           + stackSize on ItemSchema
                    + MeadInfoSchema + mead on RecipeSchema
stations.yaml       verification only (no structural changes expected)
```
