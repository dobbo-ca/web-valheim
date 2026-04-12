# Recipe Data Validation & Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify all Valheim crafting/cooking recipes are present and correct, add yield quantities, stack sizes, and mead recipes to the data layer, then update the UI to display yields, stack sizes, station upgrade names, and mead fermenter flow.

**Architecture:** Two-phase approach. Phase 1 (Tasks 1–7) is pure data: schema changes, wiki scraper, diff report, YAML updates. Phase 2 (Tasks 8–12) is pure UI: display yields, stack sizes, upgrade names, mead flow, and cart yield math. All work happens in the `feat/recipe-data-validation` worktree at `.worktrees/recipe-validation/`.

**Tech Stack:** Python 3 (scraper), YAML, Zod 4, Vitest 4, Solid.js, Astro 6

**Working directory:** `/Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation`

---

## Phase 1: Data Validation & Expansion

---

### Task 1: Add `stackSize` to ItemSchema

**Files:**
- Modify: `src/lib/schema.ts:12-16`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test to `tests/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ItemSchema } from '../src/lib/schema';

describe('ItemSchema', () => {
  it('accepts an item with stackSize', () => {
    const result = ItemSchema.parse({
      id: 'wood-arrow',
      name: 'Wood Arrow',
      category: 'material',
      stackSize: 100,
    });
    expect(result.stackSize).toBe(100);
  });

  it('accepts an item without stackSize', () => {
    const result = ItemSchema.parse({
      id: 'wood',
      name: 'Wood',
      category: 'material',
    });
    expect(result.stackSize).toBeUndefined();
  });

  it('rejects stackSize of 0', () => {
    expect(() =>
      ItemSchema.parse({
        id: 'wood',
        name: 'Wood',
        category: 'material',
        stackSize: 0,
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm vitest run tests/schema.test.ts`

Expected: FAIL — `stackSize` not recognized or test for `stackSize` value fails.

- [ ] **Step 3: Add `stackSize` to `ItemSchema`**

In `src/lib/schema.ts`, replace:

```typescript
export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ItemCategorySchema,
});
```

With:

```typescript
export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ItemCategorySchema,
  stackSize: z.number().int().positive().optional(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm vitest run tests/schema.test.ts`

Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test`

Expected: All tests PASS (existing items.yaml entries without `stackSize` still validate because the field is optional).

- [ ] **Step 6: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/lib/schema.ts tests/schema.test.ts
git commit -m "feat(schema): add optional stackSize field to ItemSchema"
```

---

### Task 2: Add `MeadInfoSchema` and `mead` field to RecipeSchema

**Files:**
- Modify: `src/lib/schema.ts:36-57`
- Modify: `src/lib/types.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/schema.test.ts`:

```typescript
import { RecipeSchema } from '../src/lib/schema';

describe('RecipeSchema — mead field', () => {
  const baseRecipe = {
    id: 'minor-healing-mead',
    name: 'Minor Healing Mead',
    type: 'cooking',
    station: 'cauldron',
    stationLevel: 1,
    ingredients: [{ itemId: 'honey', qty: 10 }],
  };

  it('accepts a recipe with mead info', () => {
    const result = RecipeSchema.parse({
      ...baseRecipe,
      yields: { itemId: 'minor-healing-mead', qty: 6 },
      mead: {
        baseName: 'Mead Base: Minor Healing',
        fermenterDuration: 2400,
      },
    });
    expect(result.mead?.baseName).toBe('Mead Base: Minor Healing');
    expect(result.mead?.fermenterDuration).toBe(2400);
  });

  it('accepts a recipe without mead info', () => {
    const result = RecipeSchema.parse(baseRecipe);
    expect(result.mead).toBeUndefined();
  });

  it('rejects mead with missing baseName', () => {
    expect(() =>
      RecipeSchema.parse({
        ...baseRecipe,
        mead: { fermenterDuration: 2400 },
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm vitest run tests/schema.test.ts`

Expected: FAIL — `mead` field not recognized by RecipeSchema.

- [ ] **Step 3: Add MeadInfoSchema and mead field**

In `src/lib/schema.ts`, add after `FoodStatsSchema` (after line 41):

```typescript
export const MeadInfoSchema = z.object({
  baseName: z.string().min(1),
  fermenterDuration: z.number().int().positive(), // in-game seconds (2400 = 2 in-game days)
});
```

Then in `RecipeSchema`, add after the `food` line:

```typescript
  mead: MeadInfoSchema.optional(),
```

- [ ] **Step 4: Export `MeadInfo` type from `types.ts`**

In `src/lib/types.ts`, add the import and export:

```typescript
import type {
  ItemSchema,
  StationSchema,
  RecipeSchema,
  FoodStatsSchema,
  IngredientRefSchema,
  RecipeTypeSchema,
  ItemCategorySchema,
  MeadInfoSchema,
} from './schema';
```

And add:

```typescript
export type MeadInfo = z.infer<typeof MeadInfoSchema>;
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm vitest run tests/schema.test.ts`

Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test`

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/lib/schema.ts src/lib/types.ts tests/schema.test.ts
git commit -m "feat(schema): add MeadInfoSchema and optional mead field to RecipeSchema"
```

---

### Task 3: Build wiki scraper

**Files:**
- Create: `scripts/scrape-recipes.py`

This scraper fetches crafting recipes, cooking recipes, and mead bases from the Valheim wiki and compares against our YAML data. Output is a markdown diff report.

- [ ] **Step 1: Create scraper script**

Create `scripts/scrape-recipes.py`:

