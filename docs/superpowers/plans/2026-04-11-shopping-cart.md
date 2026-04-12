# Shopping Cart & Grocery List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shopping cart that lets users select recipes with quantities, aggregates ingredients into a grocery list, and supports clipboard copy, localStorage persistence, and shareable compressed URLs.

**Architecture:** Cart state lives in a Solid.js `createStore` (`Record<string, number>`) created in `RecipeTable`. Cart logic (operations, grocery aggregation, persistence, URL encoding) lives in `src/lib/cart.ts`. Three new UI components: `CartButton`, `CartDrawer`, `AddToCartButton`. One new dependency: `lz-string` for URL compression.

**Tech Stack:** Solid.js (createStore), lz-string, Vitest, Playwright, vanilla CSS

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/cart.ts` | Cart operations, grocery aggregation, localStorage sync, URL encode/decode |
| Create | `src/components/AddToCartButton.tsx` | Per-row "+ Add" / "✓ In Cart" button |
| Create | `src/components/CartButton.tsx` | Floating cart badge (count + toggle drawer) |
| Create | `src/components/CartDrawer.tsx` | Slide-out drawer with cart items, grocery list, copy button |
| Modify | `src/components/RecipeTable.tsx` | Create cart store, wire up cart components |
| Modify | `src/components/RecipeRow.tsx` | Accept cart props, render AddToCartButton |
| Modify | `src/styles/theme.css` | Cart button, drawer, overlay, add-to-cart button styles |
| Create | `tests/cart.test.ts` | Unit tests for cart logic |
| Modify | `tests/e2e/smoke.spec.ts` | E2E tests for cart flow |

---

### Task 1: Install lz-string

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
pnpm add lz-string
```

- [ ] **Step 2: Install types**

```bash
pnpm add -D @types/lz-string
```

- [ ] **Step 3: Verify installation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors (types resolve correctly).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add lz-string for cart URL compression"
```

---

### Task 2: Cart logic — operations and grocery aggregation

**Files:**
- Create: `src/lib/cart.ts`
- Create: `tests/cart.test.ts`

- [ ] **Step 1: Write failing tests for cart operations**

Create `tests/cart.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  addToCart,
  removeFromCart,
  setQty,
  clearCart,
  aggregateGroceryList,
} from '../src/lib/cart';
import type { Recipe, Item } from '../src/lib/types';

describe('cart operations', () => {
  it('addToCart sets qty to 1 for new recipe', () => {
    const cart: Record<string, number> = {};
    expect(addToCart(cart, 'hammer')).toEqual({ hammer: 1 });
  });

  it('addToCart does not overwrite existing qty', () => {
    const cart: Record<string, number> = { hammer: 3 };
    expect(addToCart(cart, 'hammer')).toEqual({ hammer: 3 });
  });

  it('removeFromCart deletes the entry', () => {
    const cart: Record<string, number> = { hammer: 3, 'queens-jam': 5 };
    expect(removeFromCart(cart, 'hammer')).toEqual({ 'queens-jam': 5 });
  });

  it('removeFromCart on missing key is a no-op', () => {
    const cart: Record<string, number> = { hammer: 3 };
    expect(removeFromCart(cart, 'nope')).toEqual({ hammer: 3 });
  });

  it('setQty sets the quantity', () => {
    const cart: Record<string, number> = { hammer: 1 };
    expect(setQty(cart, 'hammer', 5)).toEqual({ hammer: 5 });
  });

  it('setQty removes entry when n <= 0', () => {
    const cart: Record<string, number> = { hammer: 3 };
    expect(setQty(cart, 'hammer', 0)).toEqual({});
  });

  it('clearCart returns empty object', () => {
    const cart: Record<string, number> = { hammer: 3, 'queens-jam': 5 };
    expect(clearCart()).toEqual({});
  });
});

const mockRecipes: Recipe[] = [
  {
    id: 'hammer',
    name: 'Hammer',
    type: 'crafting',
    station: 'workbench',
    stationLevel: 1,
    ingredients: [
      { itemId: 'wood', qty: 3 },
      { itemId: 'stone', qty: 2 },
    ],
  },
  {
    id: 'bronze-axe',
    name: 'Bronze Axe',
    type: 'crafting',
    station: 'forge',
    stationLevel: 1,
    ingredients: [
      { itemId: 'wood', qty: 4 },
      { itemId: 'bronze', qty: 8 },
    ],
  },
];

