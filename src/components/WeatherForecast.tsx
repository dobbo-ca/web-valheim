import { For, Show, type Component, createSignal, createMemo } from 'solid-js';
import {
  ALL_BIOMES,
  type Biome,
  getForecast,
  getWeatherIcon,
  getWeatherLabel,
} from '../lib/weather';

interface Props {
  baseHref: string;
}

const DayInput: Component<{ value: number; onInput: (v: string) => void }> = (props) => (
  <input
    class="wx-day-inline-input"
    type="number"
    min="1"
    value={props.value}
    onInput={(e) => props.onInput(e.currentTarget.value)}
  />
);

export const WeatherForecast: Component<Props> = (props) => {
  const [currentDay, setCurrentDay] = createSignal(1);
  const [selectedBiome, setSelectedBiome] = createSignal<Biome>('Meadows');

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
      setCurrentDay(n);
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
                    <span class="wx-detail__cell-label">{period.label}</span>
                    <img
                      class="wx-detail__cell-icon"
                      src={iconUrl(getWeatherIcon(period.weather))}
                      alt={getWeatherLabel(period.weather)}
                      width="32"
                      height="32"
                    />
                    <span class="wx-detail__cell-name">
                      {getWeatherLabel(period.weather)}
                    </span>
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
                  <div class="wx-biome-card__name">{biome}</div>
                  <img
                    class="wx-biome-card__icon"
                    src={iconUrl(getWeatherIcon(forecast.dominant))}
                    alt=""
                    width="36"
                    height="36"
                  />
                  <div class="wx-biome-card__weather">
                    {getWeatherLabel(forecast.dominant)}
                  </div>
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
