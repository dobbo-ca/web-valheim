# Armor Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured armor stats (armor value, durability, weight, movement penalty, resistances, effects, set bonuses) to the Valheim helper, populated via a wiki scraper.

**Architecture:** New `ArmorStatsSchema` in `schema.ts` with `armorStats` field on recipes. Python scraper parses `{{Infobox armor}}` wiki templates to populate data. Detail page and list view updated to render armor-specific stats. Existing flat `stats` on armor items replaced by scraper output.

**Tech Stack:** Zod (schema), Python + requests (scraper), Astro + SolidJS (display), Vitest (tests)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/schema.ts` | Add `ArmorStatsSchema`, `ResistanceLevelSchema`, `ResistancesSchema`, `SetBonusSchema` |
| Modify | `src/lib/types.ts` | Export `ArmorStats`, `ResistanceLevel`, `Resistances`, `SetBonus` types |
| Modify | `src/lib/merge-stats.ts` | Add `mergeArmorStats()` function |
| Create | `scripts/scrape_armor_stats.py` | Wiki scraper for armor infoboxes |
| Modify | `src/data/recipes/crafting.yaml` | Migrate flat stats → armorStats, add missing items |
| Modify | `src/pages/recipes/[slug].astro` | Render armorStats section on detail pages |
| Create | `src/components/ArmorStatsTable.tsx` | Armor stats comparison table (parallel to `ComparisonTable.tsx`) |
| Modify | `src/components/RecipeRow.tsx` | Show armor value in list stat summary |
| Modify | `tests/schema.test.ts` | Add ArmorStatsSchema tests |

---

### Task 1: Add ArmorStatsSchema to schema.ts

**Files:**
- Modify: `src/lib/schema.ts:57-142`
- Modify: `src/lib/types.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: Write failing tests for ArmorStatsSchema**

Add to `tests/schema.test.ts`:

```typescript
import {
  StationSchema,
  ItemSchema,
  RecipeSchema,
  ArmorStatsSchema,
  ResistanceLevelSchema,
  SetBonusSchema,
} from '../src/lib/schema';

describe('ArmorStatsSchema', () => {
  it('accepts full armor stats with resistances and set bonus', () => {
    const input = {
      armor: 8,
      durability: 800,
      weight: 10.0,
      movementPenalty: -2,
      resistances: { poison: 'resistant', fire: 'weak' },
      effects: ['+15 Bows'],
      setBonus: { name: 'Root Set', pieces: 3, effect: 'Improved archery — +15 Bows' },
    };
    expect(() => ArmorStatsSchema.parse(input)).not.toThrow();
  });

  it('accepts minimal armor stats (no resistances, effects, or set bonus)', () => {
    const input = { armor: 2, durability: 400, weight: 1.0 };
    const parsed = ArmorStatsSchema.parse(input);
    expect(parsed.resistances).toBeUndefined();
    expect(parsed.effects).toBeUndefined();
    expect(parsed.setBonus).toBeUndefined();
    expect(parsed.movementPenalty).toBeUndefined();
  });

  it('rejects invalid resistance level', () => {
    expect(() => ArmorStatsSchema.parse({
      armor: 10, durability: 1000, weight: 5,
      resistances: { fire: 'immune' },
    })).toThrow();
  });

  it('rejects invalid resistance damage type key', () => {
    expect(() => ArmorStatsSchema.parse({
      armor: 10, durability: 1000, weight: 5,
      resistances: { arcane: 'resistant' },
    })).toThrow();
  });

  it('rejects negative armor value', () => {
    expect(() => ArmorStatsSchema.parse({
      armor: -1, durability: 400, weight: 1.0,
    })).toThrow();
  });
});

describe('RecipeSchema — armorStats field', () => {
  it('accepts a recipe with armorStats', () => {
    const result = RecipeSchema.parse({
      id: 'leather-helmet',
      name: 'Leather Helmet',
      type: 'crafting',
      station: 'workbench',
      stationLevel: 1,
      ingredients: [{ itemId: 'deer-hide', qty: 6 }],
      armorStats: { armor: 2, durability: 400, weight: 1.0 },
    });
    expect(result.armorStats?.armor).toBe(2);
  });

  it('accepts a recipe without armorStats', () => {
    const result = RecipeSchema.parse({
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'crafting',
      station: 'forge',
      stationLevel: 2,
      ingredients: [{ itemId: 'iron', qty: 60 }],
    });
    expect(result.armorStats).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/schema.test.ts`
Expected: FAIL — `ArmorStatsSchema` not exported from schema.ts

- [ ] **Step 3: Implement ArmorStatsSchema in schema.ts**

Add after the `BlockingSchema` definition (after line ~97) in `src/lib/schema.ts`:

```typescript
// ── Armor stats ──────────────────────────────────────────────────────────────
export const ResistanceLevelSchema = z.enum(['weak', 'resistant']);

export const DamageTypeKeySchema = z.enum([
  'slash', 'pierce', 'blunt', 'fire', 'frost', 'lightning', 'poison', 'spirit',
]);

export const ResistancesSchema = z.record(DamageTypeKeySchema, ResistanceLevelSchema);

export const SetBonusSchema = z.object({
  name: z.string().min(1),
  pieces: z.number().int().positive(),
  effect: z.string().min(1),
});

export const ArmorStatsSchema = z.object({
  armor: z.number().nonnegative(),
  durability: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  movementPenalty: z.number().optional(),
  resistances: ResistancesSchema.optional(),
  effects: z.array(z.string()).optional(),
  setBonus: SetBonusSchema.optional(),
});
```

Add `armorStats` to `RecipeSchema`:

```typescript
  armorStats: ArmorStatsSchema.optional(),
```

Add `armorStats` overlay to `ItemUpgradeSchema` (partial — only armor and durability change per level):

```typescript
  armorStats: ArmorStatsSchema.partial().optional(),
```

- [ ] **Step 4: Export new types in types.ts**

Add to `src/lib/types.ts` imports:

```typescript
import type {
  // ... existing imports ...
  ArmorStatsSchema,
  ResistanceLevelSchema,
  ResistancesSchema,
  SetBonusSchema,
} from './schema';
```

Add type exports:

```typescript
export type ArmorStats = z.infer<typeof ArmorStatsSchema>;
export type ResistanceLevel = z.infer<typeof ResistanceLevelSchema>;
export type Resistances = z.infer<typeof ResistancesSchema>;
export type SetBonus = z.infer<typeof SetBonusSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- tests/schema.test.ts`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.ts src/lib/types.ts tests/schema.test.ts
git commit -m "feat: add ArmorStatsSchema with resistances, effects, and set bonuses"
```

---

### Task 2: Add mergeArmorStats utility

**Files:**
- Modify: `src/lib/merge-stats.ts`
- Test: `tests/schema.test.ts` (or new test file)

- [ ] **Step 1: Write failing test for mergeArmorStats**

Add to `tests/schema.test.ts`:

```typescript
import { mergeArmorStats } from '../src/lib/merge-stats';

