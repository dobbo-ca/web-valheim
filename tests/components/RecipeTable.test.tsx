import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { RecipeTable } from '../../src/components/RecipeTable';
import type { DataSet } from '../../src/lib/loader';

const data: DataSet = {
  items: [
    { id: 'iron', name: 'Iron', category: 'material' },
    { id: 'wood', name: 'Wood', category: 'material' },
    { id: 'raspberries', name: 'Raspberries', category: 'ingredient' },
    { id: 'blueberries', name: 'Blueberries', category: 'ingredient' },
  ],
  stations: [
    { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] },
    { id: 'cauldron', name: 'Cauldron', maxLevel: 5, upgrades: [] },
  ],
  recipes: [
    {
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'crafting',
      station: 'forge',
      stationLevel: 2,
      ingredients: [
        { itemId: 'iron', qty: 60 },
        { itemId: 'wood', qty: 2 },
      ],
      tags: ['sword'],
    },
    {
      id: 'queens-jam',
      name: 'Queens Jam',
      type: 'cooking',
      station: 'cauldron',
      stationLevel: 1,
      ingredients: [
        { itemId: 'raspberries', qty: 8 },
        { itemId: 'blueberries', qty: 6 },
      ],
    },
  ],
};

beforeEach(() => {
  // Reset URL so tests don't leak filter state into one another.
  window.history.replaceState({}, '', '/valheim/');
});

describe('RecipeTable', () => {
  it('renders all recipes by default', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });

  it('filters by type chip', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    // Open the advanced filter panel first, then click the type chip
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cooking' }));
    expect(screen.queryByText('Iron Sword')).toBeNull();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });

  it('filters by text search', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'sword' } });
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.queryByText('Queens Jam')).toBeNull();
  });

  it('expands a row when clicked', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    expect(screen.getByRole('button', { name: /Iron ×60/ })).toBeInTheDocument();
  });

  it('filters by ingredient chip click', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    fireEvent.click(screen.getByRole('button', { name: /Iron ×60/ }));
    // After filtering to recipes that use Iron, Queens Jam should be gone.
    expect(screen.queryByText('Queens Jam')).toBeNull();
    // The active ingredient chip should appear in the reverse-lookup strip.
    expect(screen.getByText(/Uses ingredient/)).toBeInTheDocument();
  });

  it('syncs filter state to URL query params', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    // Open the advanced filter panel first, then click the type chip
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cooking' }));
    expect(window.location.search).toContain('type=cooking');
  });

  it('reads initial state from URL query params', () => {
    window.history.replaceState({}, '', '/valheim/?type=cooking');
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    expect(screen.queryByText('Iron Sword')).toBeNull();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });

  it('collapses a row when it is clicked again', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    const row = screen.getByRole('button', { name: /Iron Sword/ });
    // First click expands — aria-expanded becomes true
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    // Second click collapses — aria-expanded becomes false
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'false');
  });

  it('removes an ingredient from the filter when the strip chip is clicked', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    // Expand and add iron as an active filter
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    fireEvent.click(screen.getByRole('button', { name: /Iron ×60/ }));
    expect(screen.queryByText('Queens Jam')).toBeNull();
    // Click the remove chip in the reverse-lookup strip
    fireEvent.click(
      screen.getByRole('button', { name: /Remove Iron from ingredient filter/ }),
    );
    // Strip should be gone and cooking recipe should reappear
    expect(screen.queryByText(/Uses ingredient/)).toBeNull();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });
});
