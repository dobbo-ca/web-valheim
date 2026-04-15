import { createSignal, For, Show, type Component } from 'solid-js';
import type { WeaponStats, ItemUpgrade } from '../lib/types';
import { mergeStats } from '../lib/merge-stats';
import { DamageIcon } from './DamageIcon';

interface Props {
  baseStats: WeaponStats;
  upgrades?: ItemUpgrade[];
  baseHref?: string;
  /** Item name for inline header */
  name?: string;
  /** Subtitle text (e.g. "Sword · Ashlands") */
  subtitle?: string;
  /** Sprite href for item icon */
  iconHref?: string;
}

export const HeroDamageBar: Component<Props> = (props) => {
  const qualities = () => {
    const q = [{ quality: 1, stats: props.baseStats }];
    for (const u of props.upgrades ?? []) {
      if (u.stats) q.push({ quality: u.quality, stats: mergeStats(props.baseStats, u.stats) });
      else q.push({ quality: u.quality, stats: props.baseStats });
    }
    return q;
  };
  const [selectedQ, setSelectedQ] = createSignal(1);
  const activeStats = () => {
    const q = qualities().find((q) => q.quality === selectedQ());
    return q?.stats ?? props.baseStats;
  };

  const damageEntries = () => {
    const dmg = activeStats().primaryAttack?.damage;
    if (!dmg) return [];
    return Object.entries(dmg).filter(([, v]) => v != null && v > 0);
  };

  const totalDamage = () => damageEntries().reduce((sum, [, v]) => sum + (v ?? 0), 0);

  return (
    <div class="hero-bar">
      <Show when={props.name}>
        <div class="hero-bar__header">
          <Show when={props.iconHref}>
            <svg class="hero-bar__item-icon" width="48" height="48">
              <use href={props.iconHref} />
            </svg>
          </Show>
          <div>
            <div class="hero-bar__name">{props.name}</div>
            <Show when={props.subtitle}>
              <div class="hero-bar__subtitle">{props.subtitle}</div>
            </Show>
          </div>
        </div>
      </Show>
      <Show when={qualities().length > 1}>
        <div class="hero-bar__tabs">
          <For each={qualities()}>
            {(q) => (
              <button
                type="button"
                class="hero-bar__tab"
                classList={{ 'hero-bar__tab--active': selectedQ() === q.quality }}
                onClick={() => setSelectedQ(q.quality)}
              >
                ★{q.quality}
              </button>
            )}
          </For>
        </div>
      </Show>
      <div class="hero-bar__body">
        <div class="hero-bar__damage">
          <For each={damageEntries()}>
            {([type, val]) => (
              <div class="hero-bar__dmg-item">
                <div class="hero-bar__dmg-icon">
                  <DamageIcon type={type} size={22} baseHref={props.baseHref} />
                </div>
                <div>
                  <div class="hero-bar__dmg-val">{val}</div>
                  <div class="hero-bar__dmg-type">{type}</div>
                </div>
              </div>
            )}
          </For>
        </div>
        <div class="hero-bar__meta">
          <Show when={damageEntries().length > 1}>
            <div class="hero-bar__meta-item">
              <div class="hero-bar__meta-label">Total</div>
              <div class="hero-bar__meta-val">{totalDamage()}</div>
            </div>
          </Show>
          <Show when={activeStats().weight != null}>
            <div class="hero-bar__meta-item">
              <div class="hero-bar__meta-label">Weight</div>
              <div class="hero-bar__meta-val">{activeStats().weight}</div>
            </div>
          </Show>
          <Show when={activeStats().durability != null}>
            <div class="hero-bar__meta-item">
              <div class="hero-bar__meta-label">Durability</div>
              <div class="hero-bar__meta-val">{activeStats().durability}</div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
