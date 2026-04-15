import type { Recipe, RecipeType } from './types';

export interface FilterState {
  type: RecipeType | 'all';
  station: string;
  minStationLevel: number;
  maxStationLevel: number;
  ingredientIds: string[];
  query: string;
  tags: string[];
  stationCeilings: Record<string, number>;
  biomes: string[];
}

export const emptyFilterState: FilterState = {
  type: 'all',
  station: 'all',
  minStationLevel: 1,
  maxStationLevel: Number.POSITIVE_INFINITY,
  ingredientIds: [],
  query: '',
  tags: [],
  stationCeilings: {},
  biomes: [],
};

export function filterRecipes(recipes: Recipe[], state: FilterState): Recipe[] {
  const q = state.query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (state.type !== 'all' && r.type !== state.type) return false;
    if (state.station !== 'all' && r.station !== state.station) return false;
    if (r.stationLevel < state.minStationLevel) return false;

    // Per-station ceiling overrides global max when lower
    const ceiling = state.stationCeilings[r.station];
    const effectiveMax = ceiling != null
      ? Math.min(ceiling, Number.isFinite(state.maxStationLevel) ? state.maxStationLevel : ceiling)
      : state.maxStationLevel;
    if (r.stationLevel > effectiveMax) return false;

    // Tag filtering: AND logic — recipe must have all selected tags
    if (state.tags.length > 0) {
      const recipeTags = r.tags ?? [];
      if (!state.tags.every((t) => recipeTags.includes(t))) return false;
    }

    // Biome filter: recipe must match one of the selected biomes
    if (state.biomes.length > 0) {
      if (!r.biome || !state.biomes.includes(r.biome)) return false;
    }

    if (state.ingredientIds.length > 0) {
      const ingIds = new Set((r.ingredients ?? []).map((i) => i.itemId));
      if (!state.ingredientIds.every((id) => ingIds.has(id))) return false;
    }

    if (q.length > 0) {
      const haystacks: string[] = [
        r.name.toLowerCase(),
        ...(r.tags ?? []).map((t) => t.toLowerCase()),
        ...(r.ingredients ?? []).map((i) => i.itemId.toLowerCase()),
      ];
      if (!haystacks.some((h) => h.includes(q))) return false;
    }

    return true;
  });
}
