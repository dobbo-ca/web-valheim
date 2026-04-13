#!/usr/bin/env python3
"""Scrape weapon stats from the Valheim Fandom Wiki and update crafting.yaml.

Usage:
    python scripts/scrape_weapon_stats.py "Dyrnwyn"
    python scripts/scrape_weapon_stats.py --batch weapons.txt
    python scripts/scrape_weapon_stats.py "Dyrnwyn" --dry-run   # print diff only, don't write

The wiki's {{Infobox weapon}} template stores only explicit overrides.
Many stats (backstab, stagger, adrenaline, secondary damage, blocking defaults)
are computed from the weapon's category using default lookup tables defined in
Template:Infobox weapon. This script replicates those computations.

Requires: requests, pyyaml (install in scripts/.venv)
"""

import argparse
import difflib
import re
import sys
from pathlib import Path

import requests

WIKI_API = "https://valheim.fandom.com/api.php"
YAML_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "recipes" / "crafting.yaml"
USER_AGENT = "ValheimHelper/1.0 (weapon-stats-scraper)"

DAMAGE_TYPES = ["slash", "pierce", "blunt", "fire", "frost", "lightning", "poison", "spirit", "pure", "chop", "pickaxe"]

# Only these damage types contribute to stagger (from Module:Damage sumDamages)
STAGGER_DAMAGE_TYPES = ["slash", "pierce", "blunt", "lightning"]

# Categories that summon creatures — no direct stagger from the weapon itself
SUMMON_CATEGORIES = {"blood magic"}

# ── Category defaults (from Template:Infobox weapon) ─────────────────────────
# These replicate the {{#switch}} tables in the wiki template so we can compute
# derived stats the same way the wiki renders them.

BACKSTAB = {
    "axe 1h": 3, "axe 2h": 3, "axe dw": 3, "bow": 3, "club 1h": 3,
    "club 2h": 2, "crossbow": 3, "fists": 6, "knife": 6, "knife 2h": 6,
    "pickaxe": 3, "polearm": 3, "spear": 3, "sword": 3, "sword 2h": 3,
    "unarmed": 4,
}

STAGGER_MULTIPLIER = {"axe 2h": 1.5}  # default 1

# Secondary damage multiplier (applied to each damage type)
DAMAGE_MULT_SECONDARY = {
    "axe 1h": 1.5, "axe 2h": 0.5, "axe dw": 1.5, "fists": 1,
    "club 1h": 2.5, "knife": 3, "knife 2h": 3, "polearm": 1,
    "spear": 1.5, "sword": 3, "sword 2h": 3, "unarmed": 1,
}

# Stagger multiplier for secondary attack (multiplied by DAMAGE_MULT_SECONDARY)
STAGGER_MULT_SECONDARY_BASE = {
    "axe 2h": 4, "club 1h": 2, "fists": 6, "polearm": 6, "unarmed": 6,
}  # default 1

KNOCKBACK_MULT_SECONDARY = {
    "axe 1h": 1.5, "axe 2h": 2, "club 1h": 2, "fists": 4, "knife": 4,
    "knife 2h": 4, "polearm": 10, "spear": 1.5, "sword": 1, "sword 2h": 1,
    "unarmed": 4,
}

STAMINA_MULT_SECONDARY = {
    "axe 1h": 2, "axe 2h": 0.5, "axe dw": 2, "club 1h": 2, "fists": 2,
    "knife": 3, "knife 2h": 3, "polearm": 2, "spear": 1, "sword": 2,
    "sword 2h": 2, "unarmed": 2,
}

ADRENALINE = {
    "axe 1h": 1, "axe 2h": 2, "axe dw": 1, "bow": 2, "club 1h": 1,
    "club 2h": 2, "crossbow": 2, "fists": 1, "knife": 1, "knife 2h": 1,
    "polearm": 2, "spear": 1, "sword": 1, "sword 2h": 2,
}

ADRENALINE_SECONDARY = {
    "axe 1h": 1, "axe 2h": 1, "axe dw": 1, "club 1h": 3, "fists": 1,
    "knife": 1, "knife 2h": 1, "polearm": 1, "spear": 1, "sword": 3,
    "sword 2h": 1,
}

PARRY_BONUS = {
    "axe 1h": 2, "axe 2h": 2, "bow": 1.5, "club 1h": 2, "club 2h": 2,
    "crossbow": 1.5, "fists": 6, "knife": 4, "knife 2h": 4,
    "elemental magic": 2, "blood magic": 2, "pickaxe": 2, "polearm": 2,
    "shield buckler": 2.5, "shield round": 1.5, "spear": 2, "sword": 2,
    "sword 2h": 2, "unarmed": 2,
}

BLOCK_ARMOR_DEFAULT = {
    "bow": 3, "crossbow": 3, "fists": 5, "knife": 2, "knife 2h": 24,
    "pickaxe": 2,
}  # default 0

BLOCK_FORCE_DEFAULT = {
    "axe 1h": 20, "axe 2h": 30, "club 1h": 20, "club 2h": 30,
    "fists": 20, "knife": 10, "knife 2h": 30, "elemental magic": 20,
    "blood magic": 20, "pickaxe": 10, "polearm": 30,
    "shield buckler": 20, "shield round": 50, "shield tower": 80,
    "spear": 20, "sword": 20, "sword 2h": 30, "unarmed": 20,
}

