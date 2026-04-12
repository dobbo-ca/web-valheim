import pkg from 'lz-string';
const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = pkg;
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
// Cart URL encoding (lz-string)
// ---------------------------------------------------------------------------

/** Compress cart to a URL-safe string. Returns '' for empty cart. */
export function encodeCartUrl(cart: Cart): string {
  if (Object.keys(cart).length === 0) return '';
  return compressToEncodedURIComponent(JSON.stringify(cart));
}

/** Decompress and parse a cart string. Returns {} on any error. */
export function decodeCartUrl(encoded: string): Cart {
  try {
    if (!encoded) return {};
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return {};
    return JSON.parse(json) as Cart;
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
