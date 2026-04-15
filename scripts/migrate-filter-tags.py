#!/usr/bin/env python3
"""Migrate recipe YAML tags for filter redesign."""

import sys
from pathlib import Path

try:
    from ruamel.yaml import YAML
except ImportError:
    print("Install ruamel.yaml: pip install ruamel.yaml")
    sys.exit(1)

yaml = YAML()
yaml.preserve_quotes = True
yaml.width = 200

DATA_DIR = Path(__file__).parent.parent / "src" / "data" / "recipes"

MELEE_SUBTYPES = {'sword', 'axe', 'mace', 'fists', 'knife', 'spear', 'pickaxe', 'atgeir', 'club', 'battleaxe', 'sledge'}
RANGED_SUBTYPES = {'bow', 'crossbow', 'staff'}
AMMO_SUBTYPES = {'arrow', 'bolt', 'missile'}

TAG_RENAMES = {
    'club': 'mace',
    'battleaxe': 'axe',
    'sledge': 'mace',
    'tower-shield': 'tower',
    'building': 'build',
    'one-handed': '1h',
    'two-handed': '2h',
}

MEAD_TAG_MAP = {
    'instant-heal': 'healing',
    'instant-stamina': 'stamina',
    'instant-eitr': 'eitr',
    'regen': None,
    'resistance': 'resistance',
    'utility': 'utility',
}

BUTCHER_KNIFE_ID = 'butcher-knife'


def get_tags(recipe):
    if 'tags' not in recipe or recipe['tags'] is None:
        recipe['tags'] = []
    return recipe['tags']


def has_tag(tags, tag):
    return tag in tags


def add_tag(tags, tag, position=None):
    if tag not in tags:
        if position is not None:
            tags.insert(position, tag)
        else:
            tags.append(tag)


def remove_tag(tags, tag):
    while tag in tags:
        tags.remove(tag)


def rename_tags(tags):
    for i, tag in enumerate(list(tags)):
        if tag in TAG_RENAMES:
            tags[i] = TAG_RENAMES[tag]


def resolve_mead_regen(recipe):
    name = recipe.get('name', '').lower()
    mead = recipe.get('mead', {})
    effect = mead.get('effect', {}) if mead else {}

    if 'healing' in name or 'heal' in name:
        return 'healing'
    if 'stamina' in name:
        return 'stamina'
    if 'eitr' in name:
        return 'eitr'

    if effect:
        if effect.get('healthRegen') or effect.get('health'):
            return 'healing'
        if effect.get('staminaRegen') or effect.get('stamina'):
            return 'stamina'
        if effect.get('eitrRegen') or effect.get('eitr'):
            return 'eitr'

    return 'utility'


def determine_food_stat_focus(recipe):
    tags = get_tags(recipe)

    for st in ['hp', 'stamina', 'eitr', 'balanced']:
        if has_tag(tags, st):
            return st

    if has_tag(tags, 'sustain'):
        return 'balanced'

    food = recipe.get('food', {})
    if not food:
        return 'balanced'

    hp = food.get('hp', 0) or 0
    stam = food.get('stamina', 0) or 0
    eitr_val = food.get('eitr', 0) or 0

    if eitr_val > 0 and eitr_val >= hp and eitr_val >= stam:
        return 'eitr'

    total = hp + stam + eitr_val
    if total == 0:
        return 'balanced'

    hp_ratio = hp / total if total > 0 else 0
    stam_ratio = stam / total if total > 0 else 0

    if hp > 0 and stam > 0 and hp_ratio < 0.65 and stam_ratio < 0.65:
        return 'balanced'

    if hp >= stam:
        return 'hp'
    return 'stamina'


def migrate_recipe(recipe, filename):
    tags = get_tags(recipe)
    recipe_id = recipe.get('id', 'unknown')

    rename_tags(tags)

    if has_tag(tags, 'weapon'):
        remove_tag(tags, 'weapon')
        is_ranged = any(has_tag(tags, t) for t in RANGED_SUBTYPES)
        add_tag(tags, 'ranged' if is_ranged else 'melee', position=0)

    if has_tag(tags, 'atgeir') and not has_tag(tags, 'melee') and not has_tag(tags, 'ranged'):
        add_tag(tags, 'melee', position=0)

    if any(has_tag(tags, t) for t in AMMO_SUBTYPES) and not has_tag(tags, 'ammo'):
        add_tag(tags, 'ammo', position=0)

    if has_tag(tags, 'bomb') and not has_tag(tags, 'ammo'):
        add_tag(tags, 'ammo', position=0)

    if has_tag(tags, 'feast') and not has_tag(tags, 'food'):
        add_tag(tags, 'food', position=0)

    if has_tag(tags, 'bait') and not has_tag(tags, 'tool'):
        add_tag(tags, 'tool', position=0)

    if has_tag(tags, 'station-upgrade') and not has_tag(tags, 'build'):
        add_tag(tags, 'build', position=0)

    if has_tag(tags, 'material') and not any(has_tag(tags, c) for c in ['melee', 'ranged', 'ammo', 'armor', 'tool', 'build', 'food', 'mead']):
        add_tag(tags, 'tool', position=0)

    classification_tags = {'melee', 'ranged', 'ammo', 'armor', 'tool', 'build', 'food', 'mead'}
    if not any(has_tag(tags, c) for c in classification_tags):
        add_tag(tags, 'tool', position=0)

    if recipe_id == BUTCHER_KNIFE_ID:
        remove_tag(tags, 'melee')
        if not has_tag(tags, 'tool'):
            add_tag(tags, 'tool', position=0)

    # === Pickaxes → tool (not melee weapons) ===
    if has_tag(tags, 'pickaxe'):
        remove_tag(tags, 'melee')
        if not has_tag(tags, 'tool'):
            add_tag(tags, 'tool', position=0)

    if has_tag(tags, 'mead'):
        for old_tag, new_tag in MEAD_TAG_MAP.items():
            if has_tag(tags, old_tag):
                remove_tag(tags, old_tag)
                if new_tag is None:
                    resolved = resolve_mead_regen(recipe)
                    add_tag(tags, resolved)
                else:
                    add_tag(tags, new_tag)

    if has_tag(tags, 'food'):
        stat = determine_food_stat_focus(recipe)
        remove_tag(tags, 'sustain')
        add_tag(tags, stat)

    if has_tag(tags, 'food'):
        food_subtypes = {'raw', 'cooked', 'baked', 'feast'}
        if not any(has_tag(tags, s) for s in food_subtypes):
            add_tag(tags, 'cooked')

    if has_tag(tags, 'raw') and has_tag(tags, 'food'):
        add_tag(tags, 'found')

    biome = recipe.get('biome')
    if biome:
        biome_str = str(biome)
        add_tag(tags, biome_str)
        del recipe['biome']

    seen = set()
    deduped = []
    for t in tags:
        if t not in seen:
            seen.add(t)
            deduped.append(t)
    tags.clear()
    tags.extend(deduped)


def migrate_file(filepath):
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
