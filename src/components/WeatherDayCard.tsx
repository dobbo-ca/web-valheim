import { For, Show, type Component } from 'solid-js';
import type { Biome } from '../lib/weather';
import { getForecast, getWeatherIcon, getWeatherLabel } from '../lib/weather';
import { WeatherPeriodDetail } from './WeatherPeriodDetail';

interface Props {
  day: number;
  biomes: Biome[];
  isCurrentDay: boolean;
  expanded: boolean;
  baseHref: string;
  onToggle: () => void;
}

export const WeatherDayCard: Component<Props> = (props) => {
  const forecasts = () =>
    props.biomes.map((biome) => ({
      biome,
      forecast: getForecast(props.day, biome, 1)[0],
    }));

  return (
    <div
      class="weather-day-card"
      classList={{
        'weather-day-card--current': props.isCurrentDay,
        'weather-day-card--expanded': props.expanded,
      }}
      onClick={props.onToggle}
    >
      <div class="weather-day-card__header">
        <span class="weather-day-card__day">
          Day {props.day}
          <Show when={props.isCurrentDay}>
            {' '}(current)
          </Show>
        </span>
        <span class="weather-day-card__expand">
          {props.expanded ? '▾' : `▸ ${forecasts()[0]?.forecast.periods.length ?? 0}p`}
        </span>
      </div>

      <For each={forecasts()}>
        {({ biome, forecast }) => (
          <div class="weather-entry">
            <img
              class="weather-entry__icon"
              src={`${props.baseHref}icons/weather/${getWeatherIcon(forecast.dominant)}.svg`}
              alt={getWeatherLabel(forecast.dominant)}
              width="24"
              height="24"
            />
            <span class="weather-entry__name">{getWeatherLabel(forecast.dominant)}</span>
            <Show when={props.biomes.length > 1}>
              <span class="weather-entry__biome">{biome}</span>
            </Show>
            <div class="weather-effects">
              <For each={forecast.dominantEffects}>
                {(effect) => (
                  <span class={`weather-effect-badge weather-effect-badge--${effect}`}>
                    {effect}
                  </span>
                )}
              </For>
            </div>
          </div>
        )}
      </For>

      <Show when={props.expanded}>
        <For each={forecasts()}>
          {({ biome, forecast }) => (
            <>
              <Show when={props.biomes.length > 1}>
                <div style={{ "font-size": "10px", "color": "var(--muted)", "margin-top": "6px", "text-transform": "uppercase", "letter-spacing": "0.5px" }}>
                  {biome}
                </div>
              </Show>
              <WeatherPeriodDetail periods={forecast.periods} baseHref={props.baseHref} />
            </>
          )}
        </For>
      </Show>
    </div>
  );
};
