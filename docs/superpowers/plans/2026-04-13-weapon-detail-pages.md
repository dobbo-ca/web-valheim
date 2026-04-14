# Weapon Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display comprehensive weapon stats in expandable list rows (hero bar + compact upgrades) and full detail pages (hero bar + comparison table + crafting), with pixel-art damage type icons and tooltip stat explanations.

**Architecture:** Five new Solid.js components (HeroDamageBar, ComparisonTable, CompactUpgradeGrid, StatTooltip, DamageIcon) plus 11 pixel-art SVG icons. The hero bar and compact grid replace the current stats/upgrades in RecipeRow.tsx. The detail page gets the hero bar + comparison table + crafting section. A shared `stat-tooltips.ts` map provides tooltip text.

**Tech Stack:** Astro 6 + Solid.js, vanilla CSS with existing design token system, SVG sprite for damage icons.

---

### Task 1: Create Damage Type Icons

**Files:**
- Create: `public/icons/damage/slash.svg`
- Create: `public/icons/damage/pierce.svg`
- Create: `public/icons/damage/blunt.svg`
- Create: `public/icons/damage/fire.svg`
- Create: `public/icons/damage/frost.svg`
- Create: `public/icons/damage/lightning.svg`
- Create: `public/icons/damage/poison.svg`
- Create: `public/icons/damage/spirit.svg`
- Create: `public/icons/damage/pure.svg`
- Create: `public/icons/damage/chop.svg`
- Create: `public/icons/damage/pickaxe.svg`

- [ ] **Step 1: Create the damage icons directory**

```bash
mkdir -p public/icons/damage
```

- [ ] **Step 2: Create all 11 pixel-art damage type SVGs**

Each icon is a 16×16 pixel-art SVG following the existing item icon style (see `memory/reference_icon_creation.md` for style rules). Use the project's color palette conventions:
- slash: silver/steel diagonal slash marks
- pierce: steel arrow tip
- blunt: brown/grey hammer head impact
- fire: orange/red flame
- frost: light blue snowflake/crystal
- lightning: yellow bolt
- poison: green droplet
- spirit: pale blue/white wisp
- pure: gold/white star (unmitigable)
- chop: brown axe blade on wood grain
- pickaxe: grey pick head on stone

Create each as a standalone SVG with `viewBox="0 0 16 16"`.

- [ ] **Step 3: Verify icons render**

```bash
ls -la public/icons/damage/
# Should show 11 .svg files
```

Open one in a browser to verify it renders at 16×16.

- [ ] **Step 4: Commit**

```bash
git add public/icons/damage/
git commit -m "art: add pixel-art damage type icons (slash, pierce, blunt, fire, frost, lightning, poison, spirit, pure, chop, pickaxe)"
```

---

### Task 2: Create DamageIcon Component and Stat Tooltips Data

**Files:**
- Create: `src/components/DamageIcon.tsx`
- Create: `src/lib/stat-tooltips.ts`
- Create: `src/lib/merge-stats.ts`

- [ ] **Step 1: Create the stat tooltips map**

```typescript
// src/lib/stat-tooltips.ts

/** Tooltip text for combat stats that need explanation. */
export const STAT_TOOLTIPS: Record<string, string> = {
  backstab:
    'Damage multiplier when attacking an unaware enemy from behind.',
  stagger:
    'Stagger damage per hit. Based on physical + lightning damage. When the target\'s stagger bar fills, they are stunned and take 2× damage.',
  adrenaline:
    'Adrenaline gained per action. Each point increases damage by 1%. Decays over time when not attacking.',
  eitr:
    'Magical energy cost per cast. Eitr regenerates over time from food.',
  healthCost:
    'Percentage of max health consumed per cast (blood magic).',
  blockArmor:
    'Damage absorbed when blocking. Reduces incoming damage by this amount. Scales with blocking skill.',
  parryBlockArmor:
    'Damage absorbed when parrying (blocking within 0.25s). Equals Block Armor × Parry Bonus.',
  blockForce:
    'How far enemies are pushed back when you block their attack.',
  parryBonus:
    'Multiplier applied to Block Armor on a successful parry (block within 0.25s of incoming hit).',
  blockAdrenaline:
    'Adrenaline gained when blocking an attack.',
  parryAdrenaline:
    'Adrenaline gained when successfully parrying an attack.',
  knockback:
    'How far enemies are pushed back on hit.',
};
```

- [ ] **Step 2: Create the shared mergeStats utility**

