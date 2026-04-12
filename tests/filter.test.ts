import { describe, it, expect } from 'vitest';
import { filterRecipes, emptyFilterState, type FilterState } from '../src/lib/filter';
import type { Recipe } from '../src/lib/types';

const sample: Recipe[] = [
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 2,
    ingredients: [
      { itemId: 'iron', qty: 60 },
      { itemId: 'wood', qty: 2 },
    ],
    tags: ['sword', 'one-handed'],
  },
  {
    id: 'bronze-sword',
    name: 'Bronze Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 1,
    ingredients: [
      { itemId: 'bronze', qty: 8 },
      { itemId: 'wood', qty: 2 },
      { itemId: 'leather-scraps', qty: 2 },
    ],
    tags: ['sword', 'one-handed'],
  },
  {
    id: 'queens-jam',
    name: 'Queens Jam',
    type: 'cooking',
    station: 'cauldron',
    stationLevel: 1,
    ingredients: [
      { itemId: 'raspberries', qty: 8 },
      { itemId: 'blueberries', qty: 6 },
    ],
  },
];

const empty: FilterState = { ...emptyFilterState };

describe('filterRecipes', () => {
  it('returns everything when filters are empty', () => {
    expect(filterRecipes(sample, empty).map((r) => r.id)).toEqual([
      'iron-sword',
      'bronze-sword',
      'queens-jam',
    ]);
  });

  it('filters by type', () => {
    expect(
      filterRecipes(sample, { ...empty, type: 'cooking' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by station', () => {
    expect(
      filterRecipes(sample, { ...empty, station: 'cauldron' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by max station level (hides recipes above cap)', () => {
    expect(
      filterRecipes(sample, { ...empty, maxStationLevel: 1 }).map((r) => r.id),
    ).toEqual(['bronze-sword', 'queens-jam']);
  });

  it('filters by ingredient (single)', () => {
    expect(
      filterRecipes(sample, { ...empty, ingredientIds: ['iron'] }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('filters by ingredient (multiple, AND)', () => {
    expect(
      filterRecipes(sample, {
        ...empty,
        ingredientIds: ['wood', 'leather-scraps'],
      }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });

  it('filters by text query (name match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'queen' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by text query (tag match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'one-handed' }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by text query (ingredient name match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'bronze' }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });

  it('combines all filters with AND', () => {
    expect(
      filterRecipes(sample, {
        type: 'crafting',
        station: 'forge',
        maxStationLevel: 1,
        ingredientIds: ['wood'],
        query: 'sword',
      }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });
});
