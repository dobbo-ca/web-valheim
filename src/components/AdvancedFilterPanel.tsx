import { For, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station } from '../lib/types';

interface TagGroup {
  label: string;
  tags: string[];
}

const tagGroups: TagGroup[] = [
  { label: 'Weapons', tags: ['sword', 'axe', 'mace', 'spear', 'knife', 'atgeir', 'sledge', 'battleaxe', 'club'] },
  { label: 'Ranged', tags: ['bow', 'crossbow', 'arrow', 'bolt', 'staff'] },
  { label: 'Armor', tags: ['helmet', 'chest', 'legs', 'cape', 'shield', 'tower-shield'] },
];

const standaloneTags = ['tool', 'station-upgrade', 'utility', 'magic', 'elemental', 'building'];

interface Props {
  state: FilterState;
  stations: Station[];
  onChange: (next: FilterState) => void;
}

export const AdvancedFilterPanel: Component<Props> = (props) => {
  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  const typeChips: Array<{ value: FilterState['type']; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'crafting', label: 'Crafting' },
    { value: 'cooking', label: 'Cooking' },
    { value: 'building', label: 'Building' },
  ];

  const toggleTag = (tag: string) => {
    const current = props.state.tags;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    update({ tags: next });
  };

  const stationsWithUpgrades = () =>
    props.stations.filter((s) => s.upgrades.length > 0);

  const setCeiling = (stationId: string, level: number) => {
    const next = { ...props.state.stationCeilings, [stationId]: level };
    update({ stationCeilings: next });
  };

  const clearCeiling = (stationId: string) => {
    const next = { ...props.state.stationCeilings };
    delete next[stationId];
    update({ stationCeilings: next });
  };

  const getCeiling = (station: Station): number =>
    props.state.stationCeilings[station.id] ?? station.maxLevel;

  return (
    <div class="adv-filter">
      <div class="adv-filter__section">
        <span class="adv-filter__label">Type</span>
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
      </div>

      <div class="adv-filter__section">
        <span class="adv-filter__label">Station</span>
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
      </div>

      <div class="adv-filter__section">
        <span class="adv-filter__label">Level Range</span>
        <div class="adv-filter__level-range">
          <input
            type="number"
            min="1"
            max="7"
            value={props.state.minStationLevel}
            class="adv-filter__level-input"
            aria-label="Minimum level"
            onInput={(e) => {
              const val = Math.max(1, Math.min(7, Number.parseInt(e.currentTarget.value, 10) || 1));
              const max = Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7;
              update({ minStationLevel: Math.min(val, max) });
            }}
          />
          <span class="adv-filter__level-sep">–</span>
          <input
            type="number"
            min="1"
            max="7"
            value={Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7}
            class="adv-filter__level-input"
            aria-label="Maximum level"
            onInput={(e) => {
              const val = Math.max(1, Math.min(7, Number.parseInt(e.currentTarget.value, 10) || 7));
              update({ maxStationLevel: Math.max(val, props.state.minStationLevel) });
            }}
          />
        </div>
      </div>

      <div class="adv-filter__section">
        <span class="adv-filter__label">Categories</span>
        <For each={tagGroups}>
          {(group) => (
            <div class="adv-filter__tag-group">
              <span class="adv-filter__tag-group-label">{group.label}</span>
              <div class="adv-filter__tags">
                <For each={group.tags}>
                  {(tag) => (
                    <button
                      type="button"
                      class="filter-chip filter-chip--sm"
                      classList={{ 'filter-chip--active': props.state.tags.includes(tag) }}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <div class="adv-filter__tags">
          <For each={standaloneTags}>
            {(tag) => (
              <button
                type="button"
                class="filter-chip filter-chip--sm"
                classList={{ 'filter-chip--active': props.state.tags.includes(tag) }}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="adv-filter__section">
        <span class="adv-filter__label">Station Levels</span>
        <div class="adv-filter__station-levels">
          <For each={stationsWithUpgrades()}>
            {(station) => (
              <div class="adv-filter__station-level">
                <span class="adv-filter__station-name">{station.name}</span>
                <input
                  type="number"
                  min="1"
                  max={station.maxLevel}
                  value={getCeiling(station)}
                  class="adv-filter__level-input"
                  aria-label={`${station.name} level ceiling`}
                  onInput={(e) => {
                    const val = Number.parseInt(e.currentTarget.value, 10);
                    if (Number.isFinite(val) && val >= 1 && val <= station.maxLevel) {
                      if (val === station.maxLevel) {
                        clearCeiling(station.id);
                      } else {
                        setCeiling(station.id, val);
                      }
                    }
                  }}
                />
                <span class="adv-filter__station-max">/ {station.maxLevel}</span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
