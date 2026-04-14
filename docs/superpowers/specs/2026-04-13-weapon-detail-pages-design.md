# Weapon Detail Pages Design

**Date:** 2026-04-13
**Status:** Draft

## Goal

Display comprehensive weapon stats in two contexts: a compact expandable row in the recipe list, and a full detail page. Help users understand confusing combat mechanics through tooltips. Add pixel-art damage type icons for visual clarity and compactness.

## Design Decisions

| Decision | Choice |
|---|---|
| Upgrade progression layout | Comparison table — all qualities as columns, stats as rows, changed values green, unchanged dimmed |
| Damage display | Hero bar with damage type icons at top (interactive quality selector), plus text rows in comparison table |
| Expandable row content | Hero bar + compact upgrade grid with cart buttons |
| Detail page content | Hero bar + full comparison table + crafting section with upgrade ingredients |
| Stat explanations | Hover/tap tooltip icons (ⓘ) next to confusing stat names |
| Upgrade rows in list | Compact grid — all upgrades visible, tight rows with ingredient icons + per-row cart + "Add Max" |
| Icon style | Pixel-art SVG matching existing item icon style |

## Components

### 1. Hero Damage Bar

A compact, visually prominent bar showing the weapon's damage profile at a glance. Used in both the expandable row and the detail page.

**Contents:**
- Damage type icons (pixel-art SVG) with large numeric values and type labels
- Total damage sum
- Weight, durability (key at-a-glance stats)
- Quality tab selector (Q1, Q2, etc.) — clicking a tab updates the hero bar values to that quality level

**Behavior:**
- Quality tabs are derived from the recipe's upgrades array
- Selecting a quality computes merged stats (base + sparse overlay)
- Default selection: Q1

### 2. Compact Upgrade Grid (List View)

Replaces the current verbose upgrade section in the expandable row.

**Per-upgrade row:**
- Quality label (Q2, Q3...)
- Station + level (e.g. "Forge 5")
- Ingredient icons (pixel-art, from existing sprite) with quantities
- Per-row add-to-cart button (+)

**Header row:**
- "Upgrades" label
- "Add Max" button (adds all upgrade ingredients to cart)

**Layout:** Each upgrade is a single horizontal row. Ingredient names shown as hover tooltip on icons.

### 3. Comparison Table (Detail Page)

Full stat breakdown across all quality levels, organized into sections.

**Sections (shown in order, only if data exists):**
1. **Primary Attack** — damage types, knockback, backstab, stagger, stamina, eitr, health cost, adrenaline, recoil
2. **Secondary Attack** — same fields as primary
3. **Blocking** — block armor, parry block armor, block force, parry bonus, block adrenaline, parry adrenaline
4. **Properties** — durability, weight, movement speed

**Table structure:**
- Column per quality level (Q1, Q2, ...)
- Row per stat
- Changed values highlighted green
- Unchanged values dimmed (low opacity)
- Damage type rows include pixel-art icons inline with text label

**Tooltip stats** (ⓘ icon next to label):
- **Stagger** — "Stagger damage per hit. Based on physical + lightning damage. When the target's stagger bar fills, they are stunned and take 2× damage."
- **Block Armor** — "Damage absorbed when blocking. Reduces incoming damage by this amount. Scales with blocking skill."
- **Parry Block Armor** — "Damage absorbed when parrying (blocking within 0.25s). Equals Block Armor × Parry Bonus."
- **Block Force** — "How far enemies are pushed back when you block their attack."
- **Parry Bonus** — "Multiplier applied to Block Armor on a successful parry (block within 0.25s of incoming hit)."
- **Adrenaline** — "Adrenaline gained per action. Each point increases damage by 1%. Decays over time."
- **Backstab** — "Damage multiplier when attacking an unaware enemy from behind."
- **Eitr** — "Magical energy cost per cast. Eitr regenerates over time from food."
- **Health Cost** — "Percentage of max health consumed per cast (blood magic)."

### 4. Crafting Section (Detail Page)

Shows base recipe and per-quality upgrade ingredients.

**Base recipe:**
- Station name + level
- Ingredient list with pixel-art icons and names

**Upgrade recipes:**
- Same compact grid layout as the list view
- Ingredient icons with names (not just quantities — detail page has room)
- Station level per upgrade
- Add-to-cart buttons per upgrade + "Add Max"

### 5. Damage Type Icons

Pixel-art SVGs (16×16 or 20×20 viewBox) for each damage type, following the existing icon style guide.

