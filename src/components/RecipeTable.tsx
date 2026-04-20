import { For, Show, createEffect, createMemo, createSignal, onMount, onCleanup, type Component } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type { DataSet } from '../lib/loader';
import type { FilterState } from '../lib/filter';
import { filterRecipes, emptyFilterState } from '../lib/filter';
import { decodeFilterState, encodeFilterState } from '../lib/url-state';
import {
  addToCart,
  encodeCartUrl,
  decodeCartUrl,
} from '../lib/cart';
import { FilterBar } from './FilterBar';
import { RecipeRow } from './RecipeRow';

type SortKey = 'name' | 'station' | 'level';
type SortDir = 'asc' | 'desc';
type ColumnId = 'station' | 'ingredients' | 'stats';

const PAGE_SIZES = [10, 20, 50, 100] as const;
const CART_STORAGE_KEY = 'valheim-cart';
const PAGE_SIZE_KEY = 'valheim-page-size';
const COLUMNS_KEY = 'valheim-columns';
const DEFAULT_COLUMNS: ColumnId[] = ['station', 'ingredients'];
const COL_BITS: Record<ColumnId, number> = { station: 1, ingredients: 2, stats: 4 };
const DEFAULT_COL_MASK = 3; // station + ingredients visible

function encodeColumns(cols: ColumnId[]): number {
  let mask = 0;
  for (const c of cols) mask |= COL_BITS[c];
  return mask;
}

function decodeColumns(mask: number): ColumnId[] {
  return (Object.keys(COL_BITS) as ColumnId[]).filter(c => mask & COL_BITS[c]);
}

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

function readStoredColumns(): ColumnId[] {
  try {
    const stored = localStorage.getItem(COLUMNS_KEY);
    if (stored) {
      const mask = Number.parseInt(stored, 10);
      if (Number.isFinite(mask)) return decodeColumns(mask);
    }
  } catch {}
  return DEFAULT_COLUMNS;
}

interface Props {
  data: DataSet;
  baseHref: string;
  iconIds?: string[];
  spriteHref?: string;
}

