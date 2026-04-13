import { For, Show, type Component } from 'solid-js';
import type { WeaponStats, Attack, ItemUpgrade } from '../lib/types';
import { mergeStats } from '../lib/merge-stats';
import { StatTooltip } from './StatTooltip';
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

  function renderAttackSection(title: string, getAttack: (s: WeaponStats) => Attack | undefined) {
    const baseAtk = getAttack(props.baseStats);
    if (!baseAtk) return null;

    const damageRows = DAMAGE_TYPES.filter((dt) => {
      const v = baseAtk.damage?.[dt];
      return v != null && v > 0;
    });

    const fieldRows = ATTACK_FIELDS.filter((f) => {
      const v = baseAtk[f];
      return v != null;
    });

    if (damageRows.length === 0 && fieldRows.length === 0) return null;

    return (
      <>
        <tr class="ct__section-header">
          <th colspan={rows().length + 1}>{title}</th>
        </tr>
        <For each={damageRows}>
          {(dt) => (
            <tr>
              <td class="ct__stat-name">
                <DamageIcon type={dt} size={14} baseHref={props.baseHref} />
                {' '}{dt.charAt(0).toUpperCase() + dt.slice(1)}
              </td>
              <For each={rows()}>
                {(q, qi) => {
                  const atk = getAttack(q.stats);
                  const val = atk?.damage?.[dt];
                  const baseVal = getAttack(baseRow().stats)?.damage?.[dt];
                  return (
                    <td
                      class="ct__val"
                      classList={{
                        'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                        'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                      }}
                    >
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
                <StatTooltip stat={field} label={ATTACK_LABELS[field] ?? field} />
              </td>
              <For each={rows()}>
                {(q, qi) => {
                  const atk = getAttack(q.stats);
                  const val = atk?.[field] as number | undefined;
                  const baseVal = getAttack(baseRow().stats)?.[field] as number | undefined;
                  const prefix = field === 'backstab' ? '×' : undefined;
                  return (
                    <td
                      class="ct__val"
                      classList={{
                        'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                        'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                      }}
                    >
                      {formatVal(val, prefix)}
                    </td>
                  );
                }}
              </For>
            </tr>
          )}
        </For>
      </>
    );
  }

  return (
    <table class="ct">
      <thead>
        <tr>
          <th class="ct__stat-name">Stat</th>
          <For each={rows()}>
            {(q) => <th class="ct__q-header">Q{q.quality}</th>}
          </For>
        </tr>
      </thead>
      <tbody>
        {renderAttackSection('Primary Attack', (s) => s.primaryAttack)}
        {renderAttackSection('Secondary Attack', (s) => s.secondaryAttack)}

        <Show when={props.baseStats.blocking}>
          <tr class="ct__section-header">
            <th colspan={rows().length + 1}>Blocking</th>
          </tr>
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
                      <td
                        class="ct__val"
                        classList={{
                          'ct__val--changed': qi() > 0 && isChanged(baseVal, val),
                          'ct__val--unchanged': qi() > 0 && !isChanged(baseVal, val),
                        }}
                      >
                        {formatVal(val, prefix)}
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </Show>

        <tr class="ct__section-header">
          <th colspan={rows().length + 1}>Properties</th>
        </tr>
        <Show when={props.baseStats.durability != null}>
          <tr>
            <td class="ct__stat-name">Durability</td>
            <For each={rows()}>
              {(q, qi) => (
                <td
                  class="ct__val"
                  classList={{
                    'ct__val--changed': qi() > 0 && isChanged(baseRow().stats.durability, q.stats.durability),
                    'ct__val--unchanged': qi() > 0 && !isChanged(baseRow().stats.durability, q.stats.durability),
                  }}
                >
                  {formatVal(q.stats.durability)}
                </td>
              )}
            </For>
          </tr>
        </Show>
        <Show when={props.baseStats.weight != null}>
          <tr>
            <td class="ct__stat-name">Weight</td>
            <For each={rows()}>
              {(q, qi) => (
                <td class="ct__val" classList={{ 'ct__val--unchanged': qi() > 0 }}>{formatVal(q.stats.weight)}</td>
              )}
            </For>
          </tr>
        </Show>
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
  );
};
