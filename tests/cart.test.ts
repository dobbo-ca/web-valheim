import { describe, it, expect } from 'vitest';
import {
  addToCart,
  removeFromCart,
  setQty,
  clearCart,
  aggregateGroceryList,
  encodeCartUrl,
  decodeCartUrl,
  formatGroceryList,
  type Cart,
  type GroceryItem,
} from '../src/lib/cart';
import type { Recipe, Item } from '../src/lib/types';

// ---- helpers ----------------------------------------------------------------

const makeRecipe = (id: string, ingredients: { itemId: string; qty: number }[]): Recipe => ({
  id,
  name: `Recipe ${id}`,
  type: 'crafting',
  station: 'workbench',
  stationLevel: 1,
  ingredients,
});

const makeItem = (id: string, name: string): Item => ({
  id,
  name,
  category: 'material',
});

// ---- addToCart --------------------------------------------------------------

describe('addToCart', () => {
  it('adds a recipe with qty 1 when not present', () => {
    const cart = addToCart({}, 'recipe-1');
    expect(cart).toEqual({ 'recipe-1': 1 });
  });

  it('is a no-op when recipe already exists', () => {
    const cart: Cart = { 'recipe-1': 3 };
    const result = addToCart(cart, 'recipe-1');
    expect(result).toEqual({ 'recipe-1': 3 });
  });

  it('does not mutate the original cart', () => {
    const original: Cart = {};
    addToCart(original, 'recipe-1');
    expect(original).toEqual({});
  });
});

// ---- removeFromCart ---------------------------------------------------------

describe('removeFromCart', () => {
  it('removes an existing recipe', () => {
    const cart: Cart = { 'recipe-1': 2, 'recipe-2': 1 };
    expect(removeFromCart(cart, 'recipe-1')).toEqual({ 'recipe-2': 1 });
  });

  it('is a no-op when recipe is not in cart', () => {
    const cart: Cart = { 'recipe-2': 1 };
    expect(removeFromCart(cart, 'recipe-1')).toEqual({ 'recipe-2': 1 });
  });

  it('does not mutate the original cart', () => {
    const original: Cart = { 'recipe-1': 1 };
    removeFromCart(original, 'recipe-1');
    expect(original).toEqual({ 'recipe-1': 1 });
  });
});

// ---- setQty -----------------------------------------------------------------

describe('setQty', () => {
  it('sets qty for an existing recipe', () => {
    const cart: Cart = { 'recipe-1': 1 };
    expect(setQty(cart, 'recipe-1', 5)).toEqual({ 'recipe-1': 5 });
  });

  it('adds recipe with given qty if not present', () => {
    expect(setQty({}, 'recipe-1', 3)).toEqual({ 'recipe-1': 3 });
  });

  it('removes recipe when qty is 0', () => {
    const cart: Cart = { 'recipe-1': 2 };
    expect(setQty(cart, 'recipe-1', 0)).toEqual({});
  });

  it('removes recipe when qty is negative', () => {
    const cart: Cart = { 'recipe-1': 2 };
    expect(setQty(cart, 'recipe-1', -1)).toEqual({});
  });

  it('does not mutate the original cart', () => {
    const original: Cart = { 'recipe-1': 1 };
    setQty(original, 'recipe-1', 99);
    expect(original).toEqual({ 'recipe-1': 1 });
  });
});

// ---- clearCart --------------------------------------------------------------

describe('clearCart', () => {
  it('returns an empty cart', () => {
    expect(clearCart()).toEqual({});
  });
});

// ---- aggregateGroceryList ---------------------------------------------------

