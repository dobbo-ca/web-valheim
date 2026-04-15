# Consumable Audit & Schema Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit all food and mead data against the Valheim wiki, redesign schemas to use sparse fields, add missing items, and fix all stat/ingredient/station-level errors.

**Architecture:** New `FoodStatsSchema` (all optional, sparse) replaces the current required-field version. New `MeadEffectSchema` + `MeadStatsSchema` added for meads. `RecipeSchema` gains a `mead` field. Raw edible items get `station: found` recipes. All YAML data corrected to match wiki.

**Tech Stack:** Zod schemas, YAML data files, Astro detail page, Vitest

---

### Task 1: Update FoodStatsSchema to sparse fields

**Files:**
- Modify: `src/lib/schema.ts:42-48`
- Modify: `src/lib/types.ts`
- Modify: `tests/schema.test.ts:222-248`

- [ ] **Step 1: Update the FoodStatsSchema in schema.ts**

Replace lines 42-48 in `src/lib/schema.ts`:

```typescript
export const FoodStatsSchema = z.object({
  hp: z.number().optional(),
  stamina: z.number().optional(),
  eitr: z.number().optional(),
  healPerTick: z.number().optional(),
  duration: z.number().optional(),
  weight: z.number().optional(),
  regenModifier: z.number().optional(),
});
```

- [ ] **Step 2: Fix existing cooking recipe test that uses old `regen` field**

In `tests/schema.test.ts`, update the test at ~line 75-89 (`accepts a cooking recipe with food stats`):

```typescript
  it('accepts a cooking recipe with food stats', () => {
    const input = {
      id: 'queens-jam',
      name: "Queen's Jam",
      type: 'cooking' as const,
      station: 'cauldron',
      stationLevel: 1,
      ingredients: [
        { itemId: 'raspberries', qty: 8 },
        { itemId: 'blueberries', qty: 6 },
      ],
      food: { hp: 14, stamina: 40, healPerTick: 2, duration: 1200, weight: 1.0 },
    };
    expect(() => RecipeSchema.parse(input)).not.toThrow();
  });
```

- [ ] **Step 3: Update schema tests for new FoodStatsSchema**

Replace the `RecipeSchema — food with eitr` describe block in `tests/schema.test.ts` (lines 222-248):

```typescript
describe('FoodStatsSchema — sparse fields', () => {
  it('accepts food with all fields', () => {
    const result = RecipeSchema.parse({
      id: 'stuffed-mushroom',
      name: 'Stuffed Mushroom',
      type: 'cooking',
      station: 'food-table',
      stationLevel: 1,
      ingredients: [{ itemId: 'magecap', qty: 3 }],
      food: { hp: 25, stamina: 12, eitr: 75, healPerTick: 3, duration: 1500, weight: 1.0 },
    });
    expect(result.food?.eitr).toBe(75);
    expect(result.food?.healPerTick).toBe(3);
    expect(result.food?.weight).toBe(1.0);
  });

  it('accepts food with only some fields (sparse)', () => {
    const result = RecipeSchema.parse({
      id: 'bukeperries',
      name: 'Bukeperries',
      type: 'cooking',
      station: 'found',
      stationLevel: 1,
      food: { regenModifier: -1.0, duration: 15, weight: 0.1 },
    });
    expect(result.food?.hp).toBeUndefined();
    expect(result.food?.regenModifier).toBe(-1.0);
  });

  it('accepts empty food object', () => {
    const result = RecipeSchema.parse({
      id: 'test',
      name: 'Test',
      type: 'cooking',
      station: 'cauldron',
      stationLevel: 1,
      ingredients: [],
      food: {},
    });
    expect(result.food).toBeDefined();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/schema.test.ts`
