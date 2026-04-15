import type { Recipe } from './types';

export interface FilterState {
  query: string;
  tags: string[];
  ingredientIds: string[];
  station: string;
  stationCeilings: Record<string, number>;
}

export const emptyFilterState: FilterState = {
  query: '',
  tags: [],
  ingredientIds: [],
  station: 'all',
  stationCeilings: {},
};

export function filterRecipes(recipes: Recipe[], state: FilterState): Recipe[] {
  const q = state.query.trim().toLowerCase();
  return recipes.filter((r) => {
    // Station filter
    if (state.station !== 'all' && r.station !== state.station) return false;

    // Per-station ceiling
    const ceiling = state.stationCeilings[r.station];
    if (ceiling != null && r.stationLevel > ceiling) return false;

    // Tag filtering: AND logic — recipe must have all selected tags
    if (state.tags.length > 0) {
      const recipeTags = r.tags ?? [];
      if (!state.tags.every((t) => recipeTags.includes(t))) return false;
    }

    // Ingredient filtering: AND logic
    if (state.ingredientIds.length > 0) {
      const ingIds = new Set((r.ingredients ?? []).map((i) => i.itemId));
      if (!state.ingredientIds.every((id) => ingIds.has(id))) return false;
    }

    // Text search
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