```typescript
// src/lib/merge-stats.ts
import type { WeaponStats } from './types';

/** Merge base weapon stats with a sparse upgrade overlay. */
export function mergeStats(base: WeaponStats, overlay?: WeaponStats): WeaponStats {
  if (!overlay) return base;
  const merged = { ...base };
  if (overlay.durability != null) merged.durability = overlay.durability;
  if (overlay.weight != null) merged.weight = overlay.weight;
  if (overlay.movementPenalty != null) merged.movementPenalty = overlay.movementPenalty;
  if (overlay.primaryAttack) {
    merged.primaryAttack = {
      ...base.primaryAttack,
      ...overlay.primaryAttack,
      damage: { ...base.primaryAttack?.damage, ...overlay.primaryAttack?.damage },
    };
  }
  if (overlay.secondaryAttack) {
    merged.secondaryAttack = {
      ...base.secondaryAttack,
      ...overlay.secondaryAttack,
      damage: { ...base.secondaryAttack?.damage, ...overlay.secondaryAttack?.damage },
    };
  }
  if (overlay.blocking) {
    merged.blocking = { ...base.blocking, ...overlay.blocking };
  }
  return merged;
}
```

- [ ] **Step 3: Create the DamageIcon component**

```tsx
// src/components/DamageIcon.tsx
import type { Component } from 'solid-js';

interface Props {
  type: string;
  size?: number;
}

/**
 * Renders a damage type icon from public/icons/damage/.
 * Falls back to a text label if the icon doesn't load.
 */
export const DamageIcon: Component<Props> = (props) => {
  const s = () => props.size ?? 16;
  const base = import.meta.env.BASE_URL;

  return (
    <img
      class="damage-icon"
      src={`${base}icons/damage/${props.type}.svg`}
      alt={props.type}
      width={s()}
      height={s()}
      loading="lazy"
    />
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add src/components/DamageIcon.tsx src/lib/stat-tooltips.ts src/lib/merge-stats.ts
git commit -m "feat: add DamageIcon, stat tooltips, and mergeStats utility"
```

---

### Task 3: Create StatTooltip Component

**Files:**
- Create: `src/components/StatTooltip.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the StatTooltip component**

```tsx
// src/components/StatTooltip.tsx
import { Show, type Component } from 'solid-js';
import { STAT_TOOLTIPS } from '../lib/stat-tooltips';

interface Props {
  /** The stat key matching STAT_TOOLTIPS (e.g. 'stagger', 'blockForce') */
  stat: string;
  /** Display label shown before the tooltip icon */
  label: string;
}

/**
 * Renders a stat label with an optional ⓘ tooltip icon.
 * Only shows the icon if the stat has a tooltip defined.
 */