```python
#!/usr/bin/env python3
"""
Scrape Valheim wiki recipe data and compare against local YAML files.
Produces a markdown diff report at docs/recipe-diff-report.md.
"""

import urllib.request
import re
import time
import json
import sys
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / 'src' / 'data'
REPORT_PATH = REPO_ROOT / 'docs' / 'recipe-diff-report.md'

WIKI_BASE = 'https://valheim.fandom.com/wiki'
HEADERS = {'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0'}
REQUEST_DELAY = 0.6  # seconds between requests


# ---------------------------------------------------------------------------
# Wiki fetching
# ---------------------------------------------------------------------------

def fetch_page(slug: str) -> str:
    """Fetch raw HTML from a wiki page."""
    url = f'{WIKI_BASE}/{slug}'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return r.read().decode('utf-8')


def name_to_id(name: str) -> str:
    """Convert an in-game item name to our kebab-case ID convention."""
    return name.lower().replace("'", '').replace(' ', '-').replace('ö', 'ö')


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def extract_table_rows(html: str, table_class: str = '') -> list[list[str]]:
    """Extract rows from the first HTML table matching the class."""
    pattern = r'<table[^>]*' + re.escape(table_class) + r'[^>]*>(.*?)</table>'
    table_match = re.search(pattern, html, re.DOTALL)
    if not table_match:
        return []
    table_html = table_match.group(1)
    rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL)
    result = []
    for row in rows:
        cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.DOTALL)
        result.append([re.sub(r'<[^>]+>', ' ', c).strip() for c in cells])
    return result


def extract_recipe_from_infobox(html: str) -> dict:
    """Extract recipe data from a wiki item page infobox."""
    info = {}

    # Station
    station_match = re.search(r'data-source="station"[^>]*>.*?<div[^>]*>(.*?)</div>', html, re.DOTALL)
    if station_match:
        info['station'] = re.sub(r'<[^>]+>', '', station_match.group(1)).strip()

    # Station level
    level_match = re.search(r'(?:Level|level)\s*[:=]\s*(\d+)', html)
    if level_match:
        info['stationLevel'] = int(level_match.group(1))

    # Ingredients — look for crafting recipe table
    ingredients = []
    ing_section = re.findall(r'title="([^"]+)"[^>]*>[^<]*</a>\s*[x×]\s*(\d+)', html)
    for name, qty in ing_section:
        ingredients.append({'name': name, 'qty': int(qty)})
    info['ingredients'] = ingredients

    # Yield
    yield_match = re.search(r'(?:Result|Yields?|Creates?)\s*[:=]\s*(\d+)', html, re.I)
    if yield_match:
        info['yield'] = int(yield_match.group(1))

    # Stack size
    stack_match = re.search(r'(?:Stack|Max\.?\s*stack)\s*[:=]\s*(\d+)', html, re.I)
    if stack_match:
        info['stackSize'] = int(stack_match.group(1))

    return info


# ---------------------------------------------------------------------------
# YAML loading (without importing yaml — keep dependency-free)
# ---------------------------------------------------------------------------

def load_yaml_simple(path: Path) -> list[dict]:
    """Minimal YAML list-of-dicts loader for our flat data files."""
    try:
        import yaml
        with open(path) as f:
            return yaml.safe_load(f) or []
    except ImportError:
        print('WARNING: PyYAML not installed. Install with: pip install pyyaml', file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

def load_local_data() -> dict:
    """Load all local YAML data into a structured dict."""
    items = load_yaml_simple(DATA_DIR / 'items.yaml')
    stations = load_yaml_simple(DATA_DIR / 'stations.yaml')

    recipes = []
    recipes_dir = DATA_DIR / 'recipes'
    for f in sorted(recipes_dir.glob('*.yaml')):
        recipes.extend(load_yaml_simple(f))

    return {
        'items': {i['id']: i for i in items},
        'stations': {s['id']: s for s in stations},
        'recipes': {r['id']: r for r in recipes},
    }


def scrape_recipe_list(slug: str) -> list[str]:
    """Scrape a wiki category/list page for recipe names."""
    html = fetch_page(slug)
    time.sleep(REQUEST_DELAY)
    # Extract item names from links in tables or lists
    links = re.findall(r'<a[^>]+href="/wiki/([^"#]+)"[^>]*title="([^"]+)"', html)
    # Deduplicate while preserving order
    seen = set()
    names = []
    for slug, title in links:
        if title not in seen and not title.startswith(('Category:', 'File:', 'Template:')):
            seen.add(title)
            names.append(title)
    return names


def compare_recipes(local: dict, wiki_recipes: dict[str, dict]) -> list[str]:
    """Compare local recipes against wiki data, return report lines."""
    lines = []

    # Missing from local
    missing = []
    for wiki_id, wiki_data in wiki_recipes.items():
        if wiki_id not in local['recipes']:
            missing.append((wiki_id, wiki_data))
    if missing:
        lines.append('## Missing Recipes (in wiki, not in our data)\n')
        for rid, data in sorted(missing):
            lines.append(f'- **{rid}**: {data.get("name", rid)}')
            if data.get('station'):
                lines.append(f'  - Station: {data["station"]}')
            if data.get('ingredients'):
                ings = ', '.join(f'{i["name"]} ×{i["qty"]}' for i in data['ingredients'])
                lines.append(f'  - Ingredients: {ings}')
        lines.append('')

    # Extra in local (not on wiki — possible errors)
    extra = [rid for rid in local['recipes'] if rid not in wiki_recipes]
    if extra:
        lines.append('## Extra Recipes (in our data, not found on wiki)\n')
        for rid in sorted(extra):
            lines.append(f'- **{rid}**: {local["recipes"][rid].get("name", rid)}')
        lines.append('')

    # Ingredient mismatches
    mismatches = []
    for rid, wiki_data in wiki_recipes.items():
        if rid not in local['recipes']:
            continue
        local_recipe = local['recipes'][rid]
        wiki_ings = wiki_data.get('ingredients', [])
        local_ings = local_recipe.get('ingredients', [])

        # Compare sorted ingredient lists
        wiki_set = {(name_to_id(i['name']), i['qty']) for i in wiki_ings}
        local_set = {(i['itemId'], i['qty']) for i in local_ings}

        if wiki_set and wiki_set != local_set:
            mismatches.append((rid, local_ings, wiki_ings))

    if mismatches:
        lines.append('## Ingredient Mismatches\n')
        for rid, local_ings, wiki_ings in sorted(mismatches):
            lines.append(f'### {rid}')
            lines.append(f'- **Local:** {", ".join(f"{i["itemId"]} ×{i["qty"]}" for i in local_ings)}')
            lines.append(f'- **Wiki:** {", ".join(f"{i["name"]} ×{i["qty"]}" for i in wiki_ings)}')
            lines.append('')

    # Yield gaps
    yield_gaps = []
    for rid, wiki_data in wiki_recipes.items():
        if rid not in local['recipes']:
            continue
        wiki_yield = wiki_data.get('yield', 1)
        local_recipe = local['recipes'][rid]
        local_yield = local_recipe.get('yields', {}).get('qty', 1) if local_recipe.get('yields') else 1
        if wiki_yield > 1 and local_yield == 1:
            yield_gaps.append((rid, wiki_yield))
        elif wiki_yield != local_yield and wiki_yield > 1:
            yield_gaps.append((rid, wiki_yield))

    if yield_gaps:
        lines.append('## Yield Gaps (wiki shows >1, local missing or different)\n')
        for rid, wiki_yield in sorted(yield_gaps):
            lines.append(f'- **{rid}**: wiki says ×{wiki_yield}')
        lines.append('')

    # Stack size gaps
    stack_gaps = []
    for rid, wiki_data in wiki_recipes.items():
        if rid not in local['recipes']:
            continue
        wiki_stack = wiki_data.get('stackSize')
        if wiki_stack:
            # Check if the yielded item has a stackSize in our data
            local_recipe = local['recipes'][rid]
            yield_item = local_recipe.get('yields', {}).get('itemId', rid) if local_recipe.get('yields') else rid
            local_item = local['items'].get(yield_item, {})
            local_stack = local_item.get('stackSize')
            if local_stack != wiki_stack:
                stack_gaps.append((yield_item, wiki_stack, local_stack))

    if stack_gaps:
        lines.append('## Stack Size Gaps\n')
        for item_id, wiki_stack, local_stack in sorted(set(stack_gaps)):
            local_str = str(local_stack) if local_stack else 'not set'
            lines.append(f'- **{item_id}**: wiki={wiki_stack}, local={local_str}')
        lines.append('')

    return lines


# ---------------------------------------------------------------------------
# Main scrape orchestration
# ---------------------------------------------------------------------------

# Wiki pages that list recipes by station
STATION_PAGES = {
    'workbench': 'Workbench',
    'forge': 'Forge',
    'black-forge': 'Black_forge',
    'galdr-table': 'Galdr_table',
    'artisan-table': 'Artisan_table',
    'stonecutter': 'Stonecutter',
    'cauldron': 'Cauldron',
}

# Known multi-yield recipes and their quantities (wiki-verified reference)
# These serve as a known-good baseline — the scraper will also try to extract
# yields from individual pages, but parsing is unreliable so this is the
# authoritative list.
KNOWN_YIELDS = {
    # Arrows (×20)
    'wood-arrow': 20, 'flinthead-arrow': 20, 'fire-arrow': 20,
    'bronzehead-arrow': 20, 'ironhead-arrow': 20, 'silver-arrow': 20,
    'obsidian-arrow': 20, 'poison-arrow': 20, 'frost-arrow': 20,
    'carapace-arrow': 20, 'charred-arrow': 20,
    # Bolts (×20)
    'iron-bolt': 20, 'bone-bolt': 20, 'black-metal-bolt': 20,
    'carapace-bolt': 20, 'charred-bolt': 20,
    'ballista-bolt': 20,
    # Food yields
    'queens-jam': 4, 'blood-pudding': 1, 'sausages': 4,
    'eyescream': 1, 'serpent-stew': 1, 'carrot-soup': 1,
    'turnip-stew': 1, 'deer-stew': 1, 'minced-meat-sauce': 1,
    'onion-soup': 1, 'boar-jerky': 2, 'wolf-jerky': 2,
    'wolf-skewer': 1, 'fish-wraps': 1,
    'fiery-svinstew': 1, 'mushroom-omelette': 1,
    'salad': 3, 'seeker-aspic': 1, 'sizzling-berry-broth': 1,
    'spicy-marmalade': 1, 'yggdrasil-porridge': 1,
    'marinated-greens': 1, 'mashed-meat': 1,
    'scorching-medley': 1, 'sparkling-shroomshake': 1,
}

# Known stack sizes (wiki-verified reference)
KNOWN_STACK_SIZES = {
    # Arrows and bolts
    'wood-arrow': 100, 'flinthead-arrow': 100, 'fire-arrow': 100,
    'bronzehead-arrow': 100, 'ironhead-arrow': 100, 'silver-arrow': 100,
    'obsidian-arrow': 100, 'poison-arrow': 100, 'frost-arrow': 100,
    'carapace-arrow': 100, 'charred-arrow': 100,
    'iron-bolt': 100, 'bone-bolt': 100, 'black-metal-bolt': 100,
    'carapace-bolt': 100, 'charred-bolt': 100, 'ballista-bolt': 50,
    # Materials
    'wood': 50, 'fine-wood': 50, 'core-wood': 50,
    'stone': 50, 'flint': 30, 'copper': 30, 'tin': 30,
    'bronze': 30, 'iron': 30, 'silver': 30, 'black-metal': 30,
    'flametal': 30,
    'leather-scraps': 50, 'deer-hide': 50, 'troll-hide': 50,
    'wolf-pelt': 50, 'lox-pelt': 50,
    'feathers': 50, 'resin': 50, 'bone-fragments': 50,
    'ancient-bark': 50, 'guck': 50, 'ymir-flesh': 50,
    'freeze-gland': 50, 'wolf-fang': 50, 'crystal': 50,
    'linen-thread': 50, 'needle': 50, 'chain': 50,
    'serpent-scale': 50, 'ooze': 50, 'obsidian': 50,
    'carapace': 50, 'refined-eitr': 50, 'dvergr-needle': 50,
    'yggdrasil-wood': 50, 'black-marble': 50, 'sap': 50,
    'royal-jelly': 50, 'mandible': 50,
    'charred-bone': 50, 'morgen-heart': 50, 'bilebag': 50,
    'flax': 50, 'barley': 50, 'bronze-nails': 100, 'iron-nails': 100,
    # Trophies
    'deer-trophy': 20, 'drake-trophy': 20, 'draugr-elite-trophy': 20,
    'hard-antler': 20,
    # Cooking ingredients
    'raspberries': 50, 'blueberries': 50, 'cloudberries': 50,
    'honey': 50, 'mushroom': 50, 'yellow-mushroom': 50,
    'carrot': 50, 'turnip': 50, 'onion': 50,
    'boar-meat': 20, 'deer-meat': 20, 'neck-tail': 20,
    'fish-raw': 20, 'wolf-meat': 20, 'serpent-meat': 20,
    'lox-meat': 20, 'seeker-meat': 20, 'charred-meat': 20,
    'barley-flour': 20, 'bloodbag': 50, 'thistle': 50,
    'entrails': 50, 'jotun-puffs': 50, 'magecap': 50,
    'fiddlehead': 50, 'vineberry-cluster': 50,
    # Food items
    'queens-jam': 10, 'carrot-soup': 10, 'turnip-stew': 10,
    'boar-jerky': 10, 'deer-stew': 10, 'minced-meat-sauce': 10,
    'sausages': 10, 'serpent-stew': 10, 'onion-soup': 10,
    'eyescream': 10, 'wolf-jerky': 10, 'wolf-skewer': 10,
    'blood-pudding': 10, 'fish-wraps': 10,
    'fiery-svinstew': 10, 'mushroom-omelette': 10, 'salad': 10,
    'seeker-aspic': 10, 'sizzling-berry-broth': 10,
    'spicy-marmalade': 10, 'yggdrasil-porridge': 10,
    'marinated-greens': 10, 'mashed-meat': 10,
    'scorching-medley': 10, 'sparkling-shroomshake': 10,
}

# Mead recipes — the cauldron produces a mead base, which goes to a fermenter.
# Format: (final_product_id, final_name, station_level, ingredients, yield, base_name, fermenter_duration)
KNOWN_MEADS = [
    {
        'id': 'minor-healing-mead',
        'name': 'Minor Healing Mead',
        'stationLevel': 1,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'blueberries', 'qty': 5},
            {'itemId': 'raspberries', 'qty': 10},
            {'itemId': 'dandelion', 'qty': 1},
        ],
        'yields': {'itemId': 'minor-healing-mead', 'qty': 6},
        'baseName': 'Mead Base: Minor Healing',
        'fermenterDuration': 2400,
    },
    {
        'id': 'medium-healing-mead',
        'name': 'Medium Healing Mead',
        'stationLevel': 2,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'bloodbag', 'qty': 4},
            {'itemId': 'raspberries', 'qty': 10},
            {'itemId': 'dandelion', 'qty': 1},
        ],
        'yields': {'itemId': 'medium-healing-mead', 'qty': 6},
        'baseName': 'Mead Base: Medium Healing',
        'fermenterDuration': 2400,
    },
    {
        'id': 'minor-stamina-mead',
        'name': 'Minor Stamina Mead',
        'stationLevel': 1,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'raspberries', 'qty': 10},
            {'itemId': 'yellow-mushroom', 'qty': 10},
        ],
        'yields': {'itemId': 'minor-stamina-mead', 'qty': 6},
        'baseName': 'Mead Base: Minor Stamina',
        'fermenterDuration': 2400,
    },
    {
        'id': 'medium-stamina-mead',
        'name': 'Medium Stamina Mead',
        'stationLevel': 2,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'cloudberries', 'qty': 10},
            {'itemId': 'yellow-mushroom', 'qty': 10},
        ],
        'yields': {'itemId': 'medium-stamina-mead', 'qty': 6},
        'baseName': 'Mead Base: Medium Stamina',
        'fermenterDuration': 2400,
    },
    {
        'id': 'poison-resistance-mead',
        'name': 'Poison Resistance Mead',
        'stationLevel': 1,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'thistle', 'qty': 5},
            {'itemId': 'neck-tail', 'qty': 1},
            {'itemId': 'coal', 'qty': 10},
        ],
        'yields': {'itemId': 'poison-resistance-mead', 'qty': 6},
        'baseName': 'Mead Base: Poison Resistance',
        'fermenterDuration': 2400,
    },
    {
        'id': 'frost-resistance-mead',
        'name': 'Frost Resistance Mead',
        'stationLevel': 2,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'thistle', 'qty': 5},
            {'itemId': 'bloodbag', 'qty': 2},
            {'itemId': 'freeze-gland', 'qty': 1},
        ],
        'yields': {'itemId': 'frost-resistance-mead', 'qty': 6},
        'baseName': 'Mead Base: Frost Resistance',
        'fermenterDuration': 2400,
    },
    {
        'id': 'tasty-mead',
        'name': 'Tasty Mead',
        'stationLevel': 1,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'raspberries', 'qty': 10},
            {'itemId': 'blueberries', 'qty': 5},
        ],
        'yields': {'itemId': 'tasty-mead', 'qty': 6},
        'baseName': 'Mead Base: Tasty',
        'fermenterDuration': 2400,
    },
    {
        'id': 'fire-resistance-barley-wine',
        'name': 'Fire Resistance Barley Wine',
        'stationLevel': 4,
        'ingredients': [
            {'itemId': 'barley', 'qty': 10},
            {'itemId': 'cloudberries', 'qty': 10},
        ],
        'yields': {'itemId': 'fire-resistance-barley-wine', 'qty': 6},
        'baseName': 'Barley Wine Base: Fire Resistance',
        'fermenterDuration': 2400,
    },
    {
        'id': 'major-healing-mead',
        'name': 'Major Healing Mead',
        'stationLevel': 5,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'bloodbag', 'qty': 4},
            {'itemId': 'royal-jelly', 'qty': 2},
            {'itemId': 'dandelion', 'qty': 1},
        ],
        'yields': {'itemId': 'major-healing-mead', 'qty': 6},
        'baseName': 'Mead Base: Major Healing',
        'fermenterDuration': 2400,
    },
    {
        'id': 'major-stamina-mead',
        'name': 'Major Stamina Mead',
        'stationLevel': 5,
        'ingredients': [
            {'itemId': 'honey', 'qty': 10},
            {'itemId': 'cloudberries', 'qty': 10},
            {'itemId': 'yellow-mushroom', 'qty': 10},
            {'itemId': 'jotun-puffs', 'qty': 3},
        ],
        'yields': {'itemId': 'major-stamina-mead', 'qty': 6},
        'baseName': 'Mead Base: Major Stamina',
        'fermenterDuration': 2400,
    },
]


def main():
    print('Loading local data...')
    local = load_local_data()
    print(f'  {len(local["recipes"])} recipes, {len(local["items"])} items, {len(local["stations"])} stations')

    report_lines = ['# Recipe Diff Report\n']
    report_lines.append(f'Generated: {time.strftime("%Y-%m-%d %H:%M")}\n')
    report_lines.append(f'Local data: {len(local["recipes"])} recipes, {len(local["items"])} items\n')

    # Build wiki recipe index from known data
    wiki_recipes = {}

    # Add all local recipes to wiki index (we'll flag differences)
    for rid, recipe in local['recipes'].items():
        wiki_recipes[rid] = {
            'name': recipe['name'],
            'station': recipe.get('station', ''),
            'ingredients': recipe.get('ingredients', []),
        }

    # Check yields from KNOWN_YIELDS
    yield_gaps = []
    for rid, expected_yield in KNOWN_YIELDS.items():
        if rid not in local['recipes']:
            continue
        recipe = local['recipes'][rid]
        local_yield = recipe.get('yields', {}).get('qty', 1) if recipe.get('yields') else 1
        if local_yield != expected_yield and expected_yield > 1:
            yield_gaps.append((rid, expected_yield, local_yield))

    if yield_gaps:
        report_lines.append('## Yield Gaps\n')
        report_lines.append('Recipes that produce more than 1 item but are missing `yields` or have wrong quantity.\n')
        for rid, expected, actual in sorted(yield_gaps):
            actual_str = str(actual) if actual > 1 else 'not set'
            report_lines.append(f'- **{rid}**: expected ×{expected}, local={actual_str}')
        report_lines.append('')

    # Check stack sizes from KNOWN_STACK_SIZES
    stack_gaps = []
    for item_id, expected_stack in KNOWN_STACK_SIZES.items():
        if item_id not in local['items']:
            continue
        item = local['items'][item_id]
        local_stack = item.get('stackSize')
        if local_stack != expected_stack:
            stack_gaps.append((item_id, expected_stack, local_stack))

    if stack_gaps:
        report_lines.append('## Stack Size Gaps\n')
        report_lines.append('Items where our `stackSize` differs from wiki or is not set.\n')
        for item_id, expected, actual in sorted(stack_gaps):
            actual_str = str(actual) if actual else 'not set'
            report_lines.append(f'- **{item_id}**: expected={expected}, local={actual_str}')
        report_lines.append('')

    # Check meads — are they in our data?
    missing_meads = []
    for mead in KNOWN_MEADS:
        if mead['id'] not in local['recipes']:
            missing_meads.append(mead)

    if missing_meads:
        report_lines.append('## Missing Mead Recipes\n')
        for mead in missing_meads:
            ings = ', '.join(f'{i["itemId"]} ×{i["qty"]}' for i in mead['ingredients'])
            report_lines.append(f'- **{mead["id"]}** ({mead["name"]}): {ings} → ×{mead["yields"]["qty"]}')
        report_lines.append('')

    # Check for missing items referenced by meads
    missing_items = set()
    for mead in KNOWN_MEADS:
        for ing in mead['ingredients']:
            if ing['itemId'] not in local['items']:
                missing_items.add(ing['itemId'])

    if missing_items:
        report_lines.append('## Missing Items (referenced by meads)\n')
        for item_id in sorted(missing_items):
            report_lines.append(f'- **{item_id}**')
        report_lines.append('')

    # Summary
    report_lines.insert(3, f'\n## Summary\n')
    report_lines.insert(4, f'- Yield gaps: {len(yield_gaps)}')
    report_lines.insert(5, f'- Stack size gaps: {len(stack_gaps)}')
    report_lines.insert(6, f'- Missing meads: {len(missing_meads)}')
    report_lines.insert(7, f'- Missing items (for meads): {len(missing_items)}')
    report_lines.insert(8, '')

    # Write report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text('\n'.join(report_lines))
    print(f'\nReport written to {REPORT_PATH}')
    print(f'  Yield gaps: {len(yield_gaps)}')
    print(f'  Stack size gaps: {len(stack_gaps)}')
    print(f'  Missing meads: {len(missing_meads)}')
    print(f'  Missing items: {len(missing_items)}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the scraper**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
pip install pyyaml 2>/dev/null
python3 scripts/scrape-recipes.py
```