Expected: All tests pass (existing food test updated, new sparse tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema.ts tests/schema.test.ts
git commit -m "feat: make FoodStatsSchema sparse, rename regen to healPerTick, add weight/regenModifier"
```

---

### Task 2: Add MeadEffectSchema and MeadStatsSchema

**Files:**
- Modify: `src/lib/schema.ts` (add after FoodStatsSchema, ~line 49)
- Modify: `src/lib/schema.ts:146-164` (RecipeSchema — add `mead` field)
- Modify: `src/lib/types.ts` (export new types)
- Modify: `tests/schema.test.ts` (add mead tests)

- [ ] **Step 1: Add mead schemas to schema.ts**

Add after `FoodStatsSchema` (after line 49):

```typescript
export const MeadEffectSchema = z.object({
  health: z.number().optional(),
  stamina: z.number().optional(),
  eitr: z.number().optional(),
  resist: z.string().optional(),
  healthRegen: z.number().optional(),
  staminaRegen: z.number().optional(),
  eitrRegen: z.number().optional(),
  effects: z.array(z.string()).optional(),
});

export const MeadStatsSchema = z.object({
  effect: MeadEffectSchema,
  duration: z.number(),
  cooldown: z.number(),
  weight: z.number().optional(),
  cooldownGroup: z.string().optional(),
});
```

- [ ] **Step 2: Add `mead` field to RecipeSchema**

In the `RecipeSchema` object, add after the `food` field:

```typescript
  mead: MeadStatsSchema.optional(),
```

- [ ] **Step 3: Export new types in types.ts**

Add to imports in `src/lib/types.ts`:

```typescript
import type {
  // ... existing imports ...
  MeadEffectSchema,
  MeadStatsSchema,
} from './schema';
```

Add to exports:

```typescript
export type MeadEffect = z.infer<typeof MeadEffectSchema>;
export type MeadStats = z.infer<typeof MeadStatsSchema>;
```

- [ ] **Step 4: Add mead schema tests**

Add to `tests/schema.test.ts`:

```typescript
describe('MeadStatsSchema', () => {
  it('accepts an instant heal mead', () => {
    const result = RecipeSchema.parse({
      id: 'minor-healing-mead',
      name: 'Minor Healing Mead',
      type: 'cooking',
      station: 'mead-ketill',
      stationLevel: 1,
      ingredients: [{ itemId: 'honey', qty: 10 }],
      mead: {
        effect: { health: 50 },
        duration: 10,
        cooldown: 120,
        cooldownGroup: 'healing',
      },
    });
    expect(result.mead?.effect.health).toBe(50);
    expect(result.mead?.cooldownGroup).toBe('healing');
  });

  it('accepts a resistance mead', () => {
    const result = RecipeSchema.parse({
      id: 'frost-resistance-mead',
      name: 'Frost Resistance Mead',
      type: 'cooking',
      station: 'mead-ketill',
      stationLevel: 1,
      ingredients: [{ itemId: 'honey', qty: 10 }],
      mead: {
        effect: { resist: 'frost' },
        duration: 600,
        cooldown: 600,
      },
    });
    expect(result.mead?.effect.resist).toBe('frost');
  });

  it('accepts a mead with freeform effects', () => {
    const result = RecipeSchema.parse({
      id: 'berserkir-mead',
      name: 'Berserkir Mead',
      type: 'cooking',
      station: 'mead-ketill',
      stationLevel: 1,
      ingredients: [{ itemId: 'mushroom', qty: 10 }],
      mead: {
        effect: {
          effects: [
            'Attack, Block and Dodge Stamina use -80%',
            'Weak (×1.5) against Slash, Blunt and Pierce damage',
          ],
        },
        duration: 20,
        cooldown: 120,
      },
    });
    expect(result.mead?.effect.effects).toHaveLength(2);
  });

  it('rejects mead missing duration', () => {
    expect(() =>
      RecipeSchema.parse({
        id: 'bad',
        name: 'Bad',
        type: 'cooking',
        station: 'mead-ketill',
        stationLevel: 1,
        ingredients: [],
        mead: { effect: { health: 50 }, cooldown: 120 },
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/schema.test.ts`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.ts src/lib/types.ts tests/schema.test.ts
git commit -m "feat: add MeadEffectSchema and MeadStatsSchema"
```

---

### Task 3: Add `found` station and missing item/ingredient entries

**Files:**
- Modify: `src/data/stations.yaml`
- Modify: `src/data/items.yaml`

- [ ] **Step 1: Add `found` station to stations.yaml**

Add at the end of `src/data/stations.yaml`:

```yaml
- id: found
  name: Found
  maxLevel: 1
  upgrades: []
```

- [ ] **Step 2: Add missing food item definitions to items.yaml**

Add to the food items section in `src/data/items.yaml`. Note stackSize values come from wiki (raw edibles: 50, cooked meats: 20, soups/stews: 10, feasts: 5):

```yaml
# Raw edibles
- { id: raspberries, name: Raspberries, category: food, stackSize: 50 }
- { id: mushroom, name: Mushroom, category: food, stackSize: 50 }
- { id: honey, name: Honey, category: food, stackSize: 50 }
- { id: blueberries, name: Blueberries, category: food, stackSize: 50 }
- { id: yellow-mushroom, name: Yellow Mushroom, category: food, stackSize: 50 }
- { id: carrot, name: Carrot, category: food, stackSize: 50 }
- { id: onion, name: Onion, category: food, stackSize: 50 }
- { id: cloudberries, name: Cloudberries, category: food, stackSize: 50 }
- { id: magecap, name: Magecap, category: food, stackSize: 50 }
- { id: jotun-puffs, name: Jotun Puffs, category: food, stackSize: 50 }
- { id: smoke-puff-food, name: Smoke Puff, category: food, stackSize: 50 }
- { id: fiddlehead-food, name: Fiddlehead, category: food, stackSize: 50 }
- { id: vineberry-cluster-food, name: Vineberry Cluster, category: food, stackSize: 50 }
- { id: bukeperries, name: Bukeperries, category: food, stackSize: 50 }
- { id: rotten-meat, name: Rotten Meat, category: food, stackSize: 20 }

# Missing cooked/crafted foods
- { id: cooked-bear-meat, name: Cooked Bear Meat, category: food, stackSize: 20 }
- { id: cooked-egg, name: Cooked Egg, category: food, stackSize: 10 }
- { id: muckshake, name: Muckshake, category: food, stackSize: 10 }
- { id: black-soup, name: Black Soup, category: food, stackSize: 10 }
- { id: frosted-sweetbread, name: Frosted Sweetbread, category: food, stackSize: 10 }
- { id: piquant-pie, name: Piquant Pie, category: food, stackSize: 10 }
- { id: roasted-crust-pie, name: Roasted Crust Pie, category: food, stackSize: 10 }
```

- [ ] **Step 3: Add missing mead item definitions to items.yaml**

Add to the mead section:

```yaml
# Missing meads
- { id: minor-eitr-mead, name: Minor Eitr Mead, category: food, stackSize: 10 }
- { id: lingering-eitr-mead, name: Lingering Eitr Mead, category: food, stackSize: 10 }
- { id: love-potion, name: Love Potion, category: food, stackSize: 5 }
- { id: berserkir-mead, name: Berserkir Mead, category: food, stackSize: 10 }
- { id: anti-sting-concoction, name: Anti-Sting Concoction, category: food, stackSize: 10 }
- { id: draught-of-vananidir, name: Draught of Vananidir, category: food, stackSize: 10 }
- { id: tonic-of-ratatosk, name: Tonic of Ratatosk, category: food, stackSize: 10 }
- { id: mead-of-troll-endurance, name: Mead of Troll Endurance, category: food, stackSize: 10 }
- { id: brew-of-animal-whispers, name: Brew of Animal Whispers, category: food, stackSize: 10 }
- { id: lightfoot-mead, name: Lightfoot Mead, category: food, stackSize: 10 }
```

- [ ] **Step 4: Add missing ingredient items referenced by new recipes**

Some new recipes reference items not yet in items.yaml. Add to the ingredients/materials section:

```yaml
# Missing ingredients for new recipes
- { id: bear-meat, name: Bear Meat, category: ingredient, stackSize: 20, biome: black-forest }
- { id: toadstool, name: Toadstool, category: ingredient, stackSize: 50, biome: swamp }
- { id: grouper, name: Grouper, category: ingredient, stackSize: 20, biome: plains }
- { id: fragrant-bundle, name: Fragrant Bundle, category: ingredient, stackSize: 50, biome: plains }
- { id: perch, name: Perch, category: ingredient, stackSize: 20, biome: meadows }
- { id: fresh-seaweed, name: Fresh Seaweed, category: ingredient, stackSize: 50, biome: meadows }
- { id: cured-squirrel-hamstring, name: Cured Squirrel Hamstring, category: ingredient, stackSize: 20, biome: black-forest }
- { id: trollfish, name: Trollfish, category: ingredient, stackSize: 20, biome: black-forest }
- { id: powdered-dragon-eggshells, name: Powdered Dragon Eggshells, category: ingredient, stackSize: 20, biome: mountain }
- { id: pungent-pebbles, name: Pungent Pebbles, category: ingredient, stackSize: 20, biome: plains }
- { id: coins, name: Coins, category: material, stackSize: 999 }
- { id: volture-egg, name: Volture Egg, category: ingredient, stackSize: 20, biome: ashlands }
- { id: unbaked-sweetbread, name: Unbaked Sweetbread, category: food, stackSize: 10 }
- { id: egg, name: Egg, category: ingredient, stackSize: 20, biome: plains }
```

Note: some of these items (like `mushroom`, `carrot`, `onion`, etc.) may already exist in items.yaml as `category: ingredient`. We need to check for duplicates. The raw edible entries above use distinct IDs if the ingredient version already exists, but for items like `mushroom`, `honey`, etc. that are BOTH ingredients AND edible foods, we should keep the existing ingredient entry and create the food recipe pointing to that same item ID. Remove duplicate food entries from Step 2 for any items already in items.yaml — just add the recipe in a later task.

- [ ] **Step 5: Verify no duplicate IDs**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/real-data.test.ts`
Expected: PASS (loader validates no duplicate recipe IDs, cross-references valid)

If the loader complains about duplicate item IDs, remove the duplicate from the items you just added (the existing entry is sufficient).

- [ ] **Step 6: Commit**

```bash
git add src/data/stations.yaml src/data/items.yaml
git commit -m "feat: add found station, missing food/mead/ingredient item definitions"
```

---

### Task 4: Rewrite spit.yaml with corrected wiki data

**Files:**
- Modify: `src/data/recipes/spit.yaml`

- [ ] **Step 1: Replace spit.yaml with wiki-corrected data**

Replace the entire contents of `src/data/recipes/spit.yaml` with:

```yaml
# ── Cooking Spit ──────────────────────────────────────────────────────────────

- id: grilled-neck-tail
  name: Grilled Neck Tail
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: neck-tail, qty: 1 }
  yields: { itemId: grilled-neck-tail, qty: 1 }
  food:
    hp: 25
    stamina: 8
    healPerTick: 2
    duration: 1200
    weight: 0.5
  tags: [food, tier-1, meadows]

- id: cooked-boar-meat
  name: Cooked Boar Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: boar-meat, qty: 1 }
  yields: { itemId: cooked-boar-meat, qty: 1 }
  food:
    hp: 30
    stamina: 10
    healPerTick: 2
    duration: 1200
    weight: 1.0
  tags: [food, tier-1, meadows]

- id: cooked-deer-meat
  name: Cooked Deer Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: deer-meat, qty: 1 }
  yields: { itemId: cooked-deer-meat, qty: 1 }
  food:
    hp: 35
    stamina: 12
    healPerTick: 2
    duration: 1200
    weight: 1.0
  tags: [food, tier-1, meadows]

- id: cooked-fish
  name: Cooked Fish
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: fish-raw, qty: 1 }
  yields: { itemId: cooked-fish, qty: 1 }
  food:
    hp: 45
    stamina: 15
    healPerTick: 2
    duration: 1200
    weight: 0.5
  tags: [food, tier-2, swamp]

- id: cooked-wolf-meat
  name: Cooked Wolf Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: wolf-meat, qty: 1 }
  yields: { itemId: cooked-wolf-meat, qty: 1 }
  food:
    hp: 45
    stamina: 15
    healPerTick: 3
    duration: 1200
    weight: 1.0
  tags: [food, tier-4, mountain]

- id: cooked-bear-meat
  name: Cooked Bear Meat
  type: cooking
  station: cooking-spit
  stationLevel: 1
  ingredients:
    - { itemId: bear-meat, qty: 1 }
  yields: { itemId: cooked-bear-meat, qty: 1 }
  food:
    hp: 40
    stamina: 13
    healPerTick: 2
    duration: 1200
    weight: 1.0
  tags: [food, tier-2, black-forest]

- id: cooked-hare-meat
  name: Cooked Hare Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: hare-meat, qty: 1 }
  yields: { itemId: cooked-hare-meat, qty: 1 }
  food:
    hp: 60
    stamina: 20
    healPerTick: 5
    duration: 1200
    weight: 1.0
  tags: [food, tier-6, mistlands]

- id: cooked-chicken-meat
  name: Cooked Chicken Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: chicken-meat, qty: 1 }
  yields: { itemId: cooked-chicken-meat, qty: 1 }
  food:
    hp: 60
    stamina: 20
    healPerTick: 5
    duration: 1200
    weight: 1.0
  tags: [food, tier-5, plains]

# ── Iron Spit ─────────────────────────────────────────────────────────────────

- id: cooked-serpent-meat
  name: Cooked Serpent Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: serpent-meat, qty: 1 }
  yields: { itemId: cooked-serpent-meat, qty: 1 }
  food:
    hp: 70
    stamina: 23
    healPerTick: 3
    duration: 1500
    weight: 10.0
  tags: [food, tier-3, swamp]

