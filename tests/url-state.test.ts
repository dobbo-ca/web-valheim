import { describe, it, expect } from 'vitest';
import { encodeFilterState, decodeFilterState } from '../src/lib/url-state';
import { emptyFilterState, type FilterState } from '../src/lib/filter';

describe('URL state', () => {
  it('encodes all fields', () => {
    const params = encodeFilterState({
      type: 'crafting',
      station: 'forge',
      minStationLevel: 2,
      maxStationLevel: 3,
      ingredientIds: ['iron', 'wood'],
      query: 'sword',
    });
    expect(params.get('type')).toBe('crafting');
    expect(params.get('station')).toBe('forge');
    expect(params.get('minlvl')).toBe('2');
    expect(params.get('lvl')).toBe('3');
    expect(params.get('ing')).toBe('iron,wood');
    expect(params.get('q')).toBe('sword');
  });

  it('omits default values from the URL', () => {
    const params = encodeFilterState({
      type: 'all',
      station: 'all',
      minStationLevel: 1,
      maxStationLevel: Number.POSITIVE_INFINITY,
      ingredientIds: [],
      query: '',
    });
    expect([...params.keys()]).toEqual([]);
  });

  it('encodes minlvl only when greater than 1', () => {
    const paramsDefault = encodeFilterState({ ...emptyFilterState, minStationLevel: 1 });
    expect(paramsDefault.get('minlvl')).toBeNull();
    const paramsSet = encodeFilterState({ ...emptyFilterState, minStationLevel: 3 });
    expect(paramsSet.get('minlvl')).toBe('3');
  });

  it('decodes back to an equivalent state', () => {
    const params = new URLSearchParams('type=cooking&station=cauldron&lvl=1&ing=raspberries,blueberries&q=jam');
    const state = decodeFilterState(params);
    expect(state.type).toBe('cooking');
    expect(state.station).toBe('cauldron');
    expect(state.minStationLevel).toBe(1);
    expect(state.maxStationLevel).toBe(1);
    expect(state.ingredientIds).toEqual(['raspberries', 'blueberries']);
    expect(state.query).toBe('jam');
  });

  it('decodes minlvl param', () => {
    const state = decodeFilterState(new URLSearchParams('minlvl=3'));
    expect(state.minStationLevel).toBe(3);
  });

  it('returns defaults when params are missing', () => {
    const state = decodeFilterState(new URLSearchParams(''));
    expect(state.type).toBe('all');
    expect(state.station).toBe('all');
    expect(state.minStationLevel).toBe(1);
    expect(state.maxStationLevel).toBe(Number.POSITIVE_INFINITY);
    expect(state.ingredientIds).toEqual([]);
    expect(state.query).toBe('');
  });

  it('backward-compatible: URL with only lvl (no minlvl) defaults minStationLevel to 1', () => {
    const state = decodeFilterState(new URLSearchParams('lvl=5'));
    expect(state.minStationLevel).toBe(1);
    expect(state.maxStationLevel).toBe(5);
  });

  it('round-trips a fully populated state', () => {
    const original: FilterState = {
      type: 'crafting',
      station: 'forge',
      minStationLevel: 2,
      maxStationLevel: 3,
      ingredientIds: ['iron', 'wood'],
      query: 'sword',
    };
    expect(decodeFilterState(encodeFilterState(original))).toEqual(original);
  });

  it('round-trips emptyFilterState', () => {
    expect(decodeFilterState(encodeFilterState(emptyFilterState))).toEqual(
      emptyFilterState,
    );
  });
});
