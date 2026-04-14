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
        inCart={false}
        onToggle={() => {}}
        onAddToCart={() => {}}
        onOpenCart={() => {}}
        upgradeKeysInCart={new Set()}
        onAddUpgradeToCart={() => {}}
        onAddMaxUpgrades={() => {}}
      />
    ));
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Forge')).toBeInTheDocument();
    expect(screen.getByText(/Lv 2/)).toBeInTheDocument();
    // Notes not shown when collapsed
    expect(screen.queryByText(/Strong vs skeletons/)).toBeNull();
  });

  it('shows CompactUpgradeGrid and permalink when expanded', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        inCart={false}
        onToggle={() => {}}
        onAddToCart={() => {}}
        onOpenCart={() => {}}
        upgradeKeysInCart={new Set()}
        onAddUpgradeToCart={() => {}}
        onAddMaxUpgrades={() => {}}
      />
    ));
    expect(screen.getByText('Upgrades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Max/ })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open detail page/ }),
    ).toBeInTheDocument();
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
        inCart={false}
        onToggle={onToggle}
        onAddToCart={() => {}}
        onOpenCart={() => {}}
        upgradeKeysInCart={new Set()}
        onAddUpgradeToCart={() => {}}
        onAddMaxUpgrades={() => {}}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    expect(onToggle).toHaveBeenCalledWith('iron-sword');
  });

  it('renders permalink anchor with the correct href', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        inCart={false}
        onToggle={() => {}}
        onAddToCart={() => {}}
        onOpenCart={() => {}}
        upgradeKeysInCart={new Set()}
        onAddUpgradeToCart={() => {}}
        onAddMaxUpgrades={() => {}}
      />
    ));
    expect(
      screen.getByRole('link', { name: /open detail page/ }),
    ).toHaveAttribute('href', '/valheim/recipes/iron-sword/');
  });

  it('renders recipe icon when iconIds includes the recipe id', () => {
    const iconIds = new Set(['iron-sword']);
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        inCart={false}
        onToggle={() => {}}
        onAddToCart={() => {}}
        onOpenCart={() => {}}
        upgradeKeysInCart={new Set()}
        onAddUpgradeToCart={() => {}}
        onAddMaxUpgrades={() => {}}
        iconIds={iconIds}
      />
    ));
    const icon = document.querySelector('.item-icon--md');
    expect(icon).toBeInTheDocument();
    const use = icon?.querySelector('use');
    expect(use?.getAttribute('href')).toContain('#iron-sword');
  });

  it('does not render icon when iconIds is absent', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        inCart={false}
        onToggle={() => {}}
        onAddToCart={() => {}}
        onOpenCart={() => {}}
        upgradeKeysInCart={new Set()}
        onAddUpgradeToCart={() => {}}
        onAddMaxUpgrades={() => {}}
      />
    ));
    expect(document.querySelector('.item-icon--md')).toBeNull();
  });
});
