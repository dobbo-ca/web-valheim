import type { Item, Recipe } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Cart = Record<string, number>; // recipeId -> qty

export type GroceryItem = {
  itemId: string;
  name: string;
  qty: number;
};

// ---------------------------------------------------------------------------
// Cart operations (pure — always return a new cart)
// ---------------------------------------------------------------------------

/** Set qty to 1 if recipe is not already in the cart; no-op otherwise. */
export function addToCart(cart: Cart, recipeId: string): Cart {
  if (recipeId in cart) return cart;
  return { ...cart, [recipeId]: 1 };
}

/** Remove a recipe from the cart. */
export function removeFromCart(cart: Cart, recipeId: string): Cart {
  if (!(recipeId in cart)) return cart;
  const next = { ...cart };
  delete next[recipeId];
  return next;
}

/** Set the qty for a recipe; removes the entry if qty <= 0. */
export function setQty(cart: Cart, recipeId: string, n: number): Cart {
  if (n <= 0) return removeFromCart(cart, recipeId);
  return { ...cart, [recipeId]: n };
}

/** Return an empty cart. */
export function clearCart(): Cart {
  return {};
}

// ---------------------------------------------------------------------------
// Grocery aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate all recipe ingredients (multiplied by cart qty) into a sorted
 * list of GroceryItems.
 */
export function aggregateGroceryList(
  cart: Cart,
  recipesById: Map<string, Recipe>,
  itemsById: Map<string, Item>,
): GroceryItem[] {
  const totals = new Map<string, { name: string; qty: number }>();

  for (const [recipeId, cartQty] of Object.entries(cart)) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) continue;

    for (const { itemId, qty } of recipe.ingredients) {
      const item = itemsById.get(itemId);
      if (!item) continue;

      const existing = totals.get(itemId);
      if (existing) {
        existing.qty += qty * cartQty;
      } else {
        totals.set(itemId, { name: item.name, qty: qty * cartQty });
      }
    }
  }

  return Array.from(totals.entries())
    .map(([itemId, { name, qty }]) => ({ itemId, name, qty }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Cart URL encoding (integer index + base64url)
// ---------------------------------------------------------------------------

/**
 * Encode cart as a compact base64url string.
 *
 * Intermediate format: "index.qty,index.qty,..." where index is the recipe's
 * position in the sorted recipeIndex array. Qty of 1 omits the ".1" suffix.
 * The intermediate string is then base64url-encoded to keep URLs opaque.
 *
 * @param cart       The cart store (recipeId → qty)
 * @param recipeIndex Sorted array of all recipe IDs (deterministic ordering)
 */
export function encodeCartUrl(cart: Cart, recipeIndex: string[]): string {
  const entries = Object.entries(cart);
  if (entries.length === 0) return '';
  const idToIdx = new Map(recipeIndex.map((id, i) => [id, i]));
  const parts: string[] = [];
  for (const [recipeId, qty] of entries) {
    const idx = idToIdx.get(recipeId);
    if (idx == null) continue;
    parts.push(qty === 1 ? String(idx) : `${idx}.${qty}`);
  }
  if (parts.length === 0) return '';
  return btoa(parts.join(','))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64url cart string back to a Cart.
 *
 * @param encoded     The base64url string from the URL
 * @param recipeIndex Sorted array of all recipe IDs (same order used to encode)
 */
export function decodeCartUrl(encoded: string, recipeIndex: string[]): Cart {
  try {
    if (!encoded) return {};
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(padded);
    const cart: Cart = {};
    for (const part of raw.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const dotIdx = trimmed.indexOf('.');
      let idx: number;
      let qty: number;
      if (dotIdx === -1) {
        idx = Number.parseInt(trimmed, 10);
        qty = 1;
      } else {
        idx = Number.parseInt(trimmed.slice(0, dotIdx), 10);
        qty = Number.parseInt(trimmed.slice(dotIdx + 1), 10);
      }
      if (!Number.isFinite(idx) || !Number.isFinite(qty) || qty <= 0) continue;
      if (idx < 0 || idx >= recipeIndex.length) continue;
      cart[recipeIndex[idx]] = qty;
    }
    return cart;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Clipboard formatting
// ---------------------------------------------------------------------------

/** Format a grocery list as a human-readable string for clipboard copy. */
export function formatGroceryList(items: GroceryItem[]): string {
  if (items.length === 0) return '';
  return items.map((i) => `${i.name} \u00d7${i.qty}`).join('\n');
}
