import { For, Show, createMemo, createSignal, onMount, type Component } from 'solid-js';
import type { DataSet } from '../lib/loader';
import type { FilterState } from '../lib/filter';
import { filterRecipes, emptyFilterState } from '../lib/filter';
import { decodeFilterState, encodeFilterState } from '../lib/url-state';
import { FilterBar } from './FilterBar';
import { RecipeRow } from './RecipeRow';

interface Props {
  data: DataSet;
  baseHref: string;
}

export const RecipeTable: Component<Props> = (props) => {
  const [state, setState] = createSignal<FilterState>(emptyFilterState);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setState(decodeFilterState(params));
  });

  const itemsById = createMemo(
    () => new Map(props.data.items.map((i) => [i.id, i])),
  );

  const stationsById = createMemo(
    () => new Map(props.data.stations.map((s) => [s.id, s])),
  );

  const filtered = createMemo(() => filterRecipes(props.data.recipes, state()));

  const commit = (next: FilterState) => {
    setState(next);
    const params = encodeFilterState(next);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const addIngredient = (itemId: string) => {
    const current = state().ingredientIds;
    if (current.includes(itemId)) return;
    commit({ ...state(), ingredientIds: [...current, itemId] });
  };

  const removeIngredient = (itemId: string) => {
    const current = state();
    commit({
      ...current,
      ingredientIds: current.ingredientIds.filter((id) => id !== itemId),
    });
  };

  // Note: when filters hide the expanded recipe, expandedId keeps its value.
  // If filters later include the recipe again, the row will re-expand. This
  // is intentional — the user's expansion is preserved across transient
  // filter changes.

  const activeIngredientLabel = (id: string) =>
    itemsById().get(id)?.name ?? id;

  return (
    <div class="recipe-table">
      <FilterBar state={state()} stations={props.data.stations} onChange={commit} />

      <Show when={state().ingredientIds.length > 0}>
        <div class="reverse-lookup-strip">
          <span class="label">Uses ingredient:</span>
          <For each={state().ingredientIds}>
            {(id) => (
              <button
                type="button"
                class="chip chip--active-filter"
                aria-label={`Remove ${activeIngredientLabel(id)} from ingredient filter`}
                onClick={() => removeIngredient(id)}
              >
                {activeIngredientLabel(id)} ✕
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class="recipe-table__grid" role="table">
        <div class="recipe-table__header" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Station</span>
          <span role="columnheader">Lvl</span>
          <span role="columnheader">Ingredients</span>
        </div>

        <For each={filtered()} fallback={<div class="recipe-table__empty">No recipes match these filters.</div>}>
          {(recipe) => (
            <RecipeRow
              recipe={recipe}
              itemsById={itemsById()}
              stationsById={stationsById()}
              expanded={expandedId() === recipe.id}
              baseHref={props.baseHref}
              onToggle={toggleRow}
              onIngredientClick={addIngredient}
            />
          )}
        </For>
      </div>

      <div class="recipe-table__footer">
        Showing {filtered().length} of {props.data.recipes.length} recipes
      </div>
    </div>
  );
};
