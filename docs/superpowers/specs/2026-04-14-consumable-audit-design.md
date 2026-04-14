# Consumable Audit & Schema Redesign

## Overview

Audit all consumable data (food + meads) against the Valheim wiki, redesign the food and mead schemas to use sparse individual fields (only present when the item modifies that stat), and add missing items.

## Food Schema

### Current

```typescript
FoodStatsSchema = z.object({
  hp: z.number().nonnegative(),
  stamina: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  regen: z.number().nonnegative(),
  eitr: z.number().nonnegative().optional(),
});
```

### New

All fields optional — only include what the food actually provides. Rename `regen` to `healPerTick` for clarity (matches wiki's "Healing (hp/tick)" column). Add `weight`, `regenModifier` for debuff foods.

```typescript
FoodStatsSchema = z.object({
  hp: z.number().optional(),
  stamina: z.number().optional(),
  eitr: z.number().optional(),
  healPerTick: z.number().optional(),
  duration: z.number().optional(),
  weight: z.number().optional(),
  regenModifier: z.number().optional(),  // -1.0 = -100% regen (bukeperries, rotten meat)
});
```

### Examples

```yaml
# Normal food — only fields it provides
- id: queens-jam
  food:
    hp: 14
    stamina: 40
    healPerTick: 2
    duration: 1200
    weight: 1.0

# Eitr food — has eitr field
- id: stuffed-mushroom
  food:
    hp: 25
    stamina: 12
    eitr: 75
    healPerTick: 3
    duration: 1500
    weight: 1.0

# Debuff food — regenModifier, no hp/stamina
- id: bukeperries
  food:
    regenModifier: -1.0
    duration: 15
    weight: 0.1
```

### Fork type derivation

Not stored — derived at render time from the stats:

- **Red** (health): `hp > stamina` and no eitr
- **Yellow** (stamina): `stamina > hp` and no eitr
- **Blue** (eitr): `eitr` is present and `eitr >= hp` and `eitr >= stamina`
- **White** (balanced): `hp === stamina`, or feast

## Mead Schema

Meads are fundamentally different from food: they have instant or timed **effects** plus a **cooldown**, not passive stat buffs. New schema:

```typescript
MeadEffectSchema = z.object({
  health: z.number().optional(),             // instant heal: +50, +75, +125
  stamina: z.number().optional(),            // instant restore: +80, +160
  eitr: z.number().optional(),               // instant restore: +125
  resist: z.string().optional(),             // "fire", "frost", "poison"
  healthRegen: z.number().optional(),        // +0.25 = +25% health regen
  staminaRegen: z.number().optional(),       // +1.0 = +100% stamina regen
  eitrRegen: z.number().optional(),          // +0.25 = +25% eitr regen
  effects: z.array(z.string()).optional(),   // freeform for unique meads
});

MeadStatsSchema = z.object({
  effect: MeadEffectSchema,
  duration: z.number(),                      // seconds
  cooldown: z.number(),                      // seconds
  weight: z.number().optional(),             // default 1.0
  cooldownGroup: z.string().optional(),      // "healing", "stamina", "eitr" — shared cooldown
});
```

### Examples

```yaml
# Instant heal mead
- id: minor-healing-mead
  mead:
    effect:
      health: 50
    duration: 10
    cooldown: 120
    cooldownGroup: healing

# Resistance mead
- id: frost-resistance-mead
  mead:
    effect:
      resist: frost
    duration: 600
    cooldown: 600

# Regen mead
- id: lingering-healing-mead
  mead:
    effect:
      healthRegen: 0.25
    duration: 300
    cooldown: 300
    cooldownGroup: healing

# Mixed-effect mead (Tasty Mead: -50% health regen, +100% stamina regen)
- id: tasty-mead
  mead:
    effect:
      healthRegen: -0.5
      staminaRegen: 1.0
    duration: 10
    cooldown: 10

# Unique-effect mead (freeform effects list)
- id: berserkir-mead
  mead:
    effect:
      effects:
        - "Attack, Block and Dodge Stamina use -80%"
        - "Weak (×1.5) against Slash, Blunt and Pierce damage"
    duration: 20
    cooldown: 120

# Bought mead
- id: love-potion
  mead:
    effect:
      effects:
        - "Increases Troll spawning"
    duration: 300
    cooldown: 0
```

## Recipe Schema Changes

Add `mead` field alongside `food` on `RecipeSchema`:

```typescript
RecipeSchema = z.object({
  // ... existing fields ...
  food: FoodStatsSchema.optional(),
  mead: MeadStatsSchema.optional(),
  // ... rest ...
});
```

Validation: a recipe must have at most one of `food` or `mead`.

## Raw Edibles

Raw edible items (Raspberries, Mushroom, Honey, etc.) get recipe entries with `station: found` and no ingredients. They display less information but their food stats flow through the same pipeline.

```yaml
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
  tags: [food, raw, meadows]
```

The `found` station needs to be added to `stations.yaml` (or handled as a special case in the UI to display "Found" instead of a crafting station). Tags include the biome where found.

## Feast Identification

Feasts are identified by `station: food-table` + tag `feast`. They have `stackSize: 5` on items.yaml and yield 10 servings. No schema change needed — this is already working via tags.

## Missing Items to Add

### Missing foods (wiki has, we don't)

| Item | Biome | Station |
|------|-------|---------|
| Raspberries | Meadows | found |
| Mushroom | Meadows | found |
| Honey | Meadows | found (beehive) |
| Blueberries | Black Forest | found |
| Yellow mushroom | Black Forest | found |
| Carrot | Black Forest | found |
| Cooked bear meat | Black Forest | cooking-spit |
| Bukeperries | Black Forest | found |
| Muckshake | Swamp | cauldron (2) |
| Black soup | Swamp | cauldron (2) |
| Onion | Mountain | found |
| Cloudberries | Plains | found |
| Cooked egg | Plains | cauldron (1) |
| Frosted sweetbread | Plains | food-table + oven |
| Magecap | Mistlands | found |
| Jotun puffs | Mistlands | found |
| Misthare supreme | Mistlands | food-table + oven |
| Smoke puff | Ashlands | found |
| Fiddlehead | Ashlands | found |
| Vineberry cluster | Ashlands | found |
| Piquant pie | Ashlands | food-table + oven |
| Roasted crust pie | Ashlands | food-table + oven |
| Rotten meat | Ashlands | found |

### Missing meads (wiki has, we don't)

| Mead | Notes |
|------|-------|
| Minor eitr mead | Instant 125 eitr |
| Lingering eitr mead | +25% eitr regen |
| Love potion | Bought (110 coins) |
| Berserkir mead | Unique: -80% combat stamina, +1.5× damage taken |
| Anti-sting concoction | Prevent Deathsquito attacks |
| Draught of Vananidir | -50% swimming stamina |
| Tonic of Ratatosk | +15% walk/run speed, +7.5% swim speed |
| Mead of Troll endurance | +250 carry weight |
| Brew of animal whispers | ×2 taming speed |
| Lightfoot mead | -30% jump stamina, +20% jump height |

### Items needing item definitions in items.yaml

All missing foods and meads above need entries in `items.yaml` with appropriate `category`, `stackSize`, and `biome`.

## Stat Corrections

All existing food stats need to be corrected to match wiki values. Major discrepancies found in almost every item. The full data migration will update all values — here are the most notable:

| Item | Field | Ours | Wiki |
|------|-------|------|------|
| Queens Jam | hp/stamina | 32/44 | 14/40 |
| Carrot Soup | hp/stamina | 20/60 | 15/45 |
| Turnip Stew | hp/stamina | 55/25 | 18/55 |
| Sausages | hp/stamina | 60/40 | 55/18 |
| Serpent Stew | hp/stamina/duration | 80/80/2400 | 80/26/1800 |
| Eyescream | hp/stamina | 53/53 | 21/65 |
| Wolf Jerky | hp/stamina | 35/35 | 33/33 |
| Blood Pudding | hp/stamina | 90/50 | 25/75 |
| Fish Wraps | hp/stamina | 60/90 | 70/23 |
| Yggdrasil Porridge | hp/stamina/eitr | 115/35/- | 27/13/80 |
| Seeker Aspic | hp/stamina/eitr | 23/23/- | 28/14/85 |
| Boar Jerky | hp/stamina/duration | 23/21/2400 | 23/23/1800 |

Ingredient corrections also needed for: Deer Stew, Minced Meat Sauce, Serpent Stew, Eyescream, Wolf Skewer, Sausages, Onion Soup, and multiple Ashlands recipes.

Cauldron level corrections needed for: Boar Jerky (ours: 2, wiki: 1), Turnip Stew (ours: 1, wiki: 2), Sausages (ours: 3, wiki: 2), Onion Soup (ours: 3, wiki: 2), Wolf Jerky (ours: 4, wiki: 3), Wolf Skewer (ours: 4, wiki: 3), Blood Pudding (ours: 4, wiki: 4), and others.

## Tag Changes

### Biome tags on all food recipes

Every food/mead recipe gets a biome tag matching the wiki's "Biome progression" column: `meadows`, `black-forest`, `swamp`, `mountain`, `plains`, `mistlands`, `ashlands`.

### New tags

- `raw` — foraged/found foods (not crafted)
- `baked` — already exists, keep for oven items
- `feast` — already exists, keep for food-table feasts
- `eitr` — foods that grant eitr (blue fork type)

### Mead classification tags

Replace current mead tags with more specific ones:
- `mead` — all meads (keep)
- `heal` → `instant-heal` for instant heal meads
- `stamina` → `instant-stamina` for instant stamina meads
- `resistance` — keep for resist meads
- `regen` — for lingering regen meads
- `utility` — for unique-effect meads (Berserkir, Anti-sting, etc.)

## Future: "found" and "bought" Sources

Out of scope for this spec, noted for follow-up: a source system covering `found` (with biome/location) and `bought` (with vendor name: "Bog Witch", "Haldor", "Hildir") would cover raw ingredients and purchasable items like Love Potion and Troll Potion.

## Components Changed

- `schema.ts` — new `MeadEffectSchema`, `MeadStatsSchema`, updated `FoodStatsSchema`, add `mead` to `RecipeSchema`
- `items.yaml` — add missing food/mead item definitions
- `cooking.yaml` — correct all food stats, ingredients, station levels; add raw edibles
- `feasts.yaml` — correct feast stats
- `spit.yaml` — correct spit/iron-spit stats; add Cooked bear meat
- `food-table.yaml` — correct stats; add Frosted sweetbread, Misthare supreme, Piquant pie, Roasted crust pie
- `cooking.yaml` (meads section) — rewrite all meads with new `mead` schema; add 10 missing meads
- `stations.yaml` — add `found` station (or handle as special case)
- `real-data.test.ts` — add validation: food/mead mutual exclusion, sparse field checks, biome tag presence
- Detail page (`[slug].astro`) — render mead stats (effect, duration, cooldown) differently from food stats
- `ComparisonTable.tsx` / `ArmorStatsTable.tsx` — no changes (food doesn't have upgrades)

## Out of Scope

- "Found" and "bought" source system (follow-up spec)
- Food detail page visual redesign (use existing layout for now)
- Food comparison/ranking features
- Mead base item definitions (the intermediate "Mead base: Minor healing" items)