- id: cooked-lox-meat
  name: Cooked Lox Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: lox-meat, qty: 1 }
  yields: { itemId: cooked-lox-meat, qty: 1 }
  food:
    hp: 50
    stamina: 16
    healPerTick: 4
    duration: 1200
    weight: 1.0
  tags: [food, tier-5, plains]

- id: cooked-seeker-meat
  name: Cooked Seeker Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: seeker-meat, qty: 1 }
  yields: { itemId: cooked-seeker-meat, qty: 1 }
  food:
    hp: 60
    stamina: 20
    healPerTick: 5
    duration: 1200
    weight: 1.0
  tags: [food, tier-6, mistlands]

- id: cooked-bonemaw-meat
  name: Cooked Bonemaw Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: bonemaw-meat, qty: 1 }
  yields: { itemId: cooked-bonemaw-meat, qty: 1 }
  food:
    hp: 90
    stamina: 30
    healPerTick: 6
    duration: 1500
    weight: 10.0
  tags: [food, tier-7, ashlands]

- id: cooked-asksvin-tail
  name: Cooked Asksvin Tail
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: asksvin-tail, qty: 1 }
  yields: { itemId: cooked-asksvin-tail, qty: 1 }
  food:
    hp: 70
    stamina: 24
    healPerTick: 6
    duration: 1200
    weight: 1.0
  tags: [food, tier-7, ashlands]

- id: cooked-volture-meat
  name: Cooked Volture Meat
  type: cooking
  station: iron-spit
  stationLevel: 1
  ingredients:
    - { itemId: volture-meat, qty: 1 }
  yields: { itemId: cooked-volture-meat, qty: 1 }
  food:
    hp: 70
    stamina: 24
    healPerTick: 6
    duration: 1200
    weight: 1.0
  tags: [food, tier-7, ashlands]
```

- [ ] **Step 2: Run data validation**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/real-data.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/data/recipes/spit.yaml
git commit -m "fix: correct all spit/iron-spit food stats to match wiki, add cooked bear meat"
```

---

### Task 5: Rewrite cooking.yaml (cauldron foods) with corrected wiki data

**Files:**
- Modify: `src/data/recipes/cooking.yaml`

- [ ] **Step 1: Replace the foods section of cooking.yaml (everything before the Meads header)**

Replace all recipe entries before `# ── Meads ──` with wiki-corrected data. Key changes: all stats corrected, `regen` → `healPerTick`, `weight` added, biome tags added, station levels corrected, ingredients corrected, missing recipes added.

