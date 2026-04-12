import { For, Show, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { IngredientChip } from './IngredientChip';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  onToggle: (recipeId: string) => void;
  onIngredientClick: (itemId: string) => void;
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
  return (
    <>
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
          {props.recipe.name}
        </span>
        <span class="recipe-row__station">
          {props.stationsById.get(props.recipe.station)?.name ?? props.recipe.station}
        </span>
        <span class="recipe-row__lvl">{props.recipe.stationLevel}</span>
        <Show when={!props.expanded}>
          <span class="recipe-row__ings">
            {formatIngredients(props.recipe, props.itemsById)}
          </span>
        </Show>
        <span class="recipe-row__tags">
          {(props.recipe.tags ?? []).join(' · ')}
        </span>
      </button>

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
                  />
                )}
              </For>
            </div>
          </div>

          <Show when={props.recipe.food}>
            {(food) => (
              <div class="recipe-row__section">
                <span class="label">Food stats</span>
                <div class="food-stats">
                  <span>HP {food().hp}</span>
                  <span>Stam {food().stamina}</span>
                  <span>Regen {food().regen}</span>
                  <span>Duration {Math.round(food().duration / 60)}m</span>
                </div>
              </div>
            )}
          </Show>

          <Show when={props.recipe.notes}>
            <div class="recipe-row__section recipe-row__notes">
              {props.recipe.notes}
            </div>
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
