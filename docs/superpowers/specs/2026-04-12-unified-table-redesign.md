# Unified Recipe Table Redesign

## Summary

Merge station upgrades into the recipe table as a "building" type, add an advanced filter panel with tag categories and per-station level ceilings, add item upgrade quality levels with stats display, and integrate upgrades into the cart as separate line items.

## 1. Unified Table — "Building" Type

Station upgrades become recipes with `type: 'building'`. The loader generates pseudo-recipes at load time from `stations.yaml` upgrade data — no changes to the YAML files themselves.

Each generated recipe:
- `id`: `upgrade-{stationId}-{level}` (e.g. `upgrade-forge-2`)
- `name`: the upgrade's name (e.g. "Forge Bellows")
- `type`: `'building'`
- `station`: parent station ID
- `stationLevel`: the upgrade's level
- `ingredients`: from the upgrade's `requires` array
- `tags`: `['station-upgrade']`

Schema change: add `'building'` to `RecipeTypeSchema` enum.

The separate stations page (`stations.astro`), landing page, Nav component, `station-filter.ts`, `station-url-state.ts`, and `StationUpgradeTable.tsx` are all removed. Back to single-page app with the original layout (no Nav, no landing).

## 2. Advanced Filter Panel

### Layout

Search box stays always visible at the top of the filter bar. A toggle button "Advanced Filters" expands/collapses a panel below it.

The current type chips and station dropdown move INTO the advanced panel. The current filter bar becomes: search box + "Advanced Filters" toggle + cart button.

### Panel Contents

**Type chips:** All / Crafting / Cooking / Building

**Tag categories** (multi-select toggleable chips):

Grouped categories (with header labels):
- **Weapons:** sword, axe, mace, spear, knife, atgeir, sledge, battleaxe, club
- **Ranged:** bow, crossbow, arrow, bolt, staff
- **Armor:** helmet, chest, legs, cape, shield, tower-shield

Standalone chips (no group header):
- tool, station-upgrade, utility, magic, elemental, building

Selection logic: OR within a group/standalone set, AND between groups. E.g. selecting "sword" + "axe" shows swords AND axes. Selecting "sword" + "tier-3" shows only tier-3 swords.

**Per-station level ceilings:** One number input per station that has upgrades (Workbench 1-5, Forge 1-7, Cauldron 1-6, Galdr Table 1-3, Black Forge 1-3). Default: each station's maxLevel.

These act as ceilings: any recipe (crafting, cooking, or building) requiring a higher station level is hidden. When a per-station ceiling is lower than the global max-level slider, the per-station ceiling wins for that station.

**Min/max level range slider:** Stays as a global filter. Per-station ceilings override the max when lower.

### URL State

Advanced filter state encodes to URL params:
- `tags`: comma-separated active tags (e.g. `tags=sword,one-handed`)
- `stn-{id}`: per-station ceiling (e.g. `stn-forge=3`). Only encoded when below default max.
- `adv`: `1` when panel is expanded (so it opens on page load from shared URL)
- Existing params (`type`, `station`, `lvl`, `maxLvl`, `ing`, `q`) unchanged.

## 3. Item Upgrade Data Model

### Schema Additions

New optional fields on `RecipeSchema`:

```yaml
stats:
  damage:
    slash: 35
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
    stats:
      damage: { slash: 41 }
      block: 15
      parry: 30
      durability: 250
  - quality: 3
    ingredients:
      - { itemId: iron, qty: 20 }
      - { itemId: wood, qty: 4 }
    stats:
      damage: { slash: 47 }
      block: 15
      parry: 30
      durability: 300
```

Zod schemas:

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
}).optional();

export const ItemStatsSchema = z.object({
  damage: DamageStatsSchema,
  armor: z.number().nonnegative().optional(),
  block: z.number().nonnegative().optional(),
  parry: z.number().nonnegative().optional(),
  knockback: z.number().nonnegative().optional(),
  backstab: z.number().nonnegative().optional(),
  durability: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  movementPenalty: z.number().optional(),
}).optional();