```yaml
- id: queens-jam
  name: "Queen's Jam"
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: raspberries, qty: 8 }
    - { itemId: blueberries, qty: 6 }
  yields: { itemId: queens-jam, qty: 4 }
  food:
    hp: 14
    stamina: 40
    healPerTick: 2
    duration: 1200
    weight: 1.0
  tags: [food, tier-2, black-forest]

- id: carrot-soup
  name: Carrot Soup
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: mushroom, qty: 1 }
    - { itemId: carrot, qty: 3 }
  yields: { itemId: carrot-soup, qty: 1 }
  food:
    hp: 15
    stamina: 45
    healPerTick: 2
    duration: 1500
    weight: 1.0
  tags: [food, stamina, tier-2, black-forest]

- id: minced-meat-sauce
  name: Minced Meat Sauce
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: boar-meat, qty: 1 }
    - { itemId: neck-tail, qty: 1 }
    - { itemId: carrot, qty: 1 }
  yields: { itemId: minced-meat-sauce, qty: 1 }
  food:
    hp: 40
    stamina: 13
    healPerTick: 3
    duration: 1500
    weight: 1.0
  tags: [food, hp, tier-2, black-forest]

- id: deer-stew
  name: Deer Stew
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: blueberries, qty: 1 }
    - { itemId: carrot, qty: 1 }
    - { itemId: cooked-deer-meat, qty: 1 }
  yields: { itemId: deer-stew, qty: 1 }
  food:
    hp: 45
    stamina: 15
    healPerTick: 3
    duration: 1500
    weight: 1.0
  tags: [food, hp, tier-2, black-forest]

- id: cooked-egg
  name: Cooked Egg
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: egg, qty: 1 }
  yields: { itemId: cooked-egg, qty: 1 }
  food:
    hp: 35
    stamina: 12
    healPerTick: 2
    duration: 1200
    weight: 1.0
  tags: [food, tier-5, plains]

# Cauldron level 1 (Boar Jerky moved here from level 2)
- id: boar-jerky
  name: Boar Jerky
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: boar-meat, qty: 1 }
    - { itemId: honey, qty: 1 }
  yields: { itemId: boar-jerky, qty: 2 }
  food:
    hp: 23
    stamina: 23
    healPerTick: 2
    duration: 1800
    weight: 0.5
  tags: [food, sustain, tier-2, black-forest]

# Cauldron level 2
- id: turnip-stew
  name: Turnip Stew
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: boar-meat, qty: 1 }
    - { itemId: turnip, qty: 3 }
  yields: { itemId: turnip-stew, qty: 1 }
  food:
    hp: 18
    stamina: 55
    healPerTick: 2
    duration: 1500
    weight: 1.0
  tags: [food, stamina, tier-3, swamp]

- id: sausages
  name: Sausages
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: entrails, qty: 4 }
    - { itemId: boar-meat, qty: 1 }
    - { itemId: thistle, qty: 1 }
  yields: { itemId: sausages, qty: 4 }
  food:
    hp: 55
    stamina: 18
    healPerTick: 3
    duration: 1500
    weight: 0.5
  tags: [food, hp, tier-3, swamp]

- id: muckshake
  name: Muckshake
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: ooze, qty: 1 }
    - { itemId: raspberries, qty: 2 }
    - { itemId: blueberries, qty: 2 }
  yields: { itemId: muckshake, qty: 1 }
  food:
    hp: 16
    stamina: 50
    healPerTick: 1
    duration: 1200
    weight: 1.0
  tags: [food, stamina, tier-3, swamp]

- id: black-soup
  name: Black Soup
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: bloodbag, qty: 1 }
    - { itemId: honey, qty: 1 }
    - { itemId: turnip, qty: 1 }
  yields: { itemId: black-soup, qty: 1 }
  food:
    hp: 50
    stamina: 17
    healPerTick: 3
    duration: 1200
    weight: 1.0
  tags: [food, hp, tier-3, swamp]

- id: serpent-stew
  name: Serpent Stew
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: mushroom, qty: 1 }
    - { itemId: cooked-serpent-meat, qty: 1 }
    - { itemId: honey, qty: 2 }
  yields: { itemId: serpent-stew, qty: 1 }
  food:
    hp: 80
    stamina: 26
    healPerTick: 4
    duration: 1800
    weight: 1.0
  tags: [food, hp, tier-3, swamp]

- id: onion-soup
  name: Onion Soup
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: onion, qty: 3 }
  yields: { itemId: onion-soup, qty: 1 }
  food:
    hp: 20
    stamina: 60
    healPerTick: 1
    duration: 1200
    weight: 1.0
  tags: [food, stamina, tier-4, mountain]

# Cauldron level 3
- id: wolf-jerky
  name: Wolf Jerky
  type: cooking
  station: cauldron
  stationLevel: 3
  ingredients:
    - { itemId: wolf-meat, qty: 1 }
    - { itemId: honey, qty: 1 }
  yields: { itemId: wolf-jerky, qty: 2 }
  food:
    hp: 33
    stamina: 33
    healPerTick: 3
    duration: 1800
    weight: 0.5
  tags: [food, sustain, tier-4, mountain]

- id: wolf-skewer
  name: Wolf Skewer
  type: cooking
  station: cauldron
  stationLevel: 3
  ingredients:
    - { itemId: wolf-meat, qty: 1 }
    - { itemId: mushroom, qty: 2 }
    - { itemId: onion, qty: 1 }
  yields: { itemId: wolf-skewer, qty: 1 }
  food:
    hp: 65
    stamina: 21
    healPerTick: 3
    duration: 1500
    weight: 0.5
  tags: [food, hp, tier-4, mountain]

- id: eyescream
  name: Eyescream
  type: cooking
  station: cauldron
  stationLevel: 3
  ingredients:
    - { itemId: greydwarf-eye, qty: 3 }
    - { itemId: freeze-gland, qty: 1 }
  yields: { itemId: eyescream, qty: 1 }
  food:
    hp: 21
    stamina: 65
    healPerTick: 1
    duration: 1500
    weight: 0.5
  tags: [food, stamina, tier-4, mountain]

# Cauldron level 4
- id: blood-pudding
  name: Blood Pudding
  type: cooking
  station: cauldron
  stationLevel: 4
  ingredients:
    - { itemId: thistle, qty: 2 }
    - { itemId: bloodbag, qty: 2 }
    - { itemId: barley-flour, qty: 4 }
  yields: { itemId: blood-pudding, qty: 1 }
  food:
    hp: 25
    stamina: 75
    healPerTick: 2
    duration: 1800
    weight: 1.0
  tags: [food, stamina, tier-5, plains]

- id: fish-wraps
  name: Fish Wraps
  type: cooking
  station: cauldron
  stationLevel: 4
  ingredients:
    - { itemId: cooked-fish, qty: 2 }
    - { itemId: barley-flour, qty: 4 }
  yields: { itemId: fish-wraps, qty: 1 }
  food:
    hp: 70
    stamina: 23
    healPerTick: 4
    duration: 1500
    weight: 1.0
  tags: [food, hp, tier-5, plains]

# Cauldron level 5
- id: salad
  name: Salad
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: jotun-puffs, qty: 3 }
    - { itemId: onion, qty: 3 }
    - { itemId: cloudberries, qty: 3 }
  yields: { itemId: salad, qty: 3 }
  food:
    hp: 26
    stamina: 80
    healPerTick: 3
    duration: 1500
    weight: 1.0
  tags: [food, stamina, tier-6, mistlands]

- id: mushroom-omelette
  name: Mushroom Omelette
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: egg, qty: 3 }
    - { itemId: jotun-puffs, qty: 3 }
  yields: { itemId: mushroom-omelette, qty: 1 }
  food:
    hp: 28
    stamina: 85
    healPerTick: 3
    duration: 1500
    weight: 1.0
  tags: [food, stamina, tier-6, mistlands]

- id: yggdrasil-porridge
  name: Yggdrasil Porridge
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: sap, qty: 4 }
    - { itemId: barley, qty: 3 }
    - { itemId: royal-jelly, qty: 2 }
  yields: { itemId: yggdrasil-porridge, qty: 1 }
  food:
    hp: 27
    stamina: 13
    eitr: 80
    healPerTick: 3
    duration: 1500
    weight: 1.0
  tags: [food, eitr, tier-6, mistlands]

- id: seeker-aspic
  name: Seeker Aspic
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: seeker-meat, qty: 2 }
    - { itemId: magecap, qty: 2 }
    - { itemId: royal-jelly, qty: 2 }
  yields: { itemId: seeker-aspic, qty: 2 }
  food:
    hp: 28
    stamina: 14
    eitr: 85
    healPerTick: 3
    duration: 1800
    weight: 1.0
  tags: [food, eitr, tier-6, mistlands]

- id: fiery-svinstew
  name: Fiery Svinstew
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: asksvin-tail, qty: 1 }
    - { itemId: vineberry-cluster, qty: 2 }
    - { itemId: smoke-puff, qty: 1 }
  yields: { itemId: fiery-svinstew, qty: 1 }
  food:
    hp: 95
    stamina: 32
    healPerTick: 6
    duration: 1500
    weight: 1.0
  tags: [food, hp, tier-7, ashlands]

- id: spicy-marmalade
  name: Spicy Marmalade
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: vineberry-cluster, qty: 3 }
    - { itemId: honey, qty: 1 }
    - { itemId: fiddlehead, qty: 1 }
  yields: { itemId: spicy-marmalade, qty: 1 }
  food:
    hp: 30
    stamina: 90
    healPerTick: 4
    duration: 1500
    weight: 1.0
  tags: [food, stamina, tier-7, ashlands]

- id: sizzling-berry-broth
  name: Sizzling Berry Broth
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: sap, qty: 3 }
    - { itemId: vineberry-cluster, qty: 2 }
    - { itemId: fiddlehead, qty: 2 }
  yields: { itemId: sizzling-berry-broth, qty: 1 }
  food:
    hp: 28
    stamina: 14
    eitr: 85
    healPerTick: 4
    duration: 1500
    weight: 1.0
  tags: [food, eitr, tier-7, ashlands]

# Cauldron level 6
- id: scorching-medley
  name: Scorching Medley
  type: cooking
  station: cauldron
  stationLevel: 6
  ingredients:
    - { itemId: jotun-puffs, qty: 3 }
    - { itemId: onion, qty: 3 }
    - { itemId: fiddlehead, qty: 3 }
  yields: { itemId: scorching-medley, qty: 3 }
  food:
    hp: 32
    stamina: 95
    healPerTick: 4
    duration: 1500
    weight: 1.0
  tags: [food, stamina, tier-7, ashlands]

- id: mashed-meat
  name: Mashed Meat
  type: cooking
  station: cauldron
  stationLevel: 6
  ingredients:
    - { itemId: asksvin-tail, qty: 1 }
    - { itemId: volture-meat, qty: 1 }
    - { itemId: fiddlehead, qty: 1 }
  yields: { itemId: mashed-meat, qty: 1 }
  food:
    hp: 100
    stamina: 34
    healPerTick: 6
    duration: 1500
    weight: 1.0
  tags: [food, hp, tier-7, ashlands]

- id: sparkling-shroomshake
  name: Sparkling Shroomshake
  type: cooking
  station: cauldron
  stationLevel: 6
  ingredients:
    - { itemId: sap, qty: 4 }
    - { itemId: magecap, qty: 2 }
    - { itemId: vineberry-cluster, qty: 2 }
    - { itemId: smoke-puff, qty: 2 }
  yields: { itemId: sparkling-shroomshake, qty: 1 }
  food:
    hp: 30
    stamina: 15
    eitr: 90
    healPerTick: 4
    duration: 1500
    weight: 1.0
  tags: [food, eitr, tier-7, ashlands]

- id: marinated-greens
  name: Marinated Greens
  type: cooking
  station: cauldron
  stationLevel: 6
  ingredients:
    - { itemId: sap, qty: 3 }
    - { itemId: magecap, qty: 2 }
    - { itemId: fiddlehead, qty: 2 }
    - { itemId: smoke-puff, qty: 2 }
  yields: { itemId: marinated-greens, qty: 1 }
  food:
    hp: 32
    stamina: 16
    eitr: 95
    healPerTick: 4
    duration: 1800
    weight: 1.0
  tags: [food, eitr, tier-7, ashlands]
```

