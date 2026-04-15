# Filter Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign filter system from additive tag chips to structured categories with contextual sub-filters, migrating all data to a unified tag-based model.

**Architecture:** Python migration script transforms YAML data (tag renames, classification assignment, biome field→tag). TypeScript filter logic simplifies to pure tag AND. UI rewrites AdvancedFilterPanel with category→subtype→contextual sub-filter hierarchy.

**Tech Stack:** Python 3 (ruamel.yaml for YAML migration), TypeScript, SolidJS, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-04-14-filter-redesign-design.md`

---

### Task 1: Write validation tests for post-migration data

**Files:**
- Modify: `tests/real-data.test.ts`

These tests define the target state. They will FAIL until the migration runs.

- [ ] **Step 1: Replace existing classification tests with new ones**

Replace the contents of `tests/real-data.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAll } from '../src/lib/loader';

const CLASSIFICATION_TAGS = ['melee', 'ranged', 'ammo', 'armor', 'tool', 'build', 'food', 'mead'] as const;
const REMOVED_TAGS = ['weapon', 'club', 'battleaxe', 'sledge', 'tower-shield', 'building', 'one-handed', 'two-handed'] as const;
const BIOME_TAGS = ['meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean', 'deep-north'] as const;
const FOOD_STAT_TAGS = ['hp', 'balanced', 'stamina', 'eitr'] as const;
const MEAD_SUBTYPE_TAGS = ['healing', 'stamina', 'eitr', 'resistance', 'utility'] as const;

