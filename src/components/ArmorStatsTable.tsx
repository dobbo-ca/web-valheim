import { For, Show, type Component } from 'solid-js';
import type { ArmorStats, ItemUpgrade } from '../lib/types';
import { mergeArmorStats } from '../lib/merge-stats';

interface Props {
  baseStats: ArmorStats;
  upgrades?: ItemUpgrade[];
  baseHref?: string;
}

type QualityRow = { quality: number; stats: ArmorStats };

function formatVal(val: number | undefined): string {
  if (val == null) return '—';
  return String(val);
}

export const ArmorStatsTable: Component<Props> = (props) => {
  const rows = (): QualityRow[] => {
    const result: QualityRow[] = [{ quality: 1, stats: props.baseStats }];
    for (const u of props.upgrades ?? []) {
      result.push({ quality: u.quality, stats: mergeArmorStats(props.baseStats, u.armorStats) });
    }
    return result;
  };

  const baseRow = () => rows()[0];

  function isChanged(baseVal: number | undefined, val: number | undefined): boolean {
    return val != null && baseVal != null && val !== baseVal;
  }

  function renderHeader() {
    return (
      <thead>
        <tr>
          <th class="ct__stat-name">Stat</th>
          <For each={rows()}>
            {(q) => <th class="ct__q-header">Q{q.quality}</th>}
          </For>
        </tr>
      </thead>
    );
  }

  return (
    <div class="ct-grid">
      <div class="ct__section">
        <h3 class="ct__section-title">Armor</h3>
        <table class="ct">
          {renderHeader()}
          <tbody>
            <tr>
              <td class="ct__stat-name">Armor</td>
              <For each={rows()}>
                {(q, qi) => (
                  <td class="ct__val" classList={{
                    'ct__val--changed': qi() > 0 && isChanged(baseRow().stats.armor, q.stats.armor),
                    'ct__val--unchanged': qi() > 0 && !isChanged(baseRow().stats.armor, q.stats.armor),
                  }}>
                    {formatVal(q.stats.armor)}
                  </td>
                )}
              </For>
            </tr>
            <tr>
              <td class="ct__stat-name">Durability</td>
              <For each={rows()}>
                {(q, qi) => (
                  <td class="ct__val" classList={{
                    'ct__val--changed': qi() > 0 && isChanged(baseRow().stats.durability, q.stats.durability),
                    'ct__val--unchanged': qi() > 0 && !isChanged(baseRow().stats.durability, q.stats.durability),
                  }}>
                    {formatVal(q.stats.durability)}
                  </td>
                )}
              </For>
            </tr>
            <tr>
              <td class="ct__stat-name">Weight</td>
              <For each={rows()}>
                {(_q, qi) => (
                  <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>
                    {formatVal(props.baseStats.weight)}
                  </td>
                )}
              </For>
            </tr>
            <Show when={props.baseStats.movementPenalty != null}>
              <tr>
                <td class="ct__stat-name">Movement Speed</td>
                <For each={rows()}>
                  {(_q, qi) => (
                    <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>
                      {props.baseStats.movementPenalty}%
                    </td>
                  )}
                </For>
              </tr>
            </Show>
          </tbody>
        </table>
      </div>

      <Show when={props.baseStats.resistances && Object.keys(props.baseStats.resistances).length > 0}>
        <div class="ct__section">
          <h3 class="ct__section-title">Resistances</h3>
          <ul>
            <For each={Object.entries(props.baseStats.resistances!)}>
              {([damageType, level]) => (
                <li style={{ color: level === 'resistant' ? 'green' : 'red' }}>
                  {damageType.charAt(0).toUpperCase() + damageType.slice(1)}: {level}
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={props.baseStats.effects && props.baseStats.effects.length > 0}>
        <div class="ct__section">
          <h3 class="ct__section-title">Effects</h3>
          <ul>
            <For each={props.baseStats.effects!}>
              {(effect) => <li>{effect}</li>}
            </For>
          </ul>
        </div>
      </Show>

      <Show when={props.baseStats.setBonus}>
        <div class="ct__section">
          <h3 class="ct__section-title">Set Bonus</h3>
          <div class="ct__set-bonus-callout">
            <strong>{props.baseStats.setBonus!.name}</strong>
            {' '}({props.baseStats.setBonus!.pieces}-piece set):
            {' '}{props.baseStats.setBonus!.effect}
          </div>
        </div>
      </Show>
    </div>
  );
};
