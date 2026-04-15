import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { FilterBar } from '../../src/components/FilterBar';
import { emptyFilterState, type FilterState } from '../../src/lib/filter';
import type { Station } from '../../src/lib/types';

const stations: Station[] = [
  { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] },
  { id: 'cauldron', name: 'Cauldron', maxLevel: 5, upgrades: [] },
];

const empty: FilterState = { ...emptyFilterState };

describe('FilterBar', () => {
  beforeEach(() => {
    // Reset URL so tests don't leak state (e.g. adv=1) into one another.
    window.history.replaceState({}, '', '/');
  });

  it('renders search box and a Filters toggle button', () => {
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={() => {}} />
    ));
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filters/ })).toBeInTheDocument();
  });

  it('shows advanced panel with station selector when Filters toggle is clicked', () => {
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={() => {}} />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(screen.getByLabelText('Station')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear/ })).toBeInTheDocument();
  });

  it('emits a new state when a category chip is clicked (after opening panel)', () => {
    const onChange = vi.fn();
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={onChange} />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Melee' }));
    expect(onChange).toHaveBeenCalled();
    const newState = onChange.mock.calls[0][0] as FilterState;
    expect(newState.tags).toContain('melee');
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
