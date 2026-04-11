import { describe, it, expect } from 'vitest';
import { encodeFilterState, decodeFilterState } from '../src/lib/url-state';

describe('URL state', () => {
  it('encodes all fields', () => {
    const params = encodeFilterState({
      type: 'crafting',
      station: 'forge',
      maxStationLevel: 3,
      ingredientIds: ['iron', 'wood'],
      query: 'sword',
    });
    expect(params.get('type')).toBe('crafting');
    expect(params.get('station')).toBe('forge');
    expect(params.get('lvl')).toBe('3');
    expect(params.get('ing')).toBe('iron,wood');
    expect(params.get('q')).toBe('sword');
  });

  it('omits default values from the URL', () => {
    const params = encodeFilterState({
      type: 'all',
      station: 'all',
      maxStationLevel: Number.POSITIVE_INFINITY,
      ingredientIds: [],
      query: '',
    });
    expect([...params.keys()]).toEqual([]);
  });

  it('decodes back to an equivalent state', () => {
    const params = new URLSearchParams('type=cooking&station=cauldron&lvl=1&ing=raspberries,blueberries&q=jam');
    const state = decodeFilterState(params);
    expect(state.type).toBe('cooking');
    expect(state.station).toBe('cauldron');
    expect(state.maxStationLevel).toBe(1);
    expect(state.ingredientIds).toEqual(['raspberries', 'blueberries']);
    expect(state.query).toBe('jam');
  });

  it('returns defaults when params are missing', () => {
    const state = decodeFilterState(new URLSearchParams(''));
    expect(state.type).toBe('all');
    expect(state.station).toBe('all');
    expect(state.maxStationLevel).toBe(Number.POSITIVE_INFINITY);
    expect(state.ingredientIds).toEqual([]);
    expect(state.query).toBe('');
  });
});
