import { For, Show, type Component, createSignal, createMemo, createEffect, onMount } from 'solid-js';
import {
  ALL_BIOMES,
  type Biome,
  getForecast,
  getWeatherIcon,
  getWeatherLabel,
} from '../lib/weather';

interface Props {
  baseHref: string;
  spriteHref?: string;
}

/** Map biome display name to its sprite symbol ID */
const biomeIconId = (biome: string): string =>
  'filter-' + biome.toLowerCase().replace(/\s+/g, '-');

const MAX_DAY = 99999;

const DayInput: Component<{ value: number; onInput: (v: string) => void }> = (props) => (
  <input
    class="wx-day-inline-input"
    type="number"
    min="1"
    max={MAX_DAY}
    maxLength={5}
    value={props.value}
    onInput={(e) => {
      const raw = e.currentTarget.value.slice(0, 5);
      e.currentTarget.value = raw;
      props.onInput(raw);
    }}
  />
);

export const WeatherForecast: Component<Props> = (props) => {
  const [currentDay, setCurrentDay] = createSignal(1);
  const [selectedBiome, setSelectedBiome] = createSignal<Biome>('Meadows');

  // Hydrate from URL on mount
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const dayParam = params.get('day');
    if (dayParam) {
      const n = parseInt(dayParam, 10);
      if (Number.isFinite(n) && n >= 1) setCurrentDay(n);
    }
    const biomeParam = params.get('biome');
    if (biomeParam && ALL_BIOMES.includes(biomeParam as Biome)) {
      setSelectedBiome(biomeParam as Biome);
    }
  });

  // Sync state to URL
  createEffect(() => {
    const params = new URLSearchParams();
    params.set('day', String(currentDay()));
    params.set('biome', selectedBiome());
    const qs = params.toString();
    const url = `${window.location.pathname}?${qs}`;
    window.history.replaceState({}, '', url);
  });

  const forecast = createMemo(() =>
    getForecast(currentDay(), selectedBiome(), 1),
  );

  const focusedDay = createMemo(() => forecast()[0]);

  const biomeSnapshots = createMemo(() =>
    ALL_BIOMES.map((biome) => ({
      biome,
      forecast: getForecast(currentDay(), biome, 1)[0],
    })),
  );

  const handleDayInput = (value: string) => {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n >= 1) {
      setCurrentDay(Math.min(n, MAX_DAY));
    }
  };

  const iconUrl = (icon: string) =>
    `${props.baseHref}icons/weather/${icon}.svg`;

  const windPct = (intensity: number) => `${Math.round(intensity * 100)}%`;

  return (
    <div class="wx">
      {/* ── Detail panel (focused biome + day) ── */}
      <Show when={focusedDay()}>
        {(f) => (
          <div class="wx-detail">
            <div class="wx-detail__header">
              Day <DayInput value={currentDay()} onInput={handleDayInput} /> &middot; {selectedBiome()}
            </div>

            {/* Weather row */}
            <div class="wx-detail__row">
              <For each={f().periods}>
                {(period) => (
                  <div class="wx-detail__cell">
                    <span class="wx-detail__cell-time">{period.label}</span>
                    <img
                      class="wx-detail__cell-icon"
                      src={iconUrl(getWeatherIcon(period.weather))}
                      alt={getWeatherLabel(period.weather)}
                      width="32"
                      height="32"
                    />
                    <Show when={period.effects.length > 0}>
                      <div class="wx-detail__cell-effects">
                        <For each={period.effects}>
                          {(effect) => (
                            <span class={`wx-effect wx-effect--sm wx-effect--${effect}`}>
                              {effect}
                            </span>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>

            {/* Wind row — all wind changes across the day */}
            <div class="wx-detail__wind-strip">
              <For each={f().winds}>
                {(w) => (
                  <div class="wx-wind-tick">
                    <span class="wx-wind-tick__time">{w.label}</span>
                    <span
                      class="wx-wind-tick__arrow"
                      style={{ transform: `rotate(${w.angle + 180}deg)` }}
                    >
                      ↑
                    </span>
                    <span class="wx-wind-tick__pct">
                      {windPct(w.intensity)}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </Show>

      {/* ── All biomes for the focused day ── */}
      <div class="wx-biomes-grid">
        <div class="wx-biomes-grid__title">
          All Biomes &middot; Day <DayInput value={currentDay()} onInput={handleDayInput} />
        </div>
        <div class="wx-biomes-grid__items">
          <For each={biomeSnapshots()}>
            {({ biome, forecast }) => {
              const midWind = forecast.periods[Math.floor(forecast.periods.length / 2)].wind;
              return (
                <button
                  type="button"
                  class="wx-biome-card"
                  classList={{
                    'wx-biome-card--selected': selectedBiome() === biome,
                  }}
                  onClick={() => setSelectedBiome(biome)}
                >
                  <div class="wx-biome-card__name">
                    <Show when={props.spriteHref}>
                      <svg class="wx-biome-card__biome-icon" width="16" height="16" aria-hidden="true">
                        <use href={`${props.spriteHref}#${biomeIconId(biome)}`} />
                      </svg>
                    </Show>
                    {biome}
                  </div>
                  <img
                    class="wx-biome-card__icon"
                    src={iconUrl(getWeatherIcon(forecast.dominant))}
                    alt={getWeatherLabel(forecast.dominant)}
                    width="36"
                    height="36"
                  />
                  <div class="wx-biome-card__wind">
                    <span
                      class="wx-biome-card__wind-arrow"
                      style={{ transform: `rotate(${midWind.angle + 180}deg)` }}
                    >
                      ↑
                    </span>
                    <span>{windPct(midWind.intensity)} {midWind.direction}</span>
                  </div>
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