describe('aggregateGroceryList', () => {
  const itemsById = new Map<string, Item>([
    ['wood', makeItem('wood', 'Wood')],
    ['stone', makeItem('stone', 'Stone')],
    ['iron', makeItem('iron', 'Iron')],
  ]);

  const recipesById = new Map<string, Recipe>([
    ['axe', makeRecipe('axe', [{ itemId: 'wood', qty: 2 }, { itemId: 'stone', qty: 1 }])],
    ['sword', makeRecipe('sword', [{ itemId: 'iron', qty: 3 }, { itemId: 'wood', qty: 1 }])],
  ]);

  it('returns empty array for empty cart', () => {
    expect(aggregateGroceryList({}, recipesById, itemsById)).toEqual([]);
  });

  it('aggregates ingredients for a single recipe with qty 1', () => {
    const cart: Cart = { axe: 1 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    // sorted alphabetically by name: Stone, Wood
    expect(result).toEqual([
      { itemId: 'stone', name: 'Stone', qty: 1 },
      { itemId: 'wood', name: 'Wood', qty: 2 },
    ]);
  });

  it('multiplies ingredient quantities by cart qty', () => {
    const cart: Cart = { axe: 3 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([
      { itemId: 'stone', name: 'Stone', qty: 3 },
      { itemId: 'wood', name: 'Wood', qty: 6 },
    ]);
  });

  it('combines shared ingredients across multiple recipes', () => {
    const cart: Cart = { axe: 1, sword: 1 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    // wood: 2 (axe) + 1 (sword) = 3; stone: 1; iron: 3
    expect(result).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 3 },
      { itemId: 'stone', name: 'Stone', qty: 1 },
      { itemId: 'wood', name: 'Wood', qty: 3 },
    ]);
  });

  it('skips recipes not found in recipesById', () => {
    const cart: Cart = { unknown: 1 };
    expect(aggregateGroceryList(cart, recipesById, itemsById)).toEqual([]);
  });

  it('skips ingredients whose item is not found in itemsById', () => {
    const partialItemsById = new Map<string, Item>([['wood', makeItem('wood', 'Wood')]]);
    const cart: Cart = { axe: 1 };
    // stone not in itemsById, should be skipped
    const result = aggregateGroceryList(cart, recipesById, partialItemsById);
    expect(result).toEqual([{ itemId: 'wood', name: 'Wood', qty: 2 }]);
  });

  it('sorts results alphabetically by item name', () => {
    const cart: Cart = { axe: 1, sword: 1 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    const names = result.map((i) => i.name);
    expect(names).toEqual([...names].sort());
  });

  it('treats cart qty as number of crafts (not final items)', () => {
    const arrowRecipe: Recipe = {
      ...makeRecipe('wood-arrow', [{ itemId: 'wood', qty: 8 }]),
      yields: { itemId: 'wood-arrow', qty: 20 },
    };
    const recipesById = new Map<string, Recipe>([['wood-arrow', arrowRecipe]]);
    const itemsById = new Map<string, Item>([['wood', makeItem('wood', 'Wood')]]);

    // 3 crafts of arrows → 3 × 8 wood = 24 (produces 3 × 20 = 60 arrows)
    const cart: Cart = { 'wood-arrow': 3 };
    const result = aggregateGroceryList(cart, recipesById, itemsById);
    expect(result).toEqual([{ itemId: 'wood', name: 'Wood', qty: 24 }]);
  });
});

// ---- encodeCartUrl / decodeCartUrl ------------------------------------------

const recipeIndex = ['axe', 'hammer', 'queens-jam', 'sword'];

describe('encodeCartUrl', () => {
  it('returns empty string for empty cart', () => {
    expect(encodeCartUrl({}, recipeIndex)).toBe('');
  });

  it('returns a non-empty string for non-empty cart', () => {
    const encoded = encodeCartUrl({ hammer: 2 }, recipeIndex);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('produces a compact output', () => {
    const encoded = encodeCartUrl({ hammer: 3, 'queens-jam': 5, sword: 2 }, recipeIndex);
    expect(encoded.length).toBeLessThan(20);
  });

  it('omits qty suffix for qty 1', () => {
    // axe is index 0, qty 1 → intermediate "0" (no .1 suffix)
    // round-trip verifies it decodes back correctly
    const cart: Cart = { axe: 1 };
    expect(decodeCartUrl(encodeCartUrl(cart, recipeIndex), recipeIndex)).toEqual(cart);
  });
});

describe('decodeCartUrl', () => {
  it('returns empty cart for empty string', () => {
    expect(decodeCartUrl('', recipeIndex)).toEqual({});
  });

  it('returns empty cart for null-like values', () => {
    expect(decodeCartUrl(null as unknown as string, recipeIndex)).toEqual({});
    expect(decodeCartUrl(undefined as unknown as string, recipeIndex)).toEqual({});
  });

  it('returns empty cart for garbage input', () => {
    expect(decodeCartUrl('!!!', recipeIndex)).toEqual({});
  });

  it('round-trips a cart', () => {
    const cart: Cart = { hammer: 2, 'queens-jam': 1 };
    expect(decodeCartUrl(encodeCartUrl(cart, recipeIndex), recipeIndex)).toEqual(cart);
  });

  it('round-trips an empty cart', () => {
    expect(decodeCartUrl(encodeCartUrl({}, recipeIndex), recipeIndex)).toEqual({});
  });

  it('ignores out-of-range indices', () => {
    // Compress "999.3" directly — index 999 doesn't exist in recipeIndex
    const lz = require('lz-string');
    const encoded = lz.compressToEncodedURIComponent('999.3');
    expect(decodeCartUrl(encoded, recipeIndex)).toEqual({});
  });
});

// ---- formatGroceryList ------------------------------------------------------

describe('formatGroceryList', () => {
  it('returns empty string for empty list', () => {
    expect(formatGroceryList([])).toBe('');
  });

  it('formats a single item', () => {
    const items: GroceryItem[] = [{ itemId: 'wood', name: 'Wood', qty: 3 }];
    expect(formatGroceryList(items)).toBe('Wood ×3');
  });

  it('formats multiple items separated by newlines', () => {
    const items: GroceryItem[] = [
      { itemId: 'iron', name: 'Iron', qty: 3 },
      { itemId: 'stone', name: 'Stone', qty: 1 },
      { itemId: 'wood', name: 'Wood', qty: 2 },
    ];
    expect(formatGroceryList(items)).toBe('Iron ×3\nStone ×1\nWood ×2');
  });
});