export const StatTooltip: Component<Props> = (props) => {
  const tip = () => STAT_TOOLTIPS[props.stat];

  return (
    <span class="stat-label">
      {props.label}
      <Show when={tip()}>
        <span class="stat-tooltip" title={tip()} aria-label={tip()}>
          ⓘ
        </span>
      </Show>
    </span>
  );
};
```

- [ ] **Step 2: Add CSS for tooltips**

Append to `src/styles/theme.css`:

```css
/* ===== Stat tooltip ===== */
.stat-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.stat-tooltip {
  color: var(--text-soft);
  opacity: 0.4;
  cursor: help;
  font-size: 11px;
  user-select: none;
}
.stat-tooltip:hover {
  opacity: 0.8;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StatTooltip.tsx src/styles/theme.css
git commit -m "feat: add StatTooltip component with hover explanations"
```

---

### Task 4: Create HeroDamageBar Component

**Files:**
- Create: `src/components/HeroDamageBar.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the HeroDamageBar component**

This component renders the hero bar with damage type icons, quality selector tabs, and key stats (total, weight, durability). Clicking a quality tab updates the displayed values.

```tsx
// src/components/HeroDamageBar.tsx
import { createSignal, For, Show, type Component } from 'solid-js';
import type { WeaponStats, ItemUpgrade } from '../lib/types';
import { mergeStats } from '../lib/merge-stats';
import { DamageIcon } from './DamageIcon';

interface Props {
  baseStats: WeaponStats;
  upgrades?: ItemUpgrade[];
}

export const HeroDamageBar: Component<Props> = (props) => {
  const qualities = () => {
    const q = [{ quality: 1, stats: props.baseStats }];
    for (const u of props.upgrades ?? []) {
      if (u.stats) q.push({ quality: u.quality, stats: mergeStats(props.baseStats, u.stats) });
      else q.push({ quality: u.quality, stats: props.baseStats });
    }
    return q;
  };
  const [selectedQ, setSelectedQ] = createSignal(1);
  const activeStats = () => {
    const q = qualities().find((q) => q.quality === selectedQ());
    return q?.stats ?? props.baseStats;
  };

  const damageEntries = () => {
    const dmg = activeStats().primaryAttack?.damage;
    if (!dmg) return [];
    return Object.entries(dmg).filter(([, v]) => v != null && v > 0);
  };

  const totalDamage = () => damageEntries().reduce((sum, [, v]) => sum + (v ?? 0), 0);

  return (
    <div class="hero-bar">
      <Show when={qualities().length > 1}>
        <div class="hero-bar__tabs">
          <For each={qualities()}>
            {(q) => (
              <button
                type="button"
                class="hero-bar__tab"
                classList={{ 'hero-bar__tab--active': selectedQ() === q.quality }}
                onClick={() => setSelectedQ(q.quality)}
              >
                Q{q.quality}
              </button>
            )}
          </For>
        </div>
      </Show>
      <div class="hero-bar__body">
        <div class="hero-bar__damage">
          <For each={damageEntries()}>
            {([type, val]) => (
              <div class="hero-bar__dmg-item">
                <div class="hero-bar__dmg-icon">
                  <DamageIcon type={type} size={22} />
                </div>
                <div>
                  <div class="hero-bar__dmg-val">{val}</div>
                  <div class="hero-bar__dmg-type">{type}</div>
                </div>
              </div>
            )}
          </For>
        </div>
        <div class="hero-bar__meta">
          <Show when={damageEntries().length > 1}>
            <div class="hero-bar__meta-item">
              <div class="hero-bar__meta-label">Total</div>
              <div class="hero-bar__meta-val">{totalDamage()}</div>
            </div>
          </Show>
          <Show when={activeStats().weight != null}>
            <div class="hero-bar__meta-item">
              <div class="hero-bar__meta-label">Weight</div>
              <div class="hero-bar__meta-val">{activeStats().weight}</div>
            </div>
          </Show>
          <Show when={activeStats().durability != null}>
            <div class="hero-bar__meta-item">
              <div class="hero-bar__meta-label">Durability</div>
              <div class="hero-bar__meta-val">{activeStats().durability}</div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add CSS for the hero bar**

Append to `src/styles/theme.css`:

```css
/* ===== Hero damage bar ===== */
.hero-bar {
  background: color-mix(in oklch, var(--bg) 50%, var(--surface));
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  overflow: hidden;
}
.hero-bar__tabs {
  display: flex;
  border-bottom: 1px solid var(--border-soft);
}
.hero-bar__tab {
  flex: 1;
  padding: 6px 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.hero-bar__tab--active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  background: var(--accent-bg);
}
.hero-bar__body {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 14px 16px;
  flex-wrap: wrap;
}
.hero-bar__damage {
  display: flex;
  gap: 20px;
  align-items: center;
}
.hero-bar__dmg-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hero-bar__dmg-icon {
  width: 32px;
  height: 32px;
  background: var(--accent-bg);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-bar__dmg-val {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
.hero-bar__dmg-type {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-soft);
}
.hero-bar__meta {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-left: auto;
}
.hero-bar__meta-item {
  text-align: center;
}
.hero-bar__meta-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-soft);
}
.hero-bar__meta-val {
  font-size: 18px;
  font-weight: 600;
}

