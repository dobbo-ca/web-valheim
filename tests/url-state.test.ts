import { describe, it, expect } from 'vitest';
import { encodeFilterState, decodeFilterState } from '../src/lib/url-state';
import { emptyFilterState, type FilterState } from '../src/lib/filter';

describe('URL state', () => {
  it('encodes all fields', () => {
    const params = encodeFilterState({
      station: 'forge',
      ingredientIds: ['iron', 'wood'],
      query: 'sword',
      tags: ['melee', 'sword'],
      stationCeilings: { forge: 3 },
    });
    expect(params.get('station')).toBe('forge');
    expect(params.get('ing')).toBe('iron,wood');
    expect(params.get('q')).toBe('sword');
    expect(params.get('tags')).toBe('melee,sword');
    expect(params.get('stn-forge')).toBe('3');
  });

  it('omits default values from the URL', () => {
    const params = encodeFilterState(emptyFilterState);
    expect([...params.keys()]).toEqual([]);
  });

  it('decodes back to an equivalent state', () => {
    const params = new URLSearchParams('station=cauldron&ing=raspberries,blueberries&q=jam&tags=food');
    const state = decodeFilterState(params);
    expect(state.station).toBe('cauldron');
    expect(state.ingredientIds).toEqual(['raspberries', 'blueberries']);
    expect(state.query).toBe('jam');
    expect(state.tags).toEqual(['food']);
  });

  it('returns defaults when params are missing', () => {
    const state = decodeFilterState(new URLSearchParams(''));
    expect(state.station).toBe('all');
    expect(state.ingredientIds).toEqual([]);
    expect(state.query).toBe('');
    expect(state.tags).toEqual([]);
    expect(state.stationCeilings).toEqual({});
  });

  it('round-trips a fully populated state', () => {
    const original: FilterState = {
      station: 'forge',
      ingredientIds: ['iron', 'wood'],
      query: 'sword',
      tags: ['melee', '1h'],
      stationCeilings: { forge: 3, workbench: 2 },
    };
    expect(decodeFilterState(encodeFilterState(original))).toEqual(original);
  });

  it('round-trips emptyFilterState', () => {
    expect(decodeFilterState(encodeFilterState(emptyFilterState))).toEqual(
      emptyFilterState,
    );
  });

  it('encodes tags', () => {
    const params = encodeFilterState({ ...emptyFilterState, tags: ['melee', 'sword'] });
    expect(params.get('tags')).toBe('melee,sword');
  });

  it('omits empty tags', () => {
    const params = encodeFilterState({ ...emptyFilterState, tags: [] });
    expect(params.get('tags')).toBeNull();
  });

  it('decodes tags', () => {
    const state = decodeFilterState(new URLSearchParams('tags=sword,axe'));
    expect(state.tags).toEqual(['sword', 'axe']);
  });

  it('encodes station ceilings', () => {
    const params = encodeFilterState({
      ...emptyFilterState,
      stationCeilings: { forge: 3, workbench: 2 },
    });
    expect(params.get('stn-forge')).toBe('3');
    expect(params.get('stn-workbench')).toBe('2');
  });

  it('decodes station ceilings', () => {
    const state = decodeFilterState(new URLSearchParams('stn-forge=3&stn-workbench=2'));
    expect(state.stationCeilings).toEqual({ forge: 3, workbench: 2 });
  });

  it('round-trips tags and station ceilings', () => {
    const original: FilterState = {
      ...emptyFilterState,
      tags: ['sword'],
      stationCeilings: { forge: 5 },
    };
    expect(decodeFilterState(encodeFilterState(original))).toEqual(original);
  });
});
