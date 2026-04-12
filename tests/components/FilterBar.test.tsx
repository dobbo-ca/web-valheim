import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { FilterBar } from '../../src/components/FilterBar';
import type { FilterState } from '../../src/lib/filter';
import type { Station } from '../../src/lib/types';

const stations: Station[] = [
  { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] },
  { id: 'cauldron', name: 'Cauldron', maxLevel: 5, upgrades: [] },
];

const empty: FilterState = {
  type: 'all',
  station: 'all',
  minStationLevel: 1,
  maxStationLevel: Number.POSITIVE_INFINITY,
  ingredientIds: [],
  query: '',
};

describe('FilterBar', () => {
  it('renders type chips and station dropdown', () => {
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={() => {}} />
    ));
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crafting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cooking' })).toBeInTheDocument();
    expect(screen.getByLabelText('Station')).toBeInTheDocument();
  });

  it('emits a new state when a type chip is clicked', () => {
    const onChange = vi.fn();
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={onChange} />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Cooking' }));
    expect(onChange).toHaveBeenCalled();
    const newState = onChange.mock.calls[0][0] as FilterState;
    expect(newState.type).toBe('cooking');
  });

  it('emits a new state when the search input changes', () => {
    const onChange = vi.fn();
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={onChange} />
    ));
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'sword' } });
    expect(onChange).toHaveBeenCalled();
    const newState = onChange.mock.calls[0][0] as FilterState;
    expect(newState.query).toBe('sword');
  });
});