describe('real src/data', () => {
  it('loads without errors', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.stations.length).toBeGreaterThan(0);
    expect(data.recipes.length).toBeGreaterThan(0);
  });

  it('every recipe has exactly one classification tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = CLASSIFICATION_TAGS.filter((c) => tags.includes(c));
      if (found.length !== 1) {
        violations.push(`${recipe.id} has ${found.length} classifications: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no recipe has removed tags', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = REMOVED_TAGS.filter((t) => tags.includes(t));
      if (found.length > 0) {
        violations.push(`${recipe.id} has removed tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every melee or ranged item has exactly one handedness tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('melee') && !tags.includes('ranged')) continue;
      const hand = ['1h', '2h'].filter((h) => tags.includes(h));
      if (hand.length !== 1) {
        violations.push(`${recipe.id} has ${hand.length} handedness tags: [${hand.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every recipe has at most one biome tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = BIOME_TAGS.filter((b) => tags.includes(b));
      if (found.length > 1) {
        violations.push(`${recipe.id} has ${found.length} biome tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every food item has exactly one stat focus tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('food')) continue;
      const found = FOOD_STAT_TAGS.filter((s) => tags.includes(s));
      if (found.length !== 1) {
        violations.push(`${recipe.id} has ${found.length} stat focus tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every mead item has exactly one mead subtype tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('mead')) continue;
      // Note: 'stamina' and 'eitr' overlap with food stat tags, but on mead items they are mead subtypes
      const found = MEAD_SUBTYPE_TAGS.filter((s) => tags.includes(s));
      if (found.length !== 1) {
        violations.push(`${recipe.id} has ${found.length} mead subtype tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every found item also has a classification tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('found')) continue;
      const cls = CLASSIFICATION_TAGS.filter((c) => tags.includes(c));
      if (cls.length !== 1) {
        violations.push(`${recipe.id} is found but has ${cls.length} classifications`);
      }
    }
    expect(violations).toEqual([]);
  });

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

  it('no recipe has biome field (migrated to tag)', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if ('biome' in recipe && recipe.biome != null) {
        violations.push(`${recipe.id} still has biome field: ${recipe.biome}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/real-data.test.ts`
Expected: Multiple failures — classification tags wrong, removed tags present, biome field still exists.

- [ ] **Step 3: Commit**

```bash
git add tests/real-data.test.ts
git commit -m "test: add post-migration validation tests for filter redesign"
```

---

### Task 2: Write and run data migration script

**Files:**
- Create: `scripts/migrate-filter-tags.py`
- Modify: `src/data/recipes/crafting.yaml`
- Modify: `src/data/recipes/cooking.yaml`
- Modify: `src/data/recipes/raw.yaml`
- Modify: `src/data/recipes/spit.yaml`
- Modify: `src/data/recipes/feasts.yaml`
- Modify: `src/data/recipes/food-table.yaml`

- [ ] **Step 1: Write migration script**

Create `scripts/migrate-filter-tags.py`:

```python
#!/usr/bin/env python3
"""Migrate recipe YAML tags for filter redesign.

Transformations:
1. Tag renames: club→mace, battleaxe→axe, sledge→mace, tower-shield→tower,
   building→build, one-handed→1h, two-handed→2h
2. Remove 'weapon' tag, add 'melee' or 'ranged' based on sub-type
3. Add 'ammo' classification to arrow/bolt/missile items that lack it
4. Add 'food' classification to feast items (currently only have 'feast')
5. Add 'tool' classification to bait items
6. Add 'build' classification to station-upgrade items
7. Mead tag simplification: instant-heal→healing, instant-stamina→stamina,
   instant-eitr→eitr, regen→healing/stamina/eitr (context-dependent)
8. Food stat focus: add 'balanced' for sustain items, ensure all food has stat tag
9. Food subtypes: add 'cooked' to spit/cauldron food, ensure feasts have 'feast'
10. Add 'found' tag to raw food items
11. Biome field → tag: move biome value into tags array, remove biome field
12. Additional fixes: butcher-knife→tool, buckler audit, elemental audit
"""

import sys
from pathlib import Path

try:
    from ruamel.yaml import YAML
except ImportError:
    print("Install ruamel.yaml: pip install ruamel.yaml")
    sys.exit(1)

yaml = YAML()
yaml.preserve_quotes = True
yaml.width = 200  # prevent line wrapping

DATA_DIR = Path(__file__).parent.parent / "src" / "data" / "recipes"

# Weapon sub-types that are melee
MELEE_SUBTYPES = {'sword', 'axe', 'mace', 'fists', 'knife', 'spear', 'pickaxe', 'atgeir', 'club', 'battleaxe', 'sledge'}
# Weapon sub-types that are ranged
RANGED_SUBTYPES = {'bow', 'crossbow', 'staff'}
# Ammo sub-types
AMMO_SUBTYPES = {'arrow', 'bolt', 'missile'}

# Tags to rename (old → new)
TAG_RENAMES = {
    'club': 'mace',
    'battleaxe': 'axe',
    'sledge': 'mace',
    'tower-shield': 'tower',
    'building': 'build',
    'one-handed': '1h',
    'two-handed': '2h',
}

# Mead effect tag → broad category
MEAD_TAG_MAP = {
    'instant-heal': 'healing',
    'instant-stamina': 'stamina',
    'instant-eitr': 'eitr',
    'regen': None,  # context-dependent, resolved per-item
    'resistance': 'resistance',
    'utility': 'utility',
}

# Biome values (used to detect biome tags already in tags list)
BIOME_VALUES = {'meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean', 'deep-north'}

# Items that should be reclassified
BUTCHER_KNIFE_ID = 'butcher-knife'


def get_tags(recipe):
    """Get tags list, creating if absent."""
    if 'tags' not in recipe or recipe['tags'] is None:
        recipe['tags'] = []
    return recipe['tags']


def has_tag(tags, tag):
    return tag in tags


def add_tag(tags, tag, position=None):
    """Add tag if not present. Position 0 = front, None = end."""
    if tag not in tags:
        if position is not None:
            tags.insert(position, tag)
        else:
            tags.append(tag)


def remove_tag(tags, tag):
    while tag in tags:
        tags.remove(tag)


def rename_tags(tags):
    """Apply all tag renames in-place."""
    for i, tag in enumerate(list(tags)):
        if tag in TAG_RENAMES:
            tags[i] = TAG_RENAMES[tag]


def resolve_mead_regen(recipe):
    """For meads tagged 'regen', determine the broad category from the mead effect or recipe name."""
    name = recipe.get('name', '').lower()
    mead = recipe.get('mead', {})
    effect = mead.get('effect', {}) if mead else {}

    if 'healing' in name or 'heal' in name:
        return 'healing'
    if 'stamina' in name:
        return 'stamina'
    if 'eitr' in name:
        return 'eitr'

    # Check mead effect fields
    if effect:
        if effect.get('healthRegen') or effect.get('health'):
            return 'healing'
        if effect.get('staminaRegen') or effect.get('stamina'):
            return 'stamina'
        if effect.get('eitrRegen') or effect.get('eitr'):
            return 'eitr'

    # Fallback
    return 'utility'


def determine_food_stat_focus(recipe):
    """Determine stat focus tag for a food item."""
    tags = get_tags(recipe)

    # Already has a stat focus tag
    for st in ['hp', 'stamina', 'eitr', 'balanced']:
        if has_tag(tags, st):
            return st

    # 'sustain' maps to 'balanced'
    if has_tag(tags, 'sustain'):
        return 'balanced'

    # Derive from food stats
    food = recipe.get('food', {})
    if not food:
        return 'balanced'  # fallback

    hp = food.get('hp', 0) or 0
    stam = food.get('stamina', 0) or 0
    eitr_val = food.get('eitr', 0) or 0

    # If eitr is dominant or present
    if eitr_val > 0 and eitr_val >= hp and eitr_val >= stam:
        return 'eitr'

    # Check if balanced (multiple stats roughly equal, or both significant)
    total = hp + stam + eitr_val
    if total == 0:
        return 'balanced'

    hp_ratio = hp / total if total > 0 else 0
    stam_ratio = stam / total if total > 0 else 0

    # If both hp and stamina are significant (neither dominates >65%)
    if hp > 0 and stam > 0 and hp_ratio < 0.65 and stam_ratio < 0.65:
        return 'balanced'

    if hp >= stam:
        return 'hp'
    return 'stamina'


def migrate_recipe(recipe, filename):
    """Apply all migrations to a single recipe."""
    tags = get_tags(recipe)
    recipe_id = recipe.get('id', 'unknown')

    # === Step 1: Tag renames ===
    rename_tags(tags)

    # === Step 2: Weapon → melee/ranged classification ===
    if has_tag(tags, 'weapon'):
        remove_tag(tags, 'weapon')
        # Determine melee vs ranged from sub-type tags
        is_ranged = any(has_tag(tags, t) for t in RANGED_SUBTYPES)
        # Add classification at position 0
        add_tag(tags, 'ranged' if is_ranged else 'melee', position=0)

    # Atgeirs without weapon tag need melee
    if has_tag(tags, 'atgeir') and not has_tag(tags, 'melee') and not has_tag(tags, 'ranged'):
        add_tag(tags, 'melee', position=0)

    # === Step 3: Ammo classification ===
    if any(has_tag(tags, t) for t in AMMO_SUBTYPES) and not has_tag(tags, 'ammo'):
        add_tag(tags, 'ammo', position=0)

    # Bombs are ammo
    if has_tag(tags, 'bomb') and not has_tag(tags, 'ammo'):
        add_tag(tags, 'ammo', position=0)

    # === Step 4: Armor — already has 'armor' tag, just verify ===
    # Shield/buckler items already have 'armor' tag

    # === Step 5: Food classification ===
    # Feasts: add 'food' if missing
    if has_tag(tags, 'feast') and not has_tag(tags, 'food'):
        add_tag(tags, 'food', position=0)

    # === Step 6: Bait → tool classification ===
    if has_tag(tags, 'bait') and not has_tag(tags, 'tool'):
        add_tag(tags, 'tool', position=0)

    # === Step 7: Build classification ===
    # station-upgrade items need 'build'
    if has_tag(tags, 'station-upgrade') and not has_tag(tags, 'build'):
        add_tag(tags, 'build', position=0)

    # === Step 8: Material items → tool (crafting materials like bronze, nails) ===
    if has_tag(tags, 'material') and not any(has_tag(tags, c) for c in ['melee', 'ranged', 'ammo', 'armor', 'tool', 'build', 'food', 'mead']):
        add_tag(tags, 'tool', position=0)

    # === Step 9: Utility items without classification → tool ===
    classification_tags = {'melee', 'ranged', 'ammo', 'armor', 'tool', 'build', 'food', 'mead'}
    if not any(has_tag(tags, c) for c in classification_tags):
        # Items with no classification — check if they're utility/standalone
        if has_tag(tags, 'utility') or has_tag(tags, 'bomb'):
            pass  # bombs already handled above
        # Fallback: assign 'tool' for unclassified crafting items
        if not any(has_tag(tags, c) for c in classification_tags):
            add_tag(tags, 'tool', position=0)

    # === Step 10: Butcher knife reclassification ===
    if recipe_id == BUTCHER_KNIFE_ID:
        remove_tag(tags, 'melee')
        if not has_tag(tags, 'tool'):
            add_tag(tags, 'tool', position=0)

    # === Step 11: Mead tag simplification ===
    if has_tag(tags, 'mead'):
        for old_tag, new_tag in MEAD_TAG_MAP.items():
            if has_tag(tags, old_tag):
                remove_tag(tags, old_tag)
                if new_tag is None:
                    # 'regen' needs context resolution
                    resolved = resolve_mead_regen(recipe)
                    add_tag(tags, resolved)
                else:
                    add_tag(tags, new_tag)

    # === Step 12: Food stat focus ===
    if has_tag(tags, 'food'):
        stat = determine_food_stat_focus(recipe)
        # Remove 'sustain' if present
        remove_tag(tags, 'sustain')
        add_tag(tags, stat)

    # === Step 13: Food subtypes ===
    if has_tag(tags, 'food'):
        # Raw items already have 'raw'
        # Baked items already have 'baked'
        # Feasts already have 'feast'
        # Spit and cauldron food without a subtype → 'cooked'
        food_subtypes = {'raw', 'cooked', 'baked', 'feast'}
        if not any(has_tag(tags, s) for s in food_subtypes):
            add_tag(tags, 'cooked')

    # === Step 14: Found tag for raw food ===
    if has_tag(tags, 'raw') and has_tag(tags, 'food'):
        add_tag(tags, 'found')

    # === Step 15: Biome field → tag ===
    biome = recipe.get('biome')
    if biome:
        biome_str = str(biome)
        add_tag(tags, biome_str)
        del recipe['biome']

    # Ensure no duplicate tags
    seen = set()
    deduped = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            deduped.append(t)
    tags.clear()
    tags.extend(deduped)


def migrate_file(filepath):
    """Migrate all recipes in a YAML file."""
    print(f"Migrating {filepath.name}...")
    data = yaml.load(filepath)
    if not isinstance(data, list):
        print(f"  Skipping {filepath.name} — not a list")
        return

    for recipe in data:
        migrate_recipe(recipe, filepath.name)

    yaml.dump(data, filepath)
    print(f"  Migrated {len(data)} recipes")


def main():
    files = [
        DATA_DIR / "crafting.yaml",
        DATA_DIR / "cooking.yaml",
        DATA_DIR / "raw.yaml",
        DATA_DIR / "spit.yaml",
        DATA_DIR / "feasts.yaml",
        DATA_DIR / "food-table.yaml",
    ]

    for f in files:
        if f.exists():
            migrate_file(f)
        else:
            print(f"WARNING: {f} not found")

    print("\nDone. Run validation tests: npx vitest run tests/real-data.test.ts")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Install ruamel.yaml and run migration**

Run: `pip install ruamel.yaml && python scripts/migrate-filter-tags.py`
Expected: Output showing migration of each file with recipe counts.

- [ ] **Step 3: Run validation tests**

Run: `npx vitest run tests/real-data.test.ts`
Expected: All tests PASS. If any fail, inspect the violations and fix the migration script or data manually.

- [ ] **Step 4: Manually review YAML diffs**

Run: `git diff src/data/recipes/ | head -200`
Inspect a sample of changes to verify correctness. Check:
- `weapon` tag removed, replaced with `melee`/`ranged`
- `club` → `mace`, `battleaxe` → `axe`, `sledge` → `mace`
- `one-handed` → `1h`, `two-handed` → `2h`
- `biome` field removed, value added as tag
- Food items have stat focus tags
- Mead items have simplified subtype tags

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-filter-tags.py src/data/recipes/
git commit -m "feat: migrate recipe tags for filter redesign

Run Python migration script to:
- Replace weapon tag with melee/ranged classification
- Add ammo/food/mead/tool/build classification to all recipes
- Rename tags: club→mace, battleaxe→axe, sledge→mace, tower-shield→tower,
  building→build, one-handed→1h, two-handed→2h
- Simplify mead effect tags to broad categories
- Add food stat focus tags (hp/balanced/stamina/eitr)
- Add food subtypes (cooked/raw/baked/feast)
- Move biome field to tag
- Add found tag to raw food items"
```

---

### Task 3: Update schema — remove biome field, update BiomeSchema

**Files:**
- Modify: `src/lib/schema.ts`

- [ ] **Step 1: Add deep-north to BiomeSchema and remove biome from RecipeSchema**

In `src/lib/schema.ts`, update `BiomeSchema` to include `deep-north`:

```typescript
export const BiomeSchema = z.enum([
  'meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean', 'deep-north',
]);
```

In `RecipeSchema`, remove the `biome` field:

```typescript
// Remove this line from RecipeSchema:
//   biome: BiomeSchema.optional(),
```

- [ ] **Step 2: Run tests to verify schema change doesn't break loading**

Run: `npx vitest run tests/real-data.test.ts`
Expected: All tests PASS (data already migrated, biome field removed from YAML).

- [ ] **Step 3: Commit**

```bash
git add src/lib/schema.ts
git commit -m "feat: remove biome field from RecipeSchema, add deep-north to BiomeSchema"
```

---

### Task 4: Refactor FilterState and filterRecipes

**Files:**
- Modify: `src/lib/filter.ts`
- Modify: `tests/filter.test.ts`

- [ ] **Step 1: Write new filter tests**

Replace `tests/filter.test.ts` with tests for the new FilterState shape:

```typescript
import { describe, it, expect } from 'vitest';
import { filterRecipes, emptyFilterState, type FilterState } from '../src/lib/filter';
import type { Recipe } from '../src/lib/types';

const sample: Recipe[] = [
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 2,
    ingredients: [
      { itemId: 'iron', qty: 60 },
      { itemId: 'wood', qty: 2 },
    ],
    tags: ['melee', 'sword', '1h', 'swamp'],
  },
  {
    id: 'bronze-sword',
    name: 'Bronze Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 1,
    ingredients: [
      { itemId: 'bronze', qty: 8 },
      { itemId: 'wood', qty: 2 },
      { itemId: 'leather-scraps', qty: 2 },
    ],
    tags: ['melee', 'sword', '1h', 'black-forest'],
  },
  {
    id: 'queens-jam',
    name: 'Queens Jam',
    type: 'cooking',
    station: 'cauldron',
    stationLevel: 1,
    ingredients: [
      { itemId: 'raspberries', qty: 8 },
      { itemId: 'blueberries', qty: 6 },
    ],
    tags: ['food', 'cooked', 'balanced', 'meadows'],
  },
  {
    id: 'upgrade-forge-2',
    name: 'Forge Bellows',
    type: 'building',
    station: 'forge',
    stationLevel: 2,
    ingredients: [{ itemId: 'wood', qty: 5 }],
    tags: ['build', 'station-upgrade'],
  },
  {
    id: 'draugr-fang',
    name: 'Draugr Fang',
    type: 'crafting',
    station: 'forge',
    stationLevel: 3,
    ingredients: [
      { itemId: 'ancient-bark', qty: 10 },
      { itemId: 'silver', qty: 20 },
    ],
    tags: ['ranged', 'bow', '2h', 'elemental', 'mountain'],
  },
  {
    id: 'minor-healing-mead',
    name: 'Minor Healing Mead',
    type: 'cooking',
    station: 'mead-ketill',
    stationLevel: 1,
    ingredients: [
      { itemId: 'honey', qty: 10 },
      { itemId: 'raspberries', qty: 10 },
    ],
    tags: ['mead', 'healing', 'meadows'],
  },
];

const empty: FilterState = { ...emptyFilterState };

describe('filterRecipes', () => {
  it('returns everything when filters are empty', () => {
    expect(filterRecipes(sample, empty).map((r) => r.id)).toEqual([
      'iron-sword', 'bronze-sword', 'queens-jam', 'upgrade-forge-2', 'draugr-fang', 'minor-healing-mead',
    ]);
  });

  it('filters by category tag (melee)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['melee'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by category + subtype (melee + sword)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['melee', 'sword'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by category + subtype + handedness', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['ranged', '2h'] }).map((r) => r.id),
    ).toEqual(['draugr-fang']);
  });

  it('filters by biome tag', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['meadows'] }).map((r) => r.id),
    ).toEqual(['queens-jam', 'minor-healing-mead']);
  });

  it('filters by category + biome (AND)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['melee', 'swamp'] }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('filters by food category', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['food'] }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by mead category', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['mead'] }).map((r) => r.id),
    ).toEqual(['minor-healing-mead']);
  });

  it('filters by modifier tag', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['elemental'] }).map((r) => r.id),
    ).toEqual(['draugr-fang']);
  });

  it('filters by station', () => {
    expect(
      filterRecipes(sample, { ...empty, station: 'cauldron' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by per-station ceiling', () => {
    expect(
      filterRecipes(sample, { ...empty, stationCeilings: { forge: 1 } }).map((r) => r.id),
    ).toEqual(['bronze-sword', 'queens-jam', 'minor-healing-mead']);
  });

  it('filters by ingredient (single)', () => {
    expect(
      filterRecipes(sample, { ...empty, ingredientIds: ['iron'] }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('filters by text query (name match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'queen' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by text query (tag match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: '1h' }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('combines tags + station + query with AND', () => {
    expect(
      filterRecipes(sample, {
        ...empty,
        tags: ['melee'],
        station: 'forge',
        query: 'iron',
      }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('empty tags match everything (no tag filter)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: [] }).length,
    ).toBe(sample.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail with current code**

Run: `npx vitest run tests/filter.test.ts`
Expected: FAIL — old FilterState has different shape, sample data uses new tag format.

- [ ] **Step 3: Update FilterState and filterRecipes**

Replace `src/lib/filter.ts`:

```typescript
import type { Recipe } from './types';

export interface FilterState {
  query: string;
  tags: string[];
  ingredientIds: string[];
  station: string;
  stationCeilings: Record<string, number>;
}

export const emptyFilterState: FilterState = {
  query: '',
  tags: [],
  ingredientIds: [],
  station: 'all',
  stationCeilings: {},
};

export function filterRecipes(recipes: Recipe[], state: FilterState): Recipe[] {
  const q = state.query.trim().toLowerCase();
  return recipes.filter((r) => {
    // Station filter
    if (state.station !== 'all' && r.station !== state.station) return false;

    // Per-station ceiling
    const ceiling = state.stationCeilings[r.station];
    if (ceiling != null && r.stationLevel > ceiling) return false;

    // Tag filtering: AND logic — recipe must have all selected tags
    if (state.tags.length > 0) {
      const recipeTags = r.tags ?? [];
      if (!state.tags.every((t) => recipeTags.includes(t))) return false;
    }

    // Ingredient filtering: AND logic
    if (state.ingredientIds.length > 0) {
      const ingIds = new Set((r.ingredients ?? []).map((i) => i.itemId));
      if (!state.ingredientIds.every((id) => ingIds.has(id))) return false;
    }

    // Text search
    if (q.length > 0) {
      const haystacks: string[] = [
        r.name.toLowerCase(),
        ...(r.tags ?? []).map((t) => t.toLowerCase()),
        ...(r.ingredients ?? []).map((i) => i.itemId.toLowerCase()),
      ];
      if (!haystacks.some((h) => h.includes(q))) return false;
    }

    return true;
  });
}
```

- [ ] **Step 4: Run filter tests**

Run: `npx vitest run tests/filter.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts tests/filter.test.ts
git commit -m "feat: simplify FilterState — tags-only filtering, remove type/biome fields"
```

---

### Task 5: Update URL state encode/decode

**Files:**
- Modify: `src/lib/url-state.ts`

- [ ] **Step 1: Update encode/decode for new FilterState shape**

Replace `src/lib/url-state.ts`:

```typescript
import type { FilterState } from './filter';

export function encodeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tags.length > 0) {
    params.set('tags', state.tags.join(','));
  }
  if (state.ingredientIds.length > 0) {
    params.set('ing', state.ingredientIds.join(','));
  }
  if (state.query.trim().length > 0) {
    params.set('q', state.query.trim());
  }
  if (state.station !== 'all') {
    params.set('station', state.station);
  }
  for (const [stationId, level] of Object.entries(state.stationCeilings)) {
    params.set(`stn-${stationId}`, String(level));
  }
  return params;
}

export function decodeFilterState(params: URLSearchParams): FilterState {
  const tagsRaw = params.get('tags');
  const tags = tagsRaw
    ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const ingRaw = params.get('ing');
  const ingredientIds = ingRaw
    ? ingRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const query = params.get('q') ?? '';
  const station = params.get('station') ?? 'all';

  const stationCeilings: Record<string, number> = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith('stn-')) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        stationCeilings[key.slice(4)] = parsed;
      }
    }
  }

  return { query, tags, ingredientIds, station, stationCeilings };
}
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All PASS. URL state is used by components which will be updated next — no dedicated URL state tests needed beyond existing integration.