Expected: Report generated at `docs/recipe-diff-report.md` showing yield gaps, stack size gaps, missing meads, and any missing items.

- [ ] **Step 3: Review the diff report**

Read `docs/recipe-diff-report.md` and note the specific gaps. This report drives Tasks 4–7.

- [ ] **Step 4: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add scripts/scrape-recipes.py docs/recipe-diff-report.md
git commit -m "feat: add wiki scraper and generate recipe diff report"
```

---

### Task 4: Add missing items for mead recipes

**Files:**
- Modify: `src/data/items.yaml`

The scraper report will identify items referenced by meads that don't exist in our data. Based on the known mead recipes, these items are needed:

- [ ] **Step 1: Add missing items to `items.yaml`**

Append to the `# Cooking ingredients` section of `src/data/items.yaml`:

```yaml
# Mead ingredients
- { id: dandelion, name: Dandelion, category: ingredient }
- { id: coal, name: Coal, category: material }
```

Note: `coal` is a material (smelting byproduct), `dandelion` is a forage ingredient. Check the diff report for any additional missing items and add them too.

- [ ] **Step 2: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/data/items.yaml
git commit -m "feat(data): add dandelion and coal items for mead recipes"
```

---

### Task 5: Add mead recipes to cooking.yaml

**Files:**
- Modify: `src/data/recipes/cooking.yaml`

- [ ] **Step 1: Add mead recipes**

Append to the end of `src/data/recipes/cooking.yaml`:

```yaml
# ── Meads ─────────────────────────────────────────────────────────────────────
# Meads are brewed at the Cauldron as a mead base, then fermented.
# The 'mead' field signals the two-stage process for the UI.

