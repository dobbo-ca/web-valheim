import { Show, createSignal, onMount, type Component } from 'solid-js';
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

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('adv') === '1') setAdvOpen(true);
  });

  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  const toggleAdv = () => {
    const next = !advOpen();
    setAdvOpen(next);
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

      <Show when={advOpen()}>
        <div id="advanced-filters" class="filter-bar__adv-panel">
          <AdvancedFilterPanel
            state={props.state}
            stations={props.stations}
            onChange={props.onChange}
          />
        </div>
      </Show>
    </div>
  );
};