- [ ] **Step 3: Commit**

```bash
git add src/lib/url-state.ts
git commit -m "feat: simplify URL state encode/decode for tag-based filtering"
```

---

### Task 6: Create filter categories configuration

**Files:**
- Create: `src/lib/filter-categories.ts`

- [ ] **Step 1: Create category configuration with contextual sub-filter visibility**

Create `src/lib/filter-categories.ts`:

```typescript
export interface FilterCategory {
  label: string;
  tag: string;
  subtypes: string[];
}

export const categories: FilterCategory[] = [
  { label: 'Melee',    tag: 'melee',  subtypes: ['sword', 'axe', 'mace', 'fists', 'knife', 'spear', 'pickaxe'] },
  { label: 'Ranged',   tag: 'ranged', subtypes: ['bow', 'crossbow', 'staff'] },
  { label: 'Ammo',     tag: 'ammo',   subtypes: ['arrow', 'bolt', 'missile'] },
  { label: 'Armor',    tag: 'armor',  subtypes: ['helmet', 'chest', 'legs', 'cape', 'buckler', 'shield', 'tower'] },
  { label: 'Tools',    tag: 'tool',   subtypes: ['bait'] },
  { label: 'Building', tag: 'build',  subtypes: [] },
  { label: 'Food',     tag: 'food',   subtypes: ['raw', 'cooked', 'baked', 'feast'] },
  { label: 'Mead',     tag: 'mead',   subtypes: ['healing', 'stamina', 'eitr', 'resistance', 'utility'] },
];

export const biomes = [
  { label: 'Meadows',      tag: 'meadows' },
  { label: 'Black Forest', tag: 'black-forest' },
  { label: 'Swamp',        tag: 'swamp' },
  { label: 'Mountain',     tag: 'mountain' },
  { label: 'Plains',       tag: 'plains' },
  { label: 'Mistlands',    tag: 'mistlands' },
  { label: 'Ashlands',     tag: 'ashlands' },
  { label: 'Ocean',        tag: 'ocean' },
  { label: 'Deep North',   tag: 'deep-north' },
] as const;

export const foodStatFocus = [
  { label: 'HP',       tag: 'hp' },
  { label: 'Balanced', tag: 'balanced' },
  { label: 'Stamina',  tag: 'stamina' },
  { label: 'Eitr',     tag: 'eitr' },
] as const;

export const handedness = [
  { label: 'One-Handed', tag: '1h' },
  { label: 'Two-Handed', tag: '2h' },
] as const;

export const modifiers = [
  { label: 'Elemental', tag: 'elemental' },
  { label: 'Magic',     tag: 'magic' },
] as const;

/** Tag → human-readable display label */
export const tagDisplayNames: Record<string, string> = {
  '1h': 'One-Handed',
  '2h': 'Two-Handed',
  'tower': 'Tower Shield',
  'build': 'Building',
  'melee': 'Melee',
  'ranged': 'Ranged',
  'ammo': 'Ammo',
  'hp': 'HP',
  'balanced': 'Balanced',
};

/** Which sub-filter rows are visible for each category tag */
export type SubFilterKey = 'handedness' | 'biome' | 'statFocus' | 'modifiers' | 'found';

export const categorySubFilters: Record<string, SubFilterKey[]> = {
  melee:  ['handedness', 'biome', 'modifiers'],
  ranged: ['handedness', 'biome', 'modifiers'],
  ammo:   ['biome', 'modifiers'],
  armor:  ['biome'],
  tool:   ['biome'],
  build:  ['biome', 'found'],
  food:   ['biome', 'statFocus', 'found'],
  mead:   ['biome'],
};

/** Default (no category selected): only biome */
export const defaultSubFilters: SubFilterKey[] = ['biome'];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/filter-categories.ts
git commit -m "feat: add filter category configuration with contextual sub-filter visibility"
```