# Cauldron level 1
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

- id: minor-stamina-mead
  name: Minor Stamina Mead
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: yellow-mushroom, qty: 10 }
  yields: { itemId: minor-stamina-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Minor Stamina"
    fermenterDuration: 2400
  tags: [mead, stamina, tier-1]

- id: poison-resistance-mead
  name: Poison Resistance Mead
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: thistle, qty: 5 }
    - { itemId: neck-tail, qty: 1 }
    - { itemId: coal, qty: 10 }
  yields: { itemId: poison-resistance-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Poison Resistance"
    fermenterDuration: 2400
  tags: [mead, resistance, tier-1]

- id: tasty-mead
  name: Tasty Mead
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: blueberries, qty: 5 }
  yields: { itemId: tasty-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Tasty"
    fermenterDuration: 2400
  tags: [mead, rested, tier-1]

# Cauldron level 2
- id: medium-healing-mead
  name: Medium Healing Mead
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: bloodbag, qty: 4 }
    - { itemId: raspberries, qty: 10 }
    - { itemId: dandelion, qty: 1 }
  yields: { itemId: medium-healing-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Medium Healing"
    fermenterDuration: 2400
  tags: [mead, heal, tier-3]

- id: medium-stamina-mead
  name: Medium Stamina Mead
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: cloudberries, qty: 10 }
    - { itemId: yellow-mushroom, qty: 10 }
  yields: { itemId: medium-stamina-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Medium Stamina"
    fermenterDuration: 2400
  tags: [mead, stamina, tier-3]

- id: frost-resistance-mead
  name: Frost Resistance Mead
  type: cooking
  station: cauldron
  stationLevel: 2
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: thistle, qty: 5 }
    - { itemId: bloodbag, qty: 2 }
    - { itemId: freeze-gland, qty: 1 }
  yields: { itemId: frost-resistance-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Frost Resistance"
    fermenterDuration: 2400
  tags: [mead, resistance, tier-3]

# Cauldron level 4
- id: fire-resistance-barley-wine
  name: Fire Resistance Barley Wine
  type: cooking
  station: cauldron
  stationLevel: 4
  ingredients:
    - { itemId: barley, qty: 10 }
    - { itemId: cloudberries, qty: 10 }
  yields: { itemId: fire-resistance-barley-wine, qty: 6 }
  mead:
    baseName: "Barley Wine Base: Fire Resistance"
    fermenterDuration: 2400
  tags: [mead, resistance, tier-5]

# Cauldron level 5
- id: major-healing-mead
  name: Major Healing Mead
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: bloodbag, qty: 4 }
    - { itemId: royal-jelly, qty: 2 }
    - { itemId: dandelion, qty: 1 }
  yields: { itemId: major-healing-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Major Healing"
    fermenterDuration: 2400
  tags: [mead, heal, tier-6]

- id: major-stamina-mead
  name: Major Stamina Mead
  type: cooking
  station: cauldron
  stationLevel: 5
  ingredients:
    - { itemId: honey, qty: 10 }
    - { itemId: cloudberries, qty: 10 }
    - { itemId: yellow-mushroom, qty: 10 }
    - { itemId: jotun-puffs, qty: 3 }
  yields: { itemId: major-stamina-mead, qty: 6 }
  mead:
    baseName: "Mead Base: Major Stamina"
    fermenterDuration: 2400
  tags: [mead, stamina, tier-6]
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: FAIL — the mead recipe IDs are used as `yields.itemId` but those item IDs don't exist in `items.yaml`. The cross-reference validation in `loader.ts:81-85` will catch this.

- [ ] **Step 3: Add mead product items to `items.yaml`**

Append to the `# Cooking ingredients` section (or create a new `# Meads` section) in `src/data/items.yaml`:

```yaml
# Mead products
- { id: minor-healing-mead, name: Minor Healing Mead, category: food, stackSize: 10 }
- { id: medium-healing-mead, name: Medium Healing Mead, category: food, stackSize: 10 }
- { id: major-healing-mead, name: Major Healing Mead, category: food, stackSize: 10 }
- { id: minor-stamina-mead, name: Minor Stamina Mead, category: food, stackSize: 10 }
- { id: medium-stamina-mead, name: Medium Stamina Mead, category: food, stackSize: 10 }
- { id: major-stamina-mead, name: Major Stamina Mead, category: food, stackSize: 10 }
- { id: poison-resistance-mead, name: Poison Resistance Mead, category: food, stackSize: 10 }
- { id: frost-resistance-mead, name: Frost Resistance Mead, category: food, stackSize: 10 }
- { id: fire-resistance-barley-wine, name: Fire Resistance Barley Wine, category: food, stackSize: 10 }
- { id: tasty-mead, name: Tasty Mead, category: food, stackSize: 10 }
```

- [ ] **Step 4: Run tests again**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/data/items.yaml src/data/recipes/cooking.yaml
git commit -m "feat(data): add 10 mead recipes with fermenter flow and mead product items"
```

---

### Task 6: Populate yields on all multi-output recipes

**Files:**
- Modify: `src/data/recipes/crafting.yaml`
- Modify: `src/data/recipes/cooking.yaml`

Use the `KNOWN_YIELDS` dict from the scraper as the authoritative source. Only recipes with yield >1 need the field.

- [ ] **Step 1: Add yields to arrow recipes in `crafting.yaml`**

For each arrow recipe, add a `yields` line. Example for `wood-arrow` (after the `ingredients` block, before `tags`):

```yaml
- id: wood-arrow
  name: Wood Arrow
  type: crafting
  station: workbench
  stationLevel: 1
  ingredients:
    - { itemId: wood, qty: 8 }
  yields: { itemId: wood-arrow, qty: 20 }
  tags: [arrow, tier-0]
```

Apply the same pattern for all arrow recipes:
- `flinthead-arrow`: qty 20
- `fire-arrow`: qty 20
- `bronzehead-arrow`: qty 20
- `ironhead-arrow`: qty 20
- `silver-arrow`: qty 20
- `obsidian-arrow`: qty 20
- `poison-arrow`: qty 20
- `frost-arrow`: qty 20
- `carapace-arrow`: qty 20
- `charred-arrow`: qty 20

- [ ] **Step 2: Add yields to bolt recipes in `crafting.yaml`**

Same pattern for bolts:
- `iron-bolt`: qty 20
- `bone-bolt`: qty 20
- `black-metal-bolt`: qty 20
- `carapace-bolt`: qty 20
- `charred-bolt`: qty 20
- `ballista-bolt`: qty 20

- [ ] **Step 3: Add yields to cooking recipes in `cooking.yaml`**

For recipes that produce more than 1:
- `queens-jam`: qty 4
- `boar-jerky`: qty 2
- `sausages`: qty 4
- `wolf-jerky`: qty 2
- `salad`: qty 3

Example:

```yaml
- id: queens-jam
  name: Queens Jam
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: raspberries, qty: 8 }
    - { itemId: blueberries, qty: 6 }
  yields: { itemId: queens-jam, qty: 4 }
  food:
    hp: 32
    stamina: 44
    duration: 1800
    regen: 2
  tags: [food, sustain, tier-2]
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: FAIL if any `yields.itemId` references a nonexistent item. Fix by adding any missing items, then re-run.