export const ItemUpgradeSchema = z.object({
  quality: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  stats: ItemStatsSchema,
});
```

Add to `RecipeSchema`:
```typescript
stats: ItemStatsSchema,
upgrades: z.array(ItemUpgradeSchema).optional(),
```

### Data Population

Upgrade data will be manually added to `crafting.yaml` for weapons, armor, and tools. Data sourced from the Valheim wiki. This is a data entry task that can proceed in parallel with code work.

## 4. Stats Display

### In the Row (Compact)

A small stat summary in the ingredients/materials column area. Shows the primary stat only:
- Weapons: total damage with type, e.g. "35 slash" or "20 slash / 10 frost"
- Armor: armor rating, e.g. "14 armor"
- Tools: damage, e.g. "18 pickaxe"
- Food: already has its own display, unchanged
- Building/station upgrades: no stats, show materials as before

### In Expanded Detail

Full stat table across quality levels when the recipe has upgrades:

| Quality | Damage | Block | Parry | Durability |
|---------|--------|-------|-------|------------|
| ★1 (base) | 35 slash | 15 | 30 | 200 |
| ★2 | 41 slash | 15 | 30 | 250 |
| ★3 | 47 slash | 15 | 30 | 300 |
| ★4 | 53 slash | 15 | 30 | 350 |

Below the stats table, show ingredients per quality level:
- **Base craft:** Iron ×40, Wood ×2, Leather Scraps ×2
- **★2:** Iron ×10, Wood ×2
- **★3:** Iron ×20, Wood ×4

Each upgrade level has a "+" add-to-cart button. A "Max" button adds all available upgrade levels (respecting station ceilings from advanced filters).

For recipes without upgrades (food, building), the expanded view is unchanged.

## 5. Cart Integration

### Cart Entries for Upgrades

Each upgrade quality is a separate cart entry. Cart key format:
- Base recipe: `iron-sword` (unchanged)
- Upgrade: `iron-sword+2`, `iron-sword+3`, `iron-sword+4`

The `+N` suffix denotes upgrade quality. Cart operations (`addToCart`, `removeFromCart`, `setQty`) work on these keys directly — no special logic needed.

### Grocery Aggregation

`aggregateGroceryList` needs to handle upgrade cart entries. When it encounters a key with `+N` suffix:
1. Parse the base recipe ID and quality number
2. Look up the recipe, find the matching upgrade entry
3. Use that upgrade's ingredients (not the base recipe's)

### CartDrawer Display

Upgrade entries display as "Iron Sword +1", "Iron Sword +2" etc. in the cart list. Each has its own quantity controls (±1, ±5, remove).

The grocery list aggregates all entries (base + any upgrades) into the unified ingredient total as before.

### Expanded Row Upgrade Buttons

In the expanded recipe detail, below the stats table and upgrade ingredients:
- Each upgrade level shows a "+" button to add that specific upgrade to cart
- A "Max" button adds all upgrade levels up to the highest available
- "Max" respects per-station level ceilings: if Forge is set to 3 and the item needs Forge 4 for quality 4, "Max" only adds up to quality 3
- Adding an upgrade does NOT add the base recipe — they're independent cart entries
- If an upgrade is already in cart, its "+" button shows "✓" (same pattern as AddToCartButton)

## 6. Follow-Up: Additional Stats

The current `ItemStatsSchema` is intentionally extensible. A follow-up spec (to begin immediately after this plan concludes) will add:
- stagger
- stamina usage
- block armor
- block force  
- block adrenaline
- passives

These will be additional optional fields on `ItemStatsSchema` with corresponding display in the stats table. The schema is designed to accommodate this without restructuring.

## Out of Scope

- Station detail pages
- Separate stations page / landing page / nav component (removed)
- Recipe detail pages for upgrade entries (the `[slug].astro` detail page only handles base recipes)
- Automated wiki scraping for upgrade data
