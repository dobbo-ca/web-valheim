import { For, Show, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import { emptyFilterState } from '../lib/filter';
import type { Station } from '../lib/types';
import {
  categories,
  biomes,
  foodStatFocus,
  handedness,
  damageTypes,
  categorySubFilters,
  defaultSubFilters,
  tagDisplayNames,
  type SubFilterKey,
} from '../lib/filter-categories';

interface Props {
  state: FilterState;
  stations: Station[];
  spriteHref?: string;
  onChange: (next: FilterState) => void;
}

export const AdvancedFilterPanel: Component<Props> = (props) => {
  const FilterIcon: Component<{ name: string }> = (iconProps) => (
    <svg class="filter-icon" width={16} height={16} style={{ "image-rendering": "pixelated" }}>
      <use href={`${props.spriteHref ?? ''}#filter-${iconProps.name}`} />
    </svg>
  );

  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  // ── Tag helpers ──────────────────────────────────────────────────────────
  const hasTags = (...tags: string[]) =>
    tags.every((t) => props.state.tags.includes(t));

  const activeCategory = () =>
    categories.find((c) => hasTags(c.tag)) ?? null;

  const visibleSubFilters = (): SubFilterKey[] => {
    const cat = activeCategory();
    return cat ? (categorySubFilters[cat.tag] ?? defaultSubFilters) : defaultSubFilters;
  };

  const isSubFilterVisible = (key: SubFilterKey) =>
    visibleSubFilters().includes(key);

  // ── Single-select within a group ─────────────────────────────────────────
  const selectExclusive = (tag: string, group: string[]) => {
    const current = props.state.tags.filter((t) => !group.includes(t));
    if (hasTags(tag)) {
      update({ tags: current });
    } else {
      update({ tags: [...current, tag] });
    }
  };

  // ── Category selection ───────────────────────────────────────────────────
  const selectCategory = (tag: string) => {
    const categoryTags = categories.map((c) => c.tag);
    const allSubtypes = categories.flatMap((c) => c.subtypes);
    const allSubFilters = [
      ...handedness.map((h) => h.tag),
      ...foodStatFocus.map((f) => f.tag),
      ...damageTypes.map((d) => d.tag),
      'found',
    ];
    const clearSet = new Set([...categoryTags, ...allSubtypes, ...allSubFilters]);
    const base = props.state.tags.filter((t) => !clearSet.has(t));

    if (hasTags(tag)) {
      update({ tags: base });
    } else {
      update({ tags: [...base, tag] });
    }
  };

  const selectSubtype = (tag: string) => {
    const cat = activeCategory();
    if (!cat) return;
    selectExclusive(tag, cat.subtypes);
  };

  const selectBiome = (tag: string) =>
    selectExclusive(tag, biomes.map((b) => b.tag));

  const selectHandedness = (tag: string) =>
    selectExclusive(tag, handedness.map((h) => h.tag));

  const selectStatFocus = (tag: string) =>
    selectExclusive(tag, foodStatFocus.map((f) => f.tag));

  const toggleModifier = (tag: string) => {
    const current = props.state.tags;
    if (current.includes(tag)) {
      update({ tags: current.filter((t) => t !== tag) });
    } else {
      update({ tags: [...current, tag] });
    }
  };

  const toggleFound = () => toggleModifier('found');

  // ── Advanced section ─────────────────────────────────────────────────────
  const stationsWithUpgrades = () =>
    props.stations.filter((s) => s.upgrades.length > 0);

  const getCeiling = (station: Station): number =>
    props.state.stationCeilings[station.id] ?? station.maxLevel;

  const setCeiling = (stationId: string, level: number) =>
    update({ stationCeilings: { ...props.state.stationCeilings, [stationId]: level } });

  const clearCeiling = (stationId: string) => {
    const next = { ...props.state.stationCeilings };
    delete next[stationId];
    update({ stationCeilings: next });
  };

  const hasAnyFilter = () =>
    props.state.tags.length > 0 ||
    props.state.station !== 'all' ||
    Object.keys(props.state.stationCeilings).length > 0 ||
    props.state.query.length > 0;

  return (
    <div class="adv-filter">
      {/* ── Categories ──────────────────────────────────────────────── */}
      <div class="adv-filter__section">
        <div class="adv-filter__section-header">
          <span class="adv-filter__label">Category</span>
          <button
            type="button"
            class="adv-filter__clear"
            classList={{ 'adv-filter__clear--disabled': !hasAnyFilter() }}
            disabled={!hasAnyFilter()}
            onClick={() => props.onChange({ ...emptyFilterState })}
          >
            ✕ Clear
          </button>
        </div>
        <div class="adv-filter__tags" role="radiogroup" aria-label="Item category">
          <For each={categories}>
            {(cat) => (
              <button
                type="button"
                class="filter-chip filter-chip--sm"
                classList={{ 'filter-chip--active': hasTags(cat.tag) }}
                onClick={() => selectCategory(cat.tag)}
                role="radio"
                aria-checked={hasTags(cat.tag)}
              >
                <FilterIcon name={cat.tag} />
                {cat.label}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* ── Sub-types ───────────────────────────────────────────────── */}
      <Show when={activeCategory()?.subtypes.length}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Type</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Sub-type">
            <For each={activeCategory()!.subtypes}>
              {(sub) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(sub) }}
                  onClick={() => selectSubtype(sub)}
                  role="radio"
                  aria-checked={hasTags(sub)}
                >
                  <FilterIcon name={sub} />
                  {tagDisplayNames[sub] ?? sub}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Handedness ──────────────────────────────────────────────── */}
      <Show when={isSubFilterVisible('handedness')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Handedness</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Handedness">
            <For each={handedness}>
              {(h) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(h.tag) }}
                  onClick={() => selectHandedness(h.tag)}
                  role="radio"
                  aria-checked={hasTags(h.tag)}
                >
                  <FilterIcon name={h.tag} />
                  {h.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Biome ───────────────────────────────────────────────────── */}
      <Show when={isSubFilterVisible('biome')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Biome</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Biome">
            <For each={biomes}>
              {(b) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(b.tag) }}
                  onClick={() => selectBiome(b.tag)}
                  role="radio"
                  aria-checked={hasTags(b.tag)}
                >
                  <FilterIcon name={b.tag} />
                  {b.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Stat Focus (Food only) ──────────────────────────────────── */}
      <Show when={isSubFilterVisible('statFocus')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Stat Focus</span>
          <div class="adv-filter__tags" role="radiogroup" aria-label="Food stat focus">
            <For each={foodStatFocus}>
              {(s) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(s.tag) }}
                  onClick={() => selectStatFocus(s.tag)}
                  role="radio"
                  aria-checked={hasTags(s.tag)}
                >
                  {s.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Damage Type (Melee/Ranged/Ammo) ─────────────────────────────── */}
      <Show when={isSubFilterVisible('damageType')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Damage Type</span>
          <div class="adv-filter__tags" role="group" aria-label="Damage type">
            <For each={damageTypes}>
              {(d) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(d.tag) }}
                  onClick={() => toggleModifier(d.tag)}
                  aria-pressed={hasTags(d.tag)}
                >
                  <FilterIcon name={d.tag} />
                  {d.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ── Found (Food/Building only) ──────────────────────────────── */}
      <Show when={isSubFilterVisible('found')}>
        <div class="adv-filter__section">
          <div class="adv-filter__tags">
            <button
              type="button"
              class="filter-chip filter-chip--sm"
              classList={{ 'filter-chip--active': hasTags('found') }}
              onClick={toggleFound}
              aria-pressed={hasTags('found')}
            >
              Found
            </button>
          </div>
        </div>
      </Show>

      {/* ── Advanced (collapsible) ──────────────────────────────────── */}
      <details class="adv-filter__advanced">
        <summary class="adv-filter__label">Advanced</summary>
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
      </details>
    </div>
  );
};
