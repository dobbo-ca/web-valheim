import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { RecipeRow } from '../../src/components/RecipeRow';
import type { Recipe, Item, Station } from '../../src/lib/types';

const recipe: Recipe = {
  id: 'iron-sword',
  name: 'Iron Sword',
  type: 'crafting',
  station: 'forge',
  stationLevel: 2,
  ingredients: [
    { itemId: 'iron', qty: 60 },
    { itemId: 'wood', qty: 2 },
  ],
  tags: ['sword', 'one-handed'],
  notes: 'Strong vs skeletons.',
};

const itemsById = new Map<string, Item>([
  ['iron', { id: 'iron', name: 'Iron', category: 'material' }],
  ['wood', { id: 'wood', name: 'Wood', category: 'material' }],
]);

const stationsById = new Map<string, Station>([
  ['forge', { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] }],
]);

describe('RecipeRow', () => {
  it('renders collapsed summary', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Forge')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Notes not shown when collapsed
    expect(screen.queryByText(/Strong vs skeletons/)).toBeNull();
  });

  it('shows notes and ingredient chips when expanded', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    expect(screen.getByText(/Strong vs skeletons/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iron ×60/ })).toBeInTheDocument();
  });

  it('calls onToggle when the summary is clicked', () => {
    const onToggle = vi.fn();
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        onToggle={onToggle}
        onIngredientClick={() => {}}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    expect(onToggle).toHaveBeenCalledWith('iron-sword');
  });

  it('calls onIngredientClick when an ingredient chip is clicked (expanded)', () => {
    const onIngredientClick = vi.fn();
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={onIngredientClick}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Iron ×60/ }));
    expect(onIngredientClick).toHaveBeenCalledWith('iron');
  });

  it('row button accessible name does not include ingredient list when expanded', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    // Row button is the one with aria-expanded="true"
    const rowBtn = screen
      .getAllByRole('button')
      .find((el) => el.getAttribute('aria-expanded') === 'true');
    expect(rowBtn).toBeDefined();
    expect(rowBtn!.textContent ?? '').not.toMatch(/Iron ×60/);
    expect(rowBtn!.textContent ?? '').not.toMatch(/Wood ×2/);
  });

  it('renders permalink anchor with the correct href', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    expect(
      screen.getByRole('link', { name: /open detail page/ }),
    ).toHaveAttribute('href', '/valheim/recipes/iron-sword/');
  });
});
