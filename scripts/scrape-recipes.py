#!/usr/bin/env python3
"""
scrape-recipes.py — Compares local YAML recipe data against hardcoded known-good
Valheim game data and produces a markdown diff report at docs/recipe-diff-report.md.

Does NOT fetch from the wiki at runtime. Uses authoritative hardcoded dictionaries.
"""

import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("PyYAML not installed. Run: pip install pyyaml")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "src" / "data"
ITEMS_YAML = DATA_DIR / "items.yaml"
STATIONS_YAML = DATA_DIR / "stations.yaml"
CRAFTING_YAML = DATA_DIR / "recipes" / "crafting.yaml"
COOKING_YAML = DATA_DIR / "recipes" / "cooking.yaml"
REPORT_PATH = REPO_ROOT / "docs" / "recipe-diff-report.md"

# ---------------------------------------------------------------------------
# Known-good data (authoritative Valheim values)
# ---------------------------------------------------------------------------

# Recipes that produce more than 1 item. Key = recipe id, value = expected qty.
KNOWN_YIELDS: dict[str, int] = {
    # Arrows (all yield 20)
    "wood-arrow": 20,
    "flinthead-arrow": 20,
    "fire-arrow": 20,
    "bronzehead-arrow": 20,
    "ironhead-arrow": 20,
    "silver-arrow": 20,
    "obsidian-arrow": 20,
    "poison-arrow": 20,
    "frost-arrow": 20,
    "carapace-arrow": 20,
    "charred-arrow": 20,
    # Bolts (all yield 20 except ballista-bolt)
    "iron-bolt": 20,
    "bone-bolt": 20,
    "black-metal-bolt": 20,
    "carapace-bolt": 20,
    "charred-bolt": 20,
    "ballista-bolt": 20,
    # Food
    "queens-jam": 4,
    "boar-jerky": 2,
    "sausages": 4,
    "wolf-jerky": 2,
    "salad": 3,
}

# Expected stack sizes per item id.
KNOWN_STACK_SIZES: dict[str, int] = {
    # Metals / ores
    "copper": 30,
    "tin": 30,
    "bronze": 30,
    "iron": 30,
    "silver": 30,
    "black-metal": 30,
    "flametal": 30,
    # Wood & organic materials
    "wood": 50,
    "fine-wood": 50,
    "core-wood": 50,
    "yggdrasil-wood": 50,
    "ancient-bark": 50,
    "stone": 50,
    "flint": 50,
    "obsidian": 50,
    "coal": 50,
    "resin": 50,
    "guck": 50,
    "sap": 50,
    "crystal": 50,
    "bone-fragments": 50,
    "black-marble": 50,
    "charred-bone": 50,
    "carapace": 50,
    "mandible": 50,
    # Hides / pelts / leather
    "leather-scraps": 50,
    "deer-hide": 50,
    "troll-hide": 50,
    "wolf-pelt": 50,
    "lox-pelt": 50,
    "feathers": 50,
    "linen-thread": 50,
    "flax": 50,
    "barley": 50,
    # Nails
    "bronze-nails": 100,
    "iron-nails": 100,
    # Arrows & bolts
    "wood-arrow": 100,
    "flinthead-arrow": 100,
    "fire-arrow": 100,
    "bronzehead-arrow": 100,
    "ironhead-arrow": 100,
    "silver-arrow": 100,
    "obsidian-arrow": 100,
    "poison-arrow": 100,
    "frost-arrow": 100,
    "carapace-arrow": 100,
    "charred-arrow": 100,
    "iron-bolt": 100,
    "bone-bolt": 100,
    "black-metal-bolt": 100,
    "carapace-bolt": 100,
    "charred-bolt": 100,
    "ballista-bolt": 50,
    # Raw meats
    "boar-meat": 20,
    "deer-meat": 20,
    "neck-tail": 20,
    "fish-raw": 20,
    "wolf-meat": 20,
    "serpent-meat": 20,
    "lox-meat": 20,
    "seeker-meat": 20,
    "charred-meat": 20,
    # Foraging ingredients (berries, mushrooms, vegetables)
    "raspberries": 50,
    "blueberries": 50,
    "cloudberries": 50,
    "honey": 50,
    "mushroom": 50,
    "yellow-mushroom": 50,
    "jotun-puffs": 50,
    "magecap": 50,
    "fiddlehead": 50,
    "vineberry-cluster": 50,
    "carrot": 50,
    "turnip": 50,
    "onion": 50,
    "thistle": 50,
    "dandelion": 50,
    "royal-jelly": 50,
    "entrails": 50,
    "bloodbag": 50,
    "ooze": 50,
    # Misc ingredients
    "barley-flour": 20,
    # Food items (cooked)
    "queens-jam": 10,
    "carrot-soup": 10,
    "turnip-stew": 10,
    "boar-jerky": 10,
    "deer-stew": 10,
    "minced-meat-sauce": 10,
    "sausages": 10,
    "serpent-stew": 10,
    "onion-soup": 10,
    "eyescream": 10,
    "wolf-jerky": 10,
    "wolf-skewer": 10,
    "blood-pudding": 10,
    "fish-wraps": 10,
    "salad": 10,
    "mushroom-omelette": 10,
    "fiery-svinstew": 10,
    "seeker-aspic": 10,
    # Trophies
    "deer-trophy": 20,
    "draugr-elite-trophy": 20,
    "drake-trophy": 20,
    # Misc special items
    "ymir-flesh": 20,
    "freeze-gland": 20,
    "wolf-fang": 20,
    "hard-antler": 20,
    "serpent-scale": 20,
    "needle": 20,
    "chain": 20,
    "dvergr-needle": 20,
    "morgen-heart": 20,
    "bilebag": 20,
    "refined-eitr": 20,
}