/* Damage icon fallback */
.damage-icon {
  display: inline-block;
  vertical-align: middle;
  image-rendering: pixelated;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroDamageBar.tsx src/styles/theme.css
git commit -m "feat: add HeroDamageBar component with quality selector and damage icons"
```

---

### Task 5: Create CompactUpgradeGrid Component

**Files:**
- Create: `src/components/CompactUpgradeGrid.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the CompactUpgradeGrid component**

Replaces the verbose upgrade list in the expandable row. Shows all upgrades as tight horizontal rows with ingredient icons, station level, and per-row cart buttons.

```tsx
// src/components/CompactUpgradeGrid.tsx
import { For, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { ItemIcon } from './ItemIcon';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  upgradeKeysInCart: Set<string>;
  onAddUpgradeToCart: (cartKey: string) => void;
  onAddMaxUpgrades: (recipeId: string) => void;
  onOpenCart: () => void;
  iconIds?: Set<string>;
  spriteHref?: string;
}

export const CompactUpgradeGrid: Component<Props> = (props) => {
  const spriteHref = () => props.spriteHref ?? '/icons/sprite.svg';
  const stationName = () => {
    const s = props.stationsById.get(props.recipe.station);
    return s?.name ?? props.recipe.station;
  };

  return (
    <div class="compact-upgrades">
      <div class="compact-upgrades__header">
        <span class="label">Upgrades</span>
        <button
          type="button"
          class="compact-upgrades__max-btn"
          onClick={(e) => {
            e.stopPropagation();
            props.onAddMaxUpgrades(props.recipe.id);
          }}
        >
          🛒 Add Max
        </button>
      </div>
      <For each={props.recipe.upgrades ?? []}>
        {(upgrade) => {
          const cartKey = `${props.recipe.id}+${upgrade.quality}`;
          const inCart = () => props.upgradeKeysInCart.has(cartKey);

          return (
            <div class="compact-upgrades__row">
              <span class="compact-upgrades__quality">Q{upgrade.quality}</span>
              <span class="compact-upgrades__station">
                {stationName()} {upgrade.stationLevel}
              </span>
              <div class="compact-upgrades__ingredients">
                <For each={upgrade.ingredients}>
                  {(ing) => {
                    const name = () => props.itemsById.get(ing.itemId)?.name ?? ing.itemId;
                    const hasIcon = () => props.iconIds?.has(ing.itemId) ?? false;
                    return (
                      <span class="compact-upgrades__ing" title={name()}>
                        {hasIcon() && (
                          <ItemIcon id={ing.itemId} size="sm" spriteHref={spriteHref()} />
                        )}
                        <span class="compact-upgrades__qty">×{ing.qty}</span>
                      </span>
                    );
                  }}
                </For>
              </div>
              <button
                type="button"
                class="add-to-cart-btn add-to-cart-btn--sm"
                classList={{ 'add-to-cart-btn--in-cart': inCart() }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (inCart()) props.onOpenCart();
                  else props.onAddUpgradeToCart(cartKey);
                }}
                aria-label={
                  inCart()
                    ? `${props.recipe.name} +${upgrade.quality - 1} in cart`
                    : `Add ${props.recipe.name} +${upgrade.quality - 1} to cart`
                }
              >
                {inCart() ? '✓' : '+'}
              </button>
            </div>
          );
        }}
      </For>
    </div>
  );
};
```

- [ ] **Step 2: Add CSS for compact upgrade grid**

Append to `src/styles/theme.css`:

```css
/* ===== Compact upgrade grid ===== */
.compact-upgrades__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.compact-upgrades__max-btn {
  background: color-mix(in oklch, var(--bg) 50%, var(--surface));
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: 10px;
  color: var(--text-soft);
  cursor: pointer;
}
.compact-upgrades__max-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.compact-upgrades__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid color-mix(in oklch, var(--border-soft) 30%, transparent);
}
.compact-upgrades__row:last-of-type {
  border-bottom: none;
}
.compact-upgrades__quality {
  color: var(--accent);
  font-weight: 700;
  font-size: 11px;
  min-width: 22px;
}
.compact-upgrades__station {
  font-size: 10px;
  color: var(--text-soft);
  min-width: 55px;
}
.compact-upgrades__ingredients {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1;
}
.compact-upgrades__ing {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.compact-upgrades__qty {
  font-size: 11px;
  color: var(--text-soft);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CompactUpgradeGrid.tsx src/styles/theme.css
git commit -m "feat: add CompactUpgradeGrid component for list view upgrades"
```

---

### Task 6: Create ComparisonTable Component

**Files:**
- Create: `src/components/ComparisonTable.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the ComparisonTable component**

Full stat breakdown table for the detail page. Shows all stats across quality levels organized into sections (Primary Attack, Secondary Attack, Blocking, Properties). Changed values are green, unchanged are dimmed.

```tsx
// src/components/ComparisonTable.tsx
import { For, Show, type Component } from 'solid-js';
import type { WeaponStats, Attack, Blocking, ItemUpgrade } from '../lib/types';
import { mergeStats } from '../lib/merge-stats';
import { StatTooltip } from './StatTooltip';
import { DamageIcon } from './DamageIcon';

interface Props {
  baseStats: WeaponStats;
  upgrades?: ItemUpgrade[];
}

/** Label mapping for attack stat keys. */
const ATTACK_LABELS: Record<string, string> = {
  knockback: 'Knockback',
  backstab: 'Backstab',
  stagger: 'Stagger',
  stamina: 'Stamina',
  staminaPerSecond: 'Stamina/s',
  eitr: 'Eitr',
  healthCost: 'Health Cost',
  adrenaline: 'Adrenaline',
  recoilForce: 'Recoil',
};

const BLOCKING_LABELS: Record<string, string> = {
  blockArmor: 'Block Armor',
  parryBlockArmor: 'Parry Block Armor',
  blockForce: 'Block Force',
  parryBonus: 'Parry Bonus',
  blockAdrenaline: 'Block Adrenaline',
  parryAdrenaline: 'Parry Adrenaline',
};

const DAMAGE_TYPES = ['slash', 'pierce', 'blunt', 'fire', 'frost', 'lightning', 'poison', 'spirit', 'pure', 'chop', 'pickaxe'] as const;

const ATTACK_FIELDS = ['knockback', 'backstab', 'stagger', 'stamina', 'staminaPerSecond', 'eitr', 'healthCost', 'adrenaline', 'recoilForce'] as const;

const BLOCKING_FIELDS = ['blockArmor', 'parryBlockArmor', 'blockForce', 'parryBonus', 'blockAdrenaline', 'parryAdrenaline'] as const;

type QualityRow = { quality: number; stats: WeaponStats };

function formatVal(val: number | undefined, prefix?: string): string {
  if (val == null) return '—';
  if (prefix) return `${prefix}${val}`;
  return String(val);
}

export const ComparisonTable: Component<Props> = (props) => {
  const rows = (): QualityRow[] => {
    const result: QualityRow[] = [{ quality: 1, stats: props.baseStats }];
    for (const u of props.upgrades ?? []) {
      result.push({ quality: u.quality, stats: mergeStats(props.baseStats, u.stats) });
    }
    return result;
  };

  const baseRow = () => rows()[0];

  /** Check if a value differs from the base quality. */
  function isChanged(baseVal: number | undefined, val: number | undefined): boolean {
    return val != null && baseVal != null && val !== baseVal;
  }

  function renderAttackSection(title: string, getAttack: (s: WeaponStats) => Attack | undefined) {
    const baseAtk = getAttack(props.baseStats);
    if (!baseAtk) return null;

    const damageRows = DAMAGE_TYPES.filter((dt) => {
      const v = baseAtk.damage?.[dt];
      return v != null && v > 0;
    });

    const fieldRows = ATTACK_FIELDS.filter((f) => {
      const v = baseAtk[f];
      return v != null;
    });

    if (damageRows.length === 0 && fieldRows.length === 0) return null;

    return (
      <>
        <tr class="ct__section-header">
          <th colspan={rows().length + 1}>{title}</th>
        </tr>
        <For each={damageRows}>
          {(dt) => (
            <tr>
              <td class="ct__stat-name">
                <DamageIcon type={dt} size={14} />
                {' '}{dt.charAt(0).toUpperCase() + dt.slice(1)}
              </td>
              <For each={rows()}>
                {(q, qi) => {
                  const atk = getAttack(q.stats);
                  const val = atk?.damage?.[dt];
                  const baseVal = getAttack(baseRow().stats)?.damage?.[dt];
                  return (
                    <td
                      class="ct__val"
                      classList={{
                        'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                        'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                      }}
                    >
                      {formatVal(val)}
                    </td>
                  );
                }}
              </For>
            </tr>
          )}
        </For>
        <For each={fieldRows}>
          {(field) => (
            <tr>
              <td class="ct__stat-name">
                <StatTooltip stat={field} label={ATTACK_LABELS[field] ?? field} />
              </td>
              <For each={rows()}>
                {(q, qi) => {
                  const atk = getAttack(q.stats);
                  const val = atk?.[field] as number | undefined;
                  const baseVal = getAttack(baseRow().stats)?.[field] as number | undefined;
                  const prefix = field === 'backstab' ? '×' : undefined;
                  return (
                    <td
                      class="ct__val"
                      classList={{
                        'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                        'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                      }}
                    >
                      {formatVal(val, prefix)}
                    </td>
                  );
                }}
              </For>
            </tr>
          )}
        </For>
      </>
    );
  }

  return (
    <table class="ct">
      <thead>
        <tr>
          <th class="ct__stat-name">Stat</th>
          <For each={rows()}>
            {(q) => <th class="ct__q-header">Q{q.quality}</th>}
          </For>
        </tr>
      </thead>
      <tbody>
        {renderAttackSection('Primary Attack', (s) => s.primaryAttack)}
        {renderAttackSection('Secondary Attack', (s) => s.secondaryAttack)}

        <Show when={props.baseStats.blocking}>
          <tr class="ct__section-header">
            <th colspan={rows().length + 1}>Blocking</th>
          </tr>
          <For each={BLOCKING_FIELDS.filter((f) => props.baseStats.blocking?.[f] != null)}>
            {(field) => (
              <tr>
                <td class="ct__stat-name">
                  <StatTooltip stat={field} label={BLOCKING_LABELS[field] ?? field} />
                </td>
                <For each={rows()}>
                  {(q, qi) => {
                    const val = q.stats.blocking?.[field] as number | undefined;
                    const baseVal = baseRow().stats.blocking?.[field] as number | undefined;
                    const prefix = field === 'parryBonus' ? '×' : undefined;
                    return (
                      <td
                        class="ct__val"
                        classList={{
                          'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                          'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                        }}
                      >
                        {formatVal(val, prefix)}
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </Show>

        <tr class="ct__section-header">
          <th colspan={rows().length + 1}>Properties</th>
        </tr>
        <Show when={props.baseStats.durability != null}>
          <tr>
            <td class="ct__stat-name">Durability</td>
            <For each={rows()}>
              {(q, qi) => (
                <td
                  class="ct__val"
                  classList={{
                    'ct__val--changed': qi() > 0 && isChanged(baseRow().stats.durability, q.stats.durability),
                    'ct__val--unchanged': qi() > 0 && !isChanged(baseRow().stats.durability, q.stats.durability),
                  }}
                >
                  {formatVal(q.stats.durability)}
                </td>
              )}
            </For>
          </tr>
        </Show>
        <Show when={props.baseStats.weight != null}>
          <tr>
            <td class="ct__stat-name">Weight</td>
            <For each={rows()}>
              {(q, qi) => (
                <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>{formatVal(q.stats.weight)}</td>
              )}
            </For>
          </tr>
        </Show>
        <Show when={props.baseStats.movementPenalty != null}>
          <tr>
            <td class="ct__stat-name">Movement Speed</td>
            <For each={rows()}>
              {(q, qi) => (
                <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>
                  {props.baseStats.movementPenalty}%
                </td>
              )}
            </For>
          </tr>
        </Show>
      </tbody>
    </table>
  );
};
```

- [ ] **Step 2: Add CSS for comparison table**

Append to `src/styles/theme.css`:

```css
/* ===== Comparison table ===== */
.ct {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ct th,
.ct td {
  padding: 5px 8px;
}
.ct thead th {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-soft);
  border-bottom: 1px solid var(--border-soft);
}
.ct__q-header {
  text-align: center;
  width: 60px;
  color: var(--accent);
}
.ct__section-header th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--accent);
  font-weight: 700;
  padding-top: 16px;
  padding-bottom: 4px;
  border-bottom: none;
}
.ct__stat-name {
  color: var(--text-soft);
  text-align: left;
}
.ct__val {
  text-align: center;
}
.ct__val--changed {
  color: var(--success);
}
.ct__val--unchanged {
  opacity: 0.35;
}
.ct tr {
  border-bottom: 1px solid color-mix(in oklch, var(--border-soft) 30%, transparent);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ComparisonTable.tsx src/styles/theme.css
git commit -m "feat: add ComparisonTable component for detail page stat breakdown"
```

---

### Task 7: Integrate HeroDamageBar and CompactUpgradeGrid into RecipeRow

**Files:**
- Modify: `src/components/RecipeRow.tsx`

- [ ] **Step 1: Replace stats and upgrades sections in RecipeRow**

Replace lines 167-363 of `RecipeRow.tsx` (the `<Show when={props.recipe.stats}>` block through the `<Show when={props.recipe.upgrades}>` block) with the new components.

Import the new components at the top:

```tsx
import { HeroDamageBar } from './HeroDamageBar';
import { CompactUpgradeGrid } from './CompactUpgradeGrid';
```

Replace the stats section (lines 167-285) and upgrades section (lines 287-363) with:

```tsx
          <Show when={props.recipe.stats}>
            {(stats) => (
              <div class="recipe-row__section">
                <HeroDamageBar
                  baseStats={stats()}
                  upgrades={props.recipe.upgrades}
                />
              </div>
            )}
          </Show>

          <Show when={props.recipe.upgrades && props.recipe.upgrades.length > 0}>
            <div class="recipe-row__section">
              <CompactUpgradeGrid
                recipe={props.recipe}
                itemsById={props.itemsById}
                stationsById={props.stationsById}
                upgradeKeysInCart={props.upgradeKeysInCart}
                onAddUpgradeToCart={props.onAddUpgradeToCart}
                onAddMaxUpgrades={props.onAddMaxUpgrades}
                onOpenCart={props.onOpenCart}
                iconIds={props.iconIds}
                spriteHref={props.spriteHref}
              />
            </div>
          </Show>
```

- [ ] **Step 2: Test locally**

Run: `npm run dev -- --port 4322`

Navigate to the recipes list. Expand a weapon row (e.g. Dyrnwyn). Verify:
- Hero bar shows damage icons with values and quality tabs
- Clicking Q1/Q2 updates the hero bar values
- Compact upgrade grid shows ingredients with icons and cart buttons
- "Add Max" button works
- Non-weapon items (food, armor) still display correctly (no hero bar)

- [ ] **Step 3: Commit**

```bash
git add src/components/RecipeRow.tsx
git commit -m "feat: replace stats/upgrades in RecipeRow with HeroDamageBar + CompactUpgradeGrid"
```

---

### Task 8: Enhance Recipe Detail Page with Weapon Stats

**Files:**
- Modify: `src/pages/recipes/[slug].astro`

- [ ] **Step 1: Add weapon stats components to the detail page**

Replace the content of `src/pages/recipes/[slug].astro` with an enhanced version that includes the hero bar, comparison table, and crafting section with upgrade ingredients. The detail page is Astro (server-rendered), but the interactive components (HeroDamageBar, ComparisonTable, CompactUpgradeGrid) are Solid.js with `client:load`.

Add imports and render the components after the ingredients section:

```astro
---
import Base from '../../layouts/Base.astro';
import { getDataSet } from '../../lib/data';
import { getIconSet } from '../../lib/icons';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Recipe, Item } from '../../lib/types';
import { HeroDamageBar } from '../../components/HeroDamageBar';
import { ComparisonTable } from '../../components/ComparisonTable';

export async function getStaticPaths() {
  const data = await getDataSet();
  return data.recipes.map((r) => ({ params: { slug: r.id }, props: { recipeId: r.id } }));
}

const { recipeId } = Astro.props as { recipeId: string };
const data = await getDataSet();
const recipe = data.recipes.find((r) => r.id === recipeId) as Recipe;
const itemsById = new Map<string, Item>(data.items.map((i) => [i.id, i]));
const station = data.stations.find((s) => s.id === recipe.station);

const yieldsId = recipe.yields?.itemId ?? recipe.id;
const usedIn = data.recipes.filter(
  (r) => r.id !== recipe.id && r.ingredients.some((i) => i.itemId === yieldsId),
);

const base = import.meta.env.BASE_URL;
const iconDir = resolve(process.cwd(), 'public/icons/items');
const iconIds = getIconSet(iconDir);
const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/icons/sprite-manifest.json'), 'utf8'));
const spriteHref = `${base}icons/${manifest.filename}`;

const biomeLabel = recipe.biome
  ? recipe.biome.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  : null;

const tags = recipe.tags ?? [];
---
<Base title={`${recipe.name} — Valheim Helper`}>
  <p><a href={base}>← Back to all recipes</a></p>

  <div class="detail-header">
    {iconIds.has(recipe.id) && (
      <svg class="detail-header__icon" width="48" height="48">
        <use href={`${spriteHref}#${recipe.id}`} />
      </svg>
    )}
    <div>
      <h1>{recipe.name}</h1>
      <p class="subtitle">
        {tags.length > 0 && <>{tags[0].charAt(0).toUpperCase() + tags[0].slice(1)} · </>}
        {(() => {
          const stationName = station?.name ?? recipe.station;
          if (recipe.stationLevel > 1) return `${stationName} (Lv ${recipe.stationLevel})`;
          return stationName;
        })()}
        {biomeLabel && <span class="detail-header__biome"> · {biomeLabel}</span>}
      </p>
    </div>
  </div>

  {recipe.stats && (
    <section class="detail-section">
      <HeroDamageBar
        client:load
        baseStats={recipe.stats}
        upgrades={recipe.upgrades}
      />
    </section>
  )}

  {recipe.stats && (
    <section class="detail-section">
      <ComparisonTable
        client:load
        baseStats={recipe.stats}
        upgrades={recipe.upgrades}
      />
    </section>
  )}

  <section class="detail-section">
    <h2>Ingredients</h2>
    <ul class="detail-list">
      {recipe.ingredients.map((i) => (
        <li class="detail-ingredient">
          {iconIds.has(i.itemId) && (
            <svg class="detail-ingredient__icon" width="20" height="20">
              <use href={`${spriteHref}#${i.itemId}`} />
            </svg>
          )}
          <a href={`${base}?ing=${i.itemId}`}>
            {itemsById.get(i.itemId)?.name ?? i.itemId}
          </a>
          {' '}× {i.qty}
        </li>
      ))}
    </ul>
  </section>

  {recipe.upgrades && recipe.upgrades.length > 0 && (
    <section class="detail-section">
      <h2>Upgrade Materials</h2>
      {recipe.upgrades.map((u) => (
        <div class="detail-upgrade-row">
          <span class="detail-upgrade-row__q">Q{u.quality}</span>
          <span class="detail-upgrade-row__station">
            {station?.name ?? recipe.station} {u.stationLevel}
          </span>
          <div class="detail-upgrade-row__ings">
            {u.ingredients.map((i) => (
              <span class="detail-upgrade-row__ing">
                {iconIds.has(i.itemId) && (
                  <svg width="16" height="16" style="image-rendering:pixelated;vertical-align:middle;">
                    <use href={`${spriteHref}#${i.itemId}`} />
                  </svg>
                )}
                {' '}{itemsById.get(i.itemId)?.name ?? i.itemId} ×{i.qty}
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  )}

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

  {recipe.food && (
    <section class="detail-section">
      <h2>Food stats</h2>
      <ul class="detail-list">
        <li>HP: {recipe.food.hp}</li>
        <li>Stamina: {recipe.food.stamina}</li>
        <li>Regen: {recipe.food.regen}</li>
        <li>Duration: {Math.round(recipe.food.duration / 60)} min</li>
        {recipe.food.eitr && <li>Eitr: {recipe.food.eitr}</li>}
      </ul>
    </section>
  )}

  {recipe.notes && (
    <section class="detail-section">
      <h2>Notes</h2>
      <p>{recipe.notes}</p>
    </section>
  )}

  {usedIn.length > 0 && (
    <section class="detail-section">
      <h2>Used as ingredient in</h2>
      <ul class="detail-list">
        {usedIn.map((r) => (
          <li>
            <a href={`${base}recipes/${r.id}/`}>{r.name}</a>
          </li>
        ))}
      </ul>
    </section>
  )}
</Base>

<style>
  .detail-section { margin: 24px 0; }
  .detail-list { list-style: disc; padding-left: 24px; }
  .detail-list li { margin: 4px 0; }
  .subtitle { color: var(--muted); margin-top: -4px; }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }
  .detail-header__icon {
    image-rendering: pixelated;
    border-radius: var(--radius);
    background: var(--accent-bg);
    padding: 4px;
  }
  .detail-header__biome {
    opacity: 0.7;
  }

  .detail-ingredient {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .detail-ingredient__icon {
    image-rendering: pixelated;
  }

  .detail-upgrade-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid color-mix(in oklch, var(--border-soft) 30%, transparent);
    font-size: 13px;
  }
  .detail-upgrade-row:last-child { border-bottom: none; }
  .detail-upgrade-row__q {
    color: var(--accent);
    font-weight: 700;
    font-size: 12px;
    min-width: 24px;
  }
  .detail-upgrade-row__station {
    font-size: 11px;
    color: var(--text-soft);
    min-width: 70px;
  }
  .detail-upgrade-row__ings {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .detail-upgrade-row__ing {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--text-soft);
  }
</style>
```

- [ ] **Step 2: Test locally**

Run: `npm run dev -- --port 4322`

Navigate to a weapon detail page (e.g. `/valheim/recipes/dyrnwyn/`). Verify:
- Header shows icon, name, type, biome badge
- Hero bar with quality tabs and damage icons
- Comparison table with all sections (Primary, Secondary, Blocking, Properties)
- Changed values green, unchanged dimmed
- Tooltip ⓘ icons on hover show explanations
- Ingredient icons in crafting sections
- Upgrade materials section with compact rows
- Non-weapon pages (food, armor) still render correctly

- [ ] **Step 3: Commit**

```bash
git add src/pages/recipes/\\[slug\\].astro
git commit -m "feat: enhance recipe detail page with hero bar, comparison table, and upgrade materials"
```

---

### Task 9: Final Polish and Visual QA

**Files:**
- Possibly: `src/styles/theme.css` (minor tweaks)
- Possibly: `src/components/*.tsx` (edge case fixes)

- [ ] **Step 1: Test across weapon types**

Check these pages to verify all weapon archetypes render correctly:

- **Sword (1h):** `/valheim/recipes/dyrnwyn/` — primary + secondary + blocking
- **Staff (blood magic):** `/valheim/recipes/trollstav/` — eitr, healthCost, no secondary, no stagger
- **Shield (round):** `/valheim/recipes/flametal-shield/` — blocking only, no attacks
- **Tower shield:** `/valheim/recipes/flametal-tower-shield/` — no parry bonus
- **Crossbow:** `/valheim/recipes/ripper/` — recoilForce, no secondary
- **Mace:** `/valheim/recipes/flametal-mace/` — blunt damage, fractional secondary values
- **Arrow:** `/valheim/recipes/needle-arrow/` — simple pierce damage, no upgrades
- **Bomb:** `/valheim/recipes/ooze-bomb/` — blunt + effect, no upgrades
- **Food item:** `/valheim/recipes/lox-meat-pie/` (or similar) — no weapon stats, food stats show correctly

- [ ] **Step 2: Test expandable rows in list view**

Expand several different weapon types in the list. Verify hero bar and compact upgrades render for each. Verify cart add/remove works. Verify non-weapon rows (food, building) still expand normally.

- [ ] **Step 3: Fix any visual issues found**

Address any spacing, alignment, or overflow problems. Common issues:
- Hero bar wrapping on narrow viewports
- Comparison table horizontal scroll on mobile
- Tooltip text too long

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: visual polish for weapon detail pages across all weapon types"
```
