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
    biome: 'swamp',
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
    biome: 'black-forest',
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
    biome: 'meadows',
  },
  {
    id: 'upgrade-forge-2',
    name: 'Forge Bellows',
    type: 'building',
    station: 'forge',
    stationLevel: 2,
    ingredients: [{ itemId: 'wood', qty: 5 }],
    tags: ['station-upgrade'],
  },
];

const empty: FilterState = { ...emptyFilterState };

describe('filterRecipes', () => {
  it('returns everything when filters are empty', () => {
    expect(filterRecipes(sample, empty).map((r) => r.id)).toEqual([
      'iron-sword',
      'bronze-sword',
      'queens-jam',
      'upgrade-forge-2',
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

  it('filters by min station level (hides recipes below floor)', () => {
    expect(
      filterRecipes(sample, { ...empty, minStationLevel: 2 }).map((r) => r.id),
    ).toEqual(['iron-sword', 'upgrade-forge-2']);
  });

  it('combines all filters with AND', () => {
    expect(
      filterRecipes(sample, {
        type: 'crafting',
        station: 'forge',
        minStationLevel: 1,
        maxStationLevel: 1,
        ingredientIds: ['wood'],
        query: 'sword',
        tags: [],
        stationCeilings: {},
        biomes: [],
      }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });

  it('filters by building type', () => {
    expect(
      filterRecipes(sample, { ...empty, type: 'building' }).map((r) => r.id),
    ).toEqual(['upgrade-forge-2']);
  });

  it('filters by single tag', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['sword'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by multiple tags (AND — must have all)', () => {
    // Both swords have ['sword', 'one-handed'], so AND matches both
    expect(
      filterRecipes(sample, { ...empty, tags: ['sword', 'one-handed'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('multiple tags with no overlap returns empty', () => {
    // No recipe has both 'sword' and 'station-upgrade'
    expect(
      filterRecipes(sample, { ...empty, tags: ['sword', 'station-upgrade'] }).map((r) => r.id),
    ).toEqual([]);
  });

  it('filters by per-station ceiling', () => {
    expect(
      filterRecipes(sample, { ...empty, stationCeilings: { forge: 1 } }).map((r) => r.id),
    ).toEqual(['bronze-sword', 'queens-jam']);
  });

  it('per-station ceiling overrides maxStationLevel when lower', () => {
    expect(
      filterRecipes(sample, { ...empty, maxStationLevel: 7, stationCeilings: { forge: 1 } }).map((r) => r.id),
    ).toEqual(['bronze-sword', 'queens-jam']);
  });

  it('filters by biome (single)', () => {
    expect(
      filterRecipes(sample, { ...empty, biomes: ['meadows'] }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by biome (multiple, OR logic)', () => {
    expect(
      filterRecipes(sample, { ...empty, biomes: ['swamp', 'black-forest'] }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('excludes recipes without a biome when biome filter is active', () => {
    // upgrade-forge-2 has no biome set
    expect(
      filterRecipes(sample, { ...empty, biomes: ['meadows'] }).map((r) => r.id),
    ).not.toContain('upgrade-forge-2');
  });
});