# Known mead recipes. Each dict mirrors the expected RecipeSchema structure.
KNOWN_MEADS: list[dict] = [
    {
        "id": "minor-healing-mead",
        "stationLevel": 1,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "blueberries", "qty": 5},
            {"itemId": "raspberries", "qty": 10},
            {"itemId": "dandelion", "qty": 1},
        ],
    },
    {
        "id": "medium-healing-mead",
        "stationLevel": 2,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "bloodbag", "qty": 4},
            {"itemId": "raspberries", "qty": 10},
            {"itemId": "dandelion", "qty": 1},
        ],
    },
    {
        "id": "major-healing-mead",
        "stationLevel": 5,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "bloodbag", "qty": 4},
            {"itemId": "royal-jelly", "qty": 2},
            {"itemId": "dandelion", "qty": 1},
        ],
    },
    {
        "id": "minor-stamina-mead",
        "stationLevel": 1,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "raspberries", "qty": 10},
            {"itemId": "yellow-mushroom", "qty": 10},
        ],
    },
    {
        "id": "medium-stamina-mead",
        "stationLevel": 2,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "cloudberries", "qty": 10},
            {"itemId": "yellow-mushroom", "qty": 10},
        ],
    },
    {
        "id": "major-stamina-mead",
        "stationLevel": 5,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "cloudberries", "qty": 10},
            {"itemId": "yellow-mushroom", "qty": 10},
            {"itemId": "jotun-puffs", "qty": 3},
        ],
    },
    {
        "id": "poison-resistance-mead",
        "stationLevel": 1,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "thistle", "qty": 5},
            {"itemId": "neck-tail", "qty": 1},
            {"itemId": "coal", "qty": 10},
        ],
    },
    {
        "id": "frost-resistance-mead",
        "stationLevel": 2,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "thistle", "qty": 5},
            {"itemId": "bloodbag", "qty": 2},
            {"itemId": "freeze-gland", "qty": 1},
        ],
    },
    {
        "id": "tasty-mead",
        "stationLevel": 1,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "honey", "qty": 10},
            {"itemId": "raspberries", "qty": 10},
            {"itemId": "blueberries", "qty": 5},
        ],
    },
    {
        "id": "fire-resistance-barley-wine",
        "stationLevel": 4,
        "yield": 6,
        "mead": {"fermentDuration": 2400},
        "ingredients": [
            {"itemId": "barley", "qty": 10},
            {"itemId": "cloudberries", "qty": 10},
        ],
    },
]