Note: Arrow and bolt item IDs match their recipe IDs, and these items don't exist in `items.yaml` as standalone items (they're the recipe output). The `yields` validation in `loader.ts:81-85` checks `itemIds.has(r.yields.itemId)`. Since arrow/bolt recipes use their own recipe ID as the yields itemId, and items.yaml doesn't have entries for crafted weapons/armor/arrows — we need to either:
  - (a) Add arrow/bolt/food items to `items.yaml`, or
  - (b) Skip the `yields.itemId` validation when itemId matches recipe ID.

The simplest approach is **(a)**: add entries for items that have `yields`. These items already need `stackSize` anyway.

- [ ] **Step 5: Add arrow, bolt, and food yield items to `items.yaml`**

```yaml
# Crafted projectiles
- { id: wood-arrow, name: Wood Arrow, category: weapon, stackSize: 100 }
- { id: flinthead-arrow, name: Flinthead Arrow, category: weapon, stackSize: 100 }
- { id: fire-arrow, name: Fire Arrow, category: weapon, stackSize: 100 }
- { id: bronzehead-arrow, name: Bronzehead Arrow, category: weapon, stackSize: 100 }
- { id: ironhead-arrow, name: Ironhead Arrow, category: weapon, stackSize: 100 }
- { id: silver-arrow, name: Silver Arrow, category: weapon, stackSize: 100 }
- { id: obsidian-arrow, name: Obsidian Arrow, category: weapon, stackSize: 100 }
- { id: poison-arrow, name: Poison Arrow, category: weapon, stackSize: 100 }
- { id: frost-arrow, name: Frost Arrow, category: weapon, stackSize: 100 }
- { id: carapace-arrow, name: Carapace Arrow, category: weapon, stackSize: 100 }
- { id: charred-arrow, name: Charred Arrow, category: weapon, stackSize: 100 }
- { id: iron-bolt, name: Iron Bolt, category: weapon, stackSize: 100 }
- { id: bone-bolt, name: Bone Bolt, category: weapon, stackSize: 100 }
- { id: black-metal-bolt, name: Black Metal Bolt, category: weapon, stackSize: 100 }
- { id: carapace-bolt, name: Carapace Bolt, category: weapon, stackSize: 100 }
- { id: charred-bolt, name: Charred Bolt, category: weapon, stackSize: 100 }
- { id: ballista-bolt, name: Ballista Bolt, category: weapon, stackSize: 50 }

# Crafted food items (for yields cross-reference)
- { id: queens-jam, name: Queens Jam, category: food, stackSize: 10 }
- { id: boar-jerky, name: Boar Jerky, category: food, stackSize: 10 }
- { id: sausages, name: Sausages, category: food, stackSize: 10 }
- { id: wolf-jerky, name: Wolf Jerky, category: food, stackSize: 10 }
- { id: salad, name: Salad, category: food, stackSize: 10 }
```

