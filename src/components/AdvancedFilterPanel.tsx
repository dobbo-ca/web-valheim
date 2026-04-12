import { For, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station } from '../lib/types';

interface TagGroup {
  label: string;
  tags: string[];
}

const tagGroups: TagGroup[] = [
  { label: 'Weapons', tags: ['sword', 'axe', 'mace', 'spear', 'knife', 'atgeir', 'sledge', 'battleaxe', 'club'] },
  { label: 'Projectiles', tags: ['bow', 'crossbow', 'arrow', 'bolt', 'staff'] },
  { label: 'Armor', tags: ['helmet', 'chest', 'legs', 'cape', 'shield', 'tower-shield'] },
];

const standaloneTags = ['tool', 'station-upgrade', 'utility', 'magic', 'elemental', 'building'];

const biomes: { label: string; tier: string }[] = [
  { label: 'Meadows', tier: 'tier-0' },
  { label: 'Black Forest', tier: 'tier-1' },
  { label: 'Swamp', tier: 'tier-2' },
  { label: 'Mountain', tier: 'tier-3' },
  { label: 'Plains', tier: 'tier-4' },
  { label: 'Mistlands', tier: 'tier-5' },
  { label: 'Ashlands', tier: 'tier-6' },
];

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

  const toggleGroup = (group: TagGroup) => {
    const current = props.state.tags;
    const allSelected = group.tags.every((t) => current.includes(t));
    const next = allSelected
      ? current.filter((t) => !group.tags.includes(t))
      : [...new Set([...current, ...group.tags])];
    update({ tags: next });
  };

  const isGroupActive = (group: TagGroup) =>
    group.tags.every((t) => props.state.tags.includes(t));

  const isGroupPartial = (group: TagGroup) =>
    !isGroupActive(group) && group.tags.some((t) => props.state.tags.includes(t));

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
        <div class="adv-filter__tags" role="group" aria-label="Recipe type">
          <For each={typeChips}>
            {(chip) => (
              <button
                type="button"
                class="filter-chip filter-chip--sm"
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
        <span class="adv-filter__label">Categories</span>
        <For each={tagGroups}>
          {(group) => (
            <div class="adv-filter__tag-group">
              <div class="adv-filter__tags">
                <button
                  type="button"
                  class="filter-chip filter-chip--sm filter-chip--group"
                  classList={{
                    'filter-chip--active': isGroupActive(group),
                    'filter-chip--partial': isGroupPartial(group),
                  }}
                  onClick={() => toggleGroup(group)}
                  aria-label={`Toggle all ${group.label}`}
                >
                  {group.label}
                </button>
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
        <span class="adv-filter__label">Biome</span>
        <div class="adv-filter__tags">
          <For each={biomes}>
            {(biome) => (
              <button
                type="button"
                class="filter-chip filter-chip--sm"
                classList={{ 'filter-chip--active': props.state.tags.includes(biome.tier) }}
                onClick={() => toggleTag(biome.tier)}
              >
                {biome.label}
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