# ---------------------------------------------------------------------------
# Loader helpers
# ---------------------------------------------------------------------------


def load_yaml(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, list) else []


def load_all_recipes() -> list[dict]:
    recipes: list[dict] = []
    recipes.extend(load_yaml(CRAFTING_YAML))
    recipes.extend(load_yaml(COOKING_YAML))
    return recipes


# ---------------------------------------------------------------------------
# Comparison logic
# ---------------------------------------------------------------------------


def check_yields(recipes: list[dict]) -> list[str]:
    """Return lines describing yield gaps."""
    recipe_map = {r["id"]: r for r in recipes if "id" in r}
    lines: list[str] = []

    for recipe_id, expected_qty in sorted(KNOWN_YIELDS.items()):
        if recipe_id not in recipe_map:
            lines.append(
                f"| `{recipe_id}` | recipe missing entirely | — | {expected_qty} |"
            )
            continue
        recipe = recipe_map[recipe_id]
        yields = recipe.get("yields")
        actual_qty = yields.get("qty") if isinstance(yields, dict) else None
        if actual_qty is None:
            lines.append(
                f"| `{recipe_id}` | `yields` field absent | — | {expected_qty} |"
            )
        elif actual_qty != expected_qty:
            lines.append(
                f"| `{recipe_id}` | wrong yield | {actual_qty} | {expected_qty} |"
            )

    return lines


def check_stack_sizes(items: list[dict]) -> list[str]:
    """Return lines describing stack-size gaps."""
    item_map = {i["id"]: i for i in items if "id" in i}
    lines: list[str] = []

    for item_id, expected_size in sorted(KNOWN_STACK_SIZES.items()):
        if item_id not in item_map:
            lines.append(
                f"| `{item_id}` | item missing from items.yaml | — | {expected_size} |"
            )
            continue
        item = item_map[item_id]
        actual = item.get("stackSize", None)
        if actual is None:
            lines.append(
                f"| `{item_id}` | `stackSize` field absent | — | {expected_size} |"
            )
        elif actual != expected_size:
            lines.append(
                f"| `{item_id}` | wrong stackSize | {actual} | {expected_size} |"
            )

    return lines


def check_meads(recipes: list[dict], items: list[dict]) -> tuple[list[str], list[str]]:
    """Return (mead_gap_lines, missing_item_lines)."""
    recipe_map = {r["id"]: r for r in recipes if "id" in r}
    item_ids = {i["id"] for i in items if "id" in i}

    mead_lines: list[str] = []
    missing_item_lines: list[str] = []

    for mead in KNOWN_MEADS:
        mead_id = mead["id"]
        if mead_id not in recipe_map:
            mead_lines.append(f"| `{mead_id}` | missing entirely |")
        else:
            actual = recipe_map[mead_id]
            issues = []
            actual_yields = actual.get("yields")
            actual_yield_qty = actual_yields.get("qty") if isinstance(actual_yields, dict) else None
            if actual_yield_qty != mead["yield"]:
                issues.append(
                    f"yield {actual_yield_qty or 'absent'} ≠ {mead['yield']}"
                )
            if "mead" not in actual:
                issues.append("no `mead` block")
            elif actual["mead"].get("fermenterDuration") != mead["mead"]["fermentDuration"]:
                fd = actual["mead"].get("fermenterDuration", "absent")
                issues.append(
                    f"fermentDuration {fd} ≠ {mead['mead']['fermentDuration']}"
                )
            if issues:
                mead_lines.append(f"| `{mead_id}` | {'; '.join(issues)} |")

        # Check that every ingredient item exists in items.yaml
        for ing in mead["ingredients"]:
            iid = ing["itemId"]
            if iid not in item_ids:
                missing_item_lines.append(
                    f"| `{iid}` | referenced by `{mead_id}` | not in items.yaml |"
                )

    # Deduplicate missing items (same item may appear in multiple meads)
    seen: set[str] = set()
    deduped: list[str] = []
    for line in missing_item_lines:
        key = line.split("|")[1].strip()
        if key not in seen:
            seen.add(key)
            deduped.append(line)

    return mead_lines, deduped


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------