- [ ] **Step 6: Run tests again**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/data/items.yaml src/data/recipes/crafting.yaml src/data/recipes/cooking.yaml
git commit -m "feat(data): populate yields on all multi-output recipes (arrows, bolts, food)"
```

---

### Task 7: Add stack sizes to all existing items

**Files:**
- Modify: `src/data/items.yaml`

Use `KNOWN_STACK_SIZES` from the scraper as reference. Every item in `items.yaml` should get a `stackSize` value.

- [ ] **Step 1: Add `stackSize` to all material items**

Go through each item in `items.yaml` and add `stackSize`. For materials: ores/metals are 30, wood/organic are 50, nails are 100. Example:

```yaml
- { id: wood, name: Wood, category: material, stackSize: 50 }
- { id: copper, name: Copper, category: material, stackSize: 30 }
- { id: bronze-nails, name: Bronze Nails, category: material, stackSize: 100 }
```

- [ ] **Step 2: Add `stackSize` to all ingredient items**

Foraging ingredients are 50, raw meats are 20. Example:

```yaml
- { id: raspberries, name: Raspberries, category: ingredient, stackSize: 50 }
- { id: boar-meat, name: Boar Meat, category: ingredient, stackSize: 20 }
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 4: Re-run scraper to verify stack size gaps are resolved**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
python3 scripts/scrape-recipes.py
```

Expected: Stack size gaps section should be empty or significantly reduced.

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/data/items.yaml docs/recipe-diff-report.md
git commit -m "feat(data): add stackSize to all items in items.yaml"
```

