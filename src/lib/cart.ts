import lzString from 'lz-string';
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = lzString;
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
 * Parse a cart key into base recipe ID and optional upgrade quality.
 * "iron-sword" → { baseId: "iron-sword", quality: undefined }
 * "iron-sword+2" → { baseId: "iron-sword", quality: 2 }
 */
export function parseCartKey(key: string): { baseId: string; quality?: number } {
  const plusIdx = key.lastIndexOf('+');
  if (plusIdx === -1) return { baseId: key };
  const suffix = key.slice(plusIdx + 1);
  const quality = Number.parseInt(suffix, 10);
  if (!Number.isFinite(quality) || quality <= 1) return { baseId: key };
  return { baseId: key.slice(0, plusIdx), quality };
}

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

  for (const [cartKey, cartQty] of Object.entries(cart)) {
    const { baseId, quality } = parseCartKey(cartKey);
    const recipe = recipesById.get(baseId);
    if (!recipe) continue;

    let ingredients: { itemId: string; qty: number }[];
    if (quality != null) {
      const upgrade = recipe.upgrades?.find((u) => u.quality === quality);
      if (!upgrade) continue;
      ingredients = upgrade.ingredients;
    } else {
      ingredients = recipe.ingredients;
    }

    for (const { itemId, qty } of ingredients) {
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
// Cart URL encoding (integer index + lz-string)
// ---------------------------------------------------------------------------

/**
 * Encode cart as a compact lz-string compressed URL component.
 *
 * Intermediate format: "index.qty,index.qty,..." where index is the recipe's
 * position in the sorted recipeIndex array. Qty of 1 omits the ".1" suffix.
 * The intermediate string is then compressed with lz-string for opaque URLs.
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
  return compressToEncodedURIComponent(parts.join(','));
}

/**
 * Decode an lz-string compressed cart string back to a Cart.
 *
 * @param encoded     The compressed string from the URL
 * @param recipeIndex Sorted array of all recipe IDs (same order used to encode)
 */
export function decodeCartUrl(encoded: string, recipeIndex: string[]): Cart {
  try {
    if (!encoded) return {};
    const raw = decompressFromEncodedURIComponent(encoded);
    if (!raw) return {};
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