const mockItems: Item[] = [
  { id: 'wood', name: 'Wood', category: 'material' },
  { id: 'stone', name: 'Stone', category: 'material' },
  { id: 'bronze', name: 'Bronze', category: 'material' },
];

describe('aggregateGroceryList', () => {
  const recipesById = new Map(mockRecipes.map((r) => [r.id, r]));
  const itemsById = new Map(mockItems.map((i) => [i.id, i]));

  it('multiplies ingredients by cart qty', () => {
    const cart: Record<string, number> = { hammer: 3 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([
      { itemId: 'stone', name: 'Stone', qty: 6 },
      { itemId: 'wood', name: 'Wood', qty: 9 },
    ]);
  });

  it('merges shared ingredients across recipes', () => {
    const cart: Record<string, number> = { hammer: 2, 'bronze-axe': 1 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([
      { itemId: 'bronze', name: 'Bronze', qty: 8 },
      { itemId: 'stone', name: 'Stone', qty: 4 },
      { itemId: 'wood', name: 'Wood', qty: 10 },
    ]);
  });

  it('returns empty array for empty cart', () => {
    const result = aggregateGroceryList({}, recipesById, itemsById);
    expect(result).toEqual([]);
  });

  it('skips recipes not found in recipesById', () => {
    const cart: Record<string, number> = { 'nonexistent': 1 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([]);
  });

  it('sorts alphabetically by item name', () => {
    const cart: Record<string, number> = { 'bronze-axe': 1, hammer: 1 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    const names = result.map((g) => g.name);
    expect(names).toEqual(['Bronze', 'Stone', 'Wood']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/cart.test.ts
```

Expected: FAIL — `Cannot find module '../src/lib/cart'`.

- [ ] **Step 3: Implement cart.ts**

Create `src/lib/cart.ts`:

```ts
import type { Recipe, Item } from './types';

export interface GroceryItem {
  itemId: string;
  name: string;
  qty: number;
}

/**
 * Returns a new cart with the recipe added at qty 1.
 * If the recipe is already in the cart, returns the cart unchanged.
 */
export function addToCart(
  cart: Record<string, number>,
  recipeId: string,
): Record<string, number> {
  if (recipeId in cart) return cart;
  return { ...cart, [recipeId]: 1 };
}

/**
 * Returns a new cart with the recipe removed.
 */
export function removeFromCart(
  cart: Record<string, number>,
  recipeId: string,
): Record<string, number> {
  const { [recipeId]: _, ...rest } = cart;
  return rest;
}

/**
 * Returns a new cart with the recipe's qty set to n.
 * Removes the entry if n <= 0.
 */
export function setQty(
  cart: Record<string, number>,
  recipeId: string,
  n: number,
): Record<string, number> {
  if (n <= 0) return removeFromCart(cart, recipeId);
  return { ...cart, [recipeId]: n };
}

/**
 * Returns an empty cart.
 */
export function clearCart(): Record<string, number> {
  return {};
}

/**
 * Aggregates ingredients across all cart recipes, multiplied by quantity.
 * Returns a sorted array of GroceryItems (alphabetical by name).
 */
export function aggregateGroceryList(
  cart: Record<string, number>,
  recipesById: Map<string, Recipe>,
  itemsById: Map<string, Item>,
): GroceryItem[] {
  const totals = new Map<string, number>();

  for (const [recipeId, qty] of Object.entries(cart)) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      totals.set(ing.itemId, (totals.get(ing.itemId) ?? 0) + ing.qty * qty);
    }
  }

  const result: GroceryItem[] = [];
  for (const [itemId, qty] of totals) {
    const name = itemsById.get(itemId)?.name ?? itemId;
    result.push({ itemId, name, qty });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/cart.test.ts
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts tests/cart.test.ts
git commit -m "feat: add cart operations and grocery list aggregation"
```

---

### Task 3: Cart URL encoding with lz-string

**Files:**
- Modify: `src/lib/cart.ts`
- Modify: `tests/cart.test.ts`

- [ ] **Step 1: Write failing tests for URL encoding**

Append to `tests/cart.test.ts`:

```ts
import { encodeCartUrl, decodeCartUrl } from '../src/lib/cart';

describe('cart URL encoding', () => {
  it('round-trips a cart through compress/decompress', () => {
    const cart: Record<string, number> = { hammer: 3, 'queens-jam': 5 };
    const encoded = encodeCartUrl(cart);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
    expect(decodeCartUrl(encoded)).toEqual(cart);
  });

  it('produces a URL-safe string (no &, =, ?, or spaces)', () => {
    const cart: Record<string, number> = { hammer: 3, 'queens-jam': 5 };
    const encoded = encodeCartUrl(cart);
    expect(encoded).not.toMatch(/[&=? ]/);
  });

  it('returns empty object for null/undefined/empty input', () => {
    expect(decodeCartUrl(null)).toEqual({});
    expect(decodeCartUrl('')).toEqual({});
  });

  it('returns empty object for corrupted input', () => {
    expect(decodeCartUrl('not-valid-compressed-data')).toEqual({});
  });

  it('encodeCartUrl returns empty string for empty cart', () => {
    expect(encodeCartUrl({})).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run tests/cart.test.ts
```

Expected: FAIL — `encodeCartUrl` and `decodeCartUrl` not exported.

- [ ] **Step 3: Implement URL encoding functions**

Add to the top of `src/lib/cart.ts`, after the existing imports:

```ts
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
```

Add at the bottom of `src/lib/cart.ts`:

```ts
/**
 * Compresses a cart to a URL-safe string using lz-string.
 * Returns empty string for an empty cart.
 */
export function encodeCartUrl(cart: Record<string, number>): string {
  const keys = Object.keys(cart);
  if (keys.length === 0) return '';
  return compressToEncodedURIComponent(JSON.stringify(cart));
}

/**
 * Decompresses a cart from a URL-safe string.
 * Returns empty object on invalid/empty input.
 */
export function decodeCartUrl(encoded: string | null | undefined): Record<string, number> {
  if (!encoded) return {};
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return {};
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/cart.test.ts
```

Expected: all 15 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts tests/cart.test.ts
git commit -m "feat: add lz-string cart URL encoding/decoding"
```

---

### Task 4: Grocery list formatting for clipboard

**Files:**
- Modify: `src/lib/cart.ts`
- Modify: `tests/cart.test.ts`

- [ ] **Step 1: Write failing test for formatGroceryList**

Append to `tests/cart.test.ts`:

```ts
import { formatGroceryList } from '../src/lib/cart';
import type { GroceryItem } from '../src/lib/cart';

describe('formatGroceryList', () => {
  it('formats items as "Name ×qty" lines', () => {
    const items: GroceryItem[] = [
      { itemId: 'bronze', name: 'Bronze', qty: 8 },
      { itemId: 'stone', name: 'Stone', qty: 4 },
      { itemId: 'wood', name: 'Wood', qty: 10 },
    ];
    expect(formatGroceryList(items)).toBe('Bronze ×8\nStone ×4\nWood ×10');
  });

  it('returns empty string for empty list', () => {
    expect(formatGroceryList([])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run tests/cart.test.ts
```

Expected: FAIL — `formatGroceryList` not exported.

- [ ] **Step 3: Implement formatGroceryList**

Add at the bottom of `src/lib/cart.ts`:

```ts
/**
 * Formats a grocery list as a plain-text string for clipboard copy.
 * One line per item: "Name ×qty"
 */
export function formatGroceryList(items: GroceryItem[]): string {
  return items.map((i) => `${i.name} ×${i.qty}`).join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run tests/cart.test.ts
```

Expected: all 17 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts tests/cart.test.ts
git commit -m "feat: add grocery list clipboard formatting"
```

---

### Task 5: AddToCartButton component

**Files:**
- Create: `src/components/AddToCartButton.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the component**

Create `src/components/AddToCartButton.tsx`:

```tsx
import type { Component } from 'solid-js';

interface Props {
  inCart: boolean;
  onAdd: () => void;
  onOpenCart: () => void;
}

export const AddToCartButton: Component<Props> = (props) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.inCart) {
      props.onOpenCart();
    } else {
      props.onAdd();
    }
  };

  return (
    <button
      type="button"
      class="add-to-cart-btn"
      classList={{ 'add-to-cart-btn--in-cart': props.inCart }}
      onClick={handleClick}
      aria-label={props.inCart ? 'In cart — click to view' : 'Add to cart'}
    >
      {props.inCart ? '✓ In Cart' : '+ Add'}
    </button>
  );
};
```

- [ ] **Step 2: Add CSS styles**

Add the following at the end of `src/styles/theme.css`:

```css
/* ===== Add to cart button ===== */
.add-to-cart-btn {
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.add-to-cart-btn:hover {
  background: var(--accent);
  color: var(--bg);
}
.add-to-cart-btn--in-cart {
  background: color-mix(in oklch, var(--success) 18%, transparent);
  border-color: var(--success);
  color: var(--success);
}
.add-to-cart-btn--in-cart:hover {
  background: var(--success);
  color: var(--bg);
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AddToCartButton.tsx src/styles/theme.css
git commit -m "feat: add AddToCartButton component"
```

---

### Task 6: CartButton component (floating badge)

**Files:**
- Create: `src/components/CartButton.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the component**

Create `src/components/CartButton.tsx`:

```tsx
import { Show, type Component } from 'solid-js';

interface Props {
  count: number;
  onClick: () => void;
}

export const CartButton: Component<Props> = (props) => {
  return (
    <Show when={props.count > 0}>
      <button
        type="button"
        class="cart-badge"
        onClick={props.onClick}
        aria-label={`Shopping cart: ${props.count} recipe${props.count === 1 ? '' : 's'}`}
      >
        <span class="cart-badge__icon" aria-hidden="true">🛒</span>
        <span class="cart-badge__count">{props.count}</span>
      </button>
    </Show>
  );
};
```

- [ ] **Step 2: Add CSS styles**

Append to `src/styles/theme.css`:

```css
/* ===== Cart badge ===== */
.cart-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.cart-badge:hover {
  opacity: 0.85;
}
.cart-badge__icon {
  font-size: 14px;
}
.cart-badge__count {
  min-width: 14px;
  text-align: center;
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CartButton.tsx src/styles/theme.css
git commit -m "feat: add CartButton floating badge component"
```

---

### Task 7: CartDrawer component

**Files:**
- Create: `src/components/CartDrawer.tsx`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the component**

Create `src/components/CartDrawer.tsx`:

```tsx
import { For, Show, createSignal, type Component } from 'solid-js';
import type { GroceryItem } from '../lib/cart';
import { formatGroceryList } from '../lib/cart';

interface CartEntry {
  recipeId: string;
  recipeName: string;
  qty: number;
}

interface Props {
  open: boolean;
  entries: CartEntry[];
  groceryList: GroceryItem[];
  onClose: () => void;
  onSetQty: (recipeId: string, qty: number) => void;
  onRemove: (recipeId: string) => void;
  onClear: () => void;
}

export const CartDrawer: Component<Props> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    const text = formatGroceryList(props.groceryList);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('cart-drawer__overlay')) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <div class="cart-drawer__overlay" onClick={handleOverlayClick}>
        <div class="cart-drawer" role="dialog" aria-label="Shopping cart">
          <div class="cart-drawer__header">
            <h2 class="cart-drawer__title">Cart</h2>
            <button
              type="button"
              class="cart-drawer__close"
              onClick={props.onClose}
              aria-label="Close cart"
            >
              ✕
            </button>
          </div>

          <div class="cart-drawer__body">
            <div class="cart-drawer__items">
              <For each={props.entries}>
                {(entry) => (
                  <div class="cart-drawer__item">
                    <span class="cart-drawer__item-name">{entry.recipeName}</span>
                    <div class="cart-drawer__qty-controls">
                      <button
                        type="button"
                        class="cart-drawer__qty-btn"
                        onClick={() => props.onSetQty(entry.recipeId, entry.qty - 1)}
                        aria-label={`Decrease ${entry.recipeName} quantity`}
                      >
                        −
                      </button>
                      <span class="cart-drawer__qty-value">{entry.qty}</span>
                      <button
                        type="button"
                        class="cart-drawer__qty-btn"
                        onClick={() => props.onSetQty(entry.recipeId, entry.qty + 1)}
                        aria-label={`Increase ${entry.recipeName} quantity`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        class="cart-drawer__remove-btn"
                        onClick={() => props.onRemove(entry.recipeId)}
                        aria-label={`Remove ${entry.recipeName} from cart`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={props.groceryList.length > 0}>
              <div class="cart-drawer__divider" />
              <div class="cart-drawer__grocery">
                <h3 class="cart-drawer__grocery-title">Grocery List</h3>
                <For each={props.groceryList}>
                  {(item) => (
                    <div class="cart-drawer__grocery-item">
                      <span>{item.name}</span>
                      <span class="cart-drawer__grocery-qty">×{item.qty}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="cart-drawer__footer">
            <button
              type="button"
              class="cart-drawer__copy-btn"
              onClick={handleCopy}
              disabled={props.groceryList.length === 0}
            >
              {copied() ? 'Copied!' : 'Copy Grocery List'}
            </button>
            <button
              type="button"
              class="cart-drawer__clear-btn"
              onClick={props.onClear}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
```

- [ ] **Step 2: Add CSS styles**

Append to `src/styles/theme.css`:

```css
/* ===== Cart drawer ===== */
.cart-drawer__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
}
.cart-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  max-width: 90vw;
  background: var(--surface);
  border-left: 2px solid var(--accent);
  display: flex;
  flex-direction: column;
  z-index: 101;
  animation: cart-slide-in 0.2s ease-out;
}
@keyframes cart-slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.cart-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}
.cart-drawer__title {
  font-size: 16px;
  margin: 0;
}
.cart-drawer__close {
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}
.cart-drawer__close:hover {
  color: var(--text);
}
.cart-drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.cart-drawer__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft);
}
.cart-drawer__item-name {
  font-size: 13px;
  font-weight: 500;
}
.cart-drawer__qty-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.cart-drawer__qty-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
}
.cart-drawer__qty-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.cart-drawer__qty-value {
  min-width: 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}
.cart-drawer__remove-btn {
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  margin-left: 4px;
}
.cart-drawer__remove-btn:hover {
  color: var(--danger);
}
.cart-drawer__divider {
  height: 2px;
  background: var(--accent);
  margin: 16px 0;
}
.cart-drawer__grocery-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
  margin: 0 0 8px;
}
.cart-drawer__grocery-item {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 13px;
}
.cart-drawer__grocery-qty {
  color: var(--success);
  font-weight: 600;
}
.cart-drawer__footer {
  padding: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cart-drawer__copy-btn {
  width: 100%;
  padding: 10px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: var(--radius);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.cart-drawer__copy-btn:hover:not(:disabled) {
  opacity: 0.85;
}
.cart-drawer__copy-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.cart-drawer__clear-btn {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-soft);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.cart-drawer__clear-btn:hover {
  border-color: var(--danger);
  color: var(--danger);
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CartDrawer.tsx src/styles/theme.css
git commit -m "feat: add CartDrawer slide-out component"
```

---

### Task 8: Wire cart into RecipeTable and RecipeRow

**Files:**
- Modify: `src/components/RecipeTable.tsx`
- Modify: `src/components/RecipeRow.tsx`

- [ ] **Step 1: Update RecipeRow to accept cart props**

Replace the full contents of `src/components/RecipeRow.tsx` with:

```tsx
import { For, Show, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { IngredientChip } from './IngredientChip';
import { AddToCartButton } from './AddToCartButton';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  inCart: boolean;
  onToggle: (recipeId: string) => void;
  onIngredientClick: (itemId: string) => void;
  onAddToCart: (recipeId: string) => void;
  onOpenCart: () => void;
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
  return (
    <>
      <div class="recipe-row__wrapper" role="row">
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
        <div class="recipe-row__cart-cell">
          <AddToCartButton
            inCart={props.inCart}
            onAdd={() => props.onAddToCart(props.recipe.id)}
            onOpenCart={props.onOpenCart}
          />
        </div>
      </div>

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

- [ ] **Step 2: Update theme.css for the new row layout**

Find this rule in `src/styles/theme.css`:

```css
.recipe-table__header,
.recipe-row {
  display: grid;
  grid-template-columns: 2fr 1fr 60px 3fr;
  gap: 12px;
  padding: 10px 14px;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid var(--border-soft);
}
```

Replace with:

```css
.recipe-table__header {
  display: grid;
  grid-template-columns: 2fr 1fr 60px 3fr auto;
  gap: 12px;
  padding: 10px 14px;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid var(--border-soft);
}
.recipe-row__wrapper {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  border-bottom: 1px solid var(--border-soft);
}
.recipe-row {
  display: grid;
  grid-template-columns: 2fr 1fr 60px 3fr;
  gap: 12px;
  padding: 10px 14px;
  align-items: center;
  font-size: 13px;
}
.recipe-row__cart-cell {
  padding-right: 14px;
}
```

- [ ] **Step 3: Update RecipeTable to create cart store and wire everything**

Replace the full contents of `src/components/RecipeTable.tsx` with:

```tsx
import { For, Show, createEffect, createMemo, createSignal, onMount, type Component } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type { DataSet } from '../lib/loader';
import type { FilterState } from '../lib/filter';
import { filterRecipes, emptyFilterState } from '../lib/filter';
import { decodeFilterState, encodeFilterState } from '../lib/url-state';
import {
  addToCart,
  removeFromCart,
  setQty,
  clearCart,
  aggregateGroceryList,
  encodeCartUrl,
  decodeCartUrl,
} from '../lib/cart';
import { FilterBar } from './FilterBar';
import { RecipeRow } from './RecipeRow';
import { CartButton } from './CartButton';
import { CartDrawer } from './CartDrawer';

type SortKey = 'name' | 'station' | 'level';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 50, 100] as const;
const CART_STORAGE_KEY = 'valheim-cart';

interface Props {
  data: DataSet;
  baseHref: string;
}

export const RecipeTable: Component<Props> = (props) => {
  const [state, setState] = createSignal<FilterState>(emptyFilterState);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [sortDir, setSortDir] = createSignal<SortDir>('asc');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal<number>(20);
  const [cart, setCart] = createStore<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = createSignal(false);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setState(decodeFilterState(params));

    // Hydrate cart: URL param takes precedence over localStorage
    const cartParam = params.get('cart');
    if (cartParam) {
      setCart(reconcile(decodeCartUrl(cartParam)));
    } else {
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            setCart(reconcile(parsed));
          }
        }
      } catch {
        // ignore corrupt localStorage
      }
    }
  });

  const cartKeys = createMemo(() => Object.keys(cart));
  const cartCount = createMemo(() => cartKeys().length);

  // Persist cart to localStorage and URL on every change
  createEffect(() => {
    const snapshot: Record<string, number> = {};
    for (const key of cartKeys()) {
      snapshot[key] = cart[key];
    }

    // localStorage
    if (cartKeys().length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
    } else {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(snapshot));
    }

    // URL
    const params = new URLSearchParams(window.location.search);
    const encoded = encodeCartUrl(snapshot);
    if (encoded) {
      params.set('cart', encoded);
    } else {
      params.delete('cart');
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  });

  const itemsById = createMemo(
    () => new Map(props.data.items.map((i) => [i.id, i])),
  );

  const stationsById = createMemo(
    () => new Map(props.data.stations.map((s) => [s.id, s])),
  );

  const recipesById = createMemo(
    () => new Map(props.data.recipes.map((r) => [r.id, r])),
  );

  const filtered = createMemo(() => filterRecipes(props.data.recipes, state()));

  const sorted = createMemo(() => {
    const key = sortKey();
    const rows = filtered();
    if (!key) return rows;
    const dir = sortDir() === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (key === 'name') {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      } else if (key === 'station') {
        av = (stationsById().get(a.station)?.name ?? a.station).toLowerCase();
        bv = (stationsById().get(b.station)?.name ?? b.station).toLowerCase();
      } else {
        av = a.stationLevel;
        bv = b.stationLevel;
      }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(sorted().length / pageSize())),
  );

  const clampedPage = createMemo(() => Math.min(page(), totalPages()));

  const paginated = createMemo(() => {
    const p = clampedPage();
    const size = pageSize();
    return sorted().slice((p - 1) * size, p * size);
  });

  const visiblePages = createMemo((): (number | null)[] => {
    const total = totalPages();
    const cur = clampedPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, total]);
    for (let i = Math.max(1, cur - 1); i <= Math.min(total, cur + 1); i++) set.add(i);
    const nums = [...set].sort((a, b) => a - b);
    const result: (number | null)[] = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) result.push(null);
      result.push(n);
      prev = n;
    }
    return result;
  });

  const groceryList = createMemo(() =>
    aggregateGroceryList(
      // Build a plain object snapshot from the store for the pure function
      Object.fromEntries(cartKeys().map((k) => [k, cart[k]])),
      recipesById(),
      itemsById(),
    ),
  );

  const cartEntries = createMemo(() =>
    cartKeys().map((id) => ({
      recipeId: id,
      recipeName: recipesById().get(id)?.name ?? id,
      qty: cart[id],
    })),
  );

  const commit = (next: FilterState) => {
    setState(next);
    setPage(1);
    const params = encodeFilterState(next);
    // Preserve cart param
    const encoded = encodeCartUrl(
      Object.fromEntries(cartKeys().map((k) => [k, cart[k]])),
    );
    if (encoded) params.set('cart', encoded);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey() !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir() === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey() !== key) return ' ⇅';
    return sortDir() === 'asc' ? ' ▲' : ' ▼';
  };

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const addIngredient = (itemId: string) => {
    const current = state().ingredientIds;
    if (current.includes(itemId)) return;
    commit({ ...state(), ingredientIds: [...current, itemId] });
  };

  const removeIngredient = (itemId: string) => {
    const current = state();
    commit({
      ...current,
      ingredientIds: current.ingredientIds.filter((id) => id !== itemId),
    });
  };

  const handleAddToCart = (recipeId: string) => {
    setCart(reconcile(addToCart(Object.fromEntries(cartKeys().map((k) => [k, cart[k]])), recipeId)));
  };

  const handleSetQty = (recipeId: string, qty: number) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    const next = setQty(snapshot, recipeId, qty);
    setCart(reconcile(next));
    // Auto-close drawer if cart becomes empty
    if (Object.keys(next).length === 0) {
      setDrawerOpen(false);
    }
  };

  const handleRemoveFromCart = (recipeId: string) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    const next = removeFromCart(snapshot, recipeId);
    setCart(reconcile(next));
    if (Object.keys(next).length === 0) {
      setDrawerOpen(false);
    }
  };

  const handleClearCart = () => {
    setCart(reconcile(clearCart()));
    setDrawerOpen(false);
  };

  const activeIngredientLabel = (id: string) =>
    itemsById().get(id)?.name ?? id;

  const start = () => (clampedPage() - 1) * pageSize() + 1;
  const end = () => Math.min(clampedPage() * pageSize(), sorted().length);

  return (
    <div class="recipe-table">
      <div class="recipe-table__toolbar">
        <FilterBar state={state()} stations={props.data.stations} onChange={commit} />
        <CartButton count={cartCount()} onClick={() => setDrawerOpen(!drawerOpen())} />
      </div>

      <Show when={state().ingredientIds.length > 0}>
        <div class="reverse-lookup-strip">
          <span class="label">Uses ingredient:</span>
          <For each={state().ingredientIds}>
            {(id) => (
              <button
                type="button"
                class="chip chip--active-filter"
                aria-label={`Remove ${activeIngredientLabel(id)} from ingredient filter`}
                onClick={() => removeIngredient(id)}
              >
                {activeIngredientLabel(id)} ✕
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class="recipe-table__grid" role="table">
        <div class="recipe-table__header" role="row">
          <span role="columnheader" aria-sort={sortKey() === 'name' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'name' }} onClick={() => toggleSort('name')}>
              Name{sortIndicator('name')}
            </button>
          </span>
          <span role="columnheader" aria-sort={sortKey() === 'station' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'station' }} onClick={() => toggleSort('station')}>
              Station{sortIndicator('station')}
            </button>
          </span>
          <span role="columnheader" aria-sort={sortKey() === 'level' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'level' }} onClick={() => toggleSort('level')}>
              Lvl{sortIndicator('level')}
            </button>
          </span>
          <span role="columnheader">Ingredients</span>
          <span role="columnheader" class="sr-only">Cart</span>
        </div>

        <For each={paginated()} fallback={<div class="recipe-table__empty">No recipes match these filters.</div>}>
          {(recipe) => (
            <RecipeRow
              recipe={recipe}
              itemsById={itemsById()}
              stationsById={stationsById()}
              expanded={expandedId() === recipe.id}
              baseHref={props.baseHref}
              inCart={cart[recipe.id] != null}
              onToggle={toggleRow}
              onIngredientClick={addIngredient}
              onAddToCart={handleAddToCart}
              onOpenCart={() => setDrawerOpen(true)}
            />
          )}
        </For>
      </div>

      <div class="recipe-table__footer">
        <span>
          {sorted().length === 0
            ? 'No recipes match these filters.'
            : `${start()}–${end()} of ${sorted().length} recipes`}
        </span>

        <Show when={totalPages() > 1}>
          <div class="recipe-table__pagination">
            <button
              class="recipe-table__page-btn"
              disabled={clampedPage() === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>

            <For each={visiblePages()}>
              {(p) =>
                p === null ? (
                  <span class="recipe-table__page-ellipsis">…</span>
                ) : (
                  <button
                    class="recipe-table__page-btn"
                    classList={{ 'recipe-table__page-btn--active': p === clampedPage() }}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === clampedPage() ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              }
            </For>

            <button
              class="recipe-table__page-btn"
              disabled={clampedPage() === totalPages()}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </Show>

        <div class="recipe-table__page-size">
          <span>Per page:</span>
          <For each={PAGE_SIZES}>
            {(size) => (
              <button
                class="recipe-table__page-btn"
                classList={{ 'recipe-table__page-btn--active': pageSize() === size }}
                onClick={() => { setPageSize(size); setPage(1); }}
              >
                {size}
              </button>
            )}
          </For>
        </div>
      </div>

      <CartDrawer
        open={drawerOpen()}
        entries={cartEntries()}
        groceryList={groceryList()}
        onClose={() => setDrawerOpen(false)}
        onSetQty={handleSetQty}
        onRemove={handleRemoveFromCart}
        onClear={handleClearCart}
      />
    </div>
  );
};
```

- [ ] **Step 3: Add toolbar CSS**

Append to `src/styles/theme.css`:

```css
/* ===== Recipe table toolbar ===== */
.recipe-table__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.recipe-table__toolbar .filter-bar {
  margin-bottom: 0;
}
```

- [ ] **Step 4: Verify typecheck passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Run all unit tests**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Manually verify in browser**

```bash
pnpm dev
```

Open the app. Verify:
- "+ Add" buttons appear in each recipe row
- Clicking "+ Add" shows the cart badge
- Clicking the badge opens the drawer
- Quantity controls work (−/+)
- Grocery list updates in real-time
- Removing last item closes drawer
- "Copy Grocery List" copies to clipboard
- Refreshing the page preserves the cart (localStorage)
- The URL contains a `?cart=` param

- [ ] **Step 7: Commit**

```bash
git add src/components/RecipeTable.tsx src/components/RecipeRow.tsx src/styles/theme.css
git commit -m "feat: wire cart store into RecipeTable and RecipeRow"
```

---

### Task 9: E2E tests for cart

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Add cart E2E tests**

Append the following test block to `tests/e2e/smoke.spec.ts`, inside the existing `test.describe` block:

```ts
  test('adding a recipe shows cart badge', async ({ page }) => {
    await page.goto('/valheim/');
    // Cart badge should not be visible initially
    await expect(page.locator('.cart-badge')).not.toBeVisible();
    // Add first recipe to cart
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    // Cart badge should appear with count 1
    await expect(page.locator('.cart-badge')).toBeVisible();
    await expect(page.locator('.cart-badge__count')).toHaveText('1');
  });

  test('cart drawer opens and shows grocery list', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    // Add Hammer to cart
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    // Open drawer
    await page.locator('.cart-badge').click();
    // Drawer should be visible
    await expect(page.locator('.cart-drawer')).toBeVisible();
    // Should show Hammer in cart
    await expect(page.locator('.cart-drawer__item-name')).toHaveText('Hammer');
    // Should show grocery items
    await expect(page.locator('.cart-drawer__grocery-item')).toHaveCount(2); // Wood + Stone
  });

  test('quantity controls update grocery list', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.locator('.cart-badge').click();
    // Increase qty to 2
    await page.getByRole('button', { name: /Increase.*quantity/ }).click();
    await expect(page.locator('.cart-drawer__qty-value')).toHaveText('2');
  });

  test('cart URL state survives navigation', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    // Get the current URL with cart param
    const url = page.url();
    expect(url).toContain('cart=');
    // Navigate to the URL directly
    await page.goto(url);
    // Cart badge should still show
    await expect(page.locator('.cart-badge')).toBeVisible();
    await expect(page.locator('.cart-badge__count')).toHaveText('1');
  });

  test('clearing cart removes badge and closes drawer', async ({ page }) => {
    await page.goto('/valheim/?q=hammer');
    await page.getByRole('button', { name: 'Add to cart' }).first().click();
    await page.locator('.cart-badge').click();
    await page.getByRole('button', { name: 'Clear Cart' }).click();
    // Drawer should close and badge should disappear
    await expect(page.locator('.cart-drawer')).not.toBeVisible();
    await expect(page.locator('.cart-badge')).not.toBeVisible();
  });
```

- [ ] **Step 2: Build the site for E2E**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 3: Run E2E tests**

```bash
pnpm test:e2e
```

Expected: all tests PASS (both existing and new).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: add E2E tests for shopping cart"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full unit test suite**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Run E2E tests**

```bash
pnpm test:e2e
```

Expected: all tests PASS.

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Verify the full flow:
1. Add 2-3 different recipes to cart
2. Adjust quantities with −/+
3. Verify grocery list aggregates correctly (shared ingredients merge)
4. Copy grocery list and paste — verify flat format
5. Refresh page — cart persists
6. Copy URL and open in new tab — cart loads from URL
7. Clear cart — badge disappears, URL cleans up
