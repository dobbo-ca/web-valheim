import type { FilterState } from './filter';
import type { RecipeType } from './types';

export function encodeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.type !== 'all') params.set('type', state.type);
  if (state.station !== 'all') params.set('station', state.station);
  if (state.minStationLevel > 1) params.set('minlvl', String(state.minStationLevel));
  if (Number.isFinite(state.maxStationLevel)) {
    params.set('lvl', String(state.maxStationLevel));
  }
  if (state.ingredientIds.length > 0) {
    params.set('ing', state.ingredientIds.join(','));
  }
  if (state.query.trim().length > 0) {
    params.set('q', state.query.trim());
  }
  return params;
}

const recipeTypes: RecipeType[] = ['crafting', 'cooking'];

export function decodeFilterState(params: URLSearchParams): FilterState {
  const rawType = params.get('type');
  const type: FilterState['type'] =
    rawType && (recipeTypes as string[]).includes(rawType)
      ? (rawType as RecipeType)
      : 'all';

  const station = params.get('station') ?? 'all';

  const minLvlRaw = params.get('minlvl');
  const minLvlParsed = minLvlRaw == null ? NaN : Number.parseInt(minLvlRaw, 10);
  const minStationLevel = Number.isFinite(minLvlParsed) ? minLvlParsed : 1;

  const lvlRaw = params.get('lvl');
  const lvlParsed = lvlRaw == null ? NaN : Number.parseInt(lvlRaw, 10);
  const maxStationLevel = Number.isFinite(lvlParsed)
    ? lvlParsed
    : Number.POSITIVE_INFINITY;

  const ingRaw = params.get('ing');
  const ingredientIds = ingRaw
    ? ingRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const query = params.get('q') ?? '';

  return { type, station, minStationLevel, maxStationLevel, ingredientIds, query };
}
