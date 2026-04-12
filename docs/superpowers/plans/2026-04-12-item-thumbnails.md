# Item Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pixel-art SVG thumbnails to recipe rows and ingredient chips, with a build-time icon manifest for graceful fallback.

**Architecture:** SVG icons live in `public/icons/items/`. A build-time utility scans the directory to produce a `Set<string>` of available item IDs. Components conditionally render `<img>` tags only for items with icons. Batch 1 covers Workbench L1 + Cauldron L1 (40 items).

**Tech Stack:** Astro, Solid.js, TypeScript, SVG, Vitest, Playwright

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `public/icons/items/*.svg` | 48×48 pixel-art SVG icons (batch 1: 40 files) |
| Create | `src/lib/icons.ts` | `getIconSet()` — scans `public/icons/items/` at build time, returns `Set<string>` |
| Create | `tests/icons.test.ts` | Tests for icon manifest generation |
| Modify | `src/components/IngredientChip.tsx` | Add optional icon `<img>` before label |
| Modify | `src/components/RecipeRow.tsx` | Add icon `<img>` in name column |
| Modify | `src/components/RecipeTable.tsx` | Accept and pass `iconIds` prop |
| Modify | `src/pages/index.astro` | Generate icon set at build time, pass to RecipeTable |
| Modify | `src/styles/theme.css` | Add `.item-icon` sizing classes |
| Modify | `tests/components/RecipeRow.test.tsx` | Test icon rendering and fallback |

---

### Task 1: Icon CSS Classes

**Files:**
- Modify: `src/styles/theme.css:214` (after `.chips` block)

- [ ] **Step 1: Add icon utility classes to theme.css**

Add after the `.chips` block (line 242):

```css
/* ===== Item icons ===== */
.item-icon {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  vertical-align: middle;
  flex-shrink: 0;
}
.item-icon--sm { width: 16px; height: 16px; }
.item-icon--md { width: 24px; height: 24px; }
```

- [ ] **Step 2: Update chip layout for icon support**

The `.chip` class needs flex layout so icon + text align properly. Update the existing `.chip` rule:

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  color: var(--text);
  padding: 3px 10px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
```

- [ ] **Step 3: Update recipe row name for icon support**

Update `.recipe-row__name`:

```css
.recipe-row__name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css
git commit -m "style: add item-icon CSS classes and flex layout for chips/recipe names"
```

---

### Task 2: Icon Manifest Utility

**Files:**
- Create: `src/lib/icons.ts`
- Create: `tests/icons.test.ts`

- [ ] **Step 1: Write failing test for getIconSet**

Create `tests/icons.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getIconSet } from '../src/lib/icons';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const tmpDir = resolve(import.meta.dirname, 'fixtures/icons-test');

