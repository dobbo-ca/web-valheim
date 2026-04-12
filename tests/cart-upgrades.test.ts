import { describe, it, expect } from 'vitest';
import { aggregateGroceryList } from '../src/lib/cart';
import type { Recipe, Item } from '../src/lib/types';

const recipes: Recipe[] = [
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 2,
    ingredients: [
      { itemId: 'iron', qty: 40 },
      { itemId: 'wood', qty: 2 },
    ],
    upgrades: [
      { quality: 2, ingredients: [{ itemId: 'iron', qty: 10 }, { itemId: 'wood', qty: 2 }] },
      { quality: 3, ingredients: [{ itemId: 'iron', qty: 20 }, { itemId: 'wood', qty: 4 }] },
    ],
  },
];

const items: Item[] = [
  { id: 'iron', name: 'Iron', category: 'material' },
  { id: 'wood', name: 'Wood', category: 'material' },
];

const recipesById = new Map(recipes.map((r) => [r.id, r]));
const itemsById = new Map(items.map((i) => [i.id, i]));

describe('cart upgrade entries', () => {
  it('aggregates base recipe ingredients normally', () => {
    const list = aggregateGroceryList({ 'iron-sword': 1 }, recipesById, itemsById);
    expect(list).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 40 },
      { itemId: 'wood', name: 'Wood', qty: 2 },
    ]);
  });

  it('aggregates upgrade entry ingredients via +N suffix', () => {
    const list = aggregateGroceryList({ 'iron-sword+2': 1 }, recipesById, itemsById);
    expect(list).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 10 },
      { itemId: 'wood', name: 'Wood', qty: 2 },
    ]);
  });

  it('aggregates base + all upgrades together', () => {
    const cart = { 'iron-sword': 1, 'iron-sword+2': 1, 'iron-sword+3': 1 };
    const list = aggregateGroceryList(cart, recipesById, itemsById);
    expect(list).toEqual([
      { itemId: 'iron', name: 'Iron', qty: 70 },
      { itemId: 'wood', name: 'Wood', qty: 8 },
    ]);
  });

  it('ignores upgrade entries for non-existent quality', () => {
    const list = aggregateGroceryList({ 'iron-sword+9': 1 }, recipesById, itemsById);
    expect(list).toEqual([]);
  });
});