- [ ] **Step 2: Run data validation**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/real-data.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/data/recipes/cooking.yaml
git commit -m "fix: correct all cauldron food stats/ingredients/levels to match wiki, add missing foods"
```

---

### Task 6: Rewrite cooking.yaml meads section with new mead schema

**Files:**
- Modify: `src/data/recipes/cooking.yaml` (replace everything from `# ── Meads ──` to end)

- [ ] **Step 1: Replace the meads section of cooking.yaml**

Replace everything from `# ── Meads ──` to the end of the file:

```yaml
# ── Meads ─────────────────────────────────────────────────────────────────────

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
  mead:
    effect:
      health: 50
    duration: 10
    cooldown: 120
    cooldownGroup: healing
  tags: [mead, instant-heal, tier-1, meadows]

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
  mead:
    effect:
      health: 75
    duration: 10
    cooldown: 120
    cooldownGroup: healing
  tags: [mead, instant-heal, tier-3, swamp]

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
  mead:
    effect:
      health: 125
    duration: 10
    cooldown: 120
    cooldownGroup: healing
  tags: [mead, instant-heal, tier-6, mistlands]

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
  mead:
    effect:
      healthRegen: 0.25
    duration: 300
    cooldown: 300
    cooldownGroup: healing
  tags: [mead, regen, tier-7, ashlands]

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
  mead:
    effect:
      stamina: 80
    duration: 2
    cooldown: 120
    cooldownGroup: stamina
  tags: [mead, instant-stamina, tier-1, meadows]

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
  mead:
    effect:
      stamina: 160
    duration: 2
    cooldown: 120
    cooldownGroup: stamina
  tags: [mead, instant-stamina, tier-5, plains]

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
  mead:
    effect:
      staminaRegen: 0.25
    duration: 300
    cooldown: 300
    cooldownGroup: stamina
  tags: [mead, regen, tier-6, mistlands]

- id: minor-eitr-mead
  name: Minor Eitr Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: sap, qty: 5 }
    - { itemId: jotun-puffs, qty: 2 }
    - { itemId: magecap, qty: 5 }
  yields: { itemId: minor-eitr-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      eitr: 125
    duration: 10
    cooldown: 120
    cooldownGroup: eitr
  tags: [mead, instant-eitr, tier-6, mistlands]

- id: lingering-eitr-mead
  name: Lingering Eitr Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: sap, qty: 10 }
    - { itemId: vineberry-cluster, qty: 10 }
    - { itemId: magecap, qty: 10 }
  yields: { itemId: lingering-eitr-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      eitrRegen: 0.25
    duration: 300
    cooldown: 300
    cooldownGroup: eitr
  tags: [mead, regen, tier-7, ashlands]

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
  mead:
    effect:
      resist: poison
    duration: 600
    cooldown: 600
  tags: [mead, resistance, tier-1, meadows]

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
  mead:
    effect:
      resist: frost
    duration: 600
    cooldown: 600
  tags: [mead, resistance, tier-3, swamp]

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
  mead:
    effect:
      resist: fire
    duration: 600
    cooldown: 600
  tags: [mead, resistance, tier-5, plains]

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
  mead:
    effect:
      healthRegen: -0.5
      staminaRegen: 1.0
    duration: 10
    cooldown: 10
  tags: [mead, utility, tier-1, meadows]

- id: berserkir-mead
  name: Berserkir Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: mushroom, qty: 10 }
    - { itemId: yellow-mushroom, qty: 10 }
    - { itemId: toadstool, qty: 1 }
  yields: { itemId: berserkir-mead, qty: 3 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×3."
  mead:
    effect:
      effects:
        - "Attack, Block and Dodge Stamina use -80%"
        - "Weak (×1.5) against Slash, Blunt and Pierce damage"
    duration: 20
    cooldown: 120
  tags: [mead, utility, tier-3, swamp]

- id: anti-sting-concoction
  name: Anti-Sting Concoction
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: cloudberries, qty: 10 }
    - { itemId: grouper, qty: 3 }
    - { itemId: fragrant-bundle, qty: 1 }
  yields: { itemId: anti-sting-concoction, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      effects:
        - "Prevent Deathsquito attacks"
    duration: 600
    cooldown: 0
  tags: [mead, utility, tier-5, plains]

- id: draught-of-vananidir
  name: Draught of Vananidir
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: dandelion, qty: 10 }
    - { itemId: perch, qty: 2 }
    - { itemId: fresh-seaweed, qty: 1 }
  yields: { itemId: draught-of-vananidir, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      effects:
        - "-50% swimming stamina consumption"
    duration: 300
    cooldown: 0
  tags: [mead, utility, tier-1, meadows]

- id: tonic-of-ratatosk
  name: Tonic of Ratatosk
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: blueberries, qty: 10 }
    - { itemId: cured-squirrel-hamstring, qty: 1 }
  yields: { itemId: tonic-of-ratatosk, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      effects:
        - "+15% walking and running speed"
        - "+7.5% swimming speed"
    duration: 600
    cooldown: 0
  tags: [mead, utility, tier-2, black-forest]

- id: mead-of-troll-endurance
  name: Mead of Troll Endurance
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: trollfish, qty: 2 }
    - { itemId: honey, qty: 10 }
    - { itemId: powdered-dragon-eggshells, qty: 1 }
  yields: { itemId: mead-of-troll-endurance, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      effects:
        - "+250 carry weight"
    duration: 300
    cooldown: 120
  tags: [mead, utility, tier-4, mountain]

- id: brew-of-animal-whispers
  name: Brew of Animal Whispers
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: onion, qty: 5 }
    - { itemId: carrot, qty: 10 }
    - { itemId: pungent-pebbles, qty: 1 }
  yields: { itemId: brew-of-animal-whispers, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      effects:
        - "×2 Taming speed"
    duration: 600
    cooldown: 0
  tags: [mead, utility, tier-5, plains]

- id: lightfoot-mead
  name: Lightfoot Mead
  type: cooking
  station: mead-ketill
  stationLevel: 1
  ingredients:
    - { itemId: scale-hide, qty: 2 }
    - { itemId: feathers, qty: 5 }
    - { itemId: magecap, qty: 5 }
  yields: { itemId: lightfoot-mead, qty: 6 }
  secondaryStep:
    station: fermenter
    description: "Ferment for 2 in-game days. Produces ×6."
  mead:
    effect:
      effects:
        - "-30% jump stamina cost"
        - "+20% jump height"
    duration: 600
    cooldown: 0
  tags: [mead, utility, tier-6, mistlands]

- id: love-potion
  name: Love Potion
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: love-potion, qty: 5 }
  mead:
    effect:
      effects:
        - "Increases Troll spawning"
    duration: 300
    cooldown: 0
  tags: [mead, utility, tier-2, black-forest]
  notes: "Purchased from Haldor for 110 Coins."
```

