import { Show, createEffect, createSignal, onCleanup, onMount, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station } from '../lib/types';
import { AdvancedFilterPanel } from './AdvancedFilterPanel';

interface Props {
  state: FilterState;
  stations: Station[];
  onChange: (next: FilterState) => void;
}

export const FilterBar: Component<Props> = (props) => {
  const [advOpen, setAdvOpen] = createSignal(false);
  const [mobile, setMobile] = createSignal(false);
  const [closing, setClosing] = createSignal(false);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('adv') === '1') setAdvOpen(true);

    const mq = window.matchMedia('(max-width: 767px)');
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    onCleanup(() => mq.removeEventListener('change', handler));
  });

  // Close on Escape when sheet is open
  createEffect(() => {
    if (!advOpen() || !mobile()) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  });

  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  const toggleAdv = () => {
    const next = !advOpen();
    if (next) {
      setAdvOpen(true);
      setClosing(false);
    } else {
      handleClose();
    }
    const params = new URLSearchParams(window.location.search);
    if (next) {
      params.set('adv', '1');
    } else {
      params.delete('adv');
    }
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const handleClose = () => {
    if (mobile()) {
      setClosing(true);
    } else {
      setAdvOpen(false);
    }
  };

  const handleAnimationEnd = () => {
    if (closing()) {
      setClosing(false);
      setAdvOpen(false);
    }
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('filter-sheet__overlay')) {
      handleClose();
    }
  };

  const hasActiveFilters = () =>
    props.state.type !== 'all' ||
    props.state.station !== 'all' ||
    props.state.tags.length > 0 ||
    Object.keys(props.state.stationCeilings).length > 0 ||
    props.state.minStationLevel > 1 ||
    Number.isFinite(props.state.maxStationLevel);

  return (
    <div class="filter-bar">
      <input
        type="search"
        class="filter-bar__search"
        placeholder="Search recipes, ingredients, tags…"
        value={props.state.query}
        onInput={(e) => update({ query: e.currentTarget.value })}
      />
      <button
        type="button"
        class="filter-bar__adv-toggle"
        classList={{ 'filter-bar__adv-toggle--active': advOpen() || hasActiveFilters() }}
        onClick={toggleAdv}
        aria-expanded={advOpen()}
        aria-controls="advanced-filters"
      >
        {advOpen() ? '▾ Filters' : '▸ Filters'}
      </button>

      {/* Desktop: inline panel */}
      <Show when={advOpen() && !mobile()}>
        <div id="advanced-filters" class="filter-bar__adv-panel">
          <AdvancedFilterPanel
            state={props.state}
            stations={props.stations}
            onChange={props.onChange}
          />
        </div>
      </Show>

      {/* Mobile: bottom sheet */}
      <Show when={advOpen() && mobile()}>
        <div
          class="filter-sheet__overlay"
          classList={{ 'filter-sheet__overlay--closing': closing() }}
          onClick={handleOverlayClick}
        >
          <div
            class="filter-sheet"
            classList={{ 'filter-sheet--closing': closing() }}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            onAnimationEnd={handleAnimationEnd}
          >
            <div class="filter-sheet__header">
              <h2 class="filter-sheet__title">Filters</h2>
              <button
                type="button"
                class="filter-sheet__close"
                onClick={handleClose}
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>
            <div class="filter-sheet__body">
              <AdvancedFilterPanel
                state={props.state}
                stations={props.stations}
                onChange={props.onChange}
              />
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
