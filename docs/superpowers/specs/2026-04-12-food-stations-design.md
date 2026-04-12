# Food Stations, Mead Fixes & Icons — Design Spec

**Date:** 2026-04-12
**Branch:** `feat/food-stations`
**Goal:** Add 6 new cooking/brewing stations with all their recipes, fix mead data, generalize two-step recipe schema, add food stats to spit-cooked meats, and create pixel-art icons for all new items.

---

## 1. Schema Change: `mead` → `secondaryStep`

Replace the mead-specific `MeadInfoSchema` with a general-purpose two-step recipe field:

```typescript
export const SecondaryStepSchema = z.object({
  station: z.string().min(1),     // "fermenter", "oven"
  description: z.string().min(1), // human-readable explanation
});

// In RecipeSchema: replace mead field with:
secondaryStep: SecondaryStepSchema.optional(),
```

Remove `MeadInfoSchema` and `MeadInfo` type. Add `SecondaryStepSchema` and `SecondaryStep` type.

Update all UI references from `props.recipe.mead` → `props.recipe.secondaryStep`. The detail view renders `step().description` directly instead of constructing text from `baseName`/`fermenterDuration`.

---

## 2. New Stations

Add to `stations.yaml`. All single-level, no upgrades:

| ID | Name | maxLevel |
|---|---|---|
| `mead-ketill` | Mead Ketill | 1 |
| `cooking-spit` | Cooking Spit | 1 |
| `iron-spit` | Iron Spit | 1 |
| `food-table` | Food Table | 1 |
| `oven` | Oven | 1 |
| `fermenter` | Fermenter | 1 |

The Fermenter is added as a station so `secondaryStep.station` can reference it, but it has no direct recipes — it's only referenced by mead `secondaryStep` fields.

---

## 3. Mead Data Fixes

**Move all meads** from `station: cauldron` → `station: mead-ketill`.

**Migrate** `mead: { baseName, fermenterDuration }` → `secondaryStep: { station: "fermenter", description: "Ferment for 2 in-game days. Produces ×6." }`.

**Fix ingredients:**

| Mead | Current (wrong) | Correct |
|---|---|---|
| Major Healing | honey 10, bloodbag 4, royal-jelly 2, dandelion 1 | honey 10, blood-clot 4, royal-jelly 5 |
| Frost Resistance | honey 10, thistle 5, bloodbag 2, freeze-gland 1 | honey 10, thistle 5, bloodbag 2, greydwarf-eye 1 |