- [ ] **Step 2: Run data validation**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/real-data.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/data/recipes/cooking.yaml
git commit -m "feat: rewrite meads with new MeadStatsSchema, add 10 missing meads"
```

---

### Task 7: Rewrite food-table.yaml and feasts.yaml with corrected wiki data

**Files:**
- Modify: `src/data/recipes/food-table.yaml`
- Modify: `src/data/recipes/feasts.yaml`

- [ ] **Step 1: Replace the oven preparations section of food-table.yaml**

Keep the fishing bait section unchanged. Replace everything from `# ── Food Table — Oven Preparations ──` to end of file:

```yaml
# ── Food Table — Oven Preparations ────────────────────────────────────────────

- id: bread
  name: Bread
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: bread-dough, qty: 1 }
  yields: { itemId: bread, qty: 2 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 23
    stamina: 70
    healPerTick: 2
    duration: 1500
    weight: 0.5
  tags: [food, baked, tier-5, plains]

- id: lox-meat-pie
  name: Lox Meat Pie
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: barley-flour, qty: 4 }
    - { itemId: cloudberries, qty: 2 }
    - { itemId: lox-meat, qty: 2 }
  yields: { itemId: lox-meat-pie, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 75
    stamina: 24
    healPerTick: 4
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-5, plains]

- id: frosted-sweetbread
  name: Frosted Sweetbread
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: unbaked-sweetbread, qty: 1 }
  yields: { itemId: frosted-sweetbread, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 43
    stamina: 43
    healPerTick: 2
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-5, plains]

- id: fish-n-bread
  name: "Fish 'n' Bread"
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: anglerfish, qty: 1 }
    - { itemId: bread-dough, qty: 2 }
  yields: { itemId: fish-n-bread, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 30
    stamina: 90
    healPerTick: 3
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-6, mistlands]

- id: honey-glazed-chicken
  name: Honey Glazed Chicken
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: chicken-meat, qty: 1 }
    - { itemId: honey, qty: 3 }
    - { itemId: jotun-puffs, qty: 2 }
  yields: { itemId: honey-glazed-chicken, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 80
    stamina: 26
    healPerTick: 5
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-6, mistlands]

- id: misthare-supreme
  name: Misthare Supreme
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: hare-meat, qty: 1 }
    - { itemId: jotun-puffs, qty: 3 }
    - { itemId: carrot, qty: 2 }
  yields: { itemId: misthare-supreme, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 85
    stamina: 28
    healPerTick: 5
    duration: 1500
    weight: 1.0
  tags: [food, baked, tier-6, mistlands]

- id: stuffed-mushroom
  name: Stuffed Mushroom
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: magecap, qty: 3 }
    - { itemId: blood-clot, qty: 1 }
    - { itemId: turnip, qty: 2 }
  yields: { itemId: stuffed-mushroom, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 25
    stamina: 12
    eitr: 75
    healPerTick: 3
    duration: 1500
    weight: 1.0
  tags: [food, baked, eitr, tier-6, mistlands]

- id: meat-platter
  name: Meat Platter
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: seeker-meat, qty: 1 }
    - { itemId: lox-meat, qty: 1 }
    - { itemId: hare-meat, qty: 1 }
  yields: { itemId: meat-platter, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 80
    stamina: 26
    healPerTick: 5
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-6, mistlands]

- id: piquant-pie
  name: Piquant Pie
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: asksvin-tail, qty: 2 }
    - { itemId: vineberry-cluster, qty: 2 }
    - { itemId: barley-flour, qty: 4 }
  yields: { itemId: piquant-pie, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 105
    stamina: 35
    healPerTick: 6
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-7, ashlands]

- id: roasted-crust-pie
  name: Roasted Crust Pie
  type: cooking
  station: food-table
  stationLevel: 1
  ingredients:
    - { itemId: volture-egg, qty: 1 }
    - { itemId: vineberry-cluster, qty: 2 }
    - { itemId: barley-flour, qty: 4 }
  yields: { itemId: roasted-crust-pie, qty: 1 }
  secondaryStep:
    station: oven
    description: "Bake in an Oven (~50 seconds). Burns if left too long."
  food:
    hp: 34
    stamina: 100
    healPerTick: 4
    duration: 1800
    weight: 1.0
  tags: [food, baked, tier-7, ashlands]
```