export const RecipeTable: Component<Props> = (props) => {
  const [fullData, setFullData] = createSignal<DataSet | null>(null);
  const data = () => fullData() ?? props.data;

  const [state, setState] = createSignal<FilterState>(emptyFilterState);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [sortDir, setSortDir] = createSignal<SortDir>('asc');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal<number>(readStoredPageSize());
  const [cart, setCart] = createStore<Record<string, number>>({});
  const [mounted, setMounted] = createSignal(false);
  const [visibleColumns, setVisibleColumns] = createSignal<ColumnId[]>(readStoredColumns());
  const [colMenuOpen, setColMenuOpen] = createSignal(false);
  let colToggleRef: HTMLSpanElement | undefined;

  // Close column menu on click-outside or Escape
  const handleClickOutside = (e: MouseEvent) => {
    if (colMenuOpen() && colToggleRef && !colToggleRef.contains(e.target as Node)) {
      setColMenuOpen(false);
    }
  };
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && colMenuOpen()) setColMenuOpen(false);
  };
  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    onCleanup(() => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    });
  });

  // Stable sorted recipe IDs used as the integer index for URL encoding
  const recipeIndex = createMemo(() =>
    [...data().recipes].map((r) => r.id).sort(),
  );

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setState(decodeFilterState(params));

    // Hydrate columns: URL param takes precedence over localStorage
    const colsParam = params.get('cols');
    if (colsParam) {
      const mask = Number.parseInt(colsParam, 10);
      if (Number.isFinite(mask)) {
        const cols = decodeColumns(mask);
        setVisibleColumns(cols);
        try { localStorage.setItem(COLUMNS_KEY, String(mask)); } catch {}
      }
    }

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

    // Lazy-load full dataset (inline data is stripped to reduce HTML size)
    fetch(`${props.baseHref}data/recipes-full.json`)
      .then((r) => r.json())
      .then((full) => setFullData(full))
      .catch(() => {}); // fall back to inline slim data
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
    () => new Map(data().items.map((i) => [i.id, i])),
  );

  const stationsById = createMemo(
    () => new Map(data().stations.map((s) => [s.id, s])),
  );

  const iconSet = createMemo(
    () => new Set(props.iconIds ?? []),
  );

  const recipesById = createMemo(
    () => new Map(data().recipes.map((r) => [r.id, r])),
  );

  const cartKeys = createMemo(() => Object.keys(cart));

  const upgradeKeysInCart = createMemo(() => {
    const set = new Set<string>();
    for (const key of cartKeys()) {
      if (key.includes('+')) set.add(key);
    }
    return set;
  });

  const handleAddToCart = (recipeId: string) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    setCart(reconcile(addToCart(snapshot, recipeId)));
  };

  const handleAddUpgradeToCart = (cartKey: string) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    setCart(reconcile(addToCart(snapshot, cartKey)));
  };

  const handleAddMaxUpgrades = (recipeId: string) => {
    const recipe = recipesById().get(recipeId);
    if (!recipe?.upgrades) return;
    let snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    for (const upgrade of recipe.upgrades) {
      const ceiling = state().stationCeilings[recipe.station];
      if (ceiling != null && upgrade.quality > ceiling) continue;
      const key = `${recipeId}+${upgrade.quality}`;
      snapshot = addToCart(snapshot, key);
    }
    setCart(reconcile(snapshot));
  };

  const filtered = createMemo(() => filterRecipes(data().recipes, state()));

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
    // Preserve cart and cols params across filter changes
    const currentParams = new URLSearchParams(window.location.search);
    const cartParam = currentParams.get('cart');
    if (cartParam) params.set('cart', cartParam);
    const colsParam = currentParams.get('cols');
    if (colsParam) params.set('cols', colsParam);
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

  const toggleColumn = (col: ColumnId) => {
    const current = visibleColumns();
    const next = current.includes(col)
      ? current.filter((c) => c !== col)
      : [...current, col];
    setVisibleColumns(next);
    const mask = encodeColumns(next);
    try { localStorage.setItem(COLUMNS_KEY, String(mask)); } catch {}
    const urlParams = new URLSearchParams(window.location.search);
    if (mask === DEFAULT_COL_MASK) {
      urlParams.delete('cols');
    } else {
      urlParams.set('cols', String(mask));
    }
    const qs = urlParams.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  };

  const isColVisible = (col: ColumnId) => visibleColumns().includes(col);

  const gridColumns = () => {
    const parts = ['2fr']; // Name always visible
    if (isColVisible('station')) parts.push('1.5fr');
    if (isColVisible('ingredients')) parts.push('3fr');
    if (isColVisible('stats')) parts.push('minmax(80px, auto)');
    parts.push('62px'); // Cart always visible
    return parts.join(' ');
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
        <FilterBar state={state()} stations={data().stations} spriteHref={props.spriteHref} onChange={commit} />
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

      <div class="recipe-table__grid" role="table" style={{ '--grid-cols': gridColumns() }}>
        <div class="recipe-table__header" role="row" ref={(el: HTMLDivElement) => {
          createEffect(() => { el.style.gridTemplateColumns = gridColumns(); });
        }}>
          <span role="columnheader" aria-sort={sortKey() === 'name' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'name' }} onClick={() => toggleSort('name')}>
              Name{sortIndicator('name')}
            </button>
          </span>
          <Show when={isColVisible('station')}>
            <span role="columnheader" aria-sort={sortKey() === 'station' ? (sortDir() === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button class="recipe-table__sort-btn" classList={{ 'recipe-table__sort-btn--active': sortKey() === 'station' }} onClick={() => toggleSort('station')}>
                Station{sortIndicator('station')}
              </button>
            </span>
          </Show>
          <Show when={isColVisible('ingredients')}>
            <span role="columnheader">Ingredients</span>
          </Show>
          <Show when={isColVisible('stats')}>
            <span role="columnheader">Stats</span>
          </Show>
          <span />
        </div>
        <span ref={colToggleRef} class="recipe-table__col-toggle">
          <button
            type="button"
            class="recipe-table__col-toggle-btn"
            onClick={() => setColMenuOpen((o) => !o)}
            aria-label="Toggle column visibility"
          >
            ⚙
          </button>
          <Show when={colMenuOpen()}>
            <div class="recipe-table__col-menu">
              <For each={[
                { id: 'station' as ColumnId, label: 'Station' },
                { id: 'ingredients' as ColumnId, label: 'Ingredients' },
                { id: 'stats' as ColumnId, label: 'Stats' },
              ]}>
                {(col) => (
                  <label class="recipe-table__col-option">
                    <input type="checkbox" checked={isColVisible(col.id)} onChange={() => toggleColumn(col.id)} />
                    {col.label}
                  </label>
                )}
              </For>
            </div>
          </Show>
        </span>

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
              onAddToCart={handleAddToCart}
              onOpenCart={() => {}}
              iconIds={iconSet()}
              spriteHref={props.spriteHref}
              upgradeKeysInCart={upgradeKeysInCart()}
              onAddUpgradeToCart={handleAddUpgradeToCart}
              onAddMaxUpgrades={handleAddMaxUpgrades}
              visibleColumns={visibleColumns()}
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

    </div>
    </Show>
  );
};