BLOCK_FORCE_PER_LEVEL = {
    "axe 1h": 5, "axe 2h": 5, "club 1h": 5, "club 2h": 10, "fists": 5,
    "knife": 5, "knife 2h": 5, "elemental magic": 5, "blood magic": 5,
    "pickaxe": 5, "polearm": 5, "shield buckler": 0, "shield round": 5,
    "shield tower": 5, "spear": 5, "sword": 5, "sword 2h": 10,
}

# Default movement speed by category (most melee = -5%)
MOVEMENT_SPEED = {
    "axe 1h": -5, "axe 2h": -5, "axe dw": -5, "bow": -5, "club 1h": -5,
    "club 2h": -5, "crossbow": -5, "fists": 0, "knife": 0, "knife 2h": -5,
    "elemental magic": -5, "blood magic": -5, "pickaxe": 0, "polearm": -5,
    "shield buckler": -5, "shield round": -5, "shield tower": -5,
    "spear": -5, "sword": -5, "sword 2h": -5, "unarmed": 0,
}

BLOCK_ADRENALINE = {"bow": 1, "shield buckler": 1, "shield round": 1}  # default 2 if has block
PARRY_ADRENALINE = {"shield tower": 0}  # default 5 if has block

# Categories that don't have secondary attacks
NO_SECONDARY = {"bow", "crossbow", "club 2h", "pickaxe", "elemental magic",
                 "blood magic", "shield buckler", "shield round", "shield tower",
                 "arrow", "bolt", "bomb", "missile"}

# ── Wiki type → our category mapping ─────────────────────────────────────────
# The wiki's "type" field uses inconsistent casing/naming

WIKI_TYPE_MAP = {
    "sword": "sword",
    "sword 2h": "sword 2h",
    "club 1h": "club 1h",
    "club 2h": "club 2h",
    "axe": "axe 1h",
    "axe 1h": "axe 1h",
    "axe 2h": "axe 2h",
    "axe dw": "axe dw",
    "bow": "bow",
    "crossbow": "crossbow",
    "knife": "knife",
    "knife 2h": "knife 2h",
    "spear": "spear",
    "polearm": "polearm",
    "fists": "fists",
    "unarmed": "unarmed",
    "pickaxe": "pickaxe",
    "elemental magic": "elemental magic",
    "elemental": "elemental magic",
    "blood magic": "blood magic",
    "shield buckler": "shield buckler",
    "shield round": "shield round",
    "shield tower": "shield tower",
    "arrow": "arrow",
    "bolt": "bolt",
    "bomb": "bomb",
    "missile": "missile",
    "bomb": "bomb",
}

# Station max levels (base level 1 + number of upgrades)
# From Module:Crafting station/data on the wiki
STATION_MAX_LEVEL = {
    "workbench": 5,       # 4 upgrades
    "forge": 7,           # 6 upgrades
    "cauldron": 6,        # 5 upgrades
    "artisan table": 2,   # 1 upgrade
    "black forge": 5,     # 4 upgrades
    "galdr table": 4,     # 3 upgrades
    "stonecutter": 1,
}

# Map our YAML station IDs to wiki station names
STATION_ID_TO_NAME = {
    "workbench": "workbench",
    "forge": "forge",
    "cauldron": "cauldron",
    "artisan-table": "artisan table",
    "black-forge": "black forge",
    "galdr-table": "galdr table",
    "stonecutter": "stonecutter",
}

PER_LEVEL_SUFFIX = " per level"


def parse_station_levels(wikitext: str, fields: dict[str, str]) -> dict:
    """Extract per-quality station and repair levels from the wiki page.

    Returns dict with:
      baseStationLevel: int
      baseRepairLevel: int
      upgradeLevels: list of {stationLevel, repairLevel} for Q2, Q3, Q4...
    """
    result = {}

    # Base crafting/repair level from infobox
    base_craft = parse_number(fields.get("crafting level", ""))
    base_repair = parse_number(fields.get("repair level", ""))

    # Parse {{Upgrade station row|...|start=N}} or {{Crafting station row|...|start=N}}
    station_match = re.search(
        r'\{\{(?:Upgrade|Crafting) station row\|([^}]+)\}\}', wikitext, re.IGNORECASE
    )

    start_level = None
    max_quality = 4  # default

    if station_match:
        params = station_match.group(1).split("|")
        # Positional: station name, max quality column count
        for p in params[1:]:
            p = p.strip()
            if p.startswith("start="):
                start_level = int(p.split("=")[1])
            elif p.startswith("levels="):
                max_quality = int(p.split("=")[1])
            elif p.isdigit() and start_level is None:
                # Second positional arg is column count (max quality)
                pass

    # Use start= if available, otherwise fall back to infobox crafting level
    if start_level is not None:
        base_craft = start_level
    if base_craft is None:
        return result

    base_craft = int(base_craft)
    # Repair level defaults to crafting level if not specified
    if base_repair is None or base_repair == 0:
        base_repair = base_craft
    else:
        base_repair = int(base_repair)

    result["baseStationLevel"] = base_craft
    result["baseRepairLevel"] = base_repair

    # Each quality increments station level by 1
    upgrade_levels = []
    for q in range(2, max_quality + 1):
        upgrade_levels.append({
            "stationLevel": base_craft + (q - 1),
            "repairLevel": base_repair + (q - 1),
        })
    result["upgradeLevels"] = upgrade_levels

    return result


# ── Wiki API helpers ──────────────────────────────────────────────────────────