describe('mergeArmorStats', () => {
  const base = {
    armor: 20,
    durability: 1000,
    weight: 15,
    movementPenalty: -5,
    resistances: { poison: 'resistant' as const },
    effects: ['+25 Eitr'],
    setBonus: { name: 'Test Set', pieces: 3, effect: 'Test effect' },
  };

  it('returns base when overlay is undefined', () => {
    expect(mergeArmorStats(base, undefined)).toEqual(base);
  });

  it('merges armor and durability from overlay', () => {
    const result = mergeArmorStats(base, { armor: 22, durability: 1200 });
    expect(result.armor).toBe(22);
    expect(result.durability).toBe(1200);
    expect(result.weight).toBe(15);
    expect(result.movementPenalty).toBe(-5);
  });

  it('preserves base resistances, effects, and setBonus (upgrades never change them)', () => {
    const result = mergeArmorStats(base, { armor: 22, durability: 1200 });
    expect(result.resistances).toEqual({ poison: 'resistant' });
    expect(result.effects).toEqual(['+25 Eitr']);
    expect(result.setBonus).toEqual(base.setBonus);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/schema.test.ts`
Expected: FAIL — `mergeArmorStats` not exported

- [ ] **Step 3: Implement mergeArmorStats**

Add to `src/lib/merge-stats.ts`:

```typescript
import type { ArmorStats } from './types';

/** Merge base armor stats with a sparse upgrade overlay. */
export function mergeArmorStats(
  base: ArmorStats,
  overlay?: Partial<ArmorStats>,
): ArmorStats {
  if (!overlay) return base;
  return {
    ...base,
    ...(overlay.armor != null && { armor: overlay.armor }),
    ...(overlay.durability != null && { durability: overlay.durability }),
    // weight, movementPenalty, resistances, effects, setBonus don't change per upgrade
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/schema.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/merge-stats.ts tests/schema.test.ts
git commit -m "feat: add mergeArmorStats utility for upgrade overlays"
```

---

### Task 3: Create armor wiki scraper

**Files:**
- Create: `scripts/scrape_armor_stats.py`

This is the largest task. The scraper is forked from `scrape_weapon_stats.py` but much simpler — armor has no computed derived stats (no backstab/stagger multiplier tables). It needs to handle:

1. `{{Infobox armor}}` parsing (same approach as weapon infobox)
2. Resistances from infobox or page body text
3. Set bonus section parsing
4. Effects parsing
5. Materials per quality level
6. Missing item creation (complete recipe entries)
7. Replacement of existing flat `stats` with `armorStats`

- [ ] **Step 1: Create scrape_armor_stats.py with imports and constants**

Create `scripts/scrape_armor_stats.py`:

```python
#!/usr/bin/env python3
"""Scrape armor stats from the Valheim Fandom Wiki and update crafting.yaml.

Usage:
    python scripts/scrape_armor_stats.py "Carapace breastplate"
    python scripts/scrape_armor_stats.py --batch armors.txt
    python scripts/scrape_armor_stats.py "Root harnesk" --dry-run

Requires: requests (install in scripts/.venv or globally)
"""

import argparse
import difflib
import re
import sys
from pathlib import Path

import requests

WIKI_API = "https://valheim.fandom.com/api.php"
YAML_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "recipes" / "crafting.yaml"
USER_AGENT = "ValheimHelper/1.0 (armor-stats-scraper)"

DAMAGE_TYPES = ["slash", "pierce", "blunt", "fire", "frost", "lightning", "poison", "spirit"]

RESISTANCE_KEYWORDS = {
    "resistant": "resistant",
    "weak": "weak",
    "resistance": "resistant",
    "weakness": "weak",
}

# Map wiki station names to our YAML station IDs
STATION_NAME_TO_ID = {
    "workbench": "workbench",
    "forge": "forge",
    "cauldron": "cauldron",
    "artisan table": "artisan-table",
    "black forge": "black-forge",
    "galdr table": "galdr-table",
    "stonecutter": "stonecutter",
}

# Station max levels for capping upgrades
STATION_MAX_LEVEL = {
    "workbench": 5,
    "forge": 7,
    "cauldron": 6,
    "artisan-table": 2,
    "black-forge": 5,
    "galdr-table": 4,
    "stonecutter": 1,
}

# Armor type → tag mapping
ARMOR_TYPE_TO_TAG = {
    "helmet": "helmet",
    "head": "helmet",
    "chest": "chest",
    "legs": "legs",
    "cape": "cape",
    "cloak": "cape",
    "shoulder": "cape",
}

# Station ID → biome tier mapping (for new entries)
STATION_BIOME = {
    "workbench": ("meadows", "tier-1"),
    "forge": ("black-forest", "tier-2"),
    "black-forge": ("mistlands", "tier-6"),
    "galdr-table": ("mistlands", "tier-6"),
}
```

- [ ] **Step 2: Add wiki API helpers (reuse pattern from weapon scraper)**

Append to `scripts/scrape_armor_stats.py`:

```python
# ── Wiki API helpers ──────────────────────────────────────────────────────────

def fetch_wikitext(page_title: str) -> str | None:
    resp = requests.get(WIKI_API, params={
        "action": "parse", "page": page_title, "format": "json", "prop": "wikitext",
        "redirects": "1",
    }, headers={"User-Agent": USER_AGENT})
    data = resp.json()
    if "parse" not in data:
        return None
    return data["parse"].get("wikitext", {}).get("*")


def search_wiki(query: str) -> list[str]:
    resp = requests.get(WIKI_API, params={
        "action": "query", "list": "search", "srsearch": query,
        "format": "json", "srlimit": 5,
    }, headers={"User-Agent": USER_AGENT})
    return [r["title"] for r in resp.json().get("query", {}).get("search", [])]


def resolve_page_title(armor_name: str) -> str | None:
    wikitext = fetch_wikitext(armor_name)
    if wikitext is not None:
        print(f"  Wiki page found: \"{armor_name}\"")
        return armor_name

    results = search_wiki(armor_name)
    if not results:
        print(f"  No wiki page found for \"{armor_name}\"")
        return None

    for title in results:
        if armor_name.lower() in title.lower():
            print(f"  Wiki page resolved: \"{armor_name}\" → \"{title}\"")
            return title

    print(f"  Wiki page resolved (best guess): \"{armor_name}\" → \"{results[0]}\"")
    return results[0]


def parse_number(value: str) -> float | int | None:
    if not value:
        return None
    cleaned = re.sub(r'[%x×]', '', value).strip()
    try:
        num = float(cleaned)
        return int(num) if num == int(num) else num
    except (ValueError, OverflowError):
        return None


def name_to_item_id(name: str) -> str:
    """Convert a wiki item name to our kebab-case item ID."""
    name = re.sub(r'\[+|\]+', '', name).strip()
    item_id = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return item_id
```

- [ ] **Step 3: Add infobox parser for armor**

Append to `scripts/scrape_armor_stats.py`:

```python
# ── Infobox parser ────────────────────────────────────────────────────────────

def extract_infobox_armor(wikitext: str) -> dict[str, str]:
    """Extract fields from {{Infobox armor}} template."""
    start_match = re.search(r'\{\{[Ii]nfobox[_ ]armor\s*\n', wikitext)
    if not start_match:
        return {}

    depth = 1
    i = start_match.end()
    content_start = i
    while i < len(wikitext) - 1:
        if wikitext[i:i+2] == '{{':
            depth += 1
            i += 2
        elif wikitext[i:i+2] == '}}':
            depth -= 1
            if depth == 0:
                break
            i += 2
        else:
            i += 1

    content = wikitext[content_start:i]
    fields = {}
    skip_keys = {"image", "title", "id", "description"}

    for line_match in re.finditer(r'^\|\s*([^=\n]+?)\s*=\s*([^\n|]*)', content, re.MULTILINE):
        key = line_match.group(1).strip().lower()
        value = line_match.group(2).strip()
        if key.startswith("materials") or key in skip_keys:
            continue
        if value:
            fields[key] = value

    return fields


def extract_materials(wikitext: str) -> dict[int, list[dict]]:
    """Extract materials for each quality level from the infobox.

    Returns {quality: [{itemId, qty}, ...]}
    """
    # Find infobox armor content
    start_match = re.search(r'\{\{[Ii]nfobox[_ ]armor\s*\n', wikitext)
    if not start_match:
        return {}

    # Balance braces to find end
    depth = 1
    i = start_match.end()
    content_start = i
    while i < len(wikitext) - 1:
        if wikitext[i:i+2] == '{{':
            depth += 1
            i += 2
        elif wikitext[i:i+2] == '}}':
            depth -= 1
            if depth == 0:
                break
            i += 2
        else:
            i += 1

    content = wikitext[content_start:i]
    materials = {}

    for mat_match in re.finditer(
        r'^\|\s*materials\s+(\d)\s*=\s*(.*?)(?=\n\|\s*materials\s+\d|\n\|\s*[a-z]|\n\}\})',
        content, re.MULTILINE | re.DOTALL
    ):
        quality = int(mat_match.group(1))
        mat_text = mat_match.group(2)

        ingredients = []
        for item_match in re.finditer(r'\[\[([^\]]+)\]\]\s*x(\d+)', mat_text):
            item_name = item_match.group(1)
            qty = int(item_match.group(2))
            ingredients.append({"itemId": name_to_item_id(item_name), "qty": qty})

        for item_match in re.finditer(r'\*\s*([^[\n]+?)\s+x(\d+)', mat_text):
            raw_name = item_match.group(1).strip()
            if f'[[{raw_name}]]' not in mat_text and '[[' not in raw_name:
                qty = int(item_match.group(2))
                ingredients.append({"itemId": name_to_item_id(raw_name), "qty": qty})

        if ingredients:
            materials[quality] = ingredients

    return materials
```

- [ ] **Step 4: Add resistances and effects parsing**

Append to `scripts/scrape_armor_stats.py`:

```python
# ── Resistances & effects parsing ─────────────────────────────────────────────

def parse_resistances_from_infobox(fields: dict[str, str]) -> dict[str, str]:
    """Parse resistances from the infobox 'resistances' field."""
    resistances = {}
    raw = fields.get("resistances", "")
    if not raw:
        return resistances

    # Pattern: "Resistant vs [[Poison]]" or "Weak vs [[Fire]]"
    for match in re.finditer(
        r'(resistant|weak)\s+vs\.?\s+\[\[([^\]]+)\]\]',
        raw, re.IGNORECASE
    ):
        level = match.group(1).lower()
        dtype = match.group(2).strip().lower()
        if dtype in DAMAGE_TYPES and level in RESISTANCE_KEYWORDS:
            resistances[dtype] = RESISTANCE_KEYWORDS[level]

    # Also handle without wiki links: "Resistant vs Poison"
    if not resistances:
        for match in re.finditer(
            r'(resistant|weak)\s+vs\.?\s+(\w+)',
            raw, re.IGNORECASE
        ):
            level = match.group(1).lower()
            dtype = match.group(2).strip().lower()
            if dtype in DAMAGE_TYPES and level in RESISTANCE_KEYWORDS:
                resistances[dtype] = RESISTANCE_KEYWORDS[level]

    return resistances


def parse_resistances_from_body(wikitext: str) -> dict[str, str]:
    """Fallback: search page body text for resistance mentions."""
    resistances = {}

    # Look for patterns like "resistant to poison" or "weak to fire"
    for match in re.finditer(
        r'(resistant|weak|resistance|weakness)\s+(?:to|vs\.?)\s+(\w+)',
        wikitext, re.IGNORECASE
    ):
        level_raw = match.group(1).lower()
        dtype = match.group(2).strip().lower()
        if dtype in DAMAGE_TYPES and level_raw in RESISTANCE_KEYWORDS:
            resistances[dtype] = RESISTANCE_KEYWORDS[level_raw]

    # Also: "Resistant vs [[Pierce]]" in body text
    for match in re.finditer(
        r'(resistant|weak)\s+vs\.?\s+\[\[([^\]]+)\]\]',
        wikitext, re.IGNORECASE
    ):
        level = match.group(1).lower()
        dtype = match.group(2).strip().lower()
        if dtype in DAMAGE_TYPES:
            resistances[dtype] = RESISTANCE_KEYWORDS.get(level, level)

    return resistances


def parse_set_bonus(fields: dict[str, str]) -> dict | None:
    """Parse set bonus from infobox fields."""
    set_name = fields.get("set pieces", "")
    set_effect = fields.get("set effect", "")

    if not set_name:
        return None

    # Parse "Root Set (3 pieces)" pattern
    name_match = re.match(r'(.+?)\s*\((\d+)\s*pieces?\)', set_name)
    if name_match:
        name = name_match.group(1).strip()
        pieces = int(name_match.group(2))
    else:
        name = set_name.strip()
        pieces = 3  # default assumption

    # Clean wiki links from effect text
    effect = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]+)\]\]', r'\1', set_effect).strip()
    if not effect:
        effect = name

    # Remove bullet points/list markers
    effect = re.sub(r'^\*\s*', '', effect).strip()

    return {"name": name, "pieces": pieces, "effect": effect}


def parse_effects(fields: dict[str, str]) -> list[str]:
    """Parse non-resistance effects from infobox (e.g. '+25 Eitr', 'Slow fall')."""
    effects = []

    # Check common effect fields
    for key in ("effect", "effects", "special"):
        if key in fields:
            raw = fields[key]
            # Clean wiki links
            cleaned = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]+)\]\]', r'\1', raw).strip()
            if cleaned:
                # Split on bullet points or newlines
                for part in re.split(r'\*|\n', cleaned):
                    part = part.strip()
                    if part:
                        effects.append(part)

    return effects
