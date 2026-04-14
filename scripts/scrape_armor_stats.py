#!/usr/bin/env python3
"""Scrape armor stats from the Valheim Fandom Wiki and update crafting.yaml.

Usage:
    python scripts/scrape_armor_stats.py "Carapace breastplate"
    python scripts/scrape_armor_stats.py --batch armor_list.txt
    python scripts/scrape_armor_stats.py "Carapace breastplate" --dry-run

The wiki's {{Infobox armor}} template stores armor values, durability, weight,
movement speed penalty, resistances, effects, and set bonuses.

This script:
  - Replaces existing flat `stats:` blocks with `armorStats:` blocks
  - Adds missing items as complete new recipe entries
  - Validates/overwrites ingredients from wiki
  - Computes upgrade overlays (armor and durability per level)

Requires: requests (install in scripts/.venv)
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

# ── Constants ────────────────────────────────────────────────────────────────

STATION_NAME_TO_ID = {
    "workbench": "workbench",
    "forge": "forge",
    "black forge": "black-forge",
    "galdr table": "galdr-table",
    "artisan table": "artisan-table",
}

STATION_ID_TO_NAME = {v: k for k, v in STATION_NAME_TO_ID.items()}

STATION_MAX_LEVEL = {
    "workbench": 5,
    "forge": 7,
    "black forge": 5,
    "galdr table": 4,
    "artisan table": 2,
}

ARMOR_TYPE_TO_TAG = {
    "helmet": "helmet",
    "head": "helmet",
    "chest": "chest",
    "legs": "legs",
    "cape": "cape",
    "cloak": "cape",
    "shoulder": "cape",
}

STATION_BIOME = {
    "workbench": ("meadows", "tier-1"),
    "forge": ("black-forest", "tier-2"),
    "black-forge": ("mistlands", "tier-6"),
    "galdr-table": ("mistlands", "tier-6"),
    "artisan-table": ("plains", "tier-5"),
}

# Defaults for upgrade computation
DEFAULT_ARMOR_PER_LEVEL = 2
DEFAULT_DURABILITY_PER_LEVEL = 200

PER_LEVEL_SUFFIX = " per level"

# Known resistance keywords
RESISTANCE_KEYWORDS = {"resistant", "very resistant", "weak", "very weak", "immune"}

# ── Wiki API helpers ─────────────────────────────────────────────────────────


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
            print(f"  Wiki page resolved: \"{armor_name}\" -> \"{title}\"")
            return title

    print(f"  Wiki page resolved (best guess): \"{armor_name}\" -> \"{results[0]}\"")
    return results[0]


# ── Infobox parser ───────────────────────────────────────────────────────────


def _find_all_infobox_armor_blocks(wikitext: str) -> list[str]:
    """Find all {{infobox armor ...}} blocks using brace-balancing.

    Returns list of content strings (between opening and closing braces).
    Handles {{InfoboxTabber}} pages with multiple armor infoboxes.
    """
    blocks = []
    for start_match in re.finditer(r'\{\{[Ii]nfobox[_ ]armor\s*\n', wikitext):
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
        blocks.append(wikitext[content_start:i])
    return blocks


def _parse_infobox_fields(content: str, include_title: bool = False) -> dict[str, str]:
    """Parse key=value fields from infobox content.

    Handles multi-line values (e.g. resistance field with bullet points on
    continuation lines).
    """
    fields = {}
    skip_keys = {"image", "id", "description", "usage", "appearance"}
    if not include_title:
        skip_keys.add("title")

    # Match field start: | key = value
    # Then capture continuation lines (lines not starting with |) as part of the value
    for line_match in re.finditer(
        r'^\|\s*([^=\n]+?)\s*=\s*(.*?)(?=\n\|\s*[a-z]|\n\}\}|\Z)',
        content, re.MULTILINE | re.DOTALL
    ):
        key = line_match.group(1).strip().lower()
        # Join multi-line value into single string, preserving bullet points
        raw_value = line_match.group(2).strip()
        if key.startswith("materials") or key in skip_keys:
            continue
        if raw_value:
            fields[key] = raw_value

    return fields


def _extract_title(content: str) -> str:
    """Extract the title field from an infobox content block."""
    m = re.search(r'^\|\s*title\s*=\s*(.+)', content, re.MULTILINE)
    return m.group(1).strip() if m else ""


def _select_block_for_name(blocks: list[str], armor_name: str) -> str | None:
    """Select the correct infobox block by matching title to armor name."""
    if not blocks:
        return None
    if len(blocks) == 1:
        return blocks[0]

    # Match by title
    for block in blocks:
        title = _extract_title(block)
        if title.lower() == armor_name.lower():
            return block

    # Fuzzy: check if armor name is contained in title or vice versa
    for block in blocks:
        title = _extract_title(block)
        if armor_name.lower() in title.lower() or title.lower() in armor_name.lower():
            return block

    # Fall back to first block
    return blocks[0]


def extract_infobox_armor(wikitext: str, armor_name: str = "") -> dict[str, str]:
    """Extract fields from {{Infobox armor}} using brace-balancing.

    Handles tabbed pages ({{InfoboxTabber}}) by matching armor_name to the
    title field when multiple infobox blocks exist.
    """
    blocks = _find_all_infobox_armor_blocks(wikitext)
    if not blocks:
        return {}

    block = _select_block_for_name(blocks, armor_name)
    if block is None:
        return {}

    return _parse_infobox_fields(block)


def name_to_item_id(name: str) -> str:
    """Convert a wiki item name to our kebab-case item ID."""
    name = re.sub(r'\[+|\]+', '', name).strip()
    item_id = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return item_id


def extract_materials(wikitext: str, armor_name: str = "") -> dict[int, list[dict]]:
    """Extract materials for each quality level from the infobox."""
    blocks = _find_all_infobox_armor_blocks(wikitext)
    if not blocks:
        return {}

    block = _select_block_for_name(blocks, armor_name)
    if block is None:
        return {}

    content = block
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

        # Also handle non-linked items
        for item_match in re.finditer(r'\*\s*([^[\n]+?)\s+x(\d+)', mat_text):
            raw_name = item_match.group(1).strip()
            if f'[[{raw_name}]]' not in mat_text and '[[' not in raw_name:
                qty = int(item_match.group(2))
                ingredients.append({"itemId": name_to_item_id(raw_name), "qty": qty})

        if ingredients:
            materials[quality] = ingredients

    return materials


def parse_number(value: str) -> float | int | None:
    if not value:
        return None
    cleaned = re.sub(r'[%x\u00d7]', '', value).strip()
    try:
        num = float(cleaned)
        return int(num) if num == int(num) else num
    except (ValueError, OverflowError):
        return None


def parse_station_levels(wikitext: str, fields: dict[str, str]) -> dict:
    """Extract per-quality station and repair levels from the wiki page."""
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


# ── Resistance / effect / set bonus parsing ──────────────────────────────────


def parse_resistances_from_infobox(fields: dict[str, str]) -> dict[str, str]:
    """Parse resistance fields from infobox.

    Handles two formats:
      1. Structured: fire = Resistant, poison = Very resistant
      2. Prose in 'resistance' field: *Resistant vs [[Poison]]
    """
    resistances = {}
    resistance_types = ["fire", "frost", "lightning", "poison", "spirit", "slash", "pierce", "blunt"]

    # Format 1: individual resistance type fields
    for rtype in resistance_types:
        val = fields.get(rtype, "").strip().lower()
        if val and val in RESISTANCE_KEYWORDS:
            resistances[rtype] = val

    # Format 2: prose 'resistance' field like "*Resistant vs [[Poison]]"
    if not resistances:
        res_text = fields.get("resistance", "")
        if res_text:
            # Split on *, <br>, newlines for multiple resistances
            entries = re.split(r'\*|<br\s*/?>|\n', res_text)
            for entry in entries:
                entry = entry.strip()
                if not entry:
                    continue
                # Match patterns like "Resistant vs [[Poison]]" or "Very resistant vs [[Fire]]"
                m = re.match(r'((?:very )?resistant|(?:very )?weak|immune)\s+vs\s+\[\[(\w+)\]\]', entry, re.IGNORECASE)
                if m:
                    level = m.group(1).strip().lower()
                    rtype = m.group(2).strip().lower()
                    if rtype in resistance_types:
                        resistances[rtype] = level

    return resistances


def parse_resistances_from_body(wikitext: str) -> dict[str, str]:
    """Fallback: parse resistances from page body text for edge cases."""
    resistances = {}
    resistance_types = ["fire", "frost", "lightning", "poison", "spirit", "slash", "pierce", "blunt"]

    for rtype in resistance_types:
        # Look for patterns like "Poison: Resistant" or "{{Resistance|poison|resistant}}"
        pattern = rf'\{{\{{[Rr]esistance\|{rtype}\|(\w[\w\s]*?)\}}\}}'
        m = re.search(pattern, wikitext, re.IGNORECASE)
        if m:
            val = m.group(1).strip().lower()
            if val in RESISTANCE_KEYWORDS:
                resistances[rtype] = val

    return resistances


def parse_effects(fields: dict[str, str]) -> list[str]:
    """Parse non-resistance passive effects (e.g. '+25 Eitr', 'Slow fall')."""
    effects = []
    effect_val = fields.get("effect", "").strip()
    if not effect_val:
        effect_val = fields.get("effects", "").strip()
    if not effect_val:
        return effects

    # Split on <br>, <br/>, commas, or newlines
    parts = re.split(r'<br\s*/?>|,|\n', effect_val)
    for part in parts:
        cleaned = re.sub(r'\[\[|\]\]', '', part).strip()
        cleaned = re.sub(r'<[^>]+>', '', cleaned).strip()
        if cleaned and cleaned.lower() not in RESISTANCE_KEYWORDS:
            effects.append(cleaned)

    return effects


def parse_set_bonus(fields: dict[str, str], wikitext: str) -> dict | None:
    """Parse set bonus information.

    Handles formats like:
      set = Root Set
      set pieces = Root Set (3 pieces)
      set size = 3
      set effect = Improved archery
    """
    set_name = fields.get("set", "").strip()
    pieces = None

    # 'set pieces' may contain "SetName (N pieces)" or just a number
    set_pieces_val = fields.get("set pieces", "").strip()
    if set_pieces_val:
        # Try "SetName (N pieces)" format
        m = re.match(r'(.+?)\s*\((\d+)\s*pieces?\)', set_pieces_val, re.IGNORECASE)
        if m:
            if not set_name:
                set_name = m.group(1).strip()
            pieces = int(m.group(2))
        else:
            # Maybe just a number
            num = parse_number(set_pieces_val)
            if num is not None:
                pieces = int(num)
            elif not set_name:
                set_name = set_pieces_val

    if not set_name:
        set_name = fields.get("set name", "").strip()
    if not set_name:
        # Try to find set info in the body text
        m = re.search(r'\{\{[Ss]et\s*\|([^}]+)\}\}', wikitext)
        if m:
            set_name = m.group(1).split("|")[0].strip()

    if not set_name:
        return None

    # Clean wiki markup
    set_name = re.sub(r'\[\[|\]\]', '', set_name).strip()

    set_bonus = {"name": set_name}

    # Parse piece count from 'set size' if not already found
    if pieces is None:
        pieces_val = fields.get("set size", "")
        pieces_num = parse_number(pieces_val)
        if pieces_num is not None:
            pieces = int(pieces_num)

    set_bonus["pieces"] = pieces if pieces is not None else 3  # default

    # Parse set effect
    set_effect = fields.get("set effect", "").strip()
    if not set_effect:
        set_effect = fields.get("set bonus", "").strip()
    if set_effect:
        # Clean wiki links: [[Page|Display]] → Display, [[Page]] → Page
        set_effect = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]+)\]\]', r'\1', set_effect)
        set_effect = re.sub(r'<[^>]+>', '', set_effect).strip()
        # Join multi-line bullet items: "Improved archery\n* +15 Bows" → "Improved archery — +15 Bows"
        lines = [l.strip().lstrip('*').strip() for l in set_effect.splitlines() if l.strip()]
        set_effect = " — ".join(lines) if len(lines) > 1 else lines[0] if lines else set_name
        set_bonus["effect"] = set_effect

    return set_bonus


# ── Stats builder ────────────────────────────────────────────────────────────


def build_armor_stats_from_wiki(fields: dict[str, str], wikitext: str) -> dict:
    """Convert wiki infobox fields to armorStats format."""
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
        if val is not None:
            stats["movementPenalty"] = val
    elif "speed" in fields:
        val = parse_number(fields["speed"])
        if val is not None:
            stats["movementPenalty"] = val

    # Resistances: try infobox first, then body text fallback
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
    set_bonus = parse_set_bonus(fields, wikitext)
    if set_bonus:
        stats["setBonus"] = set_bonus

    return stats


# ── Upgrade stats ────────────────────────────────────────────────────────────


def compute_upgrade_armor_stats(base_stats: dict, fields: dict[str, str], quality: int) -> dict:
    """Compute sparse overlay for a given quality level (armor and durability only)."""
    overlay = {}
    level_diff = quality - 1

    # Armor per level
    if "armor" in base_stats:
        armor_per_level_key = "armor per level"
        per_level = parse_number(fields.get(armor_per_level_key, ""))
        if per_level is None:
            per_level = DEFAULT_ARMOR_PER_LEVEL
        new_armor = base_stats["armor"] + level_diff * per_level
        new_armor = int(new_armor) if new_armor == int(new_armor) else new_armor
        if new_armor != base_stats["armor"]:
            overlay["armor"] = new_armor

    # Durability per level
    if "durability" in base_stats:
        dur_per_level_key = "durability per level"
        per_level = parse_number(fields.get(dur_per_level_key, ""))
        if per_level is None:
            per_level = DEFAULT_DURABILITY_PER_LEVEL
        new_dur = base_stats["durability"] + level_diff * per_level
        new_dur = int(new_dur) if new_dur == int(new_dur) else new_dur
        if new_dur != base_stats["durability"]:
            overlay["durability"] = new_dur

    return overlay


# ── YAML manipulation ────────────────────────────────────────────────────────


def find_recipe_bounds(lines: list[str], armor_name: str) -> tuple[int, int] | None:
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
    """Format armorStats dict as YAML lines."""
    lines = []
    prefix = " " * indent

    key_order = ["armor", "durability", "weight", "movementPenalty",
                 "resistances", "effects", "setBonus"]

    for key in key_order:
        if key not in stats:
            continue
        val = stats[key]
        if key == "resistances" and isinstance(val, dict):
            flow = ", ".join(f"{k}: {v}" for k, v in val.items())
            lines.append(f"{prefix}{key}: {{ {flow} }}")
        elif key == "effects" and isinstance(val, list):
            for effect in val:
                lines.append(f'{prefix}  - "{effect}"')
            # Prepend the key header
            lines.insert(len(lines) - len(val), f"{prefix}effects:")
            # Remove the duplicate — actually let's redo this properly
            pass
        elif key == "setBonus" and isinstance(val, dict):
            lines.append(f"{prefix}setBonus:")
            if "name" in val:
                lines.append(f'{prefix}  name: "{val["name"]}"')
            if "pieces" in val:
                lines.append(f'{prefix}  pieces: {val["pieces"]}')
            if "effect" in val:
                lines.append(f'{prefix}  effect: "{val["effect"]}"')
        else:
            lines.append(f"{prefix}{key}: {val}")

    return lines


def _format_armor_stats_yaml(stats: dict, indent: int = 2) -> list[str]:
    """Format armorStats dict as YAML lines (clean implementation)."""
    lines = []
    prefix = " " * indent

    # Simple scalar keys
    for key in ["armor", "durability", "weight", "movementPenalty"]:
        if key in stats:
            lines.append(f"{prefix}{key}: {stats[key]}")

    # Resistances as flow mapping
    if "resistances" in stats:
        flow = ", ".join(f"{k}: {v}" for k, v in stats["resistances"].items())
        lines.append(f"{prefix}resistances: {{ {flow} }}")

    # Effects as list
    if "effects" in stats:
        lines.append(f"{prefix}effects:")
        for effect in stats["effects"]:
            lines.append(f'{prefix}  - "{effect}"')

    # Set bonus as nested mapping
    if "setBonus" in stats:
        val = stats["setBonus"]
        lines.append(f"{prefix}setBonus:")
        if "name" in val:
            lines.append(f'{prefix}  name: "{val["name"]}"')
        if "pieces" in val:
            lines.append(f'{prefix}  pieces: {val["pieces"]}')
        if "effect" in val:
            lines.append(f'{prefix}  effect: "{val["effect"]}"')

    return lines


# Use the clean implementation
format_armor_stats_yaml = _format_armor_stats_yaml


def replace_stats_with_armor_stats(lines: list[str], start: int, end: int,
                                    new_base_stats: dict, upgrade_overlays: list[dict],
                                    station_info: dict | None = None,
                                    new_upgrade_lines: list[str] | None = None,
                                    max_upgrades: int | None = None,
                                    wiki_materials: dict | None = None) -> list[str]:
    """Replace stats: blocks with armorStats: blocks in a recipe."""
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

        # Update base stationLevel
        if station_info and stripped.startswith("stationLevel:") and not in_upgrades:
            base_sl = station_info.get("baseStationLevel")
            base_rl = station_info.get("baseRepairLevel")
            indent_val = len(line) - len(stripped)
            if base_sl is not None:
                result.append(f"{' ' * indent_val}stationLevel: {base_sl}")
            else:
                result.append(line)
            if i + 1 < end and lines[i + 1].lstrip().startswith("repairLevel:"):
                pass
            elif base_rl is not None:
                result.append(f"{' ' * indent_val}repairLevel: {base_rl}")
            i += 1
            continue

        # Update base repairLevel
        if station_info and stripped.startswith("repairLevel:") and not in_upgrades:
            base_rl = station_info.get("baseRepairLevel")
            if base_rl is not None:
                indent_val = len(line) - len(stripped)
                result.append(f"{' ' * indent_val}repairLevel: {base_rl}")
                i += 1
                continue

        # Replace stats: with armorStats:
        if not in_upgrades and (stripped.startswith("stats:") or stripped.startswith("armorStats:")) and not in_stats:
            in_stats = True
            stats_indent = len(line) - len(stripped)
            result.append(f"{' ' * stats_indent}armorStats:")
            result.extend(format_armor_stats_yaml(new_base_stats, stats_indent + 2))
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

                    # Replace stats:/armorStats: in upgrade blocks
                    if ustripped.startswith("stats:") or ustripped.startswith("armorStats:"):
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
                            result.append(f"{' ' * stats_base_indent}armorStats:")
                            result.extend(format_armor_stats_yaml(upgrade_overlays[upgrade_idx], stats_base_indent + 2))
                        continue

                    # Update ingredients from wiki if available
                    if wiki_materials and ustripped.startswith("ingredients:"):
                        quality = upgrade_idx + 2
                        if quality in wiki_materials:
                            result.append(uline)  # keep "ingredients:" line
                            i += 1
                            # Skip old ingredient lines
                            while i < end:
                                nline = lines[i]
                                nstripped = nline.lstrip()
                                nindent = len(nline) - len(nstripped) if nstripped else 999
                                if nstripped and not nstripped.startswith("- {"):
                                    break
                                i += 1
                            # Write new ingredients
                            for ing in wiki_materials[quality]:
                                result.append(f"        - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
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
            result.append("  armorStats:")
            result.extend(format_armor_stats_yaml(new_base_stats, 4))
            wrote_stats = True

        result.append(line)
        i += 1

    # Append new upgrade entries
    if new_upgrade_lines:
        if not any(l.strip().startswith("upgrades:") for l in result):
            result.append("  upgrades:")
        result.extend(new_upgrade_lines)

    return result


def generate_new_recipe(armor_name: str, item_id: str, station_id: str,
                        base_stats: dict, materials: dict,
                        upgrade_overlays: list[dict],
                        station_info: dict, fields: dict[str, str]) -> list[str]:
    """Generate a complete new recipe entry for an armor item."""
    lines = []

    # Determine armor type tag
    armor_type = fields.get("type", "").strip().lower()
    tag = ARMOR_TYPE_TO_TAG.get(armor_type, "armor")

    # Biome/tier tag
    biome_info = STATION_BIOME.get(station_id, ("meadows", "tier-1"))
    tier_tag = biome_info[1]

    lines.append(f"- id: {item_id}")
    lines.append(f"  name: {armor_name}")
    lines.append(f"  type: crafting")
    lines.append(f"  station: {station_id}")
    if station_info.get("baseStationLevel"):
        lines.append(f"  stationLevel: {station_info['baseStationLevel']}")
    if station_info.get("baseRepairLevel"):
        lines.append(f"  repairLevel: {station_info['baseRepairLevel']}")

    # Base ingredients
    if 1 in materials:
        lines.append(f"  ingredients:")
        for ing in materials[1]:
            lines.append(f"    - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")

    lines.append(f"  yields: {{ itemId: {item_id}, qty: 1 }}")
    lines.append(f"  tags: [{tag}, armor, {tier_tag}]")

    # armorStats
    lines.append(f"  armorStats:")
    lines.extend(format_armor_stats_yaml(base_stats, 4))

    # Upgrades
    if upgrade_overlays:
        lines.append(f"  upgrades:")
        station_levels = station_info.get("upgradeLevels", [])
        for qi, overlay in enumerate(upgrade_overlays):
            q = qi + 2
            lines.append(f"    - quality: {q}")
            if qi < len(station_levels):
                lines.append(f"      stationLevel: {station_levels[qi]['stationLevel']}")
                lines.append(f"      repairLevel: {station_levels[qi]['repairLevel']}")
            if q in materials:
                lines.append(f"      ingredients:")
                for ing in materials[q]:
                    lines.append(f"        - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
            if overlay:
                lines.append(f"      armorStats:")
                lines.extend(format_armor_stats_yaml(overlay, 8))

    return lines


# ── Main ─────────────────────────────────────────────────────────────────────


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

    fields = extract_infobox_armor(wikitext, armor_name)
    if not fields:
        print(f"  ERROR: No {{{{Infobox armor}}}} found in \"{page_title}\"")
        return False

    print(f"\n  Wiki fields extracted:")
    for k, v in sorted(fields.items()):
        print(f"    {k}: {v}")

    wiki_stats = build_armor_stats_from_wiki(fields, wikitext)
    if not wiki_stats:
        print(f"  ERROR: No stats could be extracted")
        return False

    print(f"\n  Base armorStats:")
    for line in format_armor_stats_yaml(wiki_stats, 4):
        print(f"  {line}")

    # Extract materials
    wiki_materials = extract_materials(wikitext, armor_name)
    if wiki_materials:
        print(f"\n  Materials from wiki:")
        for q, ings in sorted(wiki_materials.items()):
            ing_strs = [f"{i['itemId']} x{i['qty']}" for i in ings]
            print(f"    Q{q}: {', '.join(ing_strs)}")

    # Station/repair levels
    station_info = parse_station_levels(wikitext, fields)
    if station_info:
        print(f"\n  Station levels:")
        print(f"    Base: station={station_info.get('baseStationLevel')}, repair={station_info.get('baseRepairLevel')}")
        for idx, ul in enumerate(station_info.get("upgradeLevels", [])):
            print(f"    Q{idx+2}: station={ul['stationLevel']}, repair={ul['repairLevel']}")

    yaml_text = YAML_PATH.read_text(encoding="utf-8")
    yaml_lines = yaml_text.splitlines()

    bounds = find_recipe_bounds(yaml_lines, armor_name)

    if bounds is None:
        # Item not in crafting.yaml — generate a new entry
        print(f"\n  No existing recipe found. Generating new entry...")

        item_id = name_to_item_id(armor_name)

        # Resolve station
        # "source" field contains wiki link like "[[Black forge]]"
        source_raw = fields.get("source", "")
        station_wiki = re.sub(r'\[+|\]+', '', source_raw).strip().lower()
        station_id = STATION_NAME_TO_ID.get(station_wiki, "workbench")

        if not station_info:
            station_info = {"baseStationLevel": 1, "baseRepairLevel": 1, "upgradeLevels": []}

        # Compute upgrade overlays
        wiki_upgrade_count = max((q for q in wiki_materials if q > 1), default=1) - 1 if wiki_materials else 0
        max_station_name = STATION_ID_TO_NAME.get(station_id, "workbench")
        max_station_level = STATION_MAX_LEVEL.get(max_station_name, 999)
        base_station = station_info.get("baseStationLevel", 1)
        max_available_upgrades = max(0, max_station_level - base_station)

        effective_upgrade_count = min(wiki_upgrade_count, max_available_upgrades) if wiki_upgrade_count > 0 else max_available_upgrades
        # Only create upgrades if wiki has materials for them or station supports them
        if wiki_upgrade_count > 0:
            effective_upgrade_count = min(wiki_upgrade_count, max_available_upgrades)
        else:
            effective_upgrade_count = 0

        upgrade_overlays = []
        for q in range(2, 2 + effective_upgrade_count):
            overlay = compute_upgrade_armor_stats(wiki_stats, fields, q)
            upgrade_overlays.append(overlay)

        if station_info and "upgradeLevels" in station_info:
            station_info["upgradeLevels"] = station_info["upgradeLevels"][:effective_upgrade_count]

        new_lines = generate_new_recipe(armor_name, item_id, station_id,
                                        wiki_stats, wiki_materials,
                                        upgrade_overlays, station_info, fields)

        print(f"\n  New recipe entry:")
        for line in new_lines:
            print(f"    {line}")

        if dry_run:
            print(f"\n  DRY RUN -- no changes written.")
        else:
            # Append to end of file
            yaml_lines.append("")
            yaml_lines.extend(new_lines)
            YAML_PATH.write_text("\n".join(yaml_lines) + "\n", encoding="utf-8")
            print(f"\n  Appended new entry to crafting.yaml")

        return True

    start, end = bounds
    print(f"  Found recipe at lines {start+1}-{end} in crafting.yaml")

    # Compute upgrade overlays
    upgrade_count = sum(1 for line in yaml_lines[start:end] if line.strip().startswith("- quality:"))
    wiki_upgrade_count = max((q for q in wiki_materials if q > 1), default=1) - 1 if wiki_materials else 0

    # Cap upgrades to station max level
    station_id = None
    for line in yaml_lines[start:end]:
        m = re.match(r'  station:\s+(\S+)', line)
        if m:
            station_id = m.group(1)
            break
    station_name = STATION_ID_TO_NAME.get(station_id, "")
    max_station_level = STATION_MAX_LEVEL.get(station_name, 999)
    base_station = station_info.get("baseStationLevel", 1) if station_info else 1

    max_available_quality = max_station_level - base_station + 1
    max_available_upgrades = max(0, max_available_quality - 1)

    effective_upgrade_count = max(upgrade_count, wiki_upgrade_count)
    if effective_upgrade_count > max_available_upgrades:
        print(f"\n  Capping upgrades: wiki has {effective_upgrade_count} but {station_name} max level is {max_station_level} (only {max_available_upgrades} upgrades available in-game)")
        effective_upgrade_count = max_available_upgrades
        if station_info and "upgradeLevels" in station_info:
            station_info["upgradeLevels"] = station_info["upgradeLevels"][:effective_upgrade_count]

    upgrade_overlays = []
    for q in range(2, 2 + effective_upgrade_count):
        overlay = compute_upgrade_armor_stats(wiki_stats, fields, q)
        upgrade_overlays.append(overlay)

    if upgrade_overlays:
        print(f"\n  Upgrade overlays ({effective_upgrade_count} levels):")
        for idx, overlay in enumerate(upgrade_overlays):
            print(f"    Quality {idx+2}:")
            if overlay:
                for line in format_armor_stats_yaml(overlay, 6):
                    print(f"    {line}")
            else:
                print(f"      (no changes from base)")

    # Generate new upgrade entries if YAML has fewer than wiki
    new_upgrade_lines = []
    if effective_upgrade_count > upgrade_count:
        print(f"\n  Generating {effective_upgrade_count - upgrade_count} new upgrade entries (Q{upgrade_count+2}-Q{effective_upgrade_count+1})")
        station_levels = station_info.get("upgradeLevels", []) if station_info else []
        for qi in range(upgrade_count, effective_upgrade_count):
            q = qi + 2
            ulines = [f"    - quality: {q}"]
            if qi < len(station_levels):
                ulines.append(f"      stationLevel: {station_levels[qi]['stationLevel']}")
                ulines.append(f"      repairLevel: {station_levels[qi]['repairLevel']}")
            if q in wiki_materials:
                ulines.append(f"      ingredients:")
                for ing in wiki_materials[q]:
                    ulines.append(f"        - {{ itemId: {ing['itemId']}, qty: {ing['qty']} }}")
            if qi < len(upgrade_overlays) and upgrade_overlays[qi]:
                ulines.append(f"      armorStats:")
                ulines.extend(format_armor_stats_yaml(upgrade_overlays[qi], 8))
            new_upgrade_lines.extend(ulines)

    old_block = yaml_lines[start:end]
    new_block = replace_stats_with_armor_stats(
        yaml_lines[start:end], 0, len(old_block),
        wiki_stats, upgrade_overlays, station_info,
        new_upgrade_lines, effective_upgrade_count, wiki_materials
    )

    diff = list(difflib.unified_diff(
        old_block, new_block,
        fromfile="crafting.yaml (before)",
        tofile="crafting.yaml (after)",
        lineterm="",
    ))

    if not diff:
        print("\n  No changes needed -- stats already match.")
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
        print(f"\n  DRY RUN -- no changes written.")
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
