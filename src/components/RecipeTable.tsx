import { For, Show, createEffect, createMemo, createSignal, onMount, type Component } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type { DataSet } from '../lib/loader';
import type { FilterState } from '../lib/filter';
import { filterRecipes, emptyFilterState } from '../lib/filter';
import { decodeFilterState, encodeFilterState } from '../lib/url-state';
import {
  addToCart,
  removeFromCart,
  setQty,
  clearCart,
  aggregateGroceryList,
  encodeCartUrl,
  decodeCartUrl,
} from '../lib/cart';
import { FilterBar } from './FilterBar';
import { RecipeRow } from './RecipeRow';
import { CartButton } from './CartButton';
import { CartDrawer } from './CartDrawer';

type SortKey = 'name' | 'station' | 'level';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 50, 100] as const;
const CART_STORAGE_KEY = 'valheim-cart';
const PAGE_SIZE_KEY = 'valheim-page-size';

function readStoredPageSize(): number {
  try {
    const stored = localStorage.getItem(PAGE_SIZE_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if ((PAGE_SIZES as readonly number[]).includes(parsed)) return parsed;
    }
  } catch {}
  return 20;
}

interface Props {
  data: DataSet;
  baseHref: string;
  iconIds?: string[];
  spriteHref?: string;
}

export const RecipeTable: Component<Props> = (props) => {
  const [state, setState] = createSignal<FilterState>(emptyFilterState);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [sortDir, setSortDir] = createSignal<SortDir>('asc');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal<number>(readStoredPageSize());
  const [cart, setCart] = createStore<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  const [mounted, setMounted] = createSignal(false);

  // Stable sorted recipe IDs used as the integer index for URL encoding
  const recipeIndex = createMemo(() =>
    [...props.data.recipes].map((r) => r.id).sort(),
  );

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setState(decodeFilterState(params));

    // Hydrate cart: URL param takes precedence over localStorage
    const cartParam = params.get('cart');
    if (cartParam) {
      setCart(reconcile(decodeCartUrl(cartParam, recipeIndex())));
    } else {
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            setCart(reconcile(parsed));
          }
        }
      } catch {
        // localStorage unavailable or corrupt
      }
    }

    setMounted(true);
  });

  createEffect(() => {
    const keys = Object.keys(cart);
    const snapshot = Object.fromEntries(keys.map((k) => [k, cart[k]]));

    // Persist to localStorage as JSON (index-independent)
    try {
      if (keys.length === 0) {
        localStorage.removeItem(CART_STORAGE_KEY);
      } else {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(snapshot));
      }
    } catch {
      // localStorage unavailable
    }

    // Update URL with compact encoded form
    const encoded = encodeCartUrl(snapshot, recipeIndex());
    const params = new URLSearchParams(window.location.search);
    if (encoded) {
      params.set('cart', encoded);
    } else {
      params.delete('cart');
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  });

  const itemsById = createMemo(
    () => new Map(props.data.items.map((i) => [i.id, i])),
  );

  const stationsById = createMemo(
    () => new Map(props.data.stations.map((s) => [s.id, s])),
  );

  const iconSet = createMemo(
    () => new Set(props.iconIds ?? []),
  );

  const recipesById = createMemo(
    () => new Map(props.data.recipes.map((r) => [r.id, r])),
  );

  const cartKeys = createMemo(() => Object.keys(cart));
  const cartCount = createMemo(() => cartKeys().length);

  const groceryList = createMemo(() =>
    aggregateGroceryList(
      Object.fromEntries(cartKeys().map((k) => [k, cart[k]])),
      recipesById(),
      itemsById(),
    ),
  );

  const cartEntries = createMemo(() =>
    cartKeys().map((recipeId) => ({
      recipeId,
      recipeName: recipesById().get(recipeId)?.name ?? recipeId,
      qty: cart[recipeId],
    })),
  );

  const handleAddToCart = (recipeId: string) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    setCart(reconcile(addToCart(snapshot, recipeId)));
  };

  const handleSetQty = (recipeId: string, qty: number) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    const next = setQty(snapshot, recipeId, qty);
    setCart(reconcile(next));
    if (Object.keys(next).length === 0) setDrawerOpen(false);
  };

  const handleRemoveFromCart = (recipeId: string) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    const next = removeFromCart(snapshot, recipeId);
    setCart(reconcile(next));
    if (Object.keys(next).length === 0) setDrawerOpen(false);
  };

  const handleClearCart = () => {
    setCart(reconcile(clearCart()));
    setDrawerOpen(false);
  };

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
    // Preserve cart param across filter changes
    const currentParams = new URLSearchParams(window.location.search);
    const cartParam = currentParams.get('cart');
    if (cartParam) params.set('cart', cartParam);
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
    <Show when={mounted()} fallback={<div class="recipe-table__loading" />}>
    <div class="recipe-table">
      <div class="recipe-table__toolbar">
        <FilterBar state={state()} stations={props.data.stations} onChange={commit} />
        <CartButton count={cartCount()} onClick={() => setDrawerOpen(true)} />
      </div>

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
          <span role="columnheader">Ingredients</span>
          <span role="columnheader" class="sr-only">Cart</span>
        </div>

        <For each={paginated()} fallback={<div class="recipe-table__empty">No recipes match these filters.</div>}>
          {(recipe) => (
            <RecipeRow
              recipe={recipe}
              itemsById={itemsById()}
              stationsById={stationsById()}
              expanded={expandedId() === recipe.id}
              baseHref={props.baseHref}
              inCart={recipe.id in cart}
              onToggle={toggleRow}
              onIngredientClick={addIngredient}
              onAddToCart={handleAddToCart}
              onOpenCart={() => setDrawerOpen(true)}
              iconIds={iconSet()}
              spriteHref={props.spriteHref ?? `${props.baseHref}icons/sprite.svg`}
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
                onClick={() => {
                  setPageSize(size);
                  setPage(1);
                  try { localStorage.setItem(PAGE_SIZE_KEY, String(size)); } catch {}
                }}
              >
                {size}
              </button>
            )}
          </For>
        </div>
      </div>

      <CartDrawer
        open={drawerOpen()}
        entries={cartEntries()}
        groceryList={groceryList()}
        onClose={() => setDrawerOpen(false)}
        onSetQty={handleSetQty}
        onRemove={handleRemoveFromCart}
        onClear={handleClearCart}
      />
    </div>
    </Show>
  );
};