```

- [ ] **Step 5: Add stats builder and station level parsing**

Append to `scripts/scrape_armor_stats.py`:

```python
# ── Stats builder ─────────────────────────────────────────────────────────────

def build_armor_stats(fields: dict[str, str], wikitext: str) -> dict:
    """Convert wiki infobox fields to our armorStats schema format."""
    stats = {}

    # Core stats
    if "armor" in fields:
        val = parse_number(fields["armor"])
        if val is not None:
            stats["armor"] = val

    if "durability" in fields:
        val = parse_number(fields["durability"])
        if val is not None:
            stats["durability"] = val

    if "weight" in fields:
        val = parse_number(fields["weight"])
        if val is not None:
            stats["weight"] = val

    if "movement speed" in fields:
        val = parse_number(fields["movement speed"])
        if val is not None and val != 0:
            stats["movementPenalty"] = val

    # Resistances: try infobox first, then page body
    resistances = parse_resistances_from_infobox(fields)
    if not resistances:
        resistances = parse_resistances_from_body(wikitext)
    if resistances:
        stats["resistances"] = resistances

    # Effects
    effects = parse_effects(fields)
    if effects:
        stats["effects"] = effects

    # Set bonus
    set_bonus = parse_set_bonus(fields)
    if set_bonus:
        stats["setBonus"] = set_bonus

    return stats