def fetch_wikitext(page_title: str) -> str | None:
    resp = requests.get(WIKI_API, params={
        "action": "parse", "page": page_title, "format": "json", "prop": "wikitext",
        "redirects": "1",  # follow redirects
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


def resolve_page_title(weapon_name: str) -> str | None:
    wikitext = fetch_wikitext(weapon_name)
    if wikitext is not None:
        print(f"  Wiki page found: \"{weapon_name}\"")
        return weapon_name

    results = search_wiki(weapon_name)
    if not results:
        print(f"  No wiki page found for \"{weapon_name}\"")
        return None

    for title in results:
        if weapon_name.lower() in title.lower():
            print(f"  Wiki page resolved: \"{weapon_name}\" → \"{title}\"")
            return title

    print(f"  Wiki page resolved (best guess): \"{weapon_name}\" → \"{results[0]}\"")
    return results[0]


# ── Infobox parser ────────────────────────────────────────────────────────────

def extract_infobox_weapon(wikitext: str) -> dict[str, str]:
    # Find the start of {{Infobox weapon and then balance braces to find the real end
    start_match = re.search(r'\{\{[Ii]nfobox weapon\s*\n', wikitext)
    if not start_match:
        return {}

    # Walk forward balancing {{ and }} to find the closing braces
    depth = 1  # we're inside the outer {{
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
    skip_keys = {"image", "title", "id", "description", "source", "usage",
                 "hitbox", "hitbox secondary", "light source", "speed",
                 "speed secondary", "last hit"}

    for line_match in re.finditer(r'^\|\s*([^=\n]+?)\s*=\s*([^\n|]*)', content, re.MULTILINE):
        key = line_match.group(1).strip().lower()
        value = line_match.group(2).strip()
        if key.startswith("materials") or key in skip_keys:
            continue
        if value:
            fields[key] = value

    return fields


def name_to_item_id(name: str) -> str:
    """Convert a wiki item name to our kebab-case item ID."""
    # Remove wiki link brackets
    name = re.sub(r'\[+|\]+', '', name).strip()
    # Lowercase, replace spaces/special chars with hyphens
    item_id = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return item_id


def extract_materials(wikitext: str) -> dict[int, list[dict]]:
    """Extract materials for each quality level from the infobox.

    Returns {quality: [{itemId, qty}, ...]}
    """
    match = re.search(r'\{\{[Ii]nfobox weapon\s*\n(.*?)(?:\}\})', wikitext, re.DOTALL)
    if not match:
        return {}

    content = match.group(1)
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

        # Also handle non-linked items (e.g. "Dyrnwyn hilt fragment x1")
        for item_match in re.finditer(r'\*\s*([^[\n]+?)\s+x(\d+)', mat_text):
            raw_name = item_match.group(1).strip()
            # Skip if this was already matched as a wiki link
            if f'[[{raw_name}]]' not in mat_text and '[[' not in raw_name:
                qty = int(item_match.group(2))
                ingredients.append({"itemId": name_to_item_id(raw_name), "qty": qty})

        if ingredients:
            materials[quality] = ingredients

    return materials


def extract_upgrade_table_values(wikitext: str) -> dict[str, list]:
    """Parse the upgrade information table for values not in the infobox.

    Returns {field_name: [q1_val, q2_val, q3_val, q4_val]}
    """
    values = {}
    idx = wikitext.find('Upgrade information')
    if idx == -1:
        return values

    table_text = wikitext[idx:idx + 3000]
    # Parse wiki table rows: !FieldName\n|val1\n|val2...
    # Handle optional leading whitespace in field names (e.g. "! Durability")
    rows = re.findall(r'^\!\s*(\w[\w\s]*?)\s*\n((?:\|[^\n]*\n)+)', table_text, re.MULTILINE)
    for field_name, val_block in rows:
        field_name = field_name.strip().lower()
        vals = [v.strip() for v in re.findall(r'\|([^\n|]+)', val_block)]
        if vals:
            values[field_name] = vals

    return values


def parse_number(value: str) -> float | int | None:
    if not value:
        return None
    cleaned = re.sub(r'[%x×]', '', value).strip()
    try:
        num = float(cleaned)
        return int(num) if num == int(num) else num
    except (ValueError, OverflowError):
        return None


def resolve_category(fields: dict[str, str]) -> str | None:
    """Resolve the weapon category from the wiki 'type' field."""
    wiki_type = fields.get("type", "").strip().lower()
    if not wiki_type:
        return None
    cat = WIKI_TYPE_MAP.get(wiki_type)
    if cat:
        return cat
    # Fuzzy: check if any map key is a substring
    for key, val in WIKI_TYPE_MAP.items():
        if key in wiki_type or wiki_type in key:
            return val
    print(f"  WARNING: Unknown weapon type \"{wiki_type}\", no category defaults applied")
    return None


def lookup(table: dict, category: str, default=0):
    return table.get(category, default)


# ── Stats builder ─────────────────────────────────────────────────────────────

def build_stats_from_wiki(fields: dict[str, str]) -> dict:
    """Convert wiki infobox fields to our nested schema format, computing derived values."""
    stats = {}
    cat = resolve_category(fields)

    # ── Weight, durability, movement ──
    if "weight" in fields:
        val = parse_number(fields["weight"])
        if val is not None:
            stats["weight"] = val

    if "durability" in fields:
        val = parse_number(fields["durability"])
        if val is not None:
            stats["durability"] = val

    # Movement speed: explicit or category default
    if "movement speed" in fields:
        val = parse_number(fields["movement speed"])
        if val is not None:
            stats["movementPenalty"] = val
    elif cat and cat in MOVEMENT_SPEED and MOVEMENT_SPEED[cat] != 0:
        stats["movementPenalty"] = MOVEMENT_SPEED[cat]

    # ── Collect base damage ──
    damage = {}
    for dtype in DAMAGE_TYPES:
        if dtype in fields:
            val = parse_number(fields[dtype])
            if val is not None and val > 0:
                damage[dtype] = val
    total_damage = sum(damage.values()) if damage else 0
    stagger_damage = sum(damage.get(dt, 0) for dt in STAGGER_DAMAGE_TYPES) if damage else 0

    # ── Primary attack ──
    primary = {}
    if damage:
        primary["damage"] = damage

    if "knockback" in fields:
        val = parse_number(fields["knockback"])
        if val is not None:
            primary["knockback"] = val

    # Backstab: explicit or category default
    if "backstab" in fields:
        val = parse_number(fields["backstab"])
        if val is not None:
            primary["backstab"] = val
    elif cat and cat in BACKSTAB:
        primary["backstab"] = BACKSTAB[cat]

    # Stagger: computed as sum(physical+lightning damage) * stagger_multiplier
    # Summon weapons (blood magic) don't have direct stagger
    if stagger_damage > 0 and cat not in SUMMON_CATEGORIES:
        stagger_mult = STAGGER_MULTIPLIER.get(cat, 1) if cat else 1
        if "staggering" in fields:
            stagger_mult = parse_number(fields["staggering"]) or stagger_mult
        stagger = stagger_damage * stagger_mult
        stagger = int(stagger) if stagger == int(stagger) else stagger
        primary["stagger"] = stagger

    # Stamina
    if "stamina" in fields:
        val = parse_number(fields["stamina"])
        if val is not None:
            primary["stamina"] = val

    # Eitr (staffs)
    if "eitr" in fields:
        val = parse_number(fields["eitr"])
        if val is not None:
            primary["eitr"] = val

    # Health cost (blood magic)
    if "health" in fields:
        val = parse_number(fields["health"])
        if val is not None:
            primary["healthCost"] = val

    # Recoil (crossbows)
    if "recoil" in fields:
        val = parse_number(fields["recoil"])
        if val is not None:
            primary["recoilForce"] = val

    # Adrenaline: explicit or category default
    if "adrenaline" in fields:
        val = parse_number(fields["adrenaline"])
        if val is not None:
            primary["adrenaline"] = val
    elif cat and cat in ADRENALINE:
        primary["adrenaline"] = ADRENALINE[cat]

    if primary:
        stats["primaryAttack"] = primary

    # ── Secondary attack ──
    secondary = {}
    has_secondary = cat and cat not in NO_SECONDARY
    dmg_mult = lookup(DAMAGE_MULT_SECONDARY, cat, 0) if cat else 0

    if has_secondary and dmg_mult > 0 and damage:
        # Secondary damage = primary * multiplier
        sec_damage = {}
        for dtype, val in damage.items():
            sec_val = val * dmg_mult
            sec_val = int(sec_val) if sec_val == int(sec_val) else sec_val
            sec_damage[dtype] = sec_val
        secondary["damage"] = sec_damage

        # Secondary knockback
        kb_mult = lookup(KNOCKBACK_MULT_SECONDARY, cat, 0)
        if "knockback" in fields and kb_mult > 0:
            base_kb = parse_number(fields["knockback"])
            if base_kb:
                sec_kb = base_kb * kb_mult
                sec_kb = int(sec_kb) if sec_kb == int(sec_kb) else sec_kb
                secondary["knockback"] = sec_kb

        # Secondary backstab (same as primary)
        if "backstab" in primary:
            secondary["backstab"] = primary["backstab"]

        # Secondary stagger
        sec_total = sum(sec_damage.values())
        stagger_mult_sec_base = STAGGER_MULT_SECONDARY_BASE.get(cat, 1) if cat else 1
        if "staggering secondary" in fields:
            stagger_mult_sec_base = parse_number(fields["staggering secondary"]) or stagger_mult_sec_base
        # Wiki formula: stagger_secondary = sum(stagger_damage) * stagger_mult_sec_base * dmg_mult
        sec_stagger = stagger_damage * stagger_mult_sec_base * dmg_mult
        sec_stagger = int(sec_stagger) if sec_stagger == int(sec_stagger) else sec_stagger
        secondary["stagger"] = sec_stagger

    # Secondary stamina: explicit or computed
    if "stamina secondary" in fields:
        val = parse_number(fields["stamina secondary"])
        if val is not None:
            secondary["stamina"] = val
    elif has_secondary and "stamina" in fields and cat:
        stam_mult = lookup(STAMINA_MULT_SECONDARY, cat, 0)
        if stam_mult > 0:
            base_stam = parse_number(fields["stamina"])
            if base_stam:
                sec_stam = base_stam * stam_mult
                sec_stam = int(sec_stam) if sec_stam == int(sec_stam) else sec_stam
                secondary["stamina"] = sec_stam

    # Secondary adrenaline
    if has_secondary and cat and cat in ADRENALINE_SECONDARY:
        secondary["adrenaline"] = ADRENALINE_SECONDARY[cat]

    if secondary:
        stats["secondaryAttack"] = secondary

    # ── Blocking ──
    blocking = {}

    # Block armor: explicit or category default
    if "block armor" in fields:
        val = parse_number(fields["block armor"])
        if val is not None:
            blocking["blockArmor"] = val
    elif cat and cat in BLOCK_ARMOR_DEFAULT:
        blocking["blockArmor"] = BLOCK_ARMOR_DEFAULT[cat]

    # Parry block armor: block armor * parry bonus
    parry_bonus = None
    if "parry bonus" in fields:
        parry_bonus = parse_number(fields["parry bonus"])
    elif cat and cat in PARRY_BONUS:
        parry_bonus = PARRY_BONUS[cat]

    if parry_bonus and "blockArmor" in blocking:
        parry_block = blocking["blockArmor"] * parry_bonus
        parry_block = int(parry_block) if parry_block == int(parry_block) else parry_block
        blocking["parryBlockArmor"] = parry_block

    # Block force: explicit or category default
    if "block force" in fields:
        val = parse_number(fields["block force"])
        if val is not None:
            blocking["blockForce"] = val
    elif cat and cat in BLOCK_FORCE_DEFAULT:
        blocking["blockForce"] = BLOCK_FORCE_DEFAULT[cat]

    if parry_bonus is not None:
        blocking["parryBonus"] = parry_bonus

    # Block/parry adrenaline
    has_block = blocking.get("blockArmor", 0) > 0
    if has_block:
        if "adrenaline block" in fields:
            blocking["blockAdrenaline"] = parse_number(fields["adrenaline block"]) or 2
        elif cat and cat in BLOCK_ADRENALINE:
            blocking["blockAdrenaline"] = BLOCK_ADRENALINE[cat]
        else:
            blocking["blockAdrenaline"] = 2

        if "adrenaline parry" in fields:
            blocking["parryAdrenaline"] = parse_number(fields["adrenaline parry"]) or 5
        elif cat and cat in PARRY_ADRENALINE:
            blocking["parryAdrenaline"] = PARRY_ADRENALINE[cat]
        else:
            blocking["parryAdrenaline"] = 5

    if blocking:
        stats["blocking"] = blocking

    return stats


# ── Upgrade stats ─────────────────────────────────────────────────────────────

def compute_upgrade_stats(base_stats: dict, fields: dict[str, str], quality: int) -> dict:
    """Compute sparse overlay for a given quality level."""
    overlay = {}
    level_diff = quality - 1

    # Damage per level
    if "primaryAttack" in base_stats and base_stats["primaryAttack"].get("damage"):
        new_damage = {}
        changed = False
        for dtype, base_val in base_stats["primaryAttack"]["damage"].items():
            per_level_key = f"{dtype}{PER_LEVEL_SUFFIX}"
            if per_level_key in fields:
                per_level = parse_number(fields[per_level_key])
                if per_level is not None and per_level > 0:
                    new_val = base_val + level_diff * per_level
                    new_val = int(new_val) if new_val == int(new_val) else new_val
                    new_damage[dtype] = new_val
                    if new_val != base_val:
                        changed = True
                else:
                    new_damage[dtype] = base_val
            else:
                new_damage[dtype] = base_val
        if changed:
            overlay.setdefault("primaryAttack", {})["damage"] = new_damage

            # Recompute stagger for this quality
            new_stagger_damage = sum(new_damage.get(dt, 0) for dt in STAGGER_DAMAGE_TYPES)
            cat = resolve_category(fields)
            stagger_mult = STAGGER_MULTIPLIER.get(cat, 1) if cat else 1
            new_stagger = new_stagger_damage * stagger_mult
            new_stagger = int(new_stagger) if new_stagger == int(new_stagger) else new_stagger
            base_stagger = base_stats.get("primaryAttack", {}).get("stagger", 0)
            if new_stagger != base_stagger:
                overlay.setdefault("primaryAttack", {})["stagger"] = new_stagger

            # Recompute secondary damage and stagger
            if "secondaryAttack" in base_stats:
                dmg_mult = lookup(DAMAGE_MULT_SECONDARY, cat, 0) if cat else 0
                if dmg_mult > 0:
                    sec_damage = {}
                    for dtype, val in new_damage.items():
                        sec_val = val * dmg_mult
                        sec_val = int(sec_val) if sec_val == int(sec_val) else sec_val
                        sec_damage[dtype] = sec_val
                    base_sec_damage = base_stats.get("secondaryAttack", {}).get("damage", {})
                    if sec_damage != base_sec_damage:
                        overlay.setdefault("secondaryAttack", {})["damage"] = sec_damage

                    # Secondary stagger
                    stagger_mult_sec = STAGGER_MULT_SECONDARY_BASE.get(cat, 1) if cat else 1
                    sec_stagger = new_stagger_damage * stagger_mult_sec * dmg_mult
                    sec_stagger = int(sec_stagger) if sec_stagger == int(sec_stagger) else sec_stagger
                    base_sec_stagger = base_stats.get("secondaryAttack", {}).get("stagger", 0)
                    if sec_stagger != base_sec_stagger:
                        overlay.setdefault("secondaryAttack", {})["stagger"] = sec_stagger

    # Durability per level
    if "durability" in base_stats:
        dur_per_level_key = "durability per level"
        per_level = parse_number(fields.get(dur_per_level_key, "")) or 50
        new_dur = base_stats["durability"] + level_diff * per_level
        new_dur = int(new_dur) if new_dur == int(new_dur) else new_dur
        if new_dur != base_stats["durability"]:
            overlay["durability"] = new_dur

    # Block force per level
    if "blocking" in base_stats and base_stats["blocking"].get("blockForce"):
        cat = resolve_category(fields)
        bf_per_level = parse_number(fields.get("block force per level", ""))
        if bf_per_level is None and cat:
            bf_per_level = BLOCK_FORCE_PER_LEVEL.get(cat, 0)
        if bf_per_level and bf_per_level > 0:
            new_bf = base_stats["blocking"]["blockForce"] + level_diff * bf_per_level
            new_bf = int(new_bf) if new_bf == int(new_bf) else new_bf
            if new_bf != base_stats["blocking"]["blockForce"]:
                overlay.setdefault("blocking", {})["blockForce"] = new_bf

    # Block armor per level
    if "blocking" in base_stats and base_stats["blocking"].get("blockArmor"):
        ba_per_level = parse_number(fields.get("block armor per level", ""))
        if ba_per_level and ba_per_level > 0:
            new_ba = base_stats["blocking"]["blockArmor"] + level_diff * ba_per_level
            new_ba = int(new_ba) if new_ba == int(new_ba) else new_ba
            if new_ba != base_stats["blocking"]["blockArmor"]:
                overlay.setdefault("blocking", {})["blockArmor"] = new_ba
                # Recompute parry block armor
                parry_bonus = base_stats["blocking"].get("parryBonus", 1)
                new_pba = new_ba * parry_bonus
                new_pba = int(new_pba) if new_pba == int(new_pba) else new_pba
                overlay.setdefault("blocking", {})["parryBlockArmor"] = new_pba

    return overlay


# ── YAML manipulation ─────────────────────────────────────────────────────────

def find_recipe_bounds(lines: list[str], weapon_name: str) -> tuple[int, int] | None:
    start = None
    for i, line in enumerate(lines):
        if re.match(r'^  name:\s+', line):
            name_val = line.split(":", 1)[1].strip().strip('"').strip("'")
            try:
                name_val = name_val.encode('utf-8').decode('unicode_escape')
            except (UnicodeDecodeError, UnicodeEncodeError):
                pass
            if name_val.lower() == weapon_name.lower():
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


def format_stats_yaml(stats: dict, indent: int = 2) -> list[str]:
    lines = []
    prefix = " " * indent

    key_order = ["weight", "durability", "movementPenalty", "primaryAttack", "secondaryAttack", "blocking"]

    for key in key_order:
        if key not in stats:
            continue
        val = stats[key]
        if isinstance(val, dict):
            lines.append(f"{prefix}{key}:")
            if key in ("primaryAttack", "secondaryAttack"):
                sub_order = ["damage", "knockback", "backstab", "stagger", "stamina",
                             "staminaPerSecond", "eitr", "healthCost", "adrenaline",
                             "reloadTime", "recoilForce", "projectile", "effect"]
                for skey in sub_order:
                    if skey not in val:
                        continue
                    sval = val[skey]
                    if isinstance(sval, dict):
                        flow = ", ".join(f"{k}: {v}" for k, v in sval.items())
                        lines.append(f"{prefix}  {skey}: {{ {flow} }}")
                    else:
                        lines.append(f"{prefix}  {skey}: {sval}")
            elif key == "blocking":
                sub_order = ["blockArmor", "parryBlockArmor", "blockForce", "parryBonus",
                             "blockAdrenaline", "parryAdrenaline"]
                for skey in sub_order:
                    if skey in val:
                        lines.append(f"{prefix}  {skey}: {val[skey]}")
        else:
            lines.append(f"{prefix}{key}: {val}")

    return lines


def replace_stats_block(lines: list[str], start: int, end: int, new_base_stats: dict, upgrade_overlays: list[dict], station_info: dict | None = None, new_upgrade_lines: list[str] | None = None, max_upgrades: int | None = None) -> list[str]:
    result = []
    i = start
    in_stats = False
    in_upgrades = False
    stats_indent = 0
    wrote_stats = False
    upgrade_idx = -1

    while i < end:
        line = lines[i]
        stripped = line.lstrip()

        # Update base stationLevel (and insert repairLevel if missing)
        if station_info and stripped.startswith("stationLevel:") and not in_upgrades:
            base_sl = station_info.get("baseStationLevel")
            base_rl = station_info.get("baseRepairLevel")
            indent = len(line) - len(stripped)
            if base_sl is not None:
                result.append(f"{' ' * indent}stationLevel: {base_sl}")
            else:
                result.append(line)
            # Check if next line is repairLevel
            if i + 1 < end and lines[i + 1].lstrip().startswith("repairLevel:"):
                # Will be handled by the repairLevel handler below
                pass
            elif base_rl is not None:
                # Insert repairLevel since it's missing
                result.append(f"{' ' * indent}repairLevel: {base_rl}")
            i += 1
            continue

        # Update base repairLevel
        if station_info and stripped.startswith("repairLevel:") and not in_upgrades:
            base_rl = station_info.get("baseRepairLevel")
            if base_rl is not None:
                indent = len(line) - len(stripped)
                result.append(f"{' ' * indent}repairLevel: {base_rl}")
                i += 1
                continue

        if not in_upgrades and stripped.startswith("stats:") and not in_stats:
            in_stats = True
            stats_indent = len(line) - len(stripped)
            result.append(f"{' ' * stats_indent}stats:")
            result.extend(format_stats_yaml(new_base_stats, stats_indent + 2))
            wrote_stats = True
            i += 1
            while i < end:
                next_line = lines[i]
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

                # Skip this entire upgrade if beyond the cap
                if max_upgrades is not None and upgrade_idx >= max_upgrades:
                    i += 1
                    while i < end:
                        uline = lines[i]
                        ustripped = uline.lstrip()
                        uindent = len(uline) - len(ustripped) if ustripped else 999
                        if ustripped.startswith("- quality:") or (ustripped and not ustripped.startswith("-") and uindent <= 4):
                            break
                        i += 1
                    continue

                result.append(line)
                i += 1

                while i < end:
                    uline = lines[i]
                    ustripped = uline.lstrip()
                    uindent = len(uline) - len(ustripped) if ustripped else 999

                    if ustripped.startswith("- quality:") or (ustripped and not ustripped.startswith("-") and uindent <= 4):
                        break

                    # Update stationLevel/repairLevel in upgrades
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

                    if ustripped.startswith("stats:"):
                        stats_base_indent = len(uline) - len(ustripped)
                        i += 1
                        while i < end:
                            nline = lines[i]
                            nstripped = nline.lstrip()
                            nindent = len(nline) - len(nstripped) if nstripped else 999
                            if nstripped and nindent <= stats_base_indent:
                                break
                            i += 1

                        if upgrade_idx < len(upgrade_overlays) and upgrade_overlays[upgrade_idx]:
                            result.append(f"{' ' * stats_base_indent}stats:")
                            result.extend(format_stats_yaml(upgrade_overlays[upgrade_idx], stats_base_indent + 2))
                        continue

                    result.append(uline)
                    i += 1
                continue

            if stripped and not stripped.startswith("-") and not stripped.startswith(" "):
                in_upgrades = False
                result.append(line)
                i += 1
                continue

        if not wrote_stats and (stripped.startswith("upgrades:") or i == end - 1):
            result.append("  stats:")
            result.extend(format_stats_yaml(new_base_stats, 4))
            wrote_stats = True

        result.append(line)
        i += 1

    # Append new upgrade entries (when YAML had none or fewer than wiki)
    if new_upgrade_lines:
        # Add "upgrades:" header if there wasn't one already
        if not any(l.strip().startswith("upgrades:") for l in result):
            result.append("  upgrades:")
        result.extend(new_upgrade_lines)

    return result


def parse_existing_stats(lines: list[str], start: int, end: int) -> dict:
    """Parse existing flat-format stats from YAML to preserve fields wiki doesn't provide."""
    stats = {}
    in_stats = False
    stats_indent = 0

    for i in range(start, end):
        line = lines[i]
        stripped = line.lstrip()
        indent_val = len(line) - len(stripped) if stripped else 999

        if stripped.startswith("stats:") and indent_val == 2:
            in_stats = True
            stats_indent = indent_val
            continue

        if in_stats:
            if stripped and indent_val <= stats_indent:
                break
            m = re.match(r'\s+(\w+):\s+(.*)', line)
            if m:
                key, val = m.group(1), m.group(2).strip()
                if key == "damage":
                    damage = {}
                    for dm in re.finditer(r'(\w+):\s*([\d.]+)', val):
                        damage[dm.group(1)] = parse_number(dm.group(2))
                    stats.setdefault("primaryAttack", {})["damage"] = damage
                elif key in ("knockback", "backstab", "stagger", "stamina"):
                    num = parse_number(val)
                    if num is not None:
                        stats.setdefault("primaryAttack", {})[key] = num
                elif key == "durability":
                    num = parse_number(val)
                    if num is not None:
                        stats["durability"] = num
                elif key == "weight":
                    num = parse_number(val)
                    if num is not None:
                        stats["weight"] = num

    return stats


def merge_stats(wiki_stats: dict, existing_stats: dict) -> dict:
    """Merge wiki stats with existing, preferring wiki values."""
    merged = dict(wiki_stats)

    for section in ("primaryAttack", "secondaryAttack", "blocking"):
        if section in existing_stats:
            if section not in merged:
                merged[section] = dict(existing_stats[section])
            else:
                for key, val in existing_stats[section].items():
                    if key == "damage":
                        continue  # wiki is authoritative for damage
                    if key not in merged[section]:
                        merged[section][key] = val

    for key in ("weight", "durability", "movementPenalty"):
        if key in existing_stats and key not in merged:
            merged[key] = existing_stats[key]

    return merged


# ── Main ──────────────────────────────────────────────────────────────────────

def scrape_weapon(weapon_name: str, dry_run: bool = False) -> bool:
    print(f"\n{'='*60}")
    print(f"Scraping: {weapon_name}")
    print(f"{'='*60}")

    page_title = resolve_page_title(weapon_name)
    if not page_title:
        return False

    wikitext = fetch_wikitext(page_title)
    if not wikitext:
        print(f"  ERROR: Could not fetch wikitext for \"{page_title}\"")
        return False

    fields = extract_infobox_weapon(wikitext)
    if not fields:
        print(f"  ERROR: No {{{{Infobox weapon}}}} found in \"{page_title}\"")
        return False

    print(f"\n  Wiki fields extracted:")
    for k, v in sorted(fields.items()):
        print(f"    {k}: {v}")

    cat = resolve_category(fields)
    if cat:
        print(f"\n  Resolved category: {cat}")

    wiki_stats = build_stats_from_wiki(fields)
    if not wiki_stats:
        print(f"  ERROR: No stats could be extracted")
        return False

    # Fill in missing values from upgrade table (e.g. durability for Trollstav)
    if "durability" not in wiki_stats:
        upgrade_table = extract_upgrade_table_values(wikitext)
        if "durability" in upgrade_table:
            dur_val = parse_number(upgrade_table["durability"][0])
            if dur_val is not None:
                wiki_stats["durability"] = dur_val
                print(f"  Durability from upgrade table: {dur_val}")

    yaml_text = YAML_PATH.read_text(encoding="utf-8")
    yaml_lines = yaml_text.splitlines()

    bounds = find_recipe_bounds(yaml_lines, weapon_name)
    if bounds is None:
        print(f"\n  ERROR: No recipe entry found for \"{weapon_name}\" in crafting.yaml")
        return False

    start, end = bounds
    print(f"  Found recipe at lines {start+1}-{end} in crafting.yaml")

    existing_stats = parse_existing_stats(yaml_lines, start, end)
    base_stats = merge_stats(wiki_stats, existing_stats)

    # Station/repair levels
    station_info = parse_station_levels(wikitext, fields)
    if station_info:
        print(f"\n  Station levels:")
        print(f"    Base: station={station_info.get('baseStationLevel')}, repair={station_info.get('baseRepairLevel')}")
        for idx, ul in enumerate(station_info.get("upgradeLevels", [])):
            print(f"    Q{idx+2}: station={ul['stationLevel']}, repair={ul['repairLevel']}")

    print(f"\n  Base stats (merged):")
    for line in format_stats_yaml(base_stats, 4):
        print(f"  {line}")

    # Compute upgrade overlays
    upgrade_count = sum(1 for line in yaml_lines[start:end] if line.strip().startswith("- quality:"))

    # Parse wiki materials for upgrades
    wiki_materials = extract_materials(wikitext)
    # Determine how many upgrade levels the wiki has (materials 2, 3, 4...)
    wiki_upgrade_count = max((q for q in wiki_materials if q > 1), default=1) - 1

    # Cap upgrades to what's actually available in-game (station max level)
    station_id = None
    for line in yaml_lines[start:end]:
        m = re.match(r'  station:\s+(\S+)', line)
        if m:
            station_id = m.group(1)
            break
    station_name = STATION_ID_TO_NAME.get(station_id, "")
    max_station_level = STATION_MAX_LEVEL.get(station_name, 999)
    base_station = station_info.get("baseStationLevel", 1) if station_info else 1

    # Max quality where station level is still reachable
    max_available_quality = max_station_level - base_station + 1
    max_available_upgrades = max(0, max_available_quality - 1)

    effective_upgrade_count = max(upgrade_count, wiki_upgrade_count)
    if effective_upgrade_count > max_available_upgrades:
        print(f"\n  Capping upgrades: wiki has {effective_upgrade_count} but {station_name} max level is {max_station_level} (only {max_available_upgrades} upgrades available in-game)")
        effective_upgrade_count = max_available_upgrades
        # Also cap station_info upgrade levels
        if station_info and "upgradeLevels" in station_info:
            station_info["upgradeLevels"] = station_info["upgradeLevels"][:effective_upgrade_count]

    upgrade_overlays = []
    for q in range(2, 2 + effective_upgrade_count):
        overlay = compute_upgrade_stats(base_stats, fields, q)
        upgrade_overlays.append(overlay)

    if upgrade_overlays:
        print(f"\n  Upgrade overlays ({effective_upgrade_count} levels):")
        for idx, overlay in enumerate(upgrade_overlays):
            print(f"    Quality {idx+2}:")
            if overlay:
                for line in format_stats_yaml(overlay, 6):
                    print(f"    {line}")
            else:
                print(f"      (no changes from base)")

    # Generate new upgrade entries if YAML has fewer than wiki
    new_upgrade_lines = []
    if effective_upgrade_count > upgrade_count:
        print(f"\n  Generating {effective_upgrade_count - upgrade_count} new upgrade entries (Q{upgrade_count+2}-Q{effective_upgrade_count+1})")
        station_levels = station_info.get("upgradeLevels", []) if station_info else []
        for qi in range(upgrade_count, effective_upgrade_count):
            q = qi + 2  # quality number
            lines = [f"    - quality: {q}"]
            if qi < len(station_levels):
                lines.append(f"      stationLevel: {station_levels[qi]['stationLevel']}")
                lines.append(f"      repairLevel: {station_levels[qi]['repairLevel']}")
            # Ingredients from wiki
            if q in wiki_materials:
                lines.append(f"      ingredients:")
                for ing in wiki_materials[q]:
                    lines.append(f"        - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
            # Stats overlay
            if qi < len(upgrade_overlays) and upgrade_overlays[qi]:
                lines.append(f"      stats:")
                lines.extend(format_stats_yaml(upgrade_overlays[qi], 8))
            new_upgrade_lines.extend(lines)

    old_block = yaml_lines[start:end]
    new_block = replace_stats_block(yaml_lines[start:end], 0, len(old_block), base_stats, upgrade_overlays, station_info, new_upgrade_lines, effective_upgrade_count)

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
    parser = argparse.ArgumentParser(description="Scrape Valheim weapon stats from wiki")
    parser.add_argument("weapon", nargs="?", help="Weapon name to scrape")
    parser.add_argument("--batch", help="File with weapon names (one per line)")
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
            results[name] = scrape_weapon(name, dry_run=args.dry_run)
        print(f"\n{'='*60}")
        print(f"Batch results:")
        for name, ok in results.items():
            print(f"  {name}: {'OK' if ok else 'FAILED'}")
    elif args.weapon:
        ok = scrape_weapon(args.weapon, dry_run=args.dry_run)
        sys.exit(0 if ok else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
