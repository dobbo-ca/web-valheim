# Weapon Stats Scraper Design

**Date:** 2026-04-12
**Status:** Approved

## Goal

Populate comprehensive weapon stats in `src/data/recipes/crafting.yaml` by scraping the [Valheim Fandom Wiki](https://valheim.fandom.com/wiki/). Migrate existing flat stat format to the nested `WeaponStatsSchema` structure defined in `src/lib/schema.ts`.

## Data Source

MediaWiki API at `valheim.fandom.com/api.php` with `action=parse&prop=wikitext`. Returns raw wikitext containing `{{Infobox weapon}}` templates with structured key-value stat fields.

### Page Title Resolution

Wiki page titles use inconsistent casing/spacing. Resolution strategy:
1. Try exact `name` field from YAML entry
2. Fall back to MediaWiki search API (`action=query&list=search`)
3. Print resolved title for user confirmation before scraping

## Schema Mapping

### Wiki Infobox → `stats.primaryAttack`

| Wiki field | Schema field |
|---|---|
| `slash` | `damage.slash` |
| `pierce` | `damage.pierce` |
| `blunt` | `damage.blunt` |
| `fire` | `damage.fire` |
| `frost` | `damage.frost` |
| `lightning` | `damage.lightning` |
| `poison` | `damage.poison` |
| `spirit` | `damage.spirit` |
| `knockback` | `knockback` |
| `backstab` | `backstab` |
| `stamina` | `stamina` |
| `eitr` | `eitr` |
| `health` (e.g. "60%") | `healthCost` (number: 60) |
| `adrenaline` | `adrenaline` |

### Wiki Infobox → `stats.secondaryAttack`

| Wiki field | Schema field |
|---|---|
| `stamina secondary` | `stamina` |

Secondary attack inherits damage profile from primary. Multiplier noted in wiki text (e.g. "3x damage") but not reliably machine-parseable — omitted from scraper, can be added manually.

### Wiki Infobox → `stats.blocking`

| Wiki field | Schema field |
|---|---|
| `block armor` | `blockArmor` |
| `block force` | `blockForce` |
| `parry bonus` | `parryBonus` |
| `parry force` | `parryBlockArmor` |

### Wiki Infobox → top-level `stats`

| Wiki field | Schema field |
|---|---|
| `weight` | `weight` |
| `durability` | `durability` |
| `movement speed` (e.g. "-5%") | `movementPenalty` (number: -5) |

## Per-Level Upgrade Scaling

Wiki provides `{damage_type} per level` fields (e.g. `slash per level=6`). For quality N:
- `damage = base + (N-1) * per_level`
- Durability typically scales +50/level (computed from upgrade table when available)

Upgrades use **sparse overlays** — only fields that differ from base stats appear in each upgrade's `stats` block.

## Script Design

**File:** `scripts/scrape_weapon_stats.py`

### Single mode
```
python scripts/scrape_weapon_stats.py "Dyrnwyn"
```
1. Loads `crafting.yaml`
2. Finds entry by name (fuzzy match on `name` field)
3. Resolves wiki page title via API
4. Parses `{{Infobox weapon}}` from wikitext
5. Maps fields to nested schema format
6. Computes per-level upgrade stats from `per level` fields
7. Updates YAML entry in-place (stats + upgrade stats only — no recipe changes)
8. Prints before/after diff

### Batch mode (future)
```
python scripts/scrape_weapon_stats.py --batch weapons.txt
```
Takes a file with one weapon name per line. Only enabled after single mode is validated on multiple weapon types.

## Edge Cases

- **Tabbed infoboxes** (`{{InfoboxTabber}}`): Extract only `{{Infobox weapon}}` blocks, ignore creature/summon sub-infoboxes
- **Variant weapons** (Nidhögg → Bleeding/Thundering/Primal): Each is a separate wiki page and separate YAML entry
- **Shields**: No `primaryAttack`/`secondaryAttack`; all stats go in `blocking`
- **Staffs**: Use `eitr` and/or `healthCost` instead of `stamina`
- **Wiki page not found**: Print warning, skip, don't modify YAML

## What the Scraper Does NOT Do

- Create new YAML entries (recipe must already exist)
- Modify ingredients, station, stationLevel, tags, or other non-stat fields
- Guess stats not present in the wiki infobox
- Run without user review of the diff

## Validation Strategy

1. Run on Dyrnwyn (sword) — validate damage types, per-level scaling, blocking
2. Run on Nidhögg (sword with variants) — validate base sword stats
3. Run on Flametal Mace (blunt weapon) — validate different damage type
4. Run on Trollstav (blood magic staff) — validate eitr/healthCost/special fields
5. Run on Flametal Shield (shield) — validate blocking-only stats
6. After 5+ weapon types validated, enable batch mode
