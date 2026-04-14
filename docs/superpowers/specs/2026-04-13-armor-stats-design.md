# Armor Stats Schema & Scraper Design

## Overview

Add structured armor stats to the Valheim helper — armor value, durability, weight, movement penalty, resistances, effects, and set bonuses. Replace the existing flat `stats` on armor recipes with a typed `ArmorStatsSchema`. Populate all data via a wiki scraper adapted from the weapon stats scraper.

## Schema

### New types in `schema.ts`

```typescript
export const ResistanceLevelSchema = z.enum(['weak', 'resistant']);

export const ResistancesSchema = z.record(
  z.enum(['slash', 'pierce', 'blunt', 'fire', 'frost', 'lightning', 'poison', 'spirit']),
  ResistanceLevelSchema
);

export const SetBonusSchema = z.object({
  name: z.string(),         // "Root Set"
  pieces: z.number().int(), // 3
  effect: z.string(),       // "Improved archery — +15 Bows"
});

export const ArmorStatsSchema = z.object({
  armor: z.number().nonnegative(),
  durability: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  movementPenalty: z.number().optional(),   // e.g. -5 (percentage)
  resistances: ResistancesSchema.optional(),
  effects: z.array(z.string()).optional(),  // ["+25 Eitr", "Slow fall"]
  setBonus: SetBonusSchema.optional(),
});
```

### RecipeSchema changes

- Add `armorStats: ArmorStatsSchema.optional()` alongside existing `stats` (which stays for weapons).
- On `ItemUpgradeSchema`: add `armorStats` as a partial overlay. Only `armor` and `durability` change per upgrade level — resistances, effects, and set bonus do not vary by quality.

### Migration

All 41 existing armor items have their flat `stats: { armor, durability, weight }` replaced with the new `armorStats` field. The scraper output is authoritative and overwrites existing values.

## Scraper (`scripts/scrape_armor_stats.py`)

Forked from `scrape_weapon_stats.py`, targeting `{{Infobox armor}}` wiki templates.

### Capabilities

- **Single item**: `python scripts/scrape_armor_stats.py "Carapace breastplate"`
- **Batch mode**: `python scripts/scrape_armor_stats.py --batch armors.txt`
- **Dry run**: `--dry-run` prints diff without writing

### Data extracted

- Armor value, durability, weight, movement speed penalty
- Crafting station, crafting level, repair level
- Base ingredients and quantities
- Upgrade ingredients per quality level (2, 3, 4)
- Upgrade armor/durability values per quality level
- Resistances (from infobox `Resistances` field)
- Effects (non-resistance passives like "+25 Eitr")
- Set bonus (set name, piece count, effect description)

### Edge case handling

- Some armor pages (e.g., Root harness) have resistances in the page body rather than the infobox. The scraper falls back to parsing body text for resistance keywords when the infobox field is absent.
- Wiki armor pages are often grouped by set (Head/Chest/Legs tabs). The scraper handles tabbed infoboxes by extracting each piece separately.

### Validation

The scraper validates against existing `crafting.yaml` data:
- Base and upgrade ingredients (names and quantities)
- Station and station/repair levels
- Flags discrepancies in `--dry-run` output for review

### Missing items

Items not yet in `crafting.yaml` (e.g., Root set) are added as complete recipe entries with all fields: id, name, type, station, stationLevel, repairLevel, ingredients, yields, tags, biome, armorStats, upgrades.

## Data (`crafting.yaml`)

- All 41 existing armor items migrated from flat `stats` to `armorStats`
- Missing armor sets added (Root set, any others discovered during scraping)
- All data validated against wiki source

## Display

### Detail page (`[slug].astro`)

New conditional block for `armorStats` (parallel to existing weapon stats block):
- **Stats card**: armor value, durability, weight, movement penalty
- **Resistances**: list with color coding (resistant = green, weak = red)
- **Effects**: simple list
- **Set bonus**: callout card showing set name, piece count, and effect
- **Upgrade table**: armor and durability per quality level (resistances/set bonus outside the table since they don't change)

### List view (`RecipeRow.tsx`)

- Show armor value for armor items (same column pattern as weapon damage)

### Comparison table (`ComparisonTable.tsx`)

- Support armor-specific columns: armor, weight, movement penalty, resistances

## Out of scope

- Resistance filtering/search (can add later if needed)
- Set completion tracking (showing which pieces you have)
- Armor value calculations with skill bonuses
