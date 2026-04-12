import { For, type Component } from 'solid-js';
import type { WeatherPeriod } from '../lib/weather';
import { getWeatherIcon, getWeatherLabel } from '../lib/weather';

interface Props {
  periods: WeatherPeriod[];
  baseHref: string;
}

export const WeatherPeriodDetail: Component<Props> = (props) => {
  return (
    <div class="weather-periods">
      <div class="weather-periods__title">Weather periods</div>
      <For each={props.periods}>
        {(period) => (
          <div class="weather-period-row">
            <span class="weather-period-row__index">{period.periodIndex + 1}</span>
            <img
              class="weather-entry__icon"
              src={`${props.baseHref}icons/weather/${getWeatherIcon(period.weather)}.svg`}
              alt=""
              width="24"
              height="24"
            />
            <span class="weather-entry__name">{getWeatherLabel(period.weather)}</span>
            <div class="weather-effects">
              <For each={period.effects}>
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
    </div>
  );
};