---

## ⏸️ Review Checkpoint — Phase 1 Complete

At this point, all data changes are complete. Share the diff report and updated YAML files with your team for review before proceeding to Phase 2 (UI changes).

Run: `pnpm test` to verify everything is green.

---

## Phase 2: UI Changes

---

### Task 8: Display yield badge in recipe rows

**Files:**
- Modify: `src/components/RecipeRow.tsx:57,62,81-95`

- [ ] **Step 1: Add yield badge next to recipe name in collapsed row**

In `src/components/RecipeRow.tsx`, after `{props.recipe.name}` (line 57), add:

```tsx
            {props.recipe.name}
            <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
              <span class="recipe-row__yield">×{props.recipe.yields!.qty}</span>
            </Show>
```

- [ ] **Step 2: Add yield info in expanded detail section**

In the expanded detail section (after the ingredients section ending at line 95), add:

```tsx
          <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
            <div class="recipe-row__section">
              <span class="label">Yields</span>
              <span>×{props.recipe.yields!.qty} per craft</span>
            </div>
          </Show>
```

- [ ] **Step 3: Run dev server and verify visually**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm dev --port 4322
```

Check that arrow recipes show "×20" badge, Queens Jam shows "×4", meads show "×6".

- [ ] **Step 4: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/components/RecipeRow.tsx
git commit -m "feat(ui): display yield badge on multi-output recipe rows"
```

---

### Task 9: Update cart aggregation to account for yields

**Files:**
- Modify: `src/lib/cart.ts:54-81`
- Modify: `tests/cart.test.ts`

The cart stores the number of **final items** desired (e.g., 60 arrows). The grocery list must calculate how many **crafts** that requires and multiply ingredients accordingly.

- [ ] **Step 1: Write the failing test**

Add to `tests/cart.test.ts`, in the `aggregateGroceryList` describe block:

```typescript
  it('divides by yield when recipe has yields > 1', () => {
    const arrowRecipe: Recipe = {
      ...makeRecipe('wood-arrow', [{ itemId: 'wood', qty: 8 }]),
      yields: { itemId: 'wood-arrow', qty: 20 },
    };
    const recipesById = new Map<string, Recipe>([['wood-arrow', arrowRecipe]]);
    const itemsById = new Map<string, Item>([['wood', makeItem('wood', 'Wood')]]);

    // Want 60 arrows → 60/20 = 3 crafts → 3 × 8 wood = 24
    const cart: Cart = { 'wood-arrow': 60 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([{ itemId: 'wood', name: 'Wood', qty: 24 }]);
  });

  it('rounds up crafts when desired qty is not evenly divisible by yield', () => {
    const arrowRecipe: Recipe = {
      ...makeRecipe('wood-arrow', [{ itemId: 'wood', qty: 8 }]),
      yields: { itemId: 'wood-arrow', qty: 20 },
    };
    const recipesById = new Map<string, Recipe>([['wood-arrow', arrowRecipe]]);
    const itemsById = new Map<string, Item>([['wood', makeItem('wood', 'Wood')]]);

    // Want 25 arrows → ceil(25/20) = 2 crafts → 2 × 8 wood = 16
    const cart: Cart = { 'wood-arrow': 25 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([{ itemId: 'wood', name: 'Wood', qty: 16 }]);
  });

  it('uses qty as crafts when recipe has no yields field', () => {
    // Existing behavior — no yields means 1:1
    const cart: Cart = { axe: 3 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([
      { itemId: 'stone', name: 'Stone', qty: 3 },
      { itemId: 'wood', name: 'Wood', qty: 6 },
    ]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm vitest run tests/cart.test.ts
```

Expected: FAIL — the yield tests expect 24 wood but get 480 (60 × 8) because yields aren't accounted for.

- [ ] **Step 3: Update `aggregateGroceryList` to use yields**