def build_report(
    yield_lines: list[str],
    stack_lines: list[str],
    mead_lines: list[str],
    missing_item_lines: list[str],
) -> str:
    sections: list[str] = []

    sections.append("# Recipe Diff Report\n")
    sections.append(
        "_Generated by `scripts/scrape-recipes.py`. "
        "Compares local YAML data against hardcoded known-good Valheim game data._\n"
    )

    # --- Yield gaps ---
    sections.append("## 1. Yield Gaps\n")
    sections.append(
        "Recipes that are known to produce more than 1 item but lack a correct `yield` field.\n"
    )
    if yield_lines:
        sections.append("| Recipe ID | Issue | Actual | Expected |")
        sections.append("| --------- | ----- | ------ | -------- |")
        sections.extend(yield_lines)
    else:
        sections.append("_No yield gaps found._")
    sections.append("")

    # --- Stack size gaps ---
    sections.append("## 2. Stack Size Gaps\n")
    sections.append(
        "Items that are missing a `stackSize` field or have the wrong value.\n"
    )
    if stack_lines:
        sections.append("| Item ID | Issue | Actual | Expected |")
        sections.append("| ------- | ----- | ------ | -------- |")
        sections.extend(stack_lines)
    else:
        sections.append("_No stack size gaps found._")
    sections.append("")

    # --- Missing mead recipes ---
    sections.append("## 3. Mead Recipe Gaps\n")
    sections.append(
        "Mead recipes that are missing or have incorrect fields "
        "(yield, mead block, fermentDuration).\n"
    )
    if mead_lines:
        sections.append("| Recipe ID | Issue |")
        sections.append("| --------- | ----- |")
        sections.extend(mead_lines)
    else:
        sections.append("_No mead recipe gaps found._")
    sections.append("")

    # --- Missing items referenced by meads ---
    sections.append("## 4. Missing Items (referenced by meads)\n")
    sections.append(
        "Ingredient items that mead recipes reference but that do not appear in `items.yaml`.\n"
    )
    if missing_item_lines:
        sections.append("| Item ID | Referenced By | Status |")
        sections.append("| ------- | ------------- | ------ |")
        sections.extend(missing_item_lines)
    else:
        sections.append("_All mead ingredient items are present in items.yaml._")
    sections.append("")

    # --- Summary ---
    total = len(yield_lines) + len(stack_lines) + len(mead_lines) + len(missing_item_lines)
    sections.append("## Summary\n")
    sections.append(f"| Category | Gap Count |")
    sections.append(f"| -------- | --------- |")
    sections.append(f"| Yield gaps | {len(yield_lines)} |")
    sections.append(f"| Stack size gaps | {len(stack_lines)} |")
    sections.append(f"| Mead recipe gaps | {len(mead_lines)} |")
    sections.append(f"| Missing items (meads) | {len(missing_item_lines)} |")
    sections.append(f"| **Total** | **{total}** |")
    sections.append("")

    return "\n".join(sections)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    print("Loading YAML data...")
    items = load_yaml(ITEMS_YAML)
    recipes = load_all_recipes()

    print(f"  Items loaded: {len(items)}")
    print(f"  Recipes loaded: {len(recipes)}")

    print("Checking yields...")
    yield_lines = check_yields(recipes)

    print("Checking stack sizes...")
    stack_lines = check_stack_sizes(items)

    print("Checking mead recipes...")
    mead_lines, missing_item_lines = check_meads(recipes, items)

    report = build_report(yield_lines, stack_lines, mead_lines, missing_item_lines)

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")

    print(f"\nReport written to: {REPORT_PATH}")
    print(f"\nSummary:")
    print(f"  Yield gaps:          {len(yield_lines)}")
    print(f"  Stack size gaps:     {len(stack_lines)}")
    print(f"  Mead recipe gaps:    {len(mead_lines)}")
    print(f"  Missing items:       {len(missing_item_lines)}")
    total = len(yield_lines) + len(stack_lines) + len(mead_lines) + len(missing_item_lines)
    print(f"  Total gaps:          {total}")


if __name__ == "__main__":
    main()
