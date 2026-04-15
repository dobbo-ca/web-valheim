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
    tags: ['melee', 'sword', '1h', 'swamp'],
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
    tags: ['melee', 'sword', '1h', 'black-forest'],
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
    tags: ['food', 'cooked', 'balanced', 'meadows'],
  },
  {
    id: 'upgrade-forge-2',
    name: 'Forge Bellows',
    type: 'building',
    station: 'forge',
    stationLevel: 2,
    ingredients: [{ itemId: 'wood', qty: 5 }],
    tags: ['build', 'station-upgrade'],
  },
  {
    id: 'draugr-fang',
    name: 'Draugr Fang',
    type: 'crafting',
    station: 'forge',
    stationLevel: 3,
    ingredients: [
      { itemId: 'ancient-bark', qty: 10 },
      { itemId: 'silver', qty: 20 },
    ],
    tags: ['ranged', 'bow', '2h', 'elemental', 'mountain'],
  },
  {
    id: 'minor-healing-mead',
    name: 'Minor Healing Mead',
    type: 'cooking',
    station: 'mead-ketill',
    stationLevel: 1,
    ingredients: [
      { itemId: 'honey', qty: 10 },
      { itemId: 'raspberries', qty: 10 },
    ],
    tags: ['mead', 'healing', 'meadows'],
  },
];

const empty: FilterState = { ...emptyFilterState };

describe('filterRecipes', () => {
  it('returns everything when filters are empty', () => {
    expect(filterRecipes(sample, empty).map((r) => r.id)).toEqual([
      'iron-sword', 'bronze-sword', 'queens-jam', 'upgrade-forge-2', 'draugr-fang', 'minor-healing-mead',
    ]);
  });

  it('filters by category tag (melee)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['melee'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by category + subtype (melee + sword)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['melee', 'sword'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by category + subtype + handedness', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['ranged', '2h'] }).map((r) => r.id),
    ).toEqual(['draugr-fang']);
  });

  it('filters by biome tag', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['meadows'] }).map((r) => r.id),
    ).toEqual(['queens-jam', 'minor-healing-mead']);
  });

  it('filters by category + biome (AND)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['melee', 'swamp'] }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('filters by food category', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['food'] }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by mead category', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['mead'] }).map((r) => r.id),
    ).toEqual(['minor-healing-mead']);
  });

  it('filters by modifier tag', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['elemental'] }).map((r) => r.id),
    ).toEqual(['draugr-fang']);
  });

  it('filters by station', () => {
    expect(
      filterRecipes(sample, { ...empty, station: 'cauldron' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by per-station ceiling', () => {
    expect(
      filterRecipes(sample, { ...empty, stationCeilings: { forge: 1 } }).map((r) => r.id),
    ).toEqual(['bronze-sword', 'queens-jam', 'minor-healing-mead']);
  });

  it('filters by ingredient (single)', () => {
    expect(
      filterRecipes(sample, { ...empty, ingredientIds: ['iron'] }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('filters by text query (name match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'queen' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by text query (tag match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: '1h' }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('combines tags + station + query with AND', () => {
    expect(
      filterRecipes(sample, {
        ...empty,
        tags: ['melee'],
        station: 'forge',
        query: 'iron',
      }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('empty tags match everything (no tag filter)', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: [] }).length,
    ).toBe(sample.length);
  });
});
