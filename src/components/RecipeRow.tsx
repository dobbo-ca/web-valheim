import { For, Show, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { IngredientChip } from './IngredientChip';
import { AddToCartButton } from './AddToCartButton';
import { ItemIcon } from './ItemIcon';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  inCart: boolean;
  onToggle: (recipeId: string) => void;
  onIngredientClick: (itemId: string) => void;
  onAddToCart: (recipeId: string) => void;
  onOpenCart: () => void;
  iconIds?: Set<string>;
  spriteHref?: string;
}

function formatIngredients(
  recipe: Recipe,
  itemsById: Map<string, Item>,
): string {
  return recipe.ingredients
    .map((i) => `${itemsById.get(i.itemId)?.name ?? i.itemId} ×${i.qty}`)
    .join(', ');
}

export const RecipeRow: Component<Props> = (props) => {
  const detailId = () => `recipe-row-detail-${props.recipe.id}`;
  const spriteHref = () => props.spriteHref ?? '/icons/sprite.svg';
  const hasRecipeIcon = () => props.iconIds?.has(props.recipe.id) ?? false;

  return (
    <>
      <div class="recipe-row__wrapper">
        <button
          type="button"
          class="recipe-row"
          classList={{ 'recipe-row--expanded': props.expanded }}
          aria-expanded={props.expanded}
          aria-controls={detailId()}
          onClick={() => props.onToggle(props.recipe.id)}
        >
          <span class="recipe-row__name">
            {props.expanded ? '▾ ' : ''}
            <Show when={hasRecipeIcon()}>
              <ItemIcon id={props.recipe.id} size="md" spriteHref={spriteHref()} />
            </Show>
            {props.recipe.name}
            <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
              <span class="recipe-row__yield">×{props.recipe.yields!.qty}</span>
            </Show>
          </span>
          <span class="recipe-row__station">
            {(() => {
              const station = props.stationsById.get(props.recipe.station);
              const stationName = station?.name ?? props.recipe.station;
              if (props.recipe.stationLevel > 1) {
                return <>{stationName}<span class="recipe-row__station-level"> (Lv {props.recipe.stationLevel})</span><span class="recipe-row__station-level-short"> +{props.recipe.stationLevel - 1}</span></>;
              }
              return stationName;
            })()}
          </span>
          <Show when={!props.expanded}>
            <span class="recipe-row__ings">
              {formatIngredients(props.recipe, props.itemsById)}
            </span>
          </Show>
        </button>
        <div class="recipe-row__cart-cell">
          <AddToCartButton
            inCart={props.inCart}
            onAdd={() => props.onAddToCart(props.recipe.id)}
            onOpenCart={props.onOpenCart}
          />
        </div>
      </div>

      <Show when={props.expanded}>
        <div class="recipe-row__detail" id={detailId()}>
          <div class="recipe-row__section">
            <span class="label">Ingredients</span>
            <div class="chips">
              <For each={props.recipe.ingredients}>
                {(ing) => (
                  <IngredientChip
                    itemId={ing.itemId}
                    label={props.itemsById.get(ing.itemId)?.name ?? ing.itemId}
                    qty={ing.qty}
                    onClick={props.onIngredientClick}
                    hasIcon={props.iconIds?.has(ing.itemId) ?? false}
                    spriteHref={spriteHref()}
                  />
                )}
              </For>
            </div>
          </div>

          <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
            <div class="recipe-row__section">
              <span class="label">Yields</span>
              <span>×{props.recipe.yields!.qty} per craft</span>
            </div>
          </Show>

          <Show when={(() => {
            const yieldItemId = props.recipe.yields?.itemId ?? props.recipe.id;
            const item = props.itemsById.get(yieldItemId);
            return item?.stackSize;
          })()}>
            {(stackSize) => (
              <div class="recipe-row__section">
                <span class="label">Stack size</span>
                <span>{stackSize()}</span>
              </div>
            )}
          </Show>

          <Show when={props.recipe.food}>
            {(food) => (
              <div class="recipe-row__section">
                <span class="label">Food stats</span>
                <div class="food-stats">
                  <span>HP {food().hp}</span>
                  <span>Stam {food().stamina}</span>
                  <span>Regen {food().regen}</span>
                  <span>Duration {Math.round(food().duration / 60)}m</span>
                  <Show when={food().eitr}>
                    <span>Eitr {food().eitr}</span>
                  </Show>
                </div>
              </div>
            )}
          </Show>

          <Show when={props.recipe.notes}>
            <div class="recipe-row__section recipe-row__notes">
              {props.recipe.notes}
            </div>
          </Show>

          <Show when={props.recipe.secondaryStep}>
            {(step) => (
              <div class="recipe-row__section">
                <span class="label">Next step</span>
                <p>{step().description}</p>
              </div>
            )}
          </Show>

          <a
            class="recipe-row__permalink"
            href={`${props.baseHref}recipes/${props.recipe.id}/`}
          >
            ↗ open detail page
          </a>
        </div>
      </Show>
    </>
  );
};