---

### Task 7: Rewrite AdvancedFilterPanel

**Files:**
- Modify: `src/components/AdvancedFilterPanel.tsx`

- [ ] **Step 1: Rewrite the component**

Replace `src/components/AdvancedFilterPanel.tsx`:

```typescript
import { For, Show, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import { emptyFilterState } from '../lib/filter';
import type { Station } from '../lib/types';
import {
  categories,
  biomes,
  foodStatFocus,
  handedness,
  modifiers,
  categorySubFilters,
  defaultSubFilters,
  type SubFilterKey,
} from '../lib/filter-categories';

interface Props {
  state: FilterState;
  stations: Station[];
  spriteHref?: string;
  onChange: (next: FilterState) => void;
}

export const AdvancedFilterPanel: Component<Props> = (props) => {
  const FilterIcon: Component<{ name: string }> = (iconProps) => (
    <svg class="filter-icon" width={16} height={16} style={{ "image-rendering": "pixelated" }}>
      <use href={`${props.spriteHref ?? ''}#filter-${iconProps.name}`} />
    </svg>
  );

  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  // ── Tag helpers ──────────────────────────────────────────────────────────
  const hasTags = (...tags: string[]) =>
    tags.every((t) => props.state.tags.includes(t));

  const activeCategory = () =>
    categories.find((c) => hasTags(c.tag)) ?? null;

  const visibleSubFilters = (): SubFilterKey[] => {
    const cat = activeCategory();
    return cat ? (categorySubFilters[cat.tag] ?? defaultSubFilters) : defaultSubFilters;
  };

  const isSubFilterVisible = (key: SubFilterKey) =>
    visibleSubFilters().includes(key);

  // ── Single-select within a group ─────────────────────────────────────────
  // Removes any tag from `group` that isn't `tag`, then toggles `tag`.
  const selectExclusive = (tag: string, group: string[]) => {
    const current = props.state.tags.filter((t) => !group.includes(t));
    if (hasTags(tag)) {
      // Deselect
      update({ tags: current });
    } else {
      update({ tags: [...current, tag] });
    }
  };

  // ── Category selection ───────────────────────────────────────────────────
  const selectCategory = (tag: string) => {
    const categoryTags = categories.map((c) => c.tag);
    // Also clear subtypes, handedness, stat focus, modifiers, found when switching categories
    const allSubtypes = categories.flatMap((c) => c.subtypes);
    const allSubFilters = [
      ...handedness.map((h) => h.tag),
      ...foodStatFocus.map((f) => f.tag),
      ...modifiers.map((m) => m.tag),
      'found',
    ];
    const clearSet = new Set([...categoryTags, ...allSubtypes, ...allSubFilters]);
    const base = props.state.tags.filter((t) => !clearSet.has(t));

    if (hasTags(tag)) {
      // Deselect category — show all
      update({ tags: base });
    } else {
      update({ tags: [...base, tag] });
    }
  };

  // ── Sub-type selection (single-select within active category) ────────────
  const selectSubtype = (tag: string) => {
    const cat = activeCategory();
    if (!cat) return;
    selectExclusive(tag, cat.subtypes);
  };

  // ── Sub-filter selections ────────────────────────────────────────────────
  const selectBiome = (tag: string) =>
    selectExclusive(tag, biomes.map((b) => b.tag));

  const selectHandedness = (tag: string) =>
    selectExclusive(tag, handedness.map((h) => h.tag));

  const selectStatFocus = (tag: string) =>
    selectExclusive(tag, foodStatFocus.map((f) => f.tag));

  const toggleModifier = (tag: string) => {
    const current = props.state.tags;
    if (current.includes(tag)) {
      update({ tags: current.filter((t) => t !== tag) });
    } else {
      update({ tags: [...current, tag] });
    }
  };

  const toggleFound = () => toggleModifier('found');

  // ── Advanced section ─────────────────────────────────────────────────────
  const stationsWithUpgrades = () =>
    props.stations.filter((s) => s.upgrades.length > 0);

  const getCeiling = (station: Station): number =>
    props.state.stationCeilings[station.id] ?? station.maxLevel;

  const setCeiling = (stationId: string, level: number) =>
    update({ stationCeilings: { ...props.state.stationCeilings, [stationId]: level } });

  const clearCeiling = (stationId: string) => {
    const next = { ...props.state.stationCeilings };
    delete next[stationId];
    update({ stationCeilings: next });
  };

  const hasAnyFilter = () =>
    props.state.tags.length > 0 ||
    props.state.station !== 'all' ||
    Object.keys(props.state.stationCeilings).length > 0 ||
    props.state.query.length > 0;

  return (
    <div class="adv-filter">
      {/* ── Categories ──────────────────────────────────────────────── */}
      <div class="adv-filter__section">
        <div class="adv-filter__section-header">
          <span class="adv-filter__label">Category</span>
          <button
            type="button"
            class="adv-filter__clear"
            classList={{ 'adv-filter__clear--disabled': !hasAnyFilter() }}
            disabled={!hasAnyFilter()}
            onClick={() => props.onChange({ ...emptyFilterState })}
          >
            ✕ Clear
          </button>
        </div>
        <div class="adv-filter__tags" role="radiogroup" aria-label="Item category">
          <For each={categories}>
            {(cat) => (
              <button
                type="button"
                class="filter-chip filter-chip--sm"
                classList={{ 'filter-chip--active': hasTags(cat.tag) }}
                onClick={() => selectCategory(cat.tag)}
                role="radio"
                aria-checked={hasTags(cat.tag)}
              >
                <FilterIcon name={cat.tag} />
                {cat.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* ── Sub-types ───────────────────────────────────────────────── */}
      <Show when={activeCategory()?.subtypes.length}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Type</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Sub-type">
            <For each={activeCategory()!.subtypes}>
              {(sub) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(sub) }}
                  onClick={() => selectSubtype(sub)}
                  role="radio"
                  aria-checked={hasTags(sub)}
                >
                  <FilterIcon name={sub} />
                  {sub}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Handedness ──────────────────────────────────────────────── */}
      <Show when={isSubFilterVisible('handedness')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Handedness</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Handedness">
            <For each={handedness}>
              {(h) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(h.tag) }}
                  onClick={() => selectHandedness(h.tag)}
                  role="radio"
                  aria-checked={hasTags(h.tag)}
                >
                  {h.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Biome ───────────────────────────────────────────────────── */}
      <Show when={isSubFilterVisible('biome')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Biome</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Biome">
            <For each={biomes}>
              {(b) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(b.tag) }}
                  onClick={() => selectBiome(b.tag)}
                  role="radio"
                  aria-checked={hasTags(b.tag)}
                >
                  <FilterIcon name={b.tag} />
                  {b.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Stat Focus (Food only) ──────────────────────────────────── */}
      <Show when={isSubFilterVisible('statFocus')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Stat Focus</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Food stat focus">
            <For each={foodStatFocus}>
              {(s) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(s.tag) }}
                  onClick={() => selectStatFocus(s.tag)}
                  role="radio"
                  aria-checked={hasTags(s.tag)}
                >
                  {s.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Modifiers (Melee/Ranged/Ammo only) ─────────────────────── */}
      <Show when={isSubFilterVisible('modifiers')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Modifiers</span>
          <div class="adv-filter__tags" role="group" aria-label="Modifiers">
            <For each={modifiers}>
              {(m) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(m.tag) }}
                  onClick={() => toggleModifier(m.tag)}
                  aria-pressed={hasTags(m.tag)}
                >
                  {m.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Found (Food/Building only) ──────────────────────────────── */}
      <Show when={isSubFilterVisible('found')}>
        <div class="adv-filter__section">
          <div class="adv-filter__tags">
            <button
              type="button"
              class="filter-chip filter-chip--sm"
              classList={{ 'filter-chip--active': hasTags('found') }}
              onClick={toggleFound}
              aria-pressed={hasTags('found')}
            >
              Found
            </button>
          </div>
        </div>
      </Show>

      {/* ── Advanced (collapsible) ──────────────────────────────────── */}
      <details class="adv-filter__advanced">
        <summary class="adv-filter__label">Advanced</summary>
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
      </details>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdvancedFilterPanel.tsx
git commit -m "feat: rewrite AdvancedFilterPanel with category hierarchy and contextual sub-filters"
```

---

### Task 8: Update FilterBar for new FilterState

**Files:**
- Modify: `src/components/FilterBar.tsx`

- [ ] **Step 1: Update hasActiveFilters to use new FilterState shape**

In `src/components/FilterBar.tsx`, replace the `hasActiveFilters` function (around line 82-89):

```typescript
  const hasActiveFilters = () =>
    props.state.tags.length > 0 ||
    props.state.station !== 'all' ||
    Object.keys(props.state.stationCeilings).length > 0;
```

This removes references to `type`, `biomes`, `minStationLevel`, `maxStationLevel` which no longer exist on FilterState.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: update FilterBar hasActiveFilters for simplified FilterState"
```

---

### Task 9: Fix remaining compile errors and integration verification

**Files:**
- Potentially any file that imports from `filter.ts` or references old FilterState fields

- [ ] **Step 1: Find all files referencing old FilterState fields**

Run: `grep -rn 'state\.type\|state\.biomes\|state\.minStationLevel\|state\.maxStationLevel\|\.type.*=.*crafting\|\.type.*=.*cooking\|\.type.*=.*building\|\.type.*=.*found' src/ --include='*.ts' --include='*.tsx'`

Fix any remaining references to removed fields. Common fixes:
- `state.type !== 'all'` → check for category tag in `state.tags`
- `state.biomes` → biome is now in `state.tags`
- `state.minStationLevel` / `state.maxStationLevel` → use `stationCeilings`

- [ ] **Step 2: Run build**

Run: `npx astro build` or the project's build command.
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: resolve remaining references to old FilterState fields"
```

---

### Task 10: Final verification and cleanup

- [ ] **Step 1: Run dev server and manually test**

Run: `npx astro dev --port 4322`

Verify:
- Categories render as 8 chips
- Clicking a category shows its sub-types
- Sub-filters appear/disappear contextually
- Biome filter works (single-select)
- Food → shows stat focus chips (HP, Balanced, Stamina, Eitr)
- Mead → shows mead subtype chips
- URL updates correctly with tag params
- Clear button resets everything
- Advanced section collapses/expands
- Station level inputs work

- [ ] **Step 2: Delete migration script (optional)**

The migration script has served its purpose. It can be kept for reference or deleted:

```bash
rm scripts/migrate-filter-tags.py
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: filter redesign complete — cleanup and verification"
```
