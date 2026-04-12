import type { Recipe, RecipeType } from './types';

export interface FilterState {
  type: RecipeType | 'all';
  station: string; // station id or 'all'
  maxStationLevel: number;
  ingredientIds: string[]; // AND
  query: string;
}

export const emptyFilterState: FilterState = {
  type: 'all',
  station: 'all',
  maxStationLevel: Number.POSITIVE_INFINITY,
  ingredientIds: [],
  query: '',
};

export function filterRecipes(recipes: Recipe[], state: FilterState): Recipe[] {
  const q = state.query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (state.type !== 'all' && r.type !== state.type) return false;
    if (state.station !== 'all' && r.station !== state.station) return false;
    if (r.stationLevel > state.maxStationLevel) return false;

    if (state.ingredientIds.length > 0) {
      const ingIds = new Set(r.ingredients.map((i) => i.itemId));
      if (!state.ingredientIds.every((id) => ingIds.has(id))) return false;
    }

    if (q.length > 0) {
      const haystacks: string[] = [
        r.name.toLowerCase(),
        ...(r.tags ?? []).map((t) => t.toLowerCase()),
        ...r.ingredients.map((i) => i.itemId.toLowerCase()),
      ];
      if (!haystacks.some((h) => h.includes(q))) return false;
    }

    return true;
  });
}