- [ ] **Step 2: Correct feasts.yaml stats and biome tags**

Update `src/data/recipes/feasts.yaml` — correct stackSize references (wiki says 5 per stack, 10 yield), add biome tags, correct stats. Replace entire file:

```yaml
# ── Feasts (Food Table) ──────────────────────────────────────────────────────

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
    healPerTick: 2
    duration: 3000
    weight: 10.0
  tags: [feast, tier-3, swamp]

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
    healPerTick: 3
    duration: 3000
    weight: 10.0
  tags: [feast, tier-3, swamp]

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
    healPerTick: 3
    duration: 3000
    weight: 10.0
  tags: [feast, tier-3, swamp]

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
    healPerTick: 3
    duration: 3000
    weight: 10.0
  tags: [feast, tier-3, swamp]

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
    healPerTick: 3
    duration: 3000
    weight: 10.0
  tags: [feast, tier-4, mountain]

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
    healPerTick: 4
    duration: 3000
    weight: 10.0
  tags: [feast, tier-5, plains]

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
    eitr: 33
    healPerTick: 5
    duration: 3000
    weight: 10.0
  tags: [feast, eitr, tier-6, mistlands]

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
    eitr: 38
    healPerTick: 6
    duration: 3000
    weight: 10.0
  tags: [feast, eitr, tier-7, ashlands]
```

- [ ] **Step 3: Run data validation**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/real-data.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/data/recipes/food-table.yaml src/data/recipes/feasts.yaml
git commit -m "fix: correct food-table/feast stats to match wiki, add missing oven recipes"
```

---

### Task 8: Add raw edible recipes

**Files:**
- Create: `src/data/recipes/raw.yaml`

- [ ] **Step 1: Create raw.yaml with all foraged/found foods**

Create `src/data/recipes/raw.yaml`:

```yaml
# ── Raw Edibles (Found, not crafted) ─────────────────────────────────────────

- id: raspberries
  name: Raspberries
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: raspberries, qty: 1 }
  food:
    hp: 7
    stamina: 20
    healPerTick: 1
    duration: 600
    weight: 0.1
  tags: [food, raw, tier-1, meadows]

- id: mushroom-food
  name: Mushroom
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: mushroom, qty: 1 }
  food:
    hp: 15
    stamina: 15
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, tier-1, meadows]

- id: honey-food
  name: Honey
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: honey, qty: 1 }
  food:
    hp: 8
    stamina: 35
    healPerTick: 1
    duration: 900
    weight: 0.2
  tags: [food, raw, tier-1, meadows]

- id: blueberries
  name: Blueberries
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: blueberries, qty: 1 }
  food:
    hp: 8
    stamina: 25
    healPerTick: 1
    duration: 600
    weight: 0.1
  tags: [food, raw, tier-2, black-forest]

- id: yellow-mushroom-food
  name: Yellow Mushroom
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: yellow-mushroom, qty: 1 }
  food:
    hp: 10
    stamina: 30
    healPerTick: 1
    duration: 600
    weight: 0.1
  tags: [food, raw, tier-2, black-forest]

- id: carrot-food
  name: Carrot
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: carrot, qty: 1 }
  food:
    hp: 10
    stamina: 32
    healPerTick: 1
    duration: 900
    weight: 0.3
  tags: [food, raw, tier-2, black-forest]

- id: bukeperries
  name: Bukeperries
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: bukeperries, qty: 1 }
  food:
    regenModifier: -1.0
    duration: 15
    weight: 0.1
  tags: [food, raw, tier-2, black-forest]

- id: onion-food
  name: Onion
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: onion, qty: 1 }
  food:
    hp: 13
    stamina: 40
    healPerTick: 1
    duration: 900
    weight: 0.3
  tags: [food, raw, tier-4, mountain]

- id: cloudberries-food
  name: Cloudberries
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: cloudberries, qty: 1 }
  food:
    hp: 13
    stamina: 40
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, tier-5, plains]

- id: magecap-food
  name: Magecap
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: magecap, qty: 1 }
  food:
    hp: 25
    stamina: 25
    eitr: 25
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, eitr, tier-6, mistlands]

- id: jotun-puffs-food
  name: Jotun Puffs
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: jotun-puffs, qty: 1 }
  food:
    hp: 25
    stamina: 25
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, tier-6, mistlands]