describe('getIconSet', () => {
  it('returns item IDs from SVG filenames', () => {
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(resolve(tmpDir, 'wood.svg'), '<svg></svg>');
    writeFileSync(resolve(tmpDir, 'stone.svg'), '<svg></svg>');
    writeFileSync(resolve(tmpDir, 'deer-hide.svg'), '<svg></svg>');

    const result = getIconSet(tmpDir);

    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(3);
    expect(result.has('wood')).toBe(true);
    expect(result.has('stone')).toBe(true);
    expect(result.has('deer-hide')).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('ignores non-SVG files', () => {
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(resolve(tmpDir, 'wood.svg'), '<svg></svg>');
    writeFileSync(resolve(tmpDir, 'readme.txt'), 'nope');
    writeFileSync(resolve(tmpDir, '.DS_Store'), '');

    const result = getIconSet(tmpDir);

    expect(result.size).toBe(1);
    expect(result.has('wood')).toBe(true);

    rmSync(tmpDir, { recursive: true });
  });

  it('returns empty set when directory does not exist', () => {
    const result = getIconSet(resolve(tmpDir, 'nonexistent'));
    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/icons.test.ts`
Expected: FAIL — module `../src/lib/icons` not found

- [ ] **Step 3: Implement getIconSet**

Create `src/lib/icons.ts`:

```typescript
import { readdirSync } from 'node:fs';

export function getIconSet(dir: string): Set<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return new Set();
  }
  const ids = entries
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4));
  return new Set(ids);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/icons.test.ts`
Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/icons.ts tests/icons.test.ts
git commit -m "feat: add build-time icon manifest utility"
```

---

### Task 3: IngredientChip Icon Support

**Files:**
- Modify: `src/components/IngredientChip.tsx`

- [ ] **Step 1: Add hasIcon prop and render icon image**

Replace the full contents of `src/components/IngredientChip.tsx`:

```tsx
import { Show, type Component } from 'solid-js';

interface Props {
  itemId: string;
  label: string;
  qty?: number;
  onClick?: (itemId: string) => void;
  variant?: 'ingredient' | 'active-filter';
  hasIcon?: boolean;
  iconBase?: string;
}

export const IngredientChip: Component<Props> = (props) => {
  const clickable = typeof props.onClick === 'function';
  const variant = () => props.variant ?? 'ingredient';
  const iconBase = () => props.iconBase ?? '/icons/items';

  return (
    <button
      type="button"
      class={`chip chip--${variant()}`}
      data-item-id={props.itemId}
      disabled={!clickable}
      onClick={() => props.onClick?.(props.itemId)}
    >
      <Show when={props.hasIcon}>
        <img
          class="item-icon item-icon--sm"
          src={`${iconBase()}/${props.itemId}.svg`}
          alt=""
          width={16}
          height={16}
        />
      </Show>
      {props.label}{props.qty != null && <>{' '}<span class="chip__qty">×{props.qty}</span></>}
    </button>
  );
};
```

- [ ] **Step 2: Run existing tests to verify nothing is broken**

Run: `pnpm test -- tests/components/RecipeRow.test.tsx`
Expected: all existing tests PASS (hasIcon defaults to undefined/falsy, no icon rendered)

- [ ] **Step 3: Commit**

```bash
git add src/components/IngredientChip.tsx
git commit -m "feat: add optional icon support to IngredientChip"
```

---

### Task 4: RecipeRow Icon Support

**Files:**
- Modify: `src/components/RecipeRow.tsx`
- Modify: `tests/components/RecipeRow.test.tsx`

- [ ] **Step 1: Write failing test for icon rendering**

Add to `tests/components/RecipeRow.test.tsx`, after the existing imports:

```typescript
// Add at the end of the describe block:

  it('renders recipe icon when iconIds includes the recipe id', () => {
    const iconIds = new Set(['iron-sword']);
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
        iconIds={iconIds}
      />
    ));
    const icon = document.querySelector('.item-icon--md') as HTMLImageElement;
    expect(icon).toBeInTheDocument();
    expect(icon.src).toContain('/icons/items/iron-sword.svg');
  });

  it('does not render icon when iconIds is absent', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    expect(document.querySelector('.item-icon--md')).toBeNull();
  });

  it('renders ingredient chip icons when expanded and iconIds provided', () => {
    const iconIds = new Set(['iron', 'wood']);
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
        iconIds={iconIds}
      />
    ));
    const smIcons = document.querySelectorAll('.item-icon--sm');
    expect(smIcons.length).toBe(2);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/components/RecipeRow.test.tsx`
Expected: FAIL — `iconIds` is not a known prop on RecipeRow

- [ ] **Step 3: Update RecipeRow to accept iconIds and render icons**

Replace the full contents of `src/components/RecipeRow.tsx`:

```tsx
import { For, Show, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { IngredientChip } from './IngredientChip';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  onToggle: (recipeId: string) => void;
  onIngredientClick: (itemId: string) => void;
  iconIds?: Set<string>;
  iconBase?: string;
}

function formatIngredients(
  recipe: Recipe,
  itemsById: Map<string, Item>,
): string {
  return recipe.ingredients
    .map((i) => `${itemsById.get(i.itemId)?.name ?? i.itemId} ×${i.qty}`)
    .join(', ');
}

export const RecipeRow: Component<Props> = (props) => {
  const detailId = () => `recipe-row-detail-${props.recipe.id}`;
  const iconBase = () => props.iconBase ?? '/icons/items';
  const hasRecipeIcon = () => props.iconIds?.has(props.recipe.id) ?? false;

  return (
    <>
      <button
        type="button"
        class="recipe-row"
        classList={{ 'recipe-row--expanded': props.expanded }}
        aria-expanded={props.expanded}
        aria-controls={detailId()}
        onClick={() => props.onToggle(props.recipe.id)}
      >
        <span class="recipe-row__name">
          {props.expanded ? '▾ ' : ''}
          <Show when={hasRecipeIcon()}>
            <img
              class="item-icon item-icon--md"
              src={`${iconBase()}/${props.recipe.id}.svg`}
              alt=""
              width={24}
              height={24}
            />
          </Show>
          {props.recipe.name}
        </span>
        <span class="recipe-row__station">
          {props.stationsById.get(props.recipe.station)?.name ?? props.recipe.station}
        </span>
        <span class="recipe-row__lvl">{props.recipe.stationLevel}</span>
        <Show when={!props.expanded}>
          <span class="recipe-row__ings">
            {formatIngredients(props.recipe, props.itemsById)}
          </span>
        </Show>
      </button>

      <Show when={props.expanded}>
        <div class="recipe-row__detail" id={detailId()}>
          <div class="recipe-row__section">
            <span class="label">Ingredients</span>
            <div class="chips">
              <For each={props.recipe.ingredients}>
                {(ing) => (
                  <IngredientChip
                    itemId={ing.itemId}
                    label={props.itemsById.get(ing.itemId)?.name ?? ing.itemId}
                    qty={ing.qty}
                    onClick={props.onIngredientClick}
                    hasIcon={props.iconIds?.has(ing.itemId) ?? false}
                    iconBase={iconBase()}
                  />
                )}
              </For>
            </div>
          </div>

          <Show when={props.recipe.food}>
            {(food) => (
              <div class="recipe-row__section">
                <span class="label">Food stats</span>
                <div class="food-stats">
                  <span>HP {food().hp}</span>
                  <span>Stam {food().stamina}</span>
                  <span>Regen {food().regen}</span>
                  <span>Duration {Math.round(food().duration / 60)}m</span>
                </div>
              </div>
            )}
          </Show>

          <Show when={props.recipe.notes}>
            <div class="recipe-row__section recipe-row__notes">
              {props.recipe.notes}
            </div>
          </Show>

          <a
            class="recipe-row__permalink"
            href={`${props.baseHref}recipes/${props.recipe.id}/`}
          >
            ↗ open detail page
          </a>
        </div>
      </Show>
    </>
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- tests/components/RecipeRow.test.tsx`
Expected: all tests PASS (new and existing)

- [ ] **Step 5: Commit**

```bash
git add src/components/RecipeRow.tsx tests/components/RecipeRow.test.tsx
git commit -m "feat: add icon support to RecipeRow with graceful fallback"
```

---

### Task 5: RecipeTable and Page Wiring

**Files:**
- Modify: `src/components/RecipeTable.tsx`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add iconIds prop to RecipeTable**

In `src/components/RecipeTable.tsx`, update the `Props` interface (line 14-17):

```typescript
interface Props {
  data: DataSet;
  baseHref: string;
  iconIds?: string[];
}
```

Note: We pass `string[]` from Astro (serializable) and convert to `Set` inside the component.

- [ ] **Step 2: Create iconSet memo and pass to RecipeRow**

In `RecipeTable.tsx`, add after the `stationsById` memo (after line 37):

```typescript
  const iconSet = createMemo(
    () => new Set(props.iconIds ?? []),
  );
```

- [ ] **Step 3: Pass iconIds to RecipeRow**

Update the `<RecipeRow>` JSX (around line 194) to include:

```tsx
            <RecipeRow
              recipe={recipe}
              itemsById={itemsById()}
              stationsById={stationsById()}
              expanded={expandedId() === recipe.id}
              baseHref={props.baseHref}
              onToggle={toggleRow}
              onIngredientClick={addIngredient}
              iconIds={iconSet()}
            />
```

- [ ] **Step 4: Wire icon set in index.astro**

Replace the contents of `src/pages/index.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import { getDataSet } from '../lib/data';
import { getIconSet } from '../lib/icons';
import { RecipeTable } from '../components/RecipeTable';
import { resolve } from 'node:path';

const data = await getDataSet();
const base = import.meta.env.BASE_URL;
const iconDir = resolve(process.cwd(), 'public/icons/items');
const iconIds = [...getIconSet(iconDir)];
---
<Base title="Valheim Recipes">
  <h1>Recipes</h1>
  <p class="subtitle">Filterable crafting + cooking reference. Click a row to expand; click an ingredient to reverse-lookup.</p>
  <RecipeTable client:load data={data} baseHref={base} iconIds={iconIds} />
</Base>
```

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/RecipeTable.tsx src/pages/index.astro
git commit -m "feat: wire icon manifest from build time through to components"
```

---

### Task 6: Create Batch 1 SVG Icons — Materials

**Files:**
- Create: `public/icons/items/wood.svg`
- Create: `public/icons/items/stone.svg`
- Create: `public/icons/items/flint.svg`
- Create: `public/icons/items/core-wood.svg`
- Create: `public/icons/items/fine-wood.svg`
- Create: `public/icons/items/deer-hide.svg`
- Create: `public/icons/items/leather-scraps.svg`
- Create: `public/icons/items/feathers.svg`
- Create: `public/icons/items/hard-antler.svg`
- Create: `public/icons/items/resin.svg`
- Create: `public/icons/items/bone-fragments.svg`

Each SVG is a 48×48 viewBox pixel-art icon. Use simple shapes (rect, polygon, circle, path) in colors inspired by the game items. Target under 1KB per file.

- [ ] **Step 1: Create `public/icons/items/` directory**

```bash
mkdir -p public/icons/items
```

- [ ] **Step 2: Create wood.svg**

Brown log with green leaf accent. Key colors: trunk `#8B6914` / `#A0722A`, leaves `#5D8A2D`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="18" y="6" width="12" height="36" fill="#A0722A"/>
  <rect x="16" y="6" width="2" height="36" fill="#8B6914"/>
  <rect x="30" y="6" width="2" height="36" fill="#8B6914"/>
  <rect x="20" y="14" width="8" height="2" fill="#BF8C3E"/>
  <rect x="20" y="26" width="8" height="2" fill="#BF8C3E"/>
  <rect x="8" y="16" width="8" height="6" fill="#5D8A2D"/>
  <rect x="32" y="10" width="8" height="6" fill="#5D8A2D"/>
</svg>
```

- [ ] **Step 3: Create stone.svg**

Gray rock with faceted highlights. Key colors: base `#808080`, highlight `#999`, shadow `#666`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="12,32 16,14 28,10 38,16 40,30 34,40 14,40" fill="#808080"/>
  <polygon points="16,14 28,10 38,16 28,22 18,20" fill="#999"/>
  <polygon points="12,32 16,14 18,20 14,40" fill="#666"/>
  <rect x="22" y="22" width="6" height="2" fill="#999"/>
  <rect x="18" y="30" width="4" height="2" fill="#999"/>
</svg>
```

- [ ] **Step 4: Create flint.svg**

Dark angular shard. Key colors: body `#4A4A4A`, edge `#6A6A6A`, sharp tip `#8A8A8A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="24,4 36,18 32,42 20,44 12,28" fill="#4A4A4A"/>
  <polygon points="24,4 36,18 28,22 16,16" fill="#6A6A6A"/>
  <polygon points="12,28 16,16 20,44" fill="#3A3A3A"/>
  <rect x="22" y="18" width="4" height="2" fill="#8A8A8A"/>
</svg>
```

- [ ] **Step 5: Create core-wood.svg**

Darker, wider log than regular wood. Key colors: `#6B4E0A` / `#7A5C12`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="14" y="6" width="20" height="36" fill="#7A5C12"/>
  <rect x="12" y="6" width="2" height="36" fill="#6B4E0A"/>
  <rect x="34" y="6" width="2" height="36" fill="#6B4E0A"/>
  <rect x="18" y="12" width="12" height="2" fill="#5A4008"/>
  <rect x="18" y="22" width="12" height="2" fill="#5A4008"/>
  <rect x="18" y="32" width="12" height="2" fill="#5A4008"/>
</svg>
```

- [ ] **Step 6: Create fine-wood.svg**

Light, polished log. Key colors: `#C4A050` / `#D4B060`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="16" y="6" width="16" height="36" fill="#D4B060"/>
  <rect x="14" y="6" width="2" height="36" fill="#C4A050"/>
  <rect x="32" y="6" width="2" height="36" fill="#C4A050"/>
  <rect x="20" y="14" width="8" height="2" fill="#E4C878"/>
  <rect x="20" y="26" width="8" height="2" fill="#E4C878"/>
</svg>
```

- [ ] **Step 7: Create deer-hide.svg**

Tan animal pelt with spots. Key colors: body `#C4956A`, spots `#A06030`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="14,8 34,8 38,20 36,36 28,44 20,44 12,36 10,20" fill="#C4956A"/>
  <polygon points="14,8 34,8 36,16 12,16" fill="#D4A87A"/>
  <rect x="18" y="22" width="4" height="4" fill="#A06030"/>
  <rect x="28" y="26" width="4" height="4" fill="#A06030"/>
  <rect x="22" y="34" width="4" height="4" fill="#A06030"/>
</svg>
```

- [ ] **Step 8: Create leather-scraps.svg**

Torn brown leather pieces. Key colors: `#8B6D4A` / `#7A5C3A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="10,14 22,8 28,14 24,28 12,30" fill="#8B6D4A"/>
  <polygon points="26,18 38,12 42,24 36,38 28,32" fill="#7A5C3A"/>
  <rect x="14" y="16" width="6" height="2" fill="#9A7C5A"/>
  <rect x="30" y="22" width="6" height="2" fill="#6A4C2A"/>
</svg>
```

- [ ] **Step 9: Create feathers.svg**

White feather with quill. Key colors: vane `#E8E8E8`, quill `#CCCCCC`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="4" width="4" height="40" fill="#CCCCCC"/>
  <polygon points="14,8 22,12 22,28 10,24" fill="#E8E8E8"/>
  <polygon points="34,8 26,12 26,28 38,24" fill="#E8E8E8"/>
  <rect x="22" y="4" width="4" height="4" fill="#B0B0B0"/>
</svg>
```

- [ ] **Step 10: Create hard-antler.svg**

Branching antler shape. Key colors: `#C8B090` / `#A89070`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="20" width="4" height="24" fill="#C8B090"/>
  <rect x="20" y="20" width="2" height="24" fill="#A89070"/>
  <rect x="14" y="8" width="4" height="16" fill="#C8B090"/>
  <rect x="30" y="8" width="4" height="16" fill="#C8B090"/>
  <rect x="18" y="18" width="12" height="4" fill="#C8B090"/>
  <rect x="8" y="4" width="4" height="8" fill="#A89070"/>
  <rect x="12" y="8" width="4" height="4" fill="#A89070"/>
  <rect x="36" y="4" width="4" height="8" fill="#A89070"/>
  <rect x="32" y="8" width="4" height="4" fill="#A89070"/>
</svg>
```

- [ ] **Step 11: Create resin.svg**

Amber/yellow blob. Key colors: body `#D4A030`, highlight `#E8C050`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="16,12 32,12 38,24 34,38 14,38 10,24" fill="#D4A030"/>
  <polygon points="16,12 32,12 28,20 18,20" fill="#E8C050"/>
  <rect x="20" y="24" width="4" height="4" fill="#E8C050"/>
</svg>
```

- [ ] **Step 12: Create bone-fragments.svg**

Scattered bone pieces. Key colors: bone `#E0D8C8`, shadow `#C8C0A8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="8" y="20" width="16" height="4" rx="2" fill="#E0D8C8"/>
  <rect x="6" y="18" width="4" height="8" rx="2" fill="#E0D8C8"/>
  <rect x="22" y="18" width="4" height="8" rx="2" fill="#E0D8C8"/>
  <rect x="26" y="28" width="14" height="4" rx="2" fill="#C8C0A8"/>
  <rect x="24" y="26" width="4" height="8" rx="2" fill="#C8C0A8"/>
  <rect x="38" y="26" width="4" height="8" rx="2" fill="#C8C0A8"/>
  <rect x="18" y="10" width="10" height="3" rx="1" fill="#D0C8B8"/>
</svg>
```

- [ ] **Step 13: Commit materials icons**

```bash
git add public/icons/items/wood.svg public/icons/items/stone.svg public/icons/items/flint.svg public/icons/items/core-wood.svg public/icons/items/fine-wood.svg public/icons/items/deer-hide.svg public/icons/items/leather-scraps.svg public/icons/items/feathers.svg public/icons/items/hard-antler.svg public/icons/items/resin.svg public/icons/items/bone-fragments.svg
git commit -m "art: add pixel-art SVG icons for batch 1 materials (11 items)"
```

---

### Task 7: Create Batch 1 SVG Icons — Cooking Ingredients

**Files:**
- Create: `public/icons/items/raspberries.svg`
- Create: `public/icons/items/blueberries.svg`
- Create: `public/icons/items/mushroom.svg`
- Create: `public/icons/items/carrot.svg`
- Create: `public/icons/items/turnip.svg`
- Create: `public/icons/items/boar-meat.svg`

- [ ] **Step 1: Create raspberries.svg**

Cluster of red berries. Key colors: berry `#CC3344`, highlight `#DD5566`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="18" cy="28" r="6" fill="#CC3344"/>
  <circle cx="30" cy="28" r="6" fill="#CC3344"/>
  <circle cx="24" cy="22" r="6" fill="#DD5566"/>
  <circle cx="18" cy="26" r="2" fill="#DD5566"/>
  <circle cx="30" cy="26" r="2" fill="#DD5566"/>
  <rect x="22" y="10" width="4" height="12" fill="#5D8A2D"/>
  <polygon points="18,12 24,8 30,12 24,14" fill="#5D8A2D"/>
</svg>
```

- [ ] **Step 2: Create blueberries.svg**

Cluster of blue berries. Key colors: berry `#4466AA`, highlight `#5577BB`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="18" cy="28" r="6" fill="#4466AA"/>
  <circle cx="30" cy="28" r="6" fill="#4466AA"/>
  <circle cx="24" cy="22" r="6" fill="#5577BB"/>
  <circle cx="18" cy="26" r="2" fill="#5577BB"/>
  <circle cx="30" cy="26" r="2" fill="#5577BB"/>
  <rect x="22" y="10" width="4" height="12" fill="#5D8A2D"/>
  <polygon points="18,12 24,8 30,12 24,14" fill="#5D8A2D"/>
</svg>
```

- [ ] **Step 3: Create mushroom.svg**

Brown mushroom with tan cap. Key colors: cap `#A0724A`, stem `#E0D8C8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="8,24 24,8 40,24" fill="#A0724A"/>
  <polygon points="12,24 24,12 36,24" fill="#B8845A"/>
  <rect x="20" y="24" width="8" height="18" fill="#E0D8C8"/>
  <rect x="18" y="24" width="12" height="2" fill="#C8C0A8"/>
  <rect x="16" y="20" width="4" height="4" fill="#E0D0B0"/>
  <rect x="28" y="18" width="4" height="4" fill="#E0D0B0"/>
</svg>
```

- [ ] **Step 4: Create carrot.svg**

Orange carrot with green top. Key colors: body `#E87830`, top `#5D8A2D`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="20,16 28,16 26,44 22,44" fill="#E87830"/>
  <polygon points="20,16 28,16 26,20 22,20" fill="#F09040"/>
  <rect x="23" y="28" width="2" height="2" fill="#F09040"/>
  <rect x="23" y="36" width="2" height="2" fill="#F09040"/>
  <rect x="18" y="4" width="4" height="14" fill="#5D8A2D"/>
  <rect x="26" y="4" width="4" height="14" fill="#5D8A2D"/>
  <rect x="22" y="6" width="4" height="12" fill="#6B9E38"/>
</svg>
```

- [ ] **Step 5: Create turnip.svg**

Purple-white root vegetable. Key colors: body `#8B5DA0`, bottom `#E0D8C8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="16,18 32,18 34,30 28,42 20,42 14,30" fill="#8B5DA0"/>
  <polygon points="16,18 32,18 34,24 14,24" fill="#A070B8"/>
  <polygon points="20,42 28,42 26,44 22,44" fill="#E0D8C8"/>
  <rect x="20" y="6" width="4" height="14" fill="#5D8A2D"/>
  <rect x="24" y="8" width="4" height="12" fill="#5D8A2D"/>
</svg>
```

- [ ] **Step 6: Create boar-meat.svg**

Raw meat slab with fat marbling. Key colors: meat `#CC4444`, fat `#E8A0A0`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="10,16 38,12 40,34 12,38" fill="#CC4444"/>
  <polygon points="10,16 38,12 38,18 10,22" fill="#E8A0A0"/>
  <rect x="18" y="24" width="8" height="2" fill="#E8A0A0"/>
  <rect x="28" y="28" width="6" height="2" fill="#E8A0A0"/>
  <rect x="8" y="36" width="4" height="6" rx="2" fill="#E0D8C8"/>
</svg>
```

- [ ] **Step 7: Commit cooking ingredient icons**

```bash
git add public/icons/items/raspberries.svg public/icons/items/blueberries.svg public/icons/items/mushroom.svg public/icons/items/carrot.svg public/icons/items/turnip.svg public/icons/items/boar-meat.svg
git commit -m "art: add pixel-art SVG icons for batch 1 cooking ingredients (6 items)"
```

---

### Task 8: Create Batch 1 SVG Icons — Tools & Weapons

**Files:**
- Create: `public/icons/items/hammer.svg`
- Create: `public/icons/items/hoe.svg`
- Create: `public/icons/items/stone-axe.svg`
- Create: `public/icons/items/flint-axe.svg`
- Create: `public/icons/items/antler-pickaxe.svg`
- Create: `public/icons/items/club.svg`
- Create: `public/icons/items/flint-knife.svg`
- Create: `public/icons/items/flint-spear.svg`
- Create: `public/icons/items/crude-bow.svg`
- Create: `public/icons/items/finewood-bow.svg`
- Create: `public/icons/items/wood-arrow.svg`
- Create: `public/icons/items/flinthead-arrow.svg`
- Create: `public/icons/items/fire-arrow.svg`

- [ ] **Step 1: Create hammer.svg**

Wooden handle with stone head. Colors: handle `#A0722A`, head `#808080`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="20" width="4" height="24" fill="#A0722A"/>
  <rect x="12" y="8" width="24" height="14" fill="#808080"/>
  <rect x="14" y="10" width="20" height="2" fill="#999"/>
  <rect x="20" y="20" width="2" height="24" fill="#8B6914"/>
</svg>
```

- [ ] **Step 2: Create hoe.svg**

Long handle with flat metal blade. Colors: handle `#A0722A`, blade `#808080`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="12" width="4" height="32" fill="#A0722A"/>
  <rect x="20" y="12" width="2" height="32" fill="#8B6914"/>
  <rect x="10" y="4" width="28" height="10" fill="#808080"/>
  <rect x="12" y="6" width="24" height="2" fill="#999"/>
</svg>
```

- [ ] **Step 3: Create stone-axe.svg**

Crude stone head on wooden handle. Colors: handle `#A0722A`, stone `#808080`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="18" width="4" height="26" fill="#A0722A"/>
  <rect x="20" y="18" width="2" height="26" fill="#8B6914"/>
  <polygon points="14,4 34,4 38,18 26,22 22,22 10,18" fill="#808080"/>
  <polygon points="14,4 34,4 30,10 18,10" fill="#999"/>
</svg>
```

- [ ] **Step 4: Create flint-axe.svg**

Flint head, darker than stone axe. Colors: handle `#A0722A`, flint `#4A4A4A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="18" width="4" height="26" fill="#A0722A"/>
  <rect x="20" y="18" width="2" height="26" fill="#8B6914"/>
  <polygon points="14,4 34,4 38,18 26,22 22,22 10,18" fill="#4A4A4A"/>
  <polygon points="14,4 34,4 30,10 18,10" fill="#6A6A6A"/>
</svg>
```

- [ ] **Step 5: Create antler-pickaxe.svg**

Antler-tipped pick on wooden handle. Colors: handle `#A0722A`, antler `#C8B090`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="18" width="4" height="26" fill="#A0722A"/>
  <rect x="20" y="18" width="2" height="26" fill="#8B6914"/>
  <polygon points="6,10 42,10 38,18 26,20 22,20 10,18" fill="#C8B090"/>
  <polygon points="6,10 10,6 14,10" fill="#A89070"/>
  <polygon points="42,10 38,6 34,10" fill="#A89070"/>
  <rect x="14" y="12" width="20" height="2" fill="#DCC8A8"/>
</svg>
```

- [ ] **Step 6: Create club.svg**

Simple wooden club, thicker at top. Colors: `#8B6914` / `#A0722A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="26" width="4" height="18" fill="#8B6914"/>
  <polygon points="16,4 32,4 34,14 30,28 18,28 14,14" fill="#A0722A"/>
  <polygon points="16,4 32,4 30,10 18,10" fill="#BF8C3E"/>
  <rect x="20" y="16" width="2" height="2" fill="#8B6914"/>
  <rect x="26" y="20" width="2" height="2" fill="#8B6914"/>
</svg>
```

- [ ] **Step 7: Create flint-knife.svg**

Small dark flint blade with wrapped handle. Colors: blade `#4A4A4A`, handle `#8B6D4A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="24,4 32,20 28,24 20,24" fill="#4A4A4A"/>
  <polygon points="24,4 32,20 28,12" fill="#6A6A6A"/>
  <rect x="20" y="24" width="8" height="20" fill="#8B6D4A"/>
  <rect x="20" y="28" width="8" height="2" fill="#A89070"/>
  <rect x="20" y="34" width="8" height="2" fill="#A89070"/>
</svg>
```

- [ ] **Step 8: Create flint-spear.svg**

Long shaft with flint tip. Colors: shaft `#A0722A`, tip `#4A4A4A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="16" width="4" height="28" fill="#A0722A"/>
  <rect x="20" y="16" width="2" height="28" fill="#8B6914"/>
  <polygon points="24,2 30,16 24,18 18,16" fill="#4A4A4A"/>
  <polygon points="24,2 30,16 26,10" fill="#6A6A6A"/>
</svg>
```

- [ ] **Step 9: Create crude-bow.svg**

Simple curved wooden bow. Colors: `#A0722A`, string `#C8C0A8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <path d="M32,4 Q12,24 32,44" fill="none" stroke="#A0722A" stroke-width="4"/>
  <line x1="32" y1="4" x2="32" y2="44" stroke="#C8C0A8" stroke-width="1.5"/>
  <rect x="30" y="2" width="4" height="4" fill="#8B6914"/>
  <rect x="30" y="42" width="4" height="4" fill="#8B6914"/>
</svg>
```

- [ ] **Step 10: Create finewood-bow.svg**

Smoother, lighter wood bow. Colors: `#D4B060`, string `#C8C0A8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <path d="M32,4 Q10,24 32,44" fill="none" stroke="#D4B060" stroke-width="4"/>
  <line x1="32" y1="4" x2="32" y2="44" stroke="#C8C0A8" stroke-width="1.5"/>
  <rect x="30" y="2" width="4" height="4" fill="#C4A050"/>
  <rect x="30" y="42" width="4" height="4" fill="#C4A050"/>
</svg>
```

- [ ] **Step 11: Create wood-arrow.svg**

Simple arrow with wood tip. Colors: shaft `#A0722A`, tip `#8B6914`, feathers `#E8E8E8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="12" width="4" height="28" fill="#A0722A"/>
  <polygon points="24,2 30,14 24,12 18,14" fill="#8B6914"/>
  <polygon points="18,40 22,36 22,44" fill="#E8E8E8"/>
  <polygon points="30,40 26,36 26,44" fill="#E8E8E8"/>
</svg>
```

- [ ] **Step 12: Create flinthead-arrow.svg**

Arrow with dark flint tip. Colors: shaft `#A0722A`, tip `#4A4A4A`, feathers `#E8E8E8`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="12" width="4" height="28" fill="#A0722A"/>
  <polygon points="24,2 30,14 24,12 18,14" fill="#4A4A4A"/>
  <polygon points="18,40 22,36 22,44" fill="#E8E8E8"/>
  <polygon points="30,40 26,36 26,44" fill="#E8E8E8"/>
</svg>
```

- [ ] **Step 13: Create fire-arrow.svg**

Arrow with flame at tip. Colors: shaft `#A0722A`, flame `#E87830` / `#FFD040`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="16" width="4" height="24" fill="#A0722A"/>
  <polygon points="24,6 30,16 24,14 18,16" fill="#4A4A4A"/>
  <polygon points="24,2 28,10 24,8 20,10" fill="#E87830"/>
  <polygon points="24,0 26,6 24,4 22,6" fill="#FFD040"/>
  <polygon points="18,40 22,36 22,44" fill="#E8E8E8"/>
  <polygon points="30,40 26,36 26,44" fill="#E8E8E8"/>
</svg>
```

- [ ] **Step 14: Commit tools and weapons icons**

```bash
git add public/icons/items/hammer.svg public/icons/items/hoe.svg public/icons/items/stone-axe.svg public/icons/items/flint-axe.svg public/icons/items/antler-pickaxe.svg public/icons/items/club.svg public/icons/items/flint-knife.svg public/icons/items/flint-spear.svg public/icons/items/crude-bow.svg public/icons/items/finewood-bow.svg public/icons/items/wood-arrow.svg public/icons/items/flinthead-arrow.svg public/icons/items/fire-arrow.svg
git commit -m "art: add pixel-art SVG icons for batch 1 tools and weapons (13 items)"
```

---

### Task 9: Create Batch 1 SVG Icons — Armor, Shields, and Food

**Files:**
- Create: `public/icons/items/leather-helmet.svg`
- Create: `public/icons/items/leather-tunic.svg`
- Create: `public/icons/items/leather-pants.svg`
- Create: `public/icons/items/deer-hide-cape.svg`
- Create: `public/icons/items/wood-shield.svg`
- Create: `public/icons/items/wood-tower-shield.svg`
- Create: `public/icons/items/bone-tower-shield.svg`
- Create: `public/icons/items/queens-jam.svg`
- Create: `public/icons/items/carrot-soup.svg`
- Create: `public/icons/items/turnip-stew.svg`

- [ ] **Step 1: Create leather-helmet.svg**

Simple leather cap. Colors: `#8B6D4A` / `#7A5C3A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="8,28 14,10 34,10 40,28 38,34 10,34" fill="#8B6D4A"/>
  <polygon points="14,10 34,10 30,18 18,18" fill="#9A7C5A"/>
  <rect x="10" y="28" width="28" height="4" fill="#7A5C3A"/>
</svg>
```

- [ ] **Step 2: Create leather-tunic.svg**

Simple torso armor. Colors: `#8B6D4A` / `#7A5C3A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="14,4 34,4 38,16 38,42 28,44 20,44 10,42 10,16" fill="#8B6D4A"/>
  <polygon points="14,4 10,16 4,12 8,4" fill="#7A5C3A"/>
  <polygon points="34,4 38,16 44,12 40,4" fill="#7A5C3A"/>
  <rect x="20" y="14" width="8" height="2" fill="#9A7C5A"/>
  <rect x="22" y="20" width="4" height="12" fill="#7A5C3A"/>
</svg>
```

- [ ] **Step 3: Create leather-pants.svg**

Simple leg armor. Colors: `#8B6D4A` / `#7A5C3A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="12,4 36,4 38,16 34,44 28,44 24,24 20,44 14,44 10,16" fill="#8B6D4A"/>
  <rect x="12" y="4" width="24" height="4" fill="#7A5C3A"/>
  <rect x="16" y="14" width="6" height="2" fill="#9A7C5A"/>
  <rect x="26" y="14" width="6" height="2" fill="#9A7C5A"/>
</svg>
```

- [ ] **Step 4: Create deer-hide-cape.svg**

Draped cape with spotted pattern. Colors: `#C4956A` / `#A06030`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="12,4 36,4 42,42 6,42" fill="#C4956A"/>
  <polygon points="12,4 36,4 32,12 16,12" fill="#D4A87A"/>
  <rect x="18" y="18" width="4" height="4" fill="#A06030"/>
  <rect x="28" y="24" width="4" height="4" fill="#A06030"/>
  <rect x="16" y="32" width="4" height="4" fill="#A06030"/>
  <rect x="26" y="34" width="4" height="4" fill="#A06030"/>
</svg>
```

- [ ] **Step 5: Create wood-shield.svg**

Round wooden shield. Colors: wood `#A0722A`, rim `#8B6914`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="20" fill="#A0722A"/>
  <circle cx="24" cy="24" r="18" fill="#BF8C3E"/>
  <circle cx="24" cy="24" r="4" fill="#8B6914"/>
  <rect x="4" y="22" width="40" height="4" fill="#8B6914"/>
  <rect x="22" y="4" width="4" height="40" fill="#8B6914"/>
</svg>
```

- [ ] **Step 6: Create wood-tower-shield.svg**

Tall rectangular wooden shield. Colors: wood `#A0722A`, bands `#8B6914`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="10" y="2" width="28" height="44" rx="4" fill="#A0722A"/>
  <rect x="12" y="4" width="24" height="40" rx="2" fill="#BF8C3E"/>
  <rect x="10" y="14" width="28" height="4" fill="#8B6914"/>
  <rect x="10" y="30" width="28" height="4" fill="#8B6914"/>
  <circle cx="24" cy="24" r="4" fill="#8B6914"/>
</svg>
```

- [ ] **Step 7: Create bone-tower-shield.svg**

Tall shield made of bones. Colors: bone `#E0D8C8`, binding `#8B6D4A`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="10" y="2" width="28" height="44" rx="4" fill="#C8C0A8"/>
  <rect x="12" y="4" width="24" height="40" rx="2" fill="#E0D8C8"/>
  <rect x="10" y="14" width="28" height="4" fill="#8B6D4A"/>
  <rect x="10" y="30" width="28" height="4" fill="#8B6D4A"/>
  <rect x="14" y="8" width="4" height="36" fill="#D0C8B8"/>
  <rect x="30" y="8" width="4" height="36" fill="#D0C8B8"/>
  <circle cx="24" cy="24" r="4" fill="#8B6D4A"/>
</svg>
```

- [ ] **Step 8: Create queens-jam.svg**

Jar of red jam. Colors: jar `#E8E8E8`, jam `#CC3344`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="14" y="14" width="20" height="28" rx="2" fill="#E8E8E8"/>
  <rect x="16" y="20" width="16" height="20" fill="#CC3344"/>
  <rect x="18" y="24" width="4" height="4" fill="#DD5566"/>
  <rect x="14" y="10" width="20" height="6" fill="#D4B060"/>
  <rect x="16" y="8" width="16" height="4" fill="#C4A050"/>
</svg>
```

- [ ] **Step 9: Create carrot-soup.svg**

Bowl of orange soup. Colors: bowl `#8B6D4A`, soup `#E87830`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="6,18 42,18 38,36 10,36" fill="#8B6D4A"/>
  <rect x="8" y="18" width="32" height="8" fill="#E87830"/>
  <rect x="10" y="20" width="8" height="2" fill="#F09040"/>
  <rect x="18" y="36" width="12" height="4" fill="#7A5C3A"/>
  <polygon points="6,16 42,16 42,20 6,20" fill="#9A7C5A"/>
</svg>
```

- [ ] **Step 10: Create turnip-stew.svg**

Bowl of purple stew. Colors: bowl `#8B6D4A`, stew `#8B5DA0`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <polygon points="6,18 42,18 38,36 10,36" fill="#8B6D4A"/>
  <rect x="8" y="18" width="32" height="8" fill="#8B5DA0"/>
  <rect x="10" y="20" width="8" height="2" fill="#A070B8"/>
  <rect x="18" y="36" width="12" height="4" fill="#7A5C3A"/>
  <polygon points="6,16 42,16 42,20 6,20" fill="#9A7C5A"/>
</svg>
```

- [ ] **Step 11: Commit armor, shields, and food icons**

```bash
git add public/icons/items/leather-helmet.svg public/icons/items/leather-tunic.svg public/icons/items/leather-pants.svg public/icons/items/deer-hide-cape.svg public/icons/items/wood-shield.svg public/icons/items/wood-tower-shield.svg public/icons/items/bone-tower-shield.svg public/icons/items/queens-jam.svg public/icons/items/carrot-soup.svg public/icons/items/turnip-stew.svg
git commit -m "art: add pixel-art SVG icons for batch 1 armor, shields, and food (10 items)"
```

---

### Task 10: E2E Smoke Test for Icons

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Read current E2E test**

Read `tests/e2e/smoke.spec.ts` to understand existing patterns.

- [ ] **Step 2: Add icon visibility test**

Add to `tests/e2e/smoke.spec.ts`:

```typescript
test('recipe row displays item icon when available', async ({ page }) => {
  await page.goto('/valheim/');
  // Find the first recipe row that has an icon
  const icon = page.locator('.item-icon--md').first();
  await expect(icon).toBeVisible();
  // Verify it's an img tag with an svg source
  await expect(icon).toHaveAttribute('src', /\/icons\/items\/.*\.svg$/);
});

test('ingredient chip displays icon when expanded', async ({ page }) => {
  await page.goto('/valheim/');
  // Click the first recipe row to expand it
  const firstRow = page.locator('.recipe-row').first();
  await firstRow.click();
  // Check for small icon in ingredient chip
  const chipIcon = page.locator('.recipe-row__detail .item-icon--sm').first();
  await expect(chipIcon).toBeVisible();
});
```

- [ ] **Step 3: Run E2E tests**

Run: `pnpm test:e2e`
Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: add E2E tests for item icon rendering"
```

---

### Task 11: Visual Review and Adjustments

- [ ] **Step 1: Start dev server and review**

Run: `pnpm dev`

Open the browser and verify:
- Recipe rows show 24px icons next to recipe names
- Expanded rows show 16px icons in ingredient chips
- Icons are crisp (not blurry) at both sizes
- No layout shift or misalignment
- Rows without icons render as before (text-only)

- [ ] **Step 2: Run full test suite**

Run: `pnpm test && pnpm test:e2e`
Expected: all tests PASS

- [ ] **Step 3: Final commit if any adjustments were needed**

Only commit if visual review revealed issues that required CSS/SVG tweaks.
