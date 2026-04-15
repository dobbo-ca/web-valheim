import type { FilterState } from './filter';

export function encodeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tags.length > 0) {
    params.set('tags', state.tags.join(','));
  }
  if (state.ingredientIds.length > 0) {
    params.set('ing', state.ingredientIds.join(','));
  }
  if (state.query.trim().length > 0) {
    params.set('q', state.query.trim());
  }
  if (state.station !== 'all') {
    params.set('station', state.station);
  }
  for (const [stationId, level] of Object.entries(state.stationCeilings)) {
    params.set(`stn-${stationId}`, String(level));
  }
  return params;
}

export function decodeFilterState(params: URLSearchParams): FilterState {
  const tagsRaw = params.get('tags');
  const tags = tagsRaw
    ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const ingRaw = params.get('ing');
  const ingredientIds = ingRaw
    ? ingRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const query = params.get('q') ?? '';
  const station = params.get('station') ?? 'all';

  const stationCeilings: Record<string, number> = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith('stn-')) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        stationCeilings[key.slice(4)] = parsed;
      }
    }
  }

  return { query, tags, ingredientIds, station, stationCeilings };
}