**Remove:** Major Stamina Mead (doesn't exist in-game).

**Add:**

- Lingering Healing Mead (mead-ketill lv1): sap 10, vineberry-cluster 10, smoke-puff 10. Yields ×6 via fermenter.
- Lingering Stamina Mead (mead-ketill lv1): sap 10, cloudberries 10, jotun-puffs 10. Yields ×6 via fermenter.

---

## 4. New Recipes

### 4a. Cooking Spit Recipes (7)

Simple 1:1 cooking. Single ingredient, no `yields` needed (default 1). Add food stats.

| Recipe | Input | HP | Stam | Duration | Regen |
|---|---|---|---|---|---|
| Grilled Neck Tail | neck-tail ×1 | 25 | 8 | 1200 | 2 |
| Cooked Boar Meat | boar-meat ×1 | 30 | 10 | 1200 | 2 |
| Cooked Deer Meat | deer-meat ×1 | 35 | 12 | 1200 | 2 |
| Cooked Fish | fish-raw ×1 | 45 | 15 | 1200 | 3 |
| Cooked Wolf Meat | wolf-meat ×1 | 45 | 15 | 1200 | 3 |
| Cooked Hare Meat | hare-meat ×1 | 60 | 20 | 1200 | 5 |
| Cooked Chicken Meat | chicken-meat ×1 | 60 | 20 | 1200 | 5 |

### 4b. Iron Spit Recipes (6)

Same pattern. These are additional meats only available on the Iron Spit.

| Recipe | Input | HP | Stam | Duration | Regen |
|---|---|---|---|---|---|
| Cooked Serpent Meat | serpent-meat ×1 | 70 | 23 | 1500 | 3 |
| Cooked Lox Meat | lox-meat ×1 | 50 | 16 | 1200 | 4 |
| Cooked Seeker Meat | seeker-meat ×1 | 60 | 20 | 1200 | 5 |
| Cooked Bonemaw Meat | bonemaw-meat ×1 | 90 | 30 | 1500 | 6 |
| Cooked Asksvin Tail | asksvin-tail ×1 | 70 | 24 | 1200 | 6 |
| Cooked Volture Meat | volture-meat ×1 | 70 | 24 | 1200 | 6 |

### 4c. Food Table Recipes (~14)

**Fishing Bait (8):** Each takes fishing-bait ×20 + a specific trophy ×1, yields ×20.

| Recipe | Trophy | Output |
|---|---|---|
| Cold Fishing Bait | ulv-trophy | cold-fishing-bait |
| Frosty Fishing Bait | drake-trophy | frosty-fishing-bait |
| Heavy Fishing Bait | serpent-trophy | heavy-fishing-bait |
| Hot Fishing Bait | surtling-trophy | hot-fishing-bait |
| Misty Fishing Bait | lox-trophy | misty-fishing-bait |
| Mossy Fishing Bait | troll-trophy | mossy-fishing-bait |
| Sticky Fishing Bait | abomination-trophy | sticky-fishing-bait |
| Stingy Fishing Bait | fuling-trophy | stingy-fishing-bait |

**Oven Preparations (6):** These produce uncooked items, with `secondaryStep: { station: "oven", description: "Bake in an Oven (~50 seconds). Burns if left too long." }`.

| Recipe | Ingredients | Output |
|---|---|---|
| Bread | barley-flour ×10 | bread (yields bread-dough, then bake in oven → bread) |
| Fish 'n' Bread | anglerfish ×1, bread-dough ×2 | fish-n-bread (yields uncooked, then bake in oven) |
| Honey Glazed Chicken | chicken-meat ×1, honey ×3, jotun-puffs ×2 | honey-glazed-chicken (via oven) |
| Lox Meat Pie | cloudberries ×2, lox-meat ×2, barley-flour ×4 | lox-meat-pie (via oven) |
| Stuffed Mushroom | magecap ×3, blood-clot ×1, turnip ×2 | stuffed-mushroom (via oven) |
| Meat Platter | hare-meat ×1, lox-meat ×1, seeker-meat ×1 | meat-platter (via oven) |

**Feasts (8):** Tagged `feast`. Each yields ×10 servings. Placed on a Serving Tray.

| Recipe | Ingredients |
|---|---|
| Whole Roasted Meadow Boar | cooked-deer-meat ×2, cooked-boar-meat ×5, dandelion ×4, woodland-herb-blend ×1 |
| Black Forest Buffet Platter | deer-stew ×3, thistle ×5, queens-jam ×4, woodland-herb-blend ×1 |
| Sailor's Bounty | cooked-fish ×5, thistle ×4, cooked-serpent-meat ×2, seafarers-herbs ×1 |
| Swamp Dweller's Delight | sausages ×8, bloodbag ×4, turnip-stew ×2, woodland-herb-blend ×1 |
| Hearty Mountain Logger's Stew | wolf-skewer ×2, onion-soup ×3, carrot ×4, mountain-peak-pepper-powder ×1 |
| Plains Pie Picnic | bread ×3, lox-meat-pie ×2, cloudberries ×5, grasslands-herbalist-harvest ×1 |
| Mushrooms Galore á la Mistlands | misthare-supreme ×1, cooked-seeker-meat ×3, yggdrasil-porridge ×1, herbs-of-the-hidden-hills ×1 |
| Ashlands Gourmet Bowl | cooked-asksvin-tail ×3, vineberry-cluster ×5, scorching-medley ×2, fiery-spice-powder ×1 |

Feast food stats:

| Feast | HP | Stam | Duration | Regen | Eitr |
|---|---|---|---|---|---|
| Whole Roasted Meadow Boar | 35 | 35 | 3000 | 2 | — |
| Black Forest Buffet Platter | 35 | 35 | 3000 | 3 | — |
| Sailor's Bounty | 45 | 45 | 3000 | 3 | — |
| Swamp Dweller's Delight | 35 | 35 | 3000 | 3 | — |
| Hearty Mountain Logger's Stew | 45 | 45 | 3000 | 3 | — |
| Plains Pie Picnic | 55 | 55 | 3000 | 4 | — |
| Mushrooms Galore á la Mistlands | 65 | 65 | 3000 | 5 | 33 |
| Ashlands Gourmet Bowl | 75 | 75 | 3000 | 6 | 38 |

Baked goods food stats:

| Food | HP | Stam | Duration | Regen |
|---|---|---|---|---|
| Bread | 23 | 70 | 1500 | 2 |
| Lox Meat Pie | 75 | 24 | 1800 | 4 |
| Fish 'n' Bread | 30 | 90 | 1800 | 3 |
| Honey Glazed Chicken | 80 | 26 | 1800 | 5 |
| Stuffed Mushroom | 25 | 12 | 1500 | 3 |
| Meat Platter | 80 | 26 | 1800 | 5 |

---

## 5. New Items (~50+)

### Raw meats / ingredients
- `hare-meat`, `chicken-meat`, `bonemaw-meat`, `asksvin-tail`, `volture-meat`, `anglerfish`
- `blood-clot`, `greydwarf-eye`, `smoke-puff`
- `bread-dough` (intermediate — created at food-table, baked in oven)
- `fishing-bait` (base bait)

### Trophies (for bait recipes)
- `ulv-trophy`, `serpent-trophy`, `surtling-trophy`, `lox-trophy`, `troll-trophy`, `abomination-trophy`, `fuling-trophy`

### Cooked meats (recipe outputs that need item entries for yields/food stats)
- `grilled-neck-tail`, `cooked-boar-meat`, `cooked-deer-meat`, `cooked-fish`, `cooked-wolf-meat`, `cooked-hare-meat`, `cooked-chicken-meat`
- `cooked-serpent-meat`, `cooked-lox-meat`, `cooked-seeker-meat`, `cooked-bonemaw-meat`, `cooked-asksvin-tail`, `cooked-volture-meat`

### Bait outputs
- `cold-fishing-bait`, `frosty-fishing-bait`, `heavy-fishing-bait`, `hot-fishing-bait`, `misty-fishing-bait`, `mossy-fishing-bait`, `sticky-fishing-bait`, `stingy-fishing-bait`

### Baked goods
- `bread`, `fish-n-bread`, `honey-glazed-chicken`, `lox-meat-pie`, `stuffed-mushroom`, `meat-platter`

### Bog Witch spices (purchasable)
- `woodland-herb-blend`, `seafarers-herbs`, `mountain-peak-pepper-powder`, `grasslands-herbalist-harvest`, `herbs-of-the-hidden-hills`, `fiery-spice-powder`

### Feast outputs
- `whole-roasted-meadow-boar`, `black-forest-buffet-platter`, `sailors-bounty`, `swamp-dwellers-delight`, `hearty-mountain-loggers-stew`, `plains-pie-picnic`, `mushrooms-galore`, `ashlands-gourmet-bowl`

### Mead fixes
- `blood-clot` (new), `greydwarf-eye` (new), `smoke-puff` (new)
- `lingering-healing-mead`, `lingering-stamina-mead` (new mead products)

### Other referenced items
- `misthare-supreme` (Mistlands food, used in feast)
- `wolf-skewer`, `onion-soup`, `deer-stew`, `turnip-stew`, `yggdrasil-porridge`, `scorching-medley` — some of these already exist as recipes but need item entries for feast cross-references

---

## 6. Eitr Support in FoodStatsSchema

Two feasts grant Eitr (magic resource). Add optional `eitr` field:

```typescript
export const FoodStatsSchema = z.object({
  hp: z.number().nonnegative(),
  stamina: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  regen: z.number().nonnegative(),
  eitr: z.number().nonnegative().optional(),
});
```

Display in RecipeRow food stats section when present.

---

## 7. Icons

Create 48×48 pixel-art SVGs following the existing style guide for every new item. Approximately 50-60 new icons.

**Style:** SVG, 48×48 viewBox, simple shapes (rect, polygon, circle, path), 2-3 tones per icon, no gradients, under 1KB each.

**Categories and reference patterns:**

| New items | Reference pattern |
|---|---|
| Raw meats (hare, chicken, bonemaw, etc.) | `boar-meat.svg` — slab polygon with fat stripe |
| Cooked meats | Similar to raw but with browner tones, char marks |
| Trophies | `deer-trophy.svg` — mounted head/skull shape |
| Fishing bait | Small pellet/worm shapes, color-coded by type |
| Baked goods (bread, pie) | Bowl/plate pattern, golden-brown tones |
| Spices (Bog Witch) | Small jar/pouch shapes, herb colors |
| Feast items | Platter/tray shapes with food arranged on top |
| Meads (new ones) | `sparkling-shroomshake.svg` — cup/bottle shape |
| Blood clot, greydwarf eye, smoke puff | Organic blob patterns, unique colors |
| Dandelion, coal | `mushroom.svg` pattern (dandelion), `stone.svg` pattern (coal) |

---

## 8. UI Changes

### SecondaryStep display

Replace all `props.recipe.mead` references with `props.recipe.secondaryStep`:
- `RecipeRow.tsx`: expanded detail section
- `[slug].astro`: detail page

### Eitr display

Add optional Eitr line to food stats in RecipeRow and [slug].astro when `food.eitr` is present.

### Feast tag

Feasts display a "Feast" badge (similar to how yields show "×20"). The notes field explains the Serving Tray mechanic.

---

## 9. Out of Scope

- Station crafting costs (separate "Building" session)
- Bog Witch as a vendor/trader mechanic (spices are just items with `category: ingredient`)
- Serving Tray as a placeable building piece
- Overcooking → Coal mechanic
