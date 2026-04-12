# Food Stations, Mead Fixes & Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new cooking/brewing stations with ~40 recipes, fix mead data, generalize two-step recipes, add food stats, and create ~55 pixel-art icons.

**Architecture:** Tasks 1-2 are schema changes (sequential). Task 3 adds stations. Tasks 4-9 are data (items + recipes by station) — mostly parallelizable after Task 3. Task 10 is the mead migration. Tasks 11-12 are UI updates. Task 13+ are icon batches (fully parallel with each other and with data tasks after Task 1).

**Tech Stack:** YAML, Zod 4, Vitest 4, Solid.js, Astro 6, hand-crafted SVG icons

**Working directory:** `/Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations`

---

## Task 1: Replace MeadInfoSchema with SecondaryStepSchema

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `src/lib/types.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Update tests — replace mead tests with secondaryStep tests**

Replace the entire `describe('RecipeSchema — mead field', ...)` block in `tests/schema.test.ts` with:

```typescript
describe('RecipeSchema — secondaryStep field', () => {
  const baseRecipe = {
    id: 'minor-healing-mead',
    name: 'Minor Healing Mead',
    type: 'cooking',
    station: 'mead-ketill',
    stationLevel: 1,
    ingredients: [{ itemId: 'honey', qty: 10 }],
  };

  it('accepts a recipe with secondaryStep', () => {
    const result = RecipeSchema.parse({
      ...baseRecipe,
      yields: { itemId: 'minor-healing-mead', qty: 6 },
      secondaryStep: {
        station: 'fermenter',
        description: 'Ferment for 2 in-game days. Produces ×6.',
      },
    });
    expect(result.secondaryStep?.station).toBe('fermenter');
    expect(result.secondaryStep?.description).toBe('Ferment for 2 in-game days. Produces ×6.');
  });

  it('accepts a recipe without secondaryStep', () => {
    const result = RecipeSchema.parse(baseRecipe);
    expect(result.secondaryStep).toBeUndefined();
  });

  it('rejects secondaryStep with missing station', () => {
    expect(() =>
      RecipeSchema.parse({
        ...baseRecipe,
        secondaryStep: { description: 'Bake in an Oven.' },
      }),
    ).toThrow();
  });

  it('rejects secondaryStep with missing description', () => {
    expect(() =>
      RecipeSchema.parse({
        ...baseRecipe,
        secondaryStep: { station: 'oven' },
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm vitest run tests/schema.test.ts`

Expected: FAIL — `secondaryStep` not recognized by RecipeSchema.

- [ ] **Step 3: Update schema.ts**

Replace `MeadInfoSchema` (lines 44-47) with:

```typescript
export const SecondaryStepSchema = z.object({
  station: z.string().min(1),
  description: z.string().min(1),
});
```

In `RecipeSchema`, replace `mead: MeadInfoSchema.optional(),` with:

```typescript
  secondaryStep: SecondaryStepSchema.optional(),
```

- [ ] **Step 4: Update types.ts**

Replace `MeadInfoSchema` import with `SecondaryStepSchema`. Replace `MeadInfo` type with:

```typescript
export type SecondaryStep = z.infer<typeof SecondaryStepSchema>;
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm vitest run tests/schema.test.ts`

Expected: PASS

- [ ] **Step 6: Run full suite — expect failures in real-data (meads still use `mead` field)**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: real-data.test may fail because cooking.yaml still has `mead:` fields. This is OK — Task 10 migrates the data. If it passes (Zod strips unknown keys), that's fine too.

- [ ] **Step 7: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/lib/schema.ts src/lib/types.ts tests/schema.test.ts
git commit -m "feat(schema): replace MeadInfoSchema with SecondaryStepSchema"
```

---

## Task 2: Add optional eitr to FoodStatsSchema

**Files:**
- Modify: `src/lib/schema.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Add test**

Add to `tests/schema.test.ts`:

```typescript
describe('RecipeSchema — food with eitr', () => {
  it('accepts food stats with eitr', () => {
    const result = RecipeSchema.parse({
      id: 'mushrooms-galore',
      name: 'Mushrooms Galore',
      type: 'cooking',
      station: 'food-table',
      stationLevel: 1,
      ingredients: [{ itemId: 'magecap', qty: 3 }],
      food: { hp: 65, stamina: 65, duration: 3000, regen: 5, eitr: 33 },
    });
    expect(result.food?.eitr).toBe(33);
  });

  it('accepts food stats without eitr', () => {
    const result = RecipeSchema.parse({
      id: 'bread',
      name: 'Bread',
      type: 'cooking',
      station: 'food-table',
      stationLevel: 1,
      ingredients: [{ itemId: 'barley-flour', qty: 10 }],
      food: { hp: 23, stamina: 70, duration: 1500, regen: 2 },
    });
    expect(result.food?.eitr).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm vitest run tests/schema.test.ts`

Expected: FAIL — eitr not recognized.

- [ ] **Step 3: Add eitr to FoodStatsSchema**

In `src/lib/schema.ts`, add to `FoodStatsSchema`:

```typescript
export const FoodStatsSchema = z.object({
  hp: z.number().nonnegative(),
  stamina: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  regen: z.number().nonnegative(),
  eitr: z.number().nonnegative().optional(),
});
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm vitest run tests/schema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/lib/schema.ts tests/schema.test.ts
git commit -m "feat(schema): add optional eitr field to FoodStatsSchema"
```

---

## Task 3: Add new stations to stations.yaml

**Files:**
- Modify: `src/data/stations.yaml`

- [ ] **Step 1: Add 6 new stations**

Append to `src/data/stations.yaml`:

```yaml
- id: mead-ketill
  name: Mead Ketill
  maxLevel: 1
  upgrades: []
- id: cooking-spit
  name: Cooking Spit
  maxLevel: 1
  upgrades: []
- id: iron-spit
  name: Iron Spit
  maxLevel: 1
  upgrades: []
- id: food-table
  name: Food Table
  maxLevel: 1
  upgrades: []
- id: oven
  name: Oven
  maxLevel: 1
  upgrades: []
- id: fermenter
  name: Fermenter
  maxLevel: 1
  upgrades: []
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS (or fail only due to mead `mead:` field issue from Task 1, not station-related).

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/stations.yaml
git commit -m "feat(data): add Mead Ketill, Cooking Spit, Iron Spit, Food Table, Oven, Fermenter stations"
```

---

## Task 4: Add new items — raw meats and ingredients

**Files:**
- Modify: `src/data/items.yaml`

- [ ] **Step 1: Add raw meats, new ingredients, and trophies**

Add to `src/data/items.yaml` in appropriate sections:

```yaml
# New raw meats
- { id: hare-meat, name: Hare Meat, category: ingredient, stackSize: 20 }
- { id: chicken-meat, name: Chicken Meat, category: ingredient, stackSize: 20 }
- { id: bonemaw-meat, name: Bonemaw Meat, category: ingredient, stackSize: 20 }
- { id: asksvin-tail, name: Asksvin Tail, category: ingredient, stackSize: 20 }
- { id: volture-meat, name: Volture Meat, category: ingredient, stackSize: 20 }
- { id: anglerfish, name: Anglerfish, category: ingredient, stackSize: 20 }

# New crafting/recipe ingredients
- { id: blood-clot, name: Blood Clot, category: material, stackSize: 50 }
- { id: greydwarf-eye, name: Greydwarf Eye, category: material, stackSize: 50 }
- { id: smoke-puff, name: Smoke Puff, category: material, stackSize: 50 }
- { id: fishing-bait, name: Fishing Bait, category: material, stackSize: 100 }
- { id: bread-dough, name: Bread Dough, category: food, stackSize: 10 }

# Trophies (for bait recipes)
- { id: ulv-trophy, name: Ulv Trophy, category: material, stackSize: 20 }
- { id: serpent-trophy, name: Serpent Trophy, category: material, stackSize: 20 }
- { id: surtling-trophy, name: Surtling Trophy, category: material, stackSize: 20 }
- { id: lox-trophy, name: Lox Trophy, category: material, stackSize: 20 }
- { id: troll-trophy, name: Troll Trophy, category: material, stackSize: 20 }
- { id: abomination-trophy, name: Abomination Trophy, category: material, stackSize: 20 }
- { id: fuling-trophy, name: Fuling Trophy, category: material, stackSize: 20 }

# Bog Witch spices (purchasable)
- { id: woodland-herb-blend, name: Woodland Herb Blend, category: ingredient, stackSize: 50 }
- { id: seafarers-herbs, name: "Seafarer's Herbs", category: ingredient, stackSize: 50 }
- { id: mountain-peak-pepper-powder, name: Mountain Peak Pepper Powder, category: ingredient, stackSize: 50 }
- { id: grasslands-herbalist-harvest, name: Grasslands Herbalist Harvest, category: ingredient, stackSize: 50 }
- { id: herbs-of-the-hidden-hills, name: Herbs of the Hidden Hills, category: ingredient, stackSize: 50 }
- { id: fiery-spice-powder, name: Fiery Spice Powder, category: ingredient, stackSize: 50 }
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/items.yaml
git commit -m "feat(data): add raw meats, trophies, spices, and new ingredients"
```

---

## Task 5: Add cooked meat items and recipe output items

**Files:**
- Modify: `src/data/items.yaml`

- [ ] **Step 1: Add all cooked meats and recipe outputs**

Add to `src/data/items.yaml`:

```yaml
# Cooked meats (spit outputs)
- { id: grilled-neck-tail, name: Grilled Neck Tail, category: food, stackSize: 10 }
- { id: cooked-boar-meat, name: Cooked Boar Meat, category: food, stackSize: 10 }
- { id: cooked-deer-meat, name: Cooked Deer Meat, category: food, stackSize: 10 }
- { id: cooked-fish, name: Cooked Fish, category: food, stackSize: 10 }
- { id: cooked-wolf-meat, name: Cooked Wolf Meat, category: food, stackSize: 10 }
- { id: cooked-hare-meat, name: Cooked Hare Meat, category: food, stackSize: 10 }
- { id: cooked-chicken-meat, name: Cooked Chicken Meat, category: food, stackSize: 10 }
- { id: cooked-serpent-meat, name: Cooked Serpent Meat, category: food, stackSize: 10 }
- { id: cooked-lox-meat, name: Cooked Lox Meat, category: food, stackSize: 10 }
- { id: cooked-seeker-meat, name: Cooked Seeker Meat, category: food, stackSize: 10 }
- { id: cooked-bonemaw-meat, name: Cooked Bonemaw Meat, category: food, stackSize: 10 }
- { id: cooked-asksvin-tail, name: Cooked Asksvin Tail, category: food, stackSize: 10 }
- { id: cooked-volture-meat, name: Cooked Volture Meat, category: food, stackSize: 10 }

# Bait outputs
- { id: cold-fishing-bait, name: Cold Fishing Bait, category: tool, stackSize: 100 }
- { id: frosty-fishing-bait, name: Frosty Fishing Bait, category: tool, stackSize: 100 }
- { id: heavy-fishing-bait, name: Heavy Fishing Bait, category: tool, stackSize: 100 }
- { id: hot-fishing-bait, name: Hot Fishing Bait, category: tool, stackSize: 100 }
- { id: misty-fishing-bait, name: Misty Fishing Bait, category: tool, stackSize: 100 }
- { id: mossy-fishing-bait, name: Mossy Fishing Bait, category: tool, stackSize: 100 }
- { id: sticky-fishing-bait, name: Sticky Fishing Bait, category: tool, stackSize: 100 }
- { id: stingy-fishing-bait, name: Stingy Fishing Bait, category: tool, stackSize: 100 }

# Baked goods (oven outputs)
- { id: bread, name: Bread, category: food, stackSize: 10 }
- { id: fish-n-bread, name: "Fish 'n' Bread", category: food, stackSize: 10 }
- { id: honey-glazed-chicken, name: Honey Glazed Chicken, category: food, stackSize: 10 }
- { id: lox-meat-pie, name: Lox Meat Pie, category: food, stackSize: 10 }
- { id: stuffed-mushroom, name: Stuffed Mushroom, category: food, stackSize: 10 }
- { id: meat-platter, name: Meat Platter, category: food, stackSize: 10 }

# Feast outputs
- { id: whole-roasted-meadow-boar, name: Whole Roasted Meadow Boar, category: food, stackSize: 1 }
- { id: black-forest-buffet-platter, name: Black Forest Buffet Platter, category: food, stackSize: 1 }
- { id: sailors-bounty, name: "Sailor's Bounty", category: food, stackSize: 1 }
- { id: swamp-dwellers-delight, name: "Swamp Dweller's Delight", category: food, stackSize: 1 }
- { id: hearty-mountain-loggers-stew, name: "Hearty Mountain Logger's Stew", category: food, stackSize: 1 }
- { id: plains-pie-picnic, name: Plains Pie Picnic, category: food, stackSize: 1 }
- { id: mushrooms-galore, name: "Mushrooms Galore à la Mistlands", category: food, stackSize: 1 }
- { id: ashlands-gourmet-bowl, name: Ashlands Gourmet Bowl, category: food, stackSize: 1 }

# Mead additions
- { id: lingering-healing-mead, name: Lingering Healing Mead, category: food, stackSize: 10 }
- { id: lingering-stamina-mead, name: Lingering Stamina Mead, category: food, stackSize: 10 }

# Other items referenced by feasts
- { id: misthare-supreme, name: Misthare Supreme, category: food, stackSize: 10 }
```

Note: `wolf-skewer`, `onion-soup`, `deer-stew`, `turnip-stew`, `yggdrasil-porridge`, `scorching-medley` — check if these already exist in items.yaml. If not, add them with `category: food, stackSize: 10`. They exist as recipes but may not have item entries yet.

- [ ] **Step 2: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/items.yaml
git commit -m "feat(data): add cooked meats, bait outputs, baked goods, feast outputs, and mead items"
```

---

## Task 6: Add Cooking Spit and Iron Spit recipes

**Files:**
- Create: `src/data/recipes/spit.yaml`

- [ ] **Step 1: Create spit recipe file**

Create `src/data/recipes/spit.yaml`:

```yaml
# ── Cooking Spit ──────────────────────────────────────────────────────────────

- id: grilled-neck-tail
  name: Grilled Neck Tail
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: neck-tail, qty: 1 }
  food:
    hp: 25
    stamina: 8
    duration: 1200
    regen: 2
  tags: [food, tier-0]

- id: cooked-boar-meat
  name: Cooked Boar Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: boar-meat, qty: 1 }
  food:
    hp: 30
    stamina: 10
    duration: 1200
    regen: 2
  tags: [food, tier-0]

- id: cooked-deer-meat
  name: Cooked Deer Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: deer-meat, qty: 1 }
  food:
    hp: 35
    stamina: 12
    duration: 1200
    regen: 2
  tags: [food, tier-1]

- id: cooked-fish
  name: Cooked Fish
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: fish-raw, qty: 1 }
  food:
    hp: 45
    stamina: 15
    duration: 1200
    regen: 3
  tags: [food, tier-2]

- id: cooked-wolf-meat
  name: Cooked Wolf Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: wolf-meat, qty: 1 }
  food:
    hp: 45
    stamina: 15
    duration: 1200
    regen: 3
  tags: [food, tier-3]

- id: cooked-hare-meat
  name: Cooked Hare Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: hare-meat, qty: 1 }
  food:
    hp: 60
    stamina: 20
    duration: 1200
    regen: 5
  tags: [food, tier-6]

- id: cooked-chicken-meat
  name: Cooked Chicken Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: chicken-meat, qty: 1 }
  food:
    hp: 60
    stamina: 20
    duration: 1200
    regen: 5
  tags: [food, tier-6]

# ── Iron Spit ─────────────────────────────────────────────────────────────────

- id: cooked-serpent-meat
  name: Cooked Serpent Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: serpent-meat, qty: 1 }
  food:
    hp: 70
    stamina: 23
    duration: 1500
    regen: 3
  tags: [food, tier-4]

- id: cooked-lox-meat
  name: Cooked Lox Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: lox-meat, qty: 1 }
  food:
    hp: 50
    stamina: 16
    duration: 1200
    regen: 4
  tags: [food, tier-5]

- id: cooked-seeker-meat
  name: Cooked Seeker Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: seeker-meat, qty: 1 }
  food:
    hp: 60
    stamina: 20
    duration: 1200
    regen: 5
  tags: [food, tier-6]

- id: cooked-bonemaw-meat
  name: Cooked Bonemaw Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: bonemaw-meat, qty: 1 }
  food:
    hp: 90
    stamina: 30
    duration: 1500
    regen: 6
  tags: [food, tier-7]

- id: cooked-asksvin-tail
  name: Cooked Asksvin Tail
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: asksvin-tail, qty: 1 }
  food:
    hp: 70
    stamina: 24
    duration: 1200
    regen: 6
  tags: [food, tier-7]

- id: cooked-volture-meat
  name: Cooked Volture Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: volture-meat, qty: 1 }
  food:
    hp: 70
    stamina: 24
    duration: 1200
    regen: 6
  tags: [food, tier-7]
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS (loader auto-discovers YAML files in recipes/).

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/recipes/spit.yaml
git commit -m "feat(data): add Cooking Spit and Iron Spit recipes with food stats"
```

---

## Task 7: Add Food Table recipes (bait + oven preps)

**Files:**
- Create: `src/data/recipes/food-table.yaml`

- [ ] **Step 1: Create food table recipe file**

Create `src/data/recipes/food-table.yaml`:

```yaml
# ── Food Table — Fishing Bait ─────────────────────────────────────────────────

- id: cold-fishing-bait
  name: Cold Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: ulv-trophy, qty: 1 }
  yields: { itemId: cold-fishing-bait, qty: 20 }
  tags: [bait, tier-4]

- id: frosty-fishing-bait
  name: Frosty Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: drake-trophy, qty: 1 }
  yields: { itemId: frosty-fishing-bait, qty: 20 }
  tags: [bait, tier-4]

- id: heavy-fishing-bait
  name: Heavy Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: serpent-trophy, qty: 1 }
  yields: { itemId: heavy-fishing-bait, qty: 20 }
  tags: [bait, tier-4]

- id: hot-fishing-bait
  name: Hot Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: surtling-trophy, qty: 1 }
  yields: { itemId: hot-fishing-bait, qty: 20 }
  tags: [bait, tier-3]

- id: misty-fishing-bait
  name: Misty Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: lox-trophy, qty: 1 }
  yields: { itemId: misty-fishing-bait, qty: 20 }
  tags: [bait, tier-5]

- id: mossy-fishing-bait
  name: Mossy Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: troll-trophy, qty: 1 }
  yields: { itemId: mossy-fishing-bait, qty: 20 }
  tags: [bait, tier-2]

- id: sticky-fishing-bait
  name: Sticky Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: abomination-trophy, qty: 1 }
  yields: { itemId: sticky-fishing-bait, qty: 20 }
  tags: [bait, tier-3]

- id: stingy-fishing-bait
  name: Stingy Fishing Bait
  type: crafting
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: fishing-bait, qty: 20 }
    - { itemId: fuling-trophy, qty: 1 }
  yields: { itemId: stingy-fishing-bait, qty: 20 }
  tags: [bait, tier-5]

# ── Food Table — Oven Preparations ────────────────────────────────────────────
# These produce an uncooked item, then secondaryStep indicates baking in oven.

- id: bread
  name: Bread
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: barley-flour, qty: 10 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 23
    stamina: 70
    duration: 1500
    regen: 2
  tags: [food, baked, tier-5]

- id: fish-n-bread
  name: "Fish 'n' Bread"
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: anglerfish, qty: 1 }
    - { itemId: bread-dough, qty: 2 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 30
    stamina: 90
    duration: 1800
    regen: 3
  tags: [food, baked, tier-6]

- id: honey-glazed-chicken
  name: Honey Glazed Chicken
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: chicken-meat, qty: 1 }
    - { itemId: honey, qty: 3 }
    - { itemId: jotun-puffs, qty: 2 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 80
    stamina: 26
    duration: 1800
    regen: 5
  tags: [food, baked, tier-6]

- id: lox-meat-pie
  name: Lox Meat Pie
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: cloudberries, qty: 2 }
    - { itemId: lox-meat, qty: 2 }
    - { itemId: barley-flour, qty: 4 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 75
    stamina: 24
    duration: 1800
    regen: 4
  tags: [food, baked, tier-5]

- id: stuffed-mushroom
  name: Stuffed Mushroom
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: magecap, qty: 3 }
    - { itemId: blood-clot, qty: 1 }
    - { itemId: turnip, qty: 2 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 25
    stamina: 12
    duration: 1500
    regen: 3
    eitr: 75
  tags: [food, baked, magic, tier-6]

- id: meat-platter
  name: Meat Platter
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: hare-meat, qty: 1 }
    - { itemId: lox-meat, qty: 1 }
    - { itemId: seeker-meat, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 80
    stamina: 26
    duration: 1800
    regen: 5
  tags: [food, baked, tier-6]
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/recipes/food-table.yaml
git commit -m "feat(data): add Food Table recipes — fishing bait and oven preparations"
```

---

## Task 8: Add feast recipes

**Files:**
- Create: `src/data/recipes/feasts.yaml`

- [ ] **Step 1: Create feast recipe file**

Create `src/data/recipes/feasts.yaml`:

```yaml
# ── Feasts (Food Table) ──────────────────────────────────────────────────────
# Feasts are placed on a Serving Tray (10 servings per placement, 50-min buff).

- id: whole-roasted-meadow-boar
  name: Whole Roasted Meadow Boar
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: cooked-deer-meat, qty: 2 }
    - { itemId: cooked-boar-meat, qty: 5 }
    - { itemId: dandelion, qty: 4 }
    - { itemId: woodland-herb-blend, qty: 1 }
  yields: { itemId: whole-roasted-meadow-boar, qty: 10 }
  food:
    hp: 35
    stamina: 35
    duration: 3000
    regen: 2
  tags: [feast, tier-1]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff."

- id: black-forest-buffet-platter
  name: Black Forest Buffet Platter
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: deer-stew, qty: 3 }
    - { itemId: thistle, qty: 5 }
    - { itemId: queens-jam, qty: 4 }
    - { itemId: woodland-herb-blend, qty: 1 }
  yields: { itemId: black-forest-buffet-platter, qty: 10 }
  food:
    hp: 35
    stamina: 35
    duration: 3000
    regen: 3
  tags: [feast, tier-2]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff."

- id: sailors-bounty
  name: "Sailor's Bounty"
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: cooked-fish, qty: 5 }
    - { itemId: thistle, qty: 4 }
    - { itemId: cooked-serpent-meat, qty: 2 }
    - { itemId: seafarers-herbs, qty: 1 }
  yields: { itemId: sailors-bounty, qty: 10 }
  food:
    hp: 45
    stamina: 45
    duration: 3000
    regen: 3
  tags: [feast, tier-4]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff."

- id: swamp-dwellers-delight
  name: "Swamp Dweller's Delight"
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: sausages, qty: 8 }
    - { itemId: bloodbag, qty: 4 }
    - { itemId: turnip-stew, qty: 2 }
    - { itemId: woodland-herb-blend, qty: 1 }
  yields: { itemId: swamp-dwellers-delight, qty: 10 }
  food:
    hp: 35
    stamina: 35
    duration: 3000
    regen: 3
  tags: [feast, tier-3]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff."

- id: hearty-mountain-loggers-stew
  name: "Hearty Mountain Logger's Stew"
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: wolf-skewer, qty: 2 }
    - { itemId: onion-soup, qty: 3 }
    - { itemId: carrot, qty: 4 }
    - { itemId: mountain-peak-pepper-powder, qty: 1 }
  yields: { itemId: hearty-mountain-loggers-stew, qty: 10 }
  food:
    hp: 45
    stamina: 45
    duration: 3000
    regen: 3
  tags: [feast, tier-4]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff."

- id: plains-pie-picnic
  name: Plains Pie Picnic
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: bread, qty: 3 }
    - { itemId: lox-meat-pie, qty: 2 }
    - { itemId: cloudberries, qty: 5 }
    - { itemId: grasslands-herbalist-harvest, qty: 1 }
  yields: { itemId: plains-pie-picnic, qty: 10 }
  food:
    hp: 55
    stamina: 55
    duration: 3000
    regen: 4
  tags: [feast, tier-5]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff."

- id: mushrooms-galore
  name: "Mushrooms Galore à la Mistlands"
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: misthare-supreme, qty: 1 }
    - { itemId: cooked-seeker-meat, qty: 3 }
    - { itemId: yggdrasil-porridge, qty: 1 }
    - { itemId: herbs-of-the-hidden-hills, qty: 1 }
  yields: { itemId: mushrooms-galore, qty: 10 }
  food:
    hp: 65
    stamina: 65
    duration: 3000
    regen: 5
    eitr: 33
  tags: [feast, tier-6]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff. Grants Eitr."

- id: ashlands-gourmet-bowl
  name: Ashlands Gourmet Bowl
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: cooked-asksvin-tail, qty: 3 }
    - { itemId: vineberry-cluster, qty: 5 }
    - { itemId: scorching-medley, qty: 2 }
    - { itemId: fiery-spice-powder, qty: 1 }
  yields: { itemId: ashlands-gourmet-bowl, qty: 10 }
  food:
    hp: 75
    stamina: 75
    duration: 3000
    regen: 6
    eitr: 38
  tags: [feast, tier-7]
  notes: "Place on a Serving Tray for 10 servings. 50-minute buff. Grants Eitr."
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS (or fail if feast ingredient items like `deer-stew`, `wolf-skewer`, `onion-soup`, `turnip-stew`, `yggdrasil-porridge`, `scorching-medley` don't exist in items.yaml yet — if so, add them first).

- [ ] **Step 3: If test fails, add missing feast ingredient items to items.yaml**

These are existing recipes that need item entries for cross-reference:

```yaml
# Existing recipe outputs needed as feast ingredients
- { id: deer-stew, name: Deer Stew, category: food, stackSize: 10 }
- { id: wolf-skewer, name: Wolf Skewer, category: food, stackSize: 10 }
- { id: onion-soup, name: Onion Soup, category: food, stackSize: 10 }
- { id: turnip-stew, name: Turnip Stew, category: food, stackSize: 10 }
- { id: yggdrasil-porridge, name: Yggdrasil Porridge, category: food, stackSize: 10 }
- { id: scorching-medley, name: Scorching Medley, category: food, stackSize: 10 }
```

- [ ] **Step 4: Run tests again**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/recipes/feasts.yaml src/data/items.yaml
git commit -m "feat(data): add 8 feast recipes with food stats and Bog Witch spice ingredients"
```

---

## Task 9: Fix and migrate mead recipes

**Files:**
- Modify: `src/data/recipes/cooking.yaml`

This task must run AFTER Task 1 (schema change) and Task 3 (new stations).

- [ ] **Step 1: Fix ingredients, change station, migrate mead → secondaryStep**

In `src/data/recipes/cooking.yaml`, find the meads section and replace it entirely. Remove `major-stamina-mead`. Fix Major Healing and Frost Resistance ingredients. Change all `station: cauldron` → `station: mead-ketill`. Replace all `mead:` blocks with `secondaryStep:`.

Replace the entire meads section (from `# ── Meads` to end of file) with:

```yaml
# ── Meads ─────────────────────────────────────────────────────────────────────
# Meads are brewed at the Mead Ketill, then fermented.

# Mead Ketill level 1
- id: minor-healing-mead
  name: Minor Healing Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: blueberries, qty: 5 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: dandelion, qty: 1 }
  yields: { itemId: minor-healing-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, heal, tier-1]

- id: minor-stamina-mead
  name: Minor Stamina Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: yellow-mushroom, qty: 10 }
  yields: { itemId: minor-stamina-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, stamina, tier-1]

- id: poison-resistance-mead
  name: Poison Resistance Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: thistle, qty: 5 }
    - { itemId: neck-tail, qty: 1 }
    - { itemId: coal, qty: 10 }
  yields: { itemId: poison-resistance-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, resistance, tier-1]

- id: tasty-mead
  name: Tasty Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: blueberries, qty: 5 }
  yields: { itemId: tasty-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, rested, tier-1]

- id: lingering-healing-mead
  name: Lingering Healing Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: sap, qty: 10 }
    - { itemId: vineberry-cluster, qty: 10 }
    - { itemId: smoke-puff, qty: 10 }
  yields: { itemId: lingering-healing-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, heal, tier-6]

- id: lingering-stamina-mead
  name: Lingering Stamina Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: sap, qty: 10 }
    - { itemId: cloudberries, qty: 10 }
    - { itemId: jotun-puffs, qty: 10 }
  yields: { itemId: lingering-stamina-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, stamina, tier-6]

# Mead Ketill level 2 (requires Spice Rack equivalent)
- id: medium-healing-mead
  name: Medium Healing Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: bloodbag, qty: 4 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: dandelion, qty: 1 }
  yields: { itemId: medium-healing-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, heal, tier-3]

- id: medium-stamina-mead
  name: Medium Stamina Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: cloudberries, qty: 10 }
    - { itemId: yellow-mushroom, qty: 10 }
  yields: { itemId: medium-stamina-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, stamina, tier-3]

- id: frost-resistance-mead
  name: Frost Resistance Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: thistle, qty: 5 }
    - { itemId: bloodbag, qty: 2 }
    - { itemId: greydwarf-eye, qty: 1 }
  yields: { itemId: frost-resistance-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, resistance, tier-3]

- id: fire-resistance-barley-wine
  name: Fire Resistance Barley Wine
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: barley, qty: 10 }
    - { itemId: cloudberries, qty: 10 }
  yields: { itemId: fire-resistance-barley-wine, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, resistance, tier-5]

- id: major-healing-mead
  name: Major Healing Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: blood-clot, qty: 4 }
    - { itemId: royal-jelly, qty: 5 }
  yields: { itemId: major-healing-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  tags: [mead, heal, tier-6]
```

- [ ] **Step 2: Remove `major-stamina-mead` from items.yaml**

Delete the line `- { id: major-stamina-mead, ... }` from `src/data/items.yaml`.

- [ ] **Step 3: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/data/recipes/cooking.yaml src/data/items.yaml
git commit -m "fix(data): fix mead ingredients, migrate to mead-ketill + secondaryStep, add lingering meads"
```

---

## Task 10: Update UI — secondaryStep and eitr display

**Files:**
- Modify: `src/components/RecipeRow.tsx`
- Modify: `src/pages/recipes/[slug].astro`

- [ ] **Step 1: Update RecipeRow.tsx — replace mead section with secondaryStep**

In `src/components/RecipeRow.tsx`, find the mead `<Show>` block (around lines 145-157) and replace:

```tsx
          <Show when={props.recipe.mead}>
            {(mead) => (
              <div class="recipe-row__section recipe-row__mead-info">
                <span class="label">Brewing</span>
                <p>
                  Craft <strong>{mead().baseName}</strong> at a Cauldron, then place in a{' '}
                  <strong>Fermenter</strong> for{' '}
                  {Math.round(mead().fermenterDuration / 1200)} in-game days.
                  {props.recipe.yields && ` Produces ×${props.recipe.yields.qty}.`}
                </p>
              </div>
            )}
          </Show>
```

With:

```tsx
          <Show when={props.recipe.secondaryStep}>
            {(step) => (
              <div class="recipe-row__section">
                <span class="label">Next step</span>
                <p>{step().description}</p>
              </div>
            )}
          </Show>
```

- [ ] **Step 2: Add eitr to food stats display in RecipeRow.tsx**

In the food stats section (around lines 125-137), add eitr after the Duration span:

```tsx
                  <span>Duration {Math.round(food().duration / 60)}m</span>
                  <Show when={food().eitr}>
                    <span>Eitr {food().eitr}</span>
                  </Show>
```

- [ ] **Step 3: Update [slug].astro — replace mead section with secondaryStep**

In `src/pages/recipes/[slug].astro`, replace the mead section (lines 80-89):

```astro
  {recipe.mead && (
    <section class="detail-section">
      <h2>Brewing</h2>
      <p>
        Craft <strong>{recipe.mead.baseName}</strong> at a Cauldron, then place in a
        <strong> Fermenter</strong> for {Math.round(recipe.mead.fermenterDuration / 1200)} in-game days.
        {recipe.yields && ` Produces ×${recipe.yields.qty}.`}
      </p>
    </section>
  )}
```

With:

```astro
  {recipe.secondaryStep && (
    <section class="detail-section">
      <h2>Next step</h2>
      <p>{recipe.secondaryStep.description}</p>
    </section>
  )}
```

- [ ] **Step 4: Add eitr to food stats in [slug].astro**

After the Regen line (line 67), add:

```astro
        {recipe.food.eitr && <li>Eitr: {recipe.food.eitr}</li>}
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations && pnpm test`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add src/components/RecipeRow.tsx "src/pages/recipes/[slug].astro"
git commit -m "feat(ui): replace mead display with secondaryStep, add eitr to food stats"
```

---

## Task 11: Create icons — raw meats, ingredients, trophies, spices

**Files:**
- Create: ~25 SVG files in `public/icons/items/`

This task is **fully parallel** with other tasks. Create pixel-art SVGs (48×48, no gradients, simple shapes, under 1KB each) for:

**Raw meats** (use `boar-meat.svg` pattern — slab polygon with fat stripe, adjust colors):
- `hare-meat.svg` — light brown slab (#C4956A base, #E0D0B0 fat stripe)
- `chicken-meat.svg` — pale pink slab (#E8A0A0 base, #F0C0C0 fat stripe)
- `bonemaw-meat.svg` — dark purple slab (#6A3A6A base, #8A5A8A fat stripe)
- `asksvin-tail.svg` — grey-green slab (#7A8A6A base, #9AAA8A fat stripe)
- `volture-meat.svg` — dark red slab (#8A3030 base, #AA5050 fat stripe)
- `anglerfish.svg` — fish shape, dark blue (#2A3A6A body, #4A5A8A highlight, tail fin)

**New ingredients** (organic blob patterns):
- `blood-clot.svg` — dark red blob (#8B0000 base, #AA2020 highlight)
- `greydwarf-eye.svg` — green circle with dark pupil (#44AA44 iris, #2A2A2A pupil, #88CC88 highlight)
- `smoke-puff.svg` — grey cloud shape (#A0A0A0 base, #C0C0C0 highlight, #808080 shadow)
- `fishing-bait.svg` — small worm/pellet shapes (#8B6D4A pellets, varied)
- `bread-dough.svg` — tan blob (#E0D0A0 base, #C4B080 shadow)
- `dandelion.svg` — yellow flower with green stem (#FFD700 petals, #4A8A2A stem)
- `coal.svg` — dark rock chunks (#2A2A2A base, #3A3A3A highlight, #1A1A1A shadow)

**Trophies** (use `deer-trophy.svg` pattern — mounted head on plaque):
- `ulv-trophy.svg` — wolf-like head, grey (#A0A0A0 head, #808080 features, #A0722A plaque)
- `serpent-trophy.svg` — serpent head, dark green (#2A6A3A head, #A0722A plaque)
- `surtling-trophy.svg` — fiery head, orange (#CC4400 head, #FF6620 flames, #A0722A plaque)
- `lox-trophy.svg` — large horned head, brown (#8B6D4A head, #A0722A plaque)
- `troll-trophy.svg` — blue head (#4A6A9A head, #A0722A plaque)
- `abomination-trophy.svg` — green mass (#3A5A2A head, #A0722A plaque)
- `fuling-trophy.svg` — goblin head, dark (#5A4A3A head, #A0722A plaque)

**Bog Witch spices** (small jar/pouch shapes):
- `woodland-herb-blend.svg` — green pouch (#4A8A2A base, #3A6A1A shadow, #6AAA4A highlight)
- `seafarers-herbs.svg` — blue-green pouch (#2A6A6A base, #1A4A4A shadow)
- `mountain-peak-pepper-powder.svg` — red-brown jar (#8A3A2A base, #AA5A3A highlight)
- `grasslands-herbalist-harvest.svg` — yellow-green pouch (#6A8A2A base)
- `herbs-of-the-hidden-hills.svg` — purple pouch (#5A3A6A base, #7A5A8A highlight)
- `fiery-spice-powder.svg` — orange-red jar (#CC4400 base, #AA2200 shadow)

For each icon: create the SVG file at `public/icons/items/{id}.svg` following the template:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <!-- shapes here -->
</svg>
```

- [ ] **Step 1: Create all raw meat and ingredient icons (13 files)**
- [ ] **Step 2: Create all trophy icons (7 files)**
- [ ] **Step 3: Create all spice icons (6 files)**
- [ ] **Step 4: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add public/icons/items/
git commit -m "art: add pixel-art icons for raw meats, ingredients, trophies, and spices"
```

---

## Task 12: Create icons — cooked meats, bait, baked goods, feasts, meads

**Files:**
- Create: ~30 SVG files in `public/icons/items/`

**Cooked meats** (similar to raw meat pattern but browner with char marks):
- `grilled-neck-tail.svg`, `cooked-boar-meat.svg`, `cooked-deer-meat.svg`, `cooked-fish.svg`, `cooked-wolf-meat.svg`, `cooked-hare-meat.svg`, `cooked-chicken-meat.svg`, `cooked-serpent-meat.svg`, `cooked-lox-meat.svg`, `cooked-seeker-meat.svg`, `cooked-bonemaw-meat.svg`, `cooked-asksvin-tail.svg`, `cooked-volture-meat.svg`

Colors: Brown base (#8B5A2B), darker char lines (#5A3A1A), golden highlight (#C4956A).

**Bait outputs** (small pellet/worm, color-coded):
- `cold-fishing-bait.svg` — ice blue (#88BBDD pellets)
- `frosty-fishing-bait.svg` — white-blue (#AACCEE pellets)
- `heavy-fishing-bait.svg` — dark teal (#2A5A5A pellets)
- `hot-fishing-bait.svg` — orange (#CC6600 pellets)
- `misty-fishing-bait.svg` — purple-grey (#8A7A9A pellets)
- `mossy-fishing-bait.svg` — green (#4A8A4A pellets)
- `sticky-fishing-bait.svg` — brown-green (#5A6A3A pellets)
- `stingy-fishing-bait.svg` — yellow-black (#AAAA3A pellets)

**Baked goods** (use bowl/plate patterns):
- `bread.svg` — golden loaf shape (#DAA520 base, #C49010 shadow, #EACC80 highlight)
- `fish-n-bread.svg` — plate with fish + bread (#DAA520 bread, #4A6A8A fish)
- `honey-glazed-chicken.svg` — golden drumstick shape (#CC8800 glaze, #AA6600 meat)
- `lox-meat-pie.svg` — round pie with crimped edges (#DAA520 crust, #CC3344 berries)
- `stuffed-mushroom.svg` — mushroom cap with filling (#8B6D4A cap, #6A3A6A filling)
- `meat-platter.svg` — plate with meat pieces (#8B5A2B meats, #A0722A plate)

**Feast items** (large platter shapes with food arranged):
- `whole-roasted-meadow-boar.svg` — platter with roast (#A0722A platter, #8B5A2B roast)
- `black-forest-buffet-platter.svg` — platter with varied items (#A0722A, #CC3344 jam)
- `sailors-bounty.svg` — platter with fish (#4A6A8A fish, #A0722A platter)
- `swamp-dwellers-delight.svg` — dark green platter (#3A5A3A, #CC4444 sausages)
- `hearty-mountain-loggers-stew.svg` — bowl with stew (#8B6D4A bowl, #AA7744 stew)
- `plains-pie-picnic.svg` — platter with pies (#DAA520 pies, #A0722A platter)
- `mushrooms-galore.svg` — platter with mushrooms (#7744BB eitr glow, #8B6D4A mushrooms)
- `ashlands-gourmet-bowl.svg` — fiery bowl (#CC4400 bowl, #FF6620 glow)

**New meads** (use `sparkling-shroomshake.svg` as reference — cup/bottle shape):
- `lingering-healing-mead.svg` — red-tinted bottle (#CC3344 liquid, #E8E8E8 glass)
- `lingering-stamina-mead.svg` — yellow-tinted bottle (#DDAA33 liquid, #E8E8E8 glass)

**Existing items needing icons** (check if they already exist before creating):
- `misthare-supreme.svg`, `deer-stew.svg`, `wolf-skewer.svg`, `onion-soup.svg`, `turnip-stew.svg`, `yggdrasil-porridge.svg`, `scorching-medley.svg`

- [ ] **Step 1: Create cooked meat icons (13 files)**
- [ ] **Step 2: Create bait output icons (8 files)**
- [ ] **Step 3: Create baked goods icons (6 files)**
- [ ] **Step 4: Create feast icons (8 files)**
- [ ] **Step 5: Create mead and other missing icons**
- [ ] **Step 6: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add public/icons/items/
git commit -m "art: add pixel-art icons for cooked meats, bait, baked goods, feasts, and meads"
```

---

## Task 13: Update scraper and regenerate report

**Files:**
- Modify: `scripts/scrape-recipes.py`
- Modify: `docs/recipe-diff-report.md`

- [ ] **Step 1: Update KNOWN_YIELDS, KNOWN_STACK_SIZES, and KNOWN_MEADS in the scraper**

Add new recipes with yields (bait ×20, feasts ×10) and stack sizes for all new items. Update mead entries to reflect corrected ingredients. Remove major-stamina-mead.

- [ ] **Step 2: Run scraper**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
python3 scripts/scrape-recipes.py
```

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
git add scripts/scrape-recipes.py docs/recipe-diff-report.md
git commit -m "chore: update scraper with new stations data and regenerate diff report"
```

---

## ⏸️ Final Verification

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/food-stations
pnpm test && pnpm dev --port 4322
```

Verify:
- [ ] All tests pass
- [ ] Cooking Spit recipes appear with food stats
- [ ] Iron Spit recipes appear with food stats
- [ ] Food Table bait recipes show yields ×20
- [ ] Oven preparations show "Next step: Bake in an Oven" in detail
- [ ] Feast recipes show "Feast" tag and food stats with Eitr where applicable
- [ ] Meads now show "Mead Ketill" as station
- [ ] Mead detail shows "Next step: Ferment for 2 in-game days"
- [ ] Icons appear for all new items
- [ ] Major Stamina Mead is gone
- [ ] Major Healing Mead has correct ingredients (blood-clot, royal-jelly)
- [ ] Frost Resistance Mead uses greydwarf-eye (not freeze-gland)
