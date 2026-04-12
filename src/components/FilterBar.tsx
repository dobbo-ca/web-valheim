import { For, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station } from '../lib/types';

interface Props {
  state: FilterState;
  stations: Station[];
  onChange: (next: FilterState) => void;
}

const typeChips: Array<{ value: FilterState['type']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'cooking', label: 'Cooking' },
];

export const FilterBar: Component<Props> = (props) => {
  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  return (
    <div class="filter-bar">
      <div class="filter-bar__chips" role="group" aria-label="Recipe type">
        <For each={typeChips}>
          {(chip) => (
            <button
              type="button"
              class="filter-chip"
              classList={{ 'filter-chip--active': props.state.type === chip.value }}
              onClick={() => update({ type: chip.value })}
            >
              {chip.label}
            </button>
          )}
        </For>
      </div>

      <label class="filter-bar__station">
        <span class="sr-only">Station</span>
        <select
          aria-label="Station"
          value={props.state.station}
          onChange={(e) => update({ station: e.currentTarget.value })}
        >
          <option value="all">All stations</option>
          <For each={props.stations}>
            {(s) => <option value={s.id}>{s.name}</option>}
          </For>
        </select>
      </label>

      <div class="filter-bar__level" role="group" aria-label="Station level range">
        <span class="label">Lvl</span>
        <input
          type="text"
          inputmode="numeric"
          pattern="[1-7]"
          maxLength={1}
          class="filter-bar__level-input"
          aria-label="Minimum station level"
          value={String(props.state.minStationLevel)}
          onInput={(e) => {
            const raw = e.currentTarget.value.replace(/\D/g, '');
            if (!raw) return;
            const val = Math.max(1, Math.min(7, Number.parseInt(raw, 10)));
            const max = Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7;
            update({ minStationLevel: Math.min(val, max) });
            e.currentTarget.value = String(Math.min(val, max));
          }}
        />
        <div class="range-slider">
          <div class="range-slider__track" />
          <div
            class="range-slider__fill"
            style={{
              left: `${((props.state.minStationLevel - 1) / 6) * 100}%`,
              width: `${(((Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7) - props.state.minStationLevel) / 6) * 100}%`,
            }}
          />
          <input
            type="range"
            min="1"
            max="7"
            value={String(props.state.minStationLevel)}
            aria-label="Minimum station level"
            onInput={(e) => {
              const val = Number.parseInt(e.currentTarget.value, 10);
              const max = Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7;
              update({ minStationLevel: Math.min(val, max) });
            }}
          />
          <input
            type="range"
            min="1"
            max="7"
            value={Number.isFinite(props.state.maxStationLevel) ? String(props.state.maxStationLevel) : '7'}
            aria-label="Maximum station level"
            onInput={(e) => {
              const val = Number.parseInt(e.currentTarget.value, 10);
              update({ maxStationLevel: Math.max(val, props.state.minStationLevel) });
            }}
          />
        </div>
        <input
          type="text"
          inputmode="numeric"
          pattern="[1-7]"
          maxLength={1}
          class="filter-bar__level-input"
          aria-label="Maximum station level"
          value={Number.isFinite(props.state.maxStationLevel) ? String(props.state.maxStationLevel) : '7'}
          onInput={(e) => {
            const raw = e.currentTarget.value.replace(/\D/g, '');
            if (!raw) return;
            const val = Math.max(1, Math.min(7, Number.parseInt(raw, 10)));
            update({ maxStationLevel: Math.max(val, props.state.minStationLevel) });
            e.currentTarget.value = String(Math.max(val, props.state.minStationLevel));
          }}
        />
      </div>

      <input
        type="search"
        class="filter-bar__search"
        placeholder="Search recipes, ingredients, tags…"
        value={props.state.query}
        onInput={(e) => update({ query: e.currentTarget.value })}
      />
    </div>
  );
};