def parse_station_levels(wikitext: str, fields: dict[str, str]) -> dict:
    """Extract per-quality station and repair levels."""
    result = {}

    base_craft = parse_number(fields.get("crafting level", ""))
    base_repair = parse_number(fields.get("repair level", ""))

    station_match = re.search(
        r'\{\{(?:Upgrade|Crafting) station row\|([^}]+)\}\}', wikitext, re.IGNORECASE
    )

    start_level = None
    max_quality = 4

    if station_match:
        params = station_match.group(1).split("|")
        for p in params[1:]:
            p = p.strip()
            if p.startswith("start="):
                start_level = int(p.split("=")[1])
            elif p.startswith("levels="):
                max_quality = int(p.split("=")[1])

    if start_level is not None:
        base_craft = start_level
    if base_craft is None:
        return result

    base_craft = int(base_craft)
    if base_repair is None or base_repair == 0:
        base_repair = base_craft
    else:
        base_repair = int(base_repair)

    result["baseStationLevel"] = base_craft
    result["baseRepairLevel"] = base_repair

    upgrade_levels = []
    for q in range(2, max_quality + 1):
        upgrade_levels.append({
            "stationLevel": base_craft + (q - 1),
            "repairLevel": base_repair + (q - 1),
        })
    result["upgradeLevels"] = upgrade_levels

    return result


def compute_upgrade_armor_stats(base_stats: dict, fields: dict[str, str], quality: int) -> dict:
    """Compute sparse armorStats overlay for a given quality level."""
    overlay = {}
    level_diff = quality - 1

    # Armor per level
    if "armor" in base_stats:
        per_level_key = "armor per level"
        per_level = parse_number(fields.get(per_level_key, "")) or 2  # default +2 per level
        new_armor = base_stats["armor"] + level_diff * per_level
        new_armor = int(new_armor) if new_armor == int(new_armor) else new_armor
        if new_armor != base_stats["armor"]:
            overlay["armor"] = new_armor

    # Durability per level
    if "durability" in base_stats:
        dur_per_level = parse_number(fields.get("durability per level", "")) or 200
        new_dur = base_stats["durability"] + level_diff * dur_per_level
        new_dur = int(new_dur) if new_dur == int(new_dur) else new_dur
        if new_dur != base_stats["durability"]:
            overlay["durability"] = new_dur

    return overlay
```

- [ ] **Step 6: Add YAML manipulation functions**

Append to `scripts/scrape_armor_stats.py`:

```python
# ── YAML manipulation ─────────────────────────────────────────────────────────

def find_recipe_bounds(lines: list[str], armor_name: str) -> tuple[int, int] | None:
    """Find the start and end line indices for a recipe entry by name."""
    start = None
    for i, line in enumerate(lines):
        if re.match(r'^  name:\s+', line):
            name_val = line.split(":", 1)[1].strip().strip('"').strip("'")
            try:
                name_val = name_val.encode('utf-8').decode('unicode_escape')
            except (UnicodeDecodeError, UnicodeEncodeError):
                pass
            if name_val.lower() == armor_name.lower():
                for j in range(i, max(i - 3, -1), -1):
                    if lines[j].startswith("- id:"):
                        start = j
                        break
                break

    if start is None:
        return None

    end = len(lines)
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("- id:"):
            end = i
            break

    return start, end


def format_armor_stats_yaml(stats: dict, indent: int = 2) -> list[str]:
    """Format armorStats as YAML lines."""
    lines = []
    prefix = " " * indent
    key_order = ["armor", "durability", "weight", "movementPenalty", "resistances", "effects", "setBonus"]

    for key in key_order:
        if key not in stats:
            continue
        val = stats[key]
        if key == "resistances" and isinstance(val, dict):
            flow = ", ".join(f"{k}: {v}" for k, v in val.items())
            lines.append(f"{prefix}{key}: {{ {flow} }}")
        elif key == "effects" and isinstance(val, list):
            lines.append(f"{prefix}{key}:")
            for effect in val:
                lines.append(f"{prefix}  - \"{effect}\"")
        elif key == "setBonus" and isinstance(val, dict):
            lines.append(f"{prefix}{key}:")
            lines.append(f"{prefix}  name: \"{val['name']}\"")
            lines.append(f"{prefix}  pieces: {val['pieces']}")
            lines.append(f"{prefix}  effect: \"{val['effect']}\"")
        else:
            lines.append(f"{prefix}{key}: {val}")

    return lines