- id: smoke-puff-food
  name: Smoke Puff
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: smoke-puff, qty: 1 }
  food:
    hp: 15
    stamina: 15
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, tier-7, ashlands]

- id: fiddlehead-food
  name: Fiddlehead
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: fiddlehead, qty: 1 }
  food:
    hp: 30
    stamina: 30
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, tier-7, ashlands]

- id: vineberry-cluster-food
  name: Vineberry Cluster
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: vineberry-cluster, qty: 1 }
  food:
    hp: 30
    stamina: 30
    eitr: 30
    healPerTick: 1
    duration: 900
    weight: 0.1
  tags: [food, raw, eitr, tier-7, ashlands]

- id: rotten-meat
  name: Rotten Meat
  type: cooking
  station: found
  stationLevel: 1
  yields: { itemId: rotten-meat, qty: 1 }
  food:
    regenModifier: -1.0
    duration: 15
    weight: 0.5
  tags: [food, raw, tier-7, ashlands]
```

- [ ] **Step 2: Run data validation**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run tests/real-data.test.ts`
Expected: PASS (loader picks up new raw.yaml automatically since it reads all .yaml files in recipes/)

- [ ] **Step 3: Commit**

```bash
git add src/data/recipes/raw.yaml
git commit -m "feat: add raw edible food recipes (found items with food stats)"
```

---

### Task 9: Add consumable validation tests

**Files:**
- Modify: `tests/real-data.test.ts`

- [ ] **Step 1: Add consumable-specific validation tests**

Add to `tests/real-data.test.ts`:

```typescript
  it('food and mead are mutually exclusive on a recipe', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (recipe.food && recipe.mead) {
        violations.push(`${recipe.id} has both food and mead`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every food recipe has a biome tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const biomes = ['meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean'];
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (!recipe.food && !recipe.mead) continue;
      const tags = recipe.tags ?? [];
      if (!tags.some((t) => biomes.includes(t))) {
        violations.push(recipe.id);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every mead recipe has duration and cooldown', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (!recipe.mead) continue;
      if (recipe.mead.duration == null || recipe.mead.cooldown == null) {
        violations.push(recipe.id);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no recipe has removed food field "regen" (renamed to healPerTick)', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (recipe.food && 'regen' in recipe.food) {
        violations.push(recipe.id);
      }
    }
    expect(violations).toEqual([]);
  });
```

- [ ] **Step 2: Run all tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/real-data.test.ts
git commit -m "test: add consumable validation tests (food/mead exclusion, biome tags, regen rename)"
```

---

### Task 10: Update detail page to render food stats with new field names and mead stats

**Files:**
- Modify: `src/pages/recipes/[slug].astro:135-147`

- [ ] **Step 1: Update food stats rendering**

Replace lines 135-147 in `src/pages/recipes/[slug].astro` (the food stats section):

```astro
    {/* ── Food stats ── */}
    {recipe.food && (
      <div class="detail-card__section">
        <h2 class="detail-card__section-title">Food stats</h2>
        <ul class="detail-list">
          {recipe.food.hp != null && <li>Health: {recipe.food.hp}</li>}
          {recipe.food.stamina != null && <li>Stamina: {recipe.food.stamina}</li>}
          {recipe.food.eitr != null && <li>Eitr: {recipe.food.eitr}</li>}
          {recipe.food.healPerTick != null && <li>Healing: {recipe.food.healPerTick} hp/tick</li>}
          {recipe.food.duration != null && <li>Duration: {Math.round(recipe.food.duration / 60)} min</li>}
          {recipe.food.weight != null && <li>Weight: {recipe.food.weight}</li>}
          {recipe.food.regenModifier != null && <li>Regen modifier: {recipe.food.regenModifier > 0 ? '+' : ''}{recipe.food.regenModifier * 100}%</li>}
        </ul>
      </div>
    )}

    {/* ── Mead stats ── */}
    {recipe.mead && (
      <div class="detail-card__section">
        <h2 class="detail-card__section-title">Mead effect</h2>
        <ul class="detail-list">
          {recipe.mead.effect.health != null && <li>Restores {recipe.mead.effect.health} health</li>}
          {recipe.mead.effect.stamina != null && <li>Restores {recipe.mead.effect.stamina} stamina</li>}
          {recipe.mead.effect.eitr != null && <li>Restores {recipe.mead.effect.eitr} eitr</li>}
          {recipe.mead.effect.resist && <li>{recipe.mead.effect.resist.charAt(0).toUpperCase() + recipe.mead.effect.resist.slice(1)} resistance</li>}
          {recipe.mead.effect.healthRegen != null && <li>{recipe.mead.effect.healthRegen > 0 ? '+' : ''}{recipe.mead.effect.healthRegen * 100}% health regen</li>}
          {recipe.mead.effect.staminaRegen != null && <li>{recipe.mead.effect.staminaRegen > 0 ? '+' : ''}{recipe.mead.effect.staminaRegen * 100}% stamina regen</li>}
          {recipe.mead.effect.eitrRegen != null && <li>{recipe.mead.effect.eitrRegen > 0 ? '+' : ''}{recipe.mead.effect.eitrRegen * 100}% eitr regen</li>}
          {(recipe.mead.effect.effects ?? []).map((e) => <li>{e}</li>)}
          <li>Duration: {recipe.mead.duration >= 60 ? `${Math.round(recipe.mead.duration / 60)} min` : `${recipe.mead.duration}s`}</li>
          <li>Cooldown: {recipe.mead.cooldown >= 60 ? `${Math.round(recipe.mead.cooldown / 60)} min` : `${recipe.mead.cooldown}s`}</li>
          {recipe.mead.cooldownGroup && <li>Cooldown group: {recipe.mead.cooldownGroup}</li>}
        </ul>
      </div>
    )}
```

- [ ] **Step 2: Build to verify rendering**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/recipes/\[slug\].astro
git commit -m "feat: update detail page for sparse food stats and mead effect rendering"
```

---

### Task 11: Final build verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm vitest run`
Expected: All tests pass

- [ ] **Step 2: Run full build**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm build 2>&1 | tail -10`
Expected: Build succeeds, page count increases (new recipe pages for raw edibles + missing foods + meads)

- [ ] **Step 3: Spot-check a few detail pages**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.claude/worktrees/feat+consumable-data && pnpm dev --port 4322 &`

Check these URLs manually:
- `http://localhost:4322/recipes/queens-jam/` — should show corrected food stats
- `http://localhost:4322/recipes/minor-healing-mead/` — should show mead effect
- `http://localhost:4322/recipes/raspberries/` — should show raw food with "Found" station
- `http://localhost:4322/recipes/berserkir-mead/` — should show freeform effects
- `http://localhost:4322/recipes/bukeperries/` — should show -100% regen modifier