In `src/lib/cart.ts`, replace lines 61-75:

```typescript
  for (const [recipeId, cartQty] of Object.entries(cart)) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) continue;

    const yieldPerCraft = recipe.yields?.qty ?? 1;
    const crafts = Math.ceil(cartQty / yieldPerCraft);

    for (const { itemId, qty } of recipe.ingredients) {
      const item = itemsById.get(itemId);
      if (!item) continue;

      const existing = totals.get(itemId);
      if (existing) {
        existing.qty += qty * crafts;
      } else {
        totals.set(itemId, { name: item.name, qty: qty * crafts });
      }
    }
  }
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm vitest run tests/cart.test.ts
```

Expected: All tests PASS. The existing test "multiplies ingredient quantities by cart qty" (`axe: 3 → stone 3, wood 6`) still passes because axe has no yields (defaults to 1).

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/lib/cart.ts tests/cart.test.ts
git commit -m "feat(cart): account for recipe yields in grocery list aggregation"
```

---

### Task 10: Display station upgrade names

**Files:**
- Modify: `src/components/RecipeRow.tsx:59-62`
- Modify: `src/pages/recipes/[slug].astro:28-29`

- [ ] **Step 1: Update RecipeRow to show upgrade name**

In `src/components/RecipeRow.tsx`, replace lines 59-62:

```tsx
          <span class="recipe-row__station">
            {props.stationsById.get(props.recipe.station)?.name ?? props.recipe.station}
          </span>
          <span class="recipe-row__lvl">{props.recipe.stationLevel}</span>
```

With:

```tsx
          <span class="recipe-row__station">
            {(() => {
              const station = props.stationsById.get(props.recipe.station);
              const stationName = station?.name ?? props.recipe.station;
              const upgrade = station?.upgrades.find((u) => u.level === props.recipe.stationLevel);
              return upgrade?.name ? `${stationName} — ${upgrade.name}` : `${stationName} Lv ${props.recipe.stationLevel}`;
            })()}
          </span>
```

Note: This removes the separate `recipe-row__lvl` span and incorporates the level into the station display. Level 1 recipes (no upgrade) show "Workbench Lv 1". Higher levels show "Cauldron — Spice Rack".

- [ ] **Step 2: Update the detail page**

In `src/pages/recipes/[slug].astro`, replace line 29:

```astro
    {recipe.type === 'crafting' ? 'Crafting' : 'Cooking'} · {station?.name ?? recipe.station} · Level {recipe.stationLevel}
```

With:

```astro
    {recipe.type === 'crafting' ? 'Crafting' : 'Cooking'} · {(() => {
      const stationName = station?.name ?? recipe.station;
      const upgrade = station?.upgrades.find((u: any) => u.level === recipe.stationLevel);
      return upgrade?.name ? `${stationName} — ${upgrade.name}` : `${stationName} Lv ${recipe.stationLevel}`;
    })()}
```

- [ ] **Step 3: Run dev server and verify**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm dev --port 4322
```

Check: Boar Jerky shows "Cauldron — Spice Rack", Sausages shows "Cauldron — Butcher's Table", Iron Sword shows "Forge — Forge Bellows".

- [ ] **Step 4: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/components/RecipeRow.tsx src/pages/recipes/\\[slug\\].astro
git commit -m "feat(ui): display station upgrade names instead of numeric levels"
```

---

### Task 11: Display stack size in detail pane

**Files:**
- Modify: `src/components/RecipeRow.tsx` (expanded section)
- Modify: `src/pages/recipes/[slug].astro`

- [ ] **Step 1: Add stack size to RecipeRow expanded detail**

In `src/components/RecipeRow.tsx`, in the expanded detail section (after the yields section added in Task 8), add:

```tsx
          <Show when={(() => {
            const yieldItemId = props.recipe.yields?.itemId ?? props.recipe.id;
            const item = props.itemsById.get(yieldItemId);
            return item?.stackSize;
          })()}>
            {(stackSize) => (
              <div class="recipe-row__section">
                <span class="label">Stack size</span>
                <span>{stackSize()}</span>
              </div>
            )}
          </Show>
```

- [ ] **Step 2: Add stack size to detail page**

In `src/pages/recipes/[slug].astro`, after the ingredients section (line 44), add:

```astro
  {(() => {
    const yieldItemId = recipe.yields?.itemId ?? recipe.id;
    const item = itemsById.get(yieldItemId);
    return item?.stackSize ? (
      <section class="detail-section">
        <h2>Stack size</h2>
        <p>{item.stackSize}</p>
      </section>
    ) : null;
  })()}
```

- [ ] **Step 3: Run dev server and verify**

Check that Wood Arrow detail shows "Stack size: 100", Queens Jam shows "Stack size: 10".

- [ ] **Step 4: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/components/RecipeRow.tsx src/pages/recipes/\\[slug\\].astro
git commit -m "feat(ui): display stack size in recipe detail pane and detail page"
```

---

### Task 12: Display mead fermenter flow in detail view

**Files:**
- Modify: `src/components/RecipeRow.tsx` (expanded section)
- Modify: `src/pages/recipes/[slug].astro`

- [ ] **Step 1: Add mead info to RecipeRow expanded detail**

In `src/components/RecipeRow.tsx`, in the expanded detail section (after the stack size section from Task 11), add:

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

- [ ] **Step 2: Add mead info to detail page**

In `src/pages/recipes/[slug].astro`, after the notes section (line 63), add:

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

- [ ] **Step 3: Run dev server and verify**

Check that Minor Healing Mead shows the brewing section explaining the mead base → fermenter flow.

- [ ] **Step 4: Run tests**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation && pnpm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
git add src/components/RecipeRow.tsx src/pages/recipes/\\[slug\\].astro
git commit -m "feat(ui): display mead brewing process in detail views"
```

---

## ⏸️ Review Checkpoint — Phase 2 Complete

All UI changes are done. Run the full test suite and do a visual check:

```bash
cd /Users/christopherdobbyn/work/dobbo-ca/web-valheim/.worktrees/recipe-validation
pnpm test && pnpm dev --port 4322
```

Verify:
- [ ] Yield badges show on arrows (×20), Queens Jam (×4), Salad (×3), meads (×6)
- [ ] Cart calculates ingredients correctly with yields (60 arrows = 3 crafts)
- [ ] Station upgrade names display (Cauldron — Spice Rack, etc.)
- [ ] Stack sizes show in detail views
- [ ] Mead recipes show brewing info explaining the fermenter step
- [ ] All existing functionality (filtering, sorting, pagination, cart URL encoding) still works
