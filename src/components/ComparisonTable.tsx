import { For, Show, type Component, type JSX } from 'solid-js';
import type { WeaponStats, Attack, ItemUpgrade } from '../lib/types';
import { mergeStats } from '../lib/merge-stats';
import { StatTooltip } from './StatTooltip';
import { StatIcon } from './StatIcon';
import { DamageIcon } from './DamageIcon';

interface Props {
  baseStats: WeaponStats;
  upgrades?: ItemUpgrade[];
  baseHref?: string;
}

const ATTACK_LABELS: Record<string, string> = {
  knockback: 'Knockback',
  backstab: 'Backstab',
  stagger: 'Stagger',
  stamina: 'Stamina',
  staminaPerSecond: 'Stamina/s',
  eitr: 'Eitr',
  healthCost: 'Health Cost',
  adrenaline: 'Adrenaline',
  recoilForce: 'Recoil',
};

const BLOCKING_LABELS: Record<string, string> = {
  blockArmor: 'Block Armor',
  parryBlockArmor: 'Parry Block Armor',
  blockForce: 'Block Force',
  parryBonus: 'Parry Bonus',
  blockAdrenaline: 'Block Adrenaline',
  parryAdrenaline: 'Parry Adrenaline',
};

const DAMAGE_TYPES = ['slash', 'pierce', 'blunt', 'fire', 'frost', 'lightning', 'poison', 'spirit', 'pure', 'chop', 'pickaxe'] as const;
const ATTACK_FIELDS = ['knockback', 'backstab', 'stagger', 'stamina', 'staminaPerSecond', 'eitr', 'healthCost', 'adrenaline', 'recoilForce'] as const;
const BLOCKING_FIELDS = ['blockArmor', 'parryBlockArmor', 'blockForce', 'parryBonus', 'blockAdrenaline', 'parryAdrenaline'] as const;

type QualityRow = { quality: number; stats: WeaponStats };

function formatVal(val: number | undefined, prefix?: string): string {
  if (val == null) return '—';
  if (prefix) return `${prefix}${val}`;
  return String(val);
}

export const ComparisonTable: Component<Props> = (props) => {
  const rows = (): QualityRow[] => {
    const result: QualityRow[] = [{ quality: 1, stats: props.baseStats }];
    for (const u of props.upgrades ?? []) {
      result.push({ quality: u.quality, stats: mergeStats(props.baseStats, u.stats) });
    }
    return result;
  };

  const baseRow = () => rows()[0];

  function isChanged(baseVal: number | undefined, val: number | undefined): boolean {
    return val != null && baseVal != null && val !== baseVal;
  }

  function renderHeader(): JSX.Element {
    return (
      <thead>
        <tr>
          <th class="ct__stat-name">Stat</th>
          <For each={rows()}>
            {(q) => <th class="ct__q-header">★{q.quality}</th>}
          </For>
        </tr>
      </thead>
    );
  }

  function renderAttackTable(title: string, getAttack: (s: WeaponStats) => Attack | undefined): JSX.Element | null {
    const baseAtk = getAttack(props.baseStats);
    if (!baseAtk) return null;

    const damageRows = DAMAGE_TYPES.filter((dt) => {
      const v = baseAtk.damage?.[dt];
      return v != null && v > 0;
    });
    const fieldRows = ATTACK_FIELDS.filter((f) => baseAtk[f] != null);
    if (damageRows.length === 0 && fieldRows.length === 0) return null;

    return (
      <div class="ct__section">
        <h3 class="ct__section-title">{title}</h3>
        <table class="ct">
          {renderHeader()}
          <tbody>
            <For each={damageRows}>
              {(dt) => (
                <tr>
                  <td class="ct__stat-name">
                    <DamageIcon type={dt} size={14} baseHref={props.baseHref} />
                    {' '}{dt.charAt(0).toUpperCase() + dt.slice(1)}
                  </td>
                  <For each={rows()}>
                    {(q, qi) => {
                      const val = getAttack(q.stats)?.damage?.[dt];
                      const baseVal = getAttack(baseRow().stats)?.damage?.[dt];
                      return (
                        <td class="ct__val" classList={{
                          'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                          'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                        }}>
                          {formatVal(val)}
                        </td>
                      );
                    }}
                  </For>
                </tr>
              )}
            </For>
            <For each={fieldRows}>
              {(field) => (
                <tr>
                  <td class="ct__stat-name">
                    <StatTooltip stat={field} label={ATTACK_LABELS[field] ?? field} baseHref={props.baseHref} />
                  </td>
                  <For each={rows()}>
                    {(q, qi) => {
                      const val = getAttack(q.stats)?.[field] as number | undefined;
                      const baseVal = getAttack(baseRow().stats)?.[field] as number | undefined;
                      const prefix = field === 'backstab' ? '×' : undefined;
                      return (
                        <td class="ct__val" classList={{
                          'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                          'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                        }}>
                          {formatVal(val, prefix)}
                        </td>
                      );
                    }}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div class="ct-grid">
      {renderAttackTable('Primary Attack', (s) => s.primaryAttack)}
      {renderAttackTable('Secondary Attack', (s) => s.secondaryAttack)}

      <Show when={props.baseStats.blocking}>
        <div class="ct__section">
          <h3 class="ct__section-title">Blocking</h3>
          <table class="ct">
            {renderHeader()}
            <tbody>
              <For each={BLOCKING_FIELDS.filter((f) => props.baseStats.blocking?.[f] != null)}>
                {(field) => (
                  <tr>
                    <td class="ct__stat-name">
                      <StatTooltip stat={field} label={BLOCKING_LABELS[field] ?? field} />
                    </td>
                    <For each={rows()}>
                      {(q, qi) => {
                        const val = q.stats.blocking?.[field] as number | undefined;
                        const baseVal = baseRow().stats.blocking?.[field] as number | undefined;
                        const prefix = field === 'parryBonus' ? '×' : undefined;
                        return (
                          <td class="ct__val" classList={{
                            'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                            'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                          }}>
                            {formatVal(val, prefix)}
                          </td>
                        );
                      }}
                    </For>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <div class="ct__section">
        <h3 class="ct__section-title">Properties</h3>
        <table class="ct">
          {renderHeader()}
          <tbody>
            <Show when={props.baseStats.durability != null}>
              <tr>
                <td class="ct__stat-name"><StatIcon stat="durability" size={14} baseHref={props.baseHref} /> Durability</td>
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
            </Show>
            <Show when={props.baseStats.weight != null}>
              <tr>
                <td class="ct__stat-name"><StatIcon stat="weight" size={14} baseHref={props.baseHref} /> Weight</td>
                <For each={rows()}>
                  {(_q, qi) => (
                    <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>{formatVal(props.baseStats.weight)}</td>
                  )}
                </For>
              </tr>
            </Show>
            <Show when={props.baseStats.movementPenalty != null}>
              <tr>
                <td class="ct__stat-name"><StatIcon stat="movementPenalty" size={14} baseHref={props.baseHref} /> Movement Speed</td>
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
    </div>
  );
};
