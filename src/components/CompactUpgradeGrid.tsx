import { For, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { ItemIcon } from './ItemIcon';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  upgradeKeysInCart: Set<string>;
  onAddUpgradeToCart: (cartKey: string) => void;
  onAddMaxUpgrades: (recipeId: string) => void;
  onOpenCart: () => void;
  iconIds?: Set<string>;
  spriteHref?: string;
}

export const CompactUpgradeGrid: Component<Props> = (props) => {
  const spriteHref = () => props.spriteHref ?? '';
  const stationName = () => {
    const s = props.stationsById.get(props.recipe.station);
    return s?.name ?? props.recipe.station;
  };

  return (
    <div class="compact-upgrades">
      <div class="compact-upgrades__header">
        <span class="label">Upgrades</span>
        <button
          type="button"
          class="compact-upgrades__max-btn"
          onClick={(e) => {
            e.stopPropagation();
            props.onAddMaxUpgrades(props.recipe.id);
          }}
        >
          🛒 Add Max
        </button>
      </div>
      <For each={props.recipe.upgrades ?? []}>
        {(upgrade) => {
          const cartKey = `${props.recipe.id}+${upgrade.quality}`;
          const inCart = () => props.upgradeKeysInCart.has(cartKey);

          return (
            <div class="compact-upgrades__row">
              <span class="compact-upgrades__quality">Q{upgrade.quality}</span>
              <span class="compact-upgrades__station">
                {stationName()} {upgrade.stationLevel}
              </span>
              <div class="compact-upgrades__ingredients">
                <For each={upgrade.ingredients}>
                  {(ing) => {
                    const name = () => props.itemsById.get(ing.itemId)?.name ?? ing.itemId;
                    const hasIcon = () => props.iconIds?.has(ing.itemId) ?? false;
                    return (
                      <span class="compact-upgrades__ing" title={name()}>
                        {hasIcon() && (
                          <ItemIcon id={ing.itemId} size="sm" spriteHref={spriteHref()} />
                        )}
                        <span class="compact-upgrades__qty">×{ing.qty}</span>
                      </span>
                    );
                  }}
                </For>
              </div>
              <button
                type="button"
                class="add-to-cart-btn add-to-cart-btn--sm"
                classList={{ 'add-to-cart-btn--in-cart': inCart() }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (inCart()) props.onOpenCart();
                  else props.onAddUpgradeToCart(cartKey);
                }}
                aria-label={
                  inCart()
                    ? `${props.recipe.name} +${upgrade.quality - 1} in cart`
                    : `Add ${props.recipe.name} +${upgrade.quality - 1} to cart`
                }
              >
                {inCart() ? '✓' : '+'}
              </button>
            </div>
          );
        }}
      </For>
    </div>
  );
};