**Icons to create:**
| Type | Visual concept |
|---|---|
| slash | Diagonal blade/slash marks |
| pierce | Arrow tip / pointed weapon |
| blunt | Hammer head / impact |
| fire | Flame |
| frost | Snowflake / ice crystal |
| lightning | Lightning bolt |
| poison | Droplet / skull |
| spirit | Ghost / wisp |
| pure | Star / diamond (unmitigable) |
| chop | Axe blade hitting wood |
| pickaxe | Pickaxe head hitting rock |

These live in `public/icons/damage/` as individual SVGs, loaded via the existing icon sprite system or as inline SVGs.

## Page Structure

### Expandable Row (List View)

```
┌─────────────────────────────────────────────────┐
│ [Icon] Dyrnwyn    Sword · Ashlands    [+Cart]   │
├─────────────────────────────────────────────────┤
│ Hero Bar: [Q1][Q2]                              │
│ ⚔️ 145 SLASH  🔥 10 FIRE  | Total 155 | Dur 200│
├─────────────────────────────────────────────────┤
│ Ingredients: Fragment×1 · Flametal×20 · Blood×1 │
├─────────────────────────────────────────────────┤
│ UPGRADES                          [🛒 Add Max]  │
│ Q2  Forge 5  [🔥×10] [💎×1]              [+]   │
└─────────────────────────────────────────────────┘
```

### Detail Page

```
┌─────────────────────────────────────────────────┐
│ ← Back                                          │
│ [Icon] Dyrnwyn                                  │
│ Sword · One-handed · Ashlands                   │
├─────────────────────────────────────────────────┤
│ Hero Bar: [Q1][Q2]                              │
│ ⚔️ 145 SLASH  🔥 10 FIRE  | Total 155 | Dur 200│
├─────────────────────────────────────────────────┤
│ PRIMARY ATTACK           Q1    Q2               │
│ Slash                    145   151 ↑            │
│ Fire                     10    10               │
│ Knockback                40    40               │
│ Backstab ⓘ              ×3    ×3               │
│ Stagger ⓘ               145   151 ↑            │
│ Stamina                  16    16               │
│ Adrenaline ⓘ            1     1                │
├─────────────────────────────────────────────────┤
│ SECONDARY ATTACK         Q1    Q2               │
│ Slash                    435   453 ↑            │
│ Fire                     30    30               │
│ ...                                             │
├─────────────────────────────────────────────────┤
│ BLOCKING                 Q1    Q2               │
│ Block Armor ⓘ           57    57               │
│ Parry Block Armor ⓘ     114   114              │
│ Block Force ⓘ           20    25  ↑            │
│ Parry Bonus ⓘ           ×2    ×2               │
├─────────────────────────────────────────────────┤
│ PROPERTIES               Q1    Q2               │
│ Durability               200   250 ↑            │
│ Weight                   0.8   0.8              │
│ Movement Speed           -5%   -5%              │
├─────────────────────────────────────────────────┤
│ CRAFTING                                        │
│ Station: Black Forge Lv 4                       │
│ [icon] Dyrnwyn Hilt Fragment ×1                 │
│ [icon] Flametal ×20                             │
│ [icon] Bloodstone ×1                  [+Cart]   │
│                                                 │
│ UPGRADES                          [🛒 Add Max]  │
│ Q2  Forge 5  [🔥 Flametal ×10] [💎 Blood ×1] + │
├─────────────────────────────────────────────────┤
│ USED IN                                         │
│ → Brutal Slayer  → Scourging Slayer             │
└─────────────────────────────────────────────────┘
```

## Implementation Scope

### New files
- `src/components/HeroDamageBar.tsx` — hero bar with quality selector
- `src/components/ComparisonTable.tsx` — full stat comparison table
- `src/components/CompactUpgradeGrid.tsx` — compact upgrade rows with cart
- `src/components/StatTooltip.tsx` — tooltip component for stat explanations
- `public/icons/damage/*.svg` — 11 damage type icons

### Modified files
- `src/pages/recipes/[slug].astro` — add weapon stats sections, crafting section, hero bar
- `src/components/RecipeRow.tsx` — replace current stats display with hero bar + compact upgrade grid
- `src/styles/theme.css` — add styles for new components

### Not in scope
- Armor detail pages (future)
- Food detail pages (already have basic stats)
- Weapon comparison tool
- Search/filter by damage type