def replace_stats_with_armor_stats(
    lines: list[str], start: int, end: int,
    new_armor_stats: dict, upgrade_overlays: list[dict],
    station_info: dict | None = None,
    new_upgrade_lines: list[str] | None = None,
    wiki_materials: dict | None = None,
) -> list[str]:
    """Replace flat stats block with armorStats, update upgrades."""
    result = []
    i = 0
    in_stats = False
    in_upgrades = False
    stats_indent = 0
    wrote_armor_stats = False
    upgrade_idx = -1

    while i < (end - start):
        line = lines[start + i]
        stripped = line.lstrip()
        cur_indent = len(line) - len(stripped) if stripped else 999

        # Update base stationLevel
        if station_info and stripped.startswith("stationLevel:") and not in_upgrades:
            base_sl = station_info.get("baseStationLevel")
            base_rl = station_info.get("baseRepairLevel")
            result.append(f"  stationLevel: {base_sl}" if base_sl else line)
            if i + 1 < (end - start) and lines[start + i + 1].lstrip().startswith("repairLevel:"):
                pass
            elif base_rl is not None:
                result.append(f"  repairLevel: {base_rl}")
            i += 1
            continue

        if station_info and stripped.startswith("repairLevel:") and not in_upgrades:
            base_rl = station_info.get("baseRepairLevel")
            if base_rl is not None:
                result.append(f"  repairLevel: {base_rl}")
                i += 1
                continue

        # Replace flat stats: with armorStats:
        if not in_upgrades and stripped.startswith("stats:") and not in_stats:
            in_stats = True
            stats_indent = cur_indent
            result.append(f"{' ' * stats_indent}armorStats:")
            result.extend(format_armor_stats_yaml(new_armor_stats, stats_indent + 2))
            wrote_armor_stats = True
            i += 1
            # Skip old stats block
            while i < (end - start):
                next_line = lines[start + i]
                next_stripped = next_line.lstrip()
                next_indent = len(next_line) - len(next_stripped) if next_stripped else 999
                if next_stripped and next_indent <= stats_indent:
                    break
                i += 1
            in_stats = False
            continue

        if stripped.startswith("upgrades:") and not in_upgrades:
            in_upgrades = True
            result.append(line)
            i += 1
            continue

        if in_upgrades:
            if stripped.startswith("- quality:"):
                upgrade_idx += 1
                result.append(line)
                i += 1

                while i < (end - start):
                    uline = lines[start + i]
                    ustripped = uline.lstrip()
                    uindent = len(uline) - len(ustripped) if ustripped else 999

                    if ustripped.startswith("- quality:") or (ustripped and not ustripped.startswith("-") and uindent <= 4):
                        break

                    # Update station/repair levels in upgrades
                    if station_info and ustripped.startswith("stationLevel:"):
                        upgrade_levels = station_info.get("upgradeLevels", [])
                        if upgrade_idx < len(upgrade_levels):
                            result.append(f"{' ' * uindent}stationLevel: {upgrade_levels[upgrade_idx]['stationLevel']}")
                            i += 1
                            continue

                    if station_info and ustripped.startswith("repairLevel:"):
                        upgrade_levels = station_info.get("upgradeLevels", [])
                        if upgrade_idx < len(upgrade_levels):
                            result.append(f"{' ' * uindent}repairLevel: {upgrade_levels[upgrade_idx]['repairLevel']}")
                            i += 1
                            continue

                    # Update ingredients from wiki
                    if wiki_materials and ustripped.startswith("ingredients:"):
                        q = upgrade_idx + 2  # quality number
                        if q in wiki_materials:
                            result.append(f"{' ' * uindent}ingredients:")
                            for ing in wiki_materials[q]:
                                result.append(f"{' ' * (uindent + 2)}- {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
                            i += 1
                            # Skip old ingredients
                            while i < (end - start):
                                nline = lines[start + i]
                                nstripped = nline.lstrip()
                                if nstripped.startswith("- {") or nstripped.startswith("- itemId:"):
                                    i += 1
                                else:
                                    break
                            continue

                    # Replace stats: with armorStats: in upgrades
                    if ustripped.startswith("stats:"):
                        stats_base_indent = uindent
                        i += 1
                        while i < (end - start):
                            nline = lines[start + i]
                            nstripped = nline.lstrip()
                            nindent = len(nline) - len(nstripped) if nstripped else 999
                            if nstripped and nindent <= stats_base_indent:
                                break
                            i += 1

                        if upgrade_idx < len(upgrade_overlays) and upgrade_overlays[upgrade_idx]:
                            result.append(f"{' ' * stats_base_indent}armorStats:")
                            result.extend(format_armor_stats_yaml(upgrade_overlays[upgrade_idx], stats_base_indent + 2))
                        continue

                    result.append(uline)
                    i += 1
                continue

            if stripped and not stripped.startswith("-") and not stripped.startswith(" "):
                in_upgrades = False
                result.append(line)
                i += 1
                continue

        # Insert armorStats before upgrades if we haven't written it yet
        if not wrote_armor_stats and (stripped.startswith("upgrades:") or i == (end - start) - 1):
            result.append("  armorStats:")
            result.extend(format_armor_stats_yaml(new_armor_stats, 4))
            wrote_armor_stats = True

        result.append(line)
        i += 1

    # Append new upgrade entries
    if new_upgrade_lines:
        if not any(l.strip().startswith("upgrades:") for l in result):
            result.append("  upgrades:")
        result.extend(new_upgrade_lines)

    return result


def generate_new_recipe(
    armor_name: str, armor_stats: dict, fields: dict[str, str],
    wiki_materials: dict, station_info: dict | None,
    upgrade_overlays: list[dict], armor_type_tag: str,
) -> list[str]:
    """Generate a complete new recipe entry for armor not yet in crafting.yaml."""
    item_id = name_to_item_id(armor_name)

    # Determine station
    source = fields.get("source", "").lower()
    station_id = "workbench"
    for wiki_name, yaml_id in STATION_NAME_TO_ID.items():
        if wiki_name in source:
            station_id = yaml_id
            break

    base_sl = station_info.get("baseStationLevel", 1) if station_info else 1
    base_rl = station_info.get("baseRepairLevel", 1) if station_info else 1

    # Determine biome and tier
    biome, tier = STATION_BIOME.get(station_id, ("meadows", "tier-1"))

    lines = [
        f"- id: {item_id}",
        f"  name: {armor_name}",
        f"  type: crafting",
        f"  station: {station_id}",
        f"  stationLevel: {base_sl}",
        f"  repairLevel: {base_rl}",
    ]

    # Base ingredients
    if 1 in wiki_materials:
        lines.append("  ingredients:")
        for ing in wiki_materials[1]:
            lines.append(f"    - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
    else:
        lines.append("  ingredients: []")

    lines.append(f"  yields: {{ itemId: {item_id}, qty: 1 }}")
    lines.append(f"  tags: [{armor_type_tag}, armor, {tier}]")
    lines.append(f"  biome: {biome}")

    # ArmorStats
    lines.append("  armorStats:")
    lines.extend(format_armor_stats_yaml(armor_stats, 4))

    # Upgrades
    upgrade_levels = station_info.get("upgradeLevels", []) if station_info else []
    if upgrade_overlays:
        lines.append("  upgrades:")
        for qi, overlay in enumerate(upgrade_overlays):
            q = qi + 2
            lines.append(f"    - quality: {q}")
            if qi < len(upgrade_levels):
                lines.append(f"      stationLevel: {upgrade_levels[qi]['stationLevel']}")
                lines.append(f"      repairLevel: {upgrade_levels[qi]['repairLevel']}")
            if q in wiki_materials:
                lines.append(f"      ingredients:")
                for ing in wiki_materials[q]:
                    lines.append(f"        - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
            if overlay:
                lines.append(f"      armorStats:")
                lines.extend(format_armor_stats_yaml(overlay, 8))

    return lines
```

- [ ] **Step 7: Add main scrape function and CLI**

Append to `scripts/scrape_armor_stats.py`:

```python
# ── Main ──────────────────────────────────────────────────────────────────────

def scrape_armor(armor_name: str, dry_run: bool = False) -> bool:
    print(f"\n{'='*60}")
    print(f"Scraping: {armor_name}")
    print(f"{'='*60}")

    page_title = resolve_page_title(armor_name)
    if not page_title:
        return False

    wikitext = fetch_wikitext(page_title)
    if not wikitext:
        print(f"  ERROR: Could not fetch wikitext for \"{page_title}\"")
        return False

    fields = extract_infobox_armor(wikitext)
    if not fields:
        print(f"  ERROR: No {{{{Infobox armor}}}} found in \"{page_title}\"")
        return False

    print(f"\n  Wiki fields extracted:")
    for k, v in sorted(fields.items()):
        print(f"    {k}: {v}")

    armor_stats = build_armor_stats(fields, wikitext)
    if not armor_stats:
        print(f"  ERROR: No stats could be extracted")
        return False

    # Station levels
    station_info = parse_station_levels(wikitext, fields)
    if station_info:
        print(f"\n  Station levels:")
        print(f"    Base: station={station_info.get('baseStationLevel')}, repair={station_info.get('baseRepairLevel')}")
        for idx, ul in enumerate(station_info.get("upgradeLevels", [])):
            print(f"    Q{idx+2}: station={ul['stationLevel']}, repair={ul['repairLevel']}")

    print(f"\n  Armor stats:")
    for line in format_armor_stats_yaml(armor_stats, 4):
        print(f"  {line}")

    # Materials
    wiki_materials = extract_materials(wikitext)
    if wiki_materials:
        print(f"\n  Materials from wiki:")
        for q, ings in sorted(wiki_materials.items()):
            print(f"    Q{q}: {', '.join(f'{i[\"itemId\"]} x{i[\"qty\"]}' for i in ings)}")

    # Compute upgrade overlays
    wiki_upgrade_count = max((q for q in wiki_materials if q > 1), default=1) - 1 if wiki_materials else 0

    # Cap upgrades by station max level
    source = fields.get("source", "").lower()
    station_id = "workbench"
    for wiki_name, yaml_id in STATION_NAME_TO_ID.items():
        if wiki_name in source:
            station_id = yaml_id
            break

    max_station_level = STATION_MAX_LEVEL.get(station_id, 999)
    base_station = station_info.get("baseStationLevel", 1) if station_info else 1
    max_available_upgrades = max(0, max_station_level - base_station)

    effective_upgrade_count = min(wiki_upgrade_count, max_available_upgrades) if wiki_upgrade_count else min(3, max_available_upgrades)
    if station_info and "upgradeLevels" in station_info:
        station_info["upgradeLevels"] = station_info["upgradeLevels"][:effective_upgrade_count]

    upgrade_overlays = []
    for q in range(2, 2 + effective_upgrade_count):
        overlay = compute_upgrade_armor_stats(armor_stats, fields, q)
        upgrade_overlays.append(overlay)

    if upgrade_overlays:
        print(f"\n  Upgrade overlays ({effective_upgrade_count} levels):")
        for idx, overlay in enumerate(upgrade_overlays):
            print(f"    Quality {idx+2}: {overlay if overlay else '(no changes)'}")

    # Read and update YAML
    yaml_text = YAML_PATH.read_text(encoding="utf-8")
    yaml_lines = yaml_text.splitlines()

    bounds = find_recipe_bounds(yaml_lines, armor_name)

    if bounds is None:
        # New entry — generate and append
        print(f"\n  No existing recipe found — generating new entry")

        armor_type = fields.get("type", "chest").lower()
        armor_type_tag = ARMOR_TYPE_TO_TAG.get(armor_type, "chest")

        new_lines = generate_new_recipe(
            armor_name, armor_stats, fields,
            wiki_materials, station_info,
            upgrade_overlays, armor_type_tag,
        )

        print(f"\n  New recipe entry:")
        for line in new_lines:
            print(f"    {line}")

        if dry_run:
            print(f"\n  DRY RUN — no changes written.")
        else:
            # Append before the last blank line or at the end
            yaml_lines.append("")
            yaml_lines.extend(new_lines)
            YAML_PATH.write_text("\n".join(yaml_lines) + "\n", encoding="utf-8")
            print(f"\n  Appended new recipe to crafting.yaml")

        return True

    start, end = bounds
    print(f"  Found recipe at lines {start+1}-{end} in crafting.yaml")

    old_block = yaml_lines[start:end]

    # Count existing upgrades
    existing_upgrade_count = sum(1 for line in old_block if line.strip().startswith("- quality:"))
    if effective_upgrade_count < existing_upgrade_count:
        effective_upgrade_count = existing_upgrade_count

    new_upgrade_lines = []
    if effective_upgrade_count > existing_upgrade_count:
        upgrade_levels = station_info.get("upgradeLevels", []) if station_info else []
        for qi in range(existing_upgrade_count, effective_upgrade_count):
            q = qi + 2
            ul = []
            ul.append(f"    - quality: {q}")
            if qi < len(upgrade_levels):
                ul.append(f"      stationLevel: {upgrade_levels[qi]['stationLevel']}")
                ul.append(f"      repairLevel: {upgrade_levels[qi]['repairLevel']}")
            if q in wiki_materials:
                ul.append(f"      ingredients:")
                for ing in wiki_materials[q]:
                    ul.append(f"        - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
            if qi < len(upgrade_overlays) and upgrade_overlays[qi]:
                ul.append(f"      armorStats:")
                ul.extend(format_armor_stats_yaml(upgrade_overlays[qi], 8))
            new_upgrade_lines.extend(ul)

    new_block = replace_stats_with_armor_stats(
        yaml_lines, start, end,
        armor_stats, upgrade_overlays,
        station_info, new_upgrade_lines, wiki_materials,
    )

    diff = list(difflib.unified_diff(
        old_block, new_block,
        fromfile="crafting.yaml (before)",
        tofile="crafting.yaml (after)",
        lineterm="",
    ))

    if not diff:
        print("\n  No changes needed — stats already match.")
        return True

    print(f"\n  Diff:")
    for line in diff:
        if line.startswith("+") and not line.startswith("+++"):
            print(f"    \033[32m{line}\033[0m")
        elif line.startswith("-") and not line.startswith("---"):
            print(f"    \033[31m{line}\033[0m")
        else:
            print(f"    {line}")

    if dry_run:
        print(f"\n  DRY RUN — no changes written.")
    else:
        new_lines = yaml_lines[:start] + new_block + yaml_lines[end:]
        YAML_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        print(f"\n  Updated crafting.yaml")

    return True


def main():
    parser = argparse.ArgumentParser(description="Scrape Valheim armor stats from wiki")
    parser.add_argument("armor", nargs="?", help="Armor name to scrape")
    parser.add_argument("--batch", help="File with armor names (one per line)")
    parser.add_argument("--dry-run", action="store_true", help="Print diff without writing")
    args = parser.parse_args()

    if args.batch:
        batch_file = Path(args.batch)
        if not batch_file.exists():
            print(f"Batch file not found: {args.batch}")
            sys.exit(1)
        names = [line.strip() for line in batch_file.read_text().splitlines() if line.strip()]
        results = {}
        for name in names:
            results[name] = scrape_armor(name, dry_run=args.dry_run)
        print(f"\n{'='*60}")
        print(f"Batch results:")
        for name, ok in results.items():
            print(f"  {name}: {'OK' if ok else 'FAILED'}")
    elif args.armor:
        ok = scrape_armor(args.armor, dry_run=args.dry_run)
        sys.exit(0 if ok else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 8: Test scraper with dry-run on a known armor item**

Run: `cd scripts && python3 -m venv .venv && source .venv/bin/activate && pip install requests && python scrape_armor_stats.py "Carapace breastplate" --dry-run`

If no `.venv` exists yet, create it. Verify the diff output looks correct: armor=32, durability=1200, weight=10.0, movementPenalty=-5, and the flat `stats:` is replaced with `armorStats:`.

- [ ] **Step 9: Test scraper on Root harnesk (body-text resistance edge case)**

Run: `python scripts/scrape_armor_stats.py "Root harnesk" --dry-run`

Verify: new entry generated with `resistances: { poison: resistant, fire: weak, pierce: resistant }` and `setBonus: { name: "Root Set", pieces: 3, effect: "Improved archery — +15 Bows" }`.

- [ ] **Step 10: Commit scraper**

```bash
git add scripts/scrape_armor_stats.py
git commit -m "feat: add armor stats wiki scraper

Parses {{Infobox armor}} templates for armor value, durability,
weight, movement penalty, resistances, effects, and set bonuses.
Supports --batch and --dry-run modes."
```

---

### Task 4: Create batch armor list and run scraper

**Files:**
- Create: `scripts/armors.txt`
- Modify: `src/data/recipes/crafting.yaml`

- [ ] **Step 1: Create batch file with all armor names**

Create `scripts/armors.txt` with all 41 existing armor items plus missing ones:

```text
Leather helmet
Leather tunic
Leather pants
Deer hide cape
Troll leather helmet
Troll leather tunic
Troll leather pants
Troll hide cape
Bronze helmet
Bronze plate cuirass
Bronze plate leggings
Iron helmet
Iron scale mail
Iron greaves
Root mask
Root harnesk
Root leggings
Wolf armor chest
Wolf armor legs
Drake helmet
Padded helmet
Padded cuirass
Padded greaves
Wolf fur cape
Lox cape
Carapace helmet
Carapace breastplate
Carapace greaves
Hood of Ask
Breastplate of Ask
Trousers of Ask
Flametal helmet
Flametal breastplate
Flametal greaves
Ashen cape
Eitr-weave hood
Eitr robe
Eitr-weave tunic
Eitr-weave trousers
Feather cape
Hood of Embla
Robes of Embla
Trousers of Embla
Asksvin cloak
```

- [ ] **Step 2: Run scraper in dry-run mode to preview all changes**

Run: `source scripts/.venv/bin/activate && python scripts/scrape_armor_stats.py --batch scripts/armors.txt --dry-run 2>&1 | tee /tmp/armor-dry-run.log`

Review the output for:
- All items found on wiki
- Stats look correct
- New entries generated for missing items (Root set)
- No unexpected errors

- [ ] **Step 3: Run scraper for real to update crafting.yaml**

Run: `python scripts/scrape_armor_stats.py --batch scripts/armors.txt`

- [ ] **Step 4: Verify the data loads correctly**

Run: `pnpm test -- tests/real-data.test.ts`

If the real-data tests validate schema, this confirms all `armorStats` entries parse correctly.

- [ ] **Step 5: Commit updated data**

```bash
git add scripts/armors.txt src/data/recipes/crafting.yaml
git commit -m "data: populate armor stats from wiki

Migrated 41 existing armor items from flat stats to armorStats.
Added missing Root armor set (3 pieces).
All stats scraped from Valheim Fandom Wiki."
```

---

### Task 5: Add ArmorStatsTable component

**Files:**
- Create: `src/components/ArmorStatsTable.tsx`

- [ ] **Step 1: Create ArmorStatsTable component**

Create `src/components/ArmorStatsTable.tsx`:

```tsx
import { For, Show, type Component, type JSX } from 'solid-js';
import type { ArmorStats, ItemUpgrade } from '../lib/types';
import { mergeArmorStats } from '../lib/merge-stats';
import { StatIcon } from './StatIcon';

interface Props {
  baseStats: ArmorStats;
  upgrades?: ItemUpgrade[];
  baseHref?: string;
}

type QualityRow = { quality: number; stats: ArmorStats };

const RESISTANCE_COLORS: Record<string, string> = {
  resistant: 'var(--color-positive, #4caf50)',
  weak: 'var(--color-negative, #f44336)',
};

function formatVal(val: number | undefined): string {
  if (val == null) return '—';
  return String(val);
}

export const ArmorStatsTable: Component<Props> = (props) => {
  const rows = (): QualityRow[] => {
    const result: QualityRow[] = [{ quality: 1, stats: props.baseStats }];
    for (const u of props.upgrades ?? []) {
      result.push({ quality: u.quality, stats: mergeArmorStats(props.baseStats, u.armorStats) });
    }
    return result;
  };

  const baseRow = () => rows()[0];

  function isChanged(baseVal: number | undefined, val: number | undefined): boolean {
    return val != null && baseVal != null && val !== baseVal;
  }

  function renderHeader(): JSX.Element {
    return (
      <thead>
        <tr>
          <th class="ct__stat-name">Stat</th>
          <For each={rows()}>
            {(q) => <th class="ct__q-header">Q{q.quality}</th>}
          </For>
        </tr>
      </thead>
    );
  }

  return (
    <div class="ct-grid">
      <div class="ct__section">
        <h3 class="ct__section-title">Armor</h3>
        <table class="ct">
          {renderHeader()}
          <tbody>
            <tr>
              <td class="ct__stat-name">Armor</td>
              <For each={rows()}>
                {(q, qi) => (
                  <td class="ct__val" classList={{
                    'ct__val--changed': qi() > 0 && isChanged(baseRow().stats.armor, q.stats.armor),
                    'ct__val--unchanged': qi() > 0 && !isChanged(baseRow().stats.armor, q.stats.armor),
                  }}>
                    {formatVal(q.stats.armor)}
                  </td>
                )}
              </For>
            </tr>
            <tr>
              <td class="ct__stat-name">Durability</td>
              <For each={rows()}>
                {(q, qi) => (
                  <td class="ct__val" classList={{
                    'ct__val--changed': qi() > 0 && isChanged(baseRow().stats.durability, q.stats.durability),
                    'ct__val--unchanged': qi() > 0 && !isChanged(baseRow().stats.durability, q.stats.durability),
                  }}>
                    {formatVal(q.stats.durability)}
                  </td>
                )}
              </For>
            </tr>
            <Show when={props.baseStats.weight != null}>
              <tr>
                <td class="ct__stat-name">Weight</td>
                <For each={rows()}>
                  {(_q, qi) => (
                    <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>
                      {formatVal(props.baseStats.weight)}
                    </td>
                  )}
                </For>
              </tr>
            </Show>
            <Show when={props.baseStats.movementPenalty != null}>
              <tr>
                <td class="ct__stat-name">Movement Speed</td>
                <For each={rows()}>
                  {(_q, qi) => (
                    <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>
                      {props.baseStats.movementPenalty}%
                    </td>
                  )}
                </For>
              </tr>
            </Show>
          </tbody>
        </table>
      </div>

      <Show when={props.baseStats.resistances && Object.keys(props.baseStats.resistances).length > 0}>
        <div class="ct__section">
          <h3 class="ct__section-title">Resistances</h3>
          <ul class="armor-resistances">
            <For each={Object.entries(props.baseStats.resistances!)}>
              {([dtype, level]) => (
                <li style={{ color: RESISTANCE_COLORS[level] ?? 'inherit' }}>
                  {level.charAt(0).toUpperCase() + level.slice(1)} vs {dtype.charAt(0).toUpperCase() + dtype.slice(1)}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={props.baseStats.effects && props.baseStats.effects.length > 0}>
        <div class="ct__section">
          <h3 class="ct__section-title">Effects</h3>
          <ul class="armor-effects">
            <For each={props.baseStats.effects!}>
              {(effect) => <li>{effect}</li>}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={props.baseStats.setBonus}>
        <div class="ct__section armor-set-bonus">
          <h3 class="ct__section-title">Set Bonus</h3>
          <p class="armor-set-bonus__name">
            {props.baseStats.setBonus!.name} ({props.baseStats.setBonus!.pieces} pieces)
          </p>
          <p class="armor-set-bonus__effect">{props.baseStats.setBonus!.effect}</p>
        </div>
      </Show>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ArmorStatsTable.tsx
git commit -m "feat: add ArmorStatsTable component for armor detail pages"
```

---

### Task 6: Update detail page to render armor stats

**Files:**
- Modify: `src/pages/recipes/[slug].astro`

- [ ] **Step 1: Add ArmorStatsTable import and isArmor flag**

In `[slug].astro`, add import at top:

```typescript
import { ArmorStatsTable } from '../../components/ArmorStatsTable';
```

After the `isWeapon` const (line ~37), add:

```typescript
const isArmor = tags.includes('armor');
```

- [ ] **Step 2: Add armorStats rendering block**

After the existing `recipe.stats` block (after line ~118), add:

```astro
    {/* ── Armor stats ── */}
    {recipe.armorStats && (
      <div class="detail-card__section">
        <h2 class="detail-card__section-title">Armor Stats</h2>
        <ArmorStatsTable
          client:load
          baseStats={recipe.armorStats}
          upgrades={recipe.upgrades}
          baseHref={base}
        />
      </div>
    )}
```

- [ ] **Step 3: Verify the page renders**

Run: `pnpm build` and check that armor detail pages build without errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/recipes/[slug].astro
git commit -m "feat: render armor stats on detail pages"
```

---

### Task 7: Update RecipeRow to show armor value in list view

**Files:**
- Modify: `src/components/RecipeRow.tsx`

- [ ] **Step 1: Update formatStatSummary to handle armorStats**

In `src/components/RecipeRow.tsx`, update the `formatStatSummary` function (line ~25):

```typescript
function formatStatSummary(recipe: Recipe): string | null {
  // Weapon stats
  if (recipe.stats) {
    const dmg = recipe.stats.primaryAttack?.damage;
    if (dmg) {
      const parts = Object.entries(dmg)
        .filter(([, v]) => v != null && v > 0)
        .map(([type, val]) => `${val} ${type}`);
      if (parts.length > 0) return parts.join(' / ');
    }
    const blockArmor = recipe.stats.blocking?.blockArmor;
    if (blockArmor != null) return `${blockArmor} block`;
  }

  // Armor stats
  if (recipe.armorStats) {
    return `${recipe.armorStats.armor} armor`;
  }

  return null;
}
```

- [ ] **Step 2: Verify the list view renders**

Run: `pnpm build`
Check that armor items in the list show "X armor" in the stats column.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecipeRow.tsx
git commit -m "feat: show armor value in recipe list stat summary"
```

---

### Task 8: Update ItemUpgradeSchema to support armorStats overlay

**Files:**
- Modify: `src/lib/schema.ts`

Note: This was partially done in Task 1 when we added `armorStats` to `ItemUpgradeSchema`. This task ensures the upgrade data in `crafting.yaml` uses `armorStats` (not `stats`) for upgrade overlays, and that the `ArmorStatsTable` reads them correctly.

- [ ] **Step 1: Verify ItemUpgradeSchema accepts armorStats**

The schema change in Task 1 added `armorStats: ArmorStatsSchema.partial().optional()` to `ItemUpgradeSchema`. Verify this works by running:

Run: `pnpm test -- tests/real-data.test.ts`
Expected: PASS (all real data validates against the updated schema)

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: ALL PASS

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds, all pages generated.

- [ ] **Step 4: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: ensure armorStats upgrade overlays work end-to-end"
```

---

### Task 9: Final validation

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: ALL PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Spot-check a few armor detail pages**

Start dev server: `pnpm dev`
Check these pages manually:
- `/recipes/leather-helmet/` — minimal armor, no resistances
- `/recipes/carapace-breastplate/` — high-tier with movement penalty
- `/recipes/root-harnesk/` — new entry with resistances, set bonus
- `/recipes/eitr-robe/` — magic armor with effects

Verify: stats card, resistances, effects, set bonus, and upgrade table all render correctly.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final validation for armor stats feature"
```
