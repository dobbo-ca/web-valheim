import { For, Show, createMemo, createSignal, onMount, type Component } from 'solid-js';
import type { DataSet } from '../lib/loader';
import type { FilterState } from '../lib/filter';
import { filterRecipes, emptyFilterState } from '../lib/filter';
import { decodeFilterState, encodeFilterState } from '../lib/url-state';
import { FilterBar } from './FilterBar';
import { RecipeRow } from './RecipeRow';

type SortKey = 'name' | 'station' | 'level';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 50, 100] as const;

interface Props {
  data: DataSet;
  baseHref: string;
}

export const RecipeTable: Component<Props> = (props) => {
  const [state, setState] = createSignal<FilterState>(emptyFilterState);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [sortDir, setSortDir] = createSignal<SortDir>('asc');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal<number>(20);

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

  const sorted = createMemo(() => {
    const key = sortKey();
    const rows = filtered();
    if (!key) return rows;
    const dir = sortDir() === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (key === 'name') {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      } else if (key === 'station') {
        av = (stationsById().get(a.station)?.name ?? a.station).toLowerCase();
        bv = (stationsById().get(b.station)?.name ?? b.station).toLowerCase();
      } else {
        av = a.stationLevel;
        bv = b.stationLevel;
      }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(sorted().length / pageSize())),
  );

  const clampedPage = createMemo(() => Math.min(page(), totalPages()));

  const paginated = createMemo(() => {
    const p = clampedPage();
    const size = pageSize();
    return sorted().slice((p - 1) * size, p * size);
  });

  // Page numbers to render: always include first, last, and a window around
  // the current page. null entries render as ellipsis separators.
  const visiblePages = createMemo((): (number | null)[] => {
    const total = totalPages();
    const cur = clampedPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, total]);
    for (let i = Math.max(1, cur - 1); i <= Math.min(total, cur + 1); i++) set.add(i);
    const nums = [...set].sort((a, b) => a - b);
    const result: (number | null)[] = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) result.push(null);
      result.push(n);
      prev = n;
    }
    return result;
  });

  const commit = (next: FilterState) => {
    setState(next);
    setPage(1);
    const params = encodeFilterState(next);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey() !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir() === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey() !== key) return ' ⇅';
    return sortDir() === 'asc' ? ' ▲' : ' ▼';
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

  const start = () => (clampedPage() - 1) * pageSize() + 1;
  const end = () => Math.min(clampedPage() * pageSize(), sorted().length);

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
          <span role="columnheader" aria-sort={sortKey() === 'name' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'name' }} onClick={() => toggleSort('name')}>
              Name{sortIndicator('name')}
            </button>
          </span>
          <span role="columnheader" aria-sort={sortKey() === 'station' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'station' }} onClick={() => toggleSort('station')}>
              Station{sortIndicator('station')}
            </button>
          </span>
          <span role="columnheader" aria-sort={sortKey() === 'level' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'level' }} onClick={() => toggleSort('level')}>
              Lvl{sortIndicator('level')}
            </button>
          </span>
          <span role="columnheader">Ingredients</span>
        </div>

        <For each={paginated()} fallback={<div class="recipe-table__empty">No recipes match these filters.</div>}>
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
        <span>
          {sorted().length === 0
            ? 'No recipes match these filters.'
            : `${start()}–${end()} of ${sorted().length} recipes`}
        </span>

        <Show when={totalPages() > 1}>
          <div class="recipe-table__pagination">
            <button
              class="recipe-table__page-btn"
              disabled={clampedPage() === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>

            <For each={visiblePages()}>
              {(p) =>
                p === null ? (
                  <span class="recipe-table__page-ellipsis">…</span>
                ) : (
                  <button
                    class="recipe-table__page-btn"
                    classList={{ 'recipe-table__page-btn--active': p === clampedPage() }}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === clampedPage() ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              }
            </For>

            <button
              class="recipe-table__page-btn"
              disabled={clampedPage() === totalPages()}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </Show>

        <div class="recipe-table__page-size">
          <span>Per page:</span>
          <For each={PAGE_SIZES}>
            {(size) => (
              <button
                class="recipe-table__page-btn"
                classList={{ 'recipe-table__page-btn--active': pageSize() === size }}
                onClick={() => { setPageSize(size); setPage(1); }}
              >
                {size}
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
