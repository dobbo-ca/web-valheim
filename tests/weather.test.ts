import { describe, it, expect } from 'vitest';
import {
  getWeatherForPeriod,
  getForecast,
  getEffects,
  getWeatherIcon,
  getWeatherLabel,
  ALL_BIOMES,
  type WeatherType,
} from '../src/lib/weather';

describe('getEffects', () => {
  it('returns empty for Clear', () => {
    expect(getEffects('Clear')).toEqual([]);
  });
  it('returns wet for Rain', () => {
    expect(getEffects('Rain')).toEqual(['wet']);
  });
  it('returns wet + shelter-needed for ThunderStorm', () => {
    expect(getEffects('ThunderStorm')).toEqual(['wet', 'shelter-needed']);
  });
  it('returns freezing + low-visibility for SnowStorm', () => {
    expect(getEffects('SnowStorm')).toEqual(['freezing', 'low-visibility']);
  });
  it('returns freezing for Snow', () => {
    expect(getEffects('Snow')).toEqual(['freezing']);
  });
  it('returns low-visibility for Misty', () => {
    expect(getEffects('Misty')).toEqual(['low-visibility']);
  });
  it('returns shelter-needed for Ashrain', () => {
    expect(getEffects('Ashrain')).toEqual(['shelter-needed']);
  });
});

describe('getWeatherForPeriod', () => {
  it('is deterministic — same seed + biome always returns same weather', () => {
    const a = getWeatherForPeriod(100, 'Meadows');
    const b = getWeatherForPeriod(100, 'Meadows');
    expect(a).toBe(b);
  });
  it('different seeds can produce different weather', () => {
    const results = new Set<WeatherType>();
    for (let seed = 0; seed < 100; seed++) {
      results.add(getWeatherForPeriod(seed, 'Meadows'));
    }
    expect(results.size).toBeGreaterThan(1);
  });
  it('single-weather biomes always return that weather', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(getWeatherForPeriod(seed, 'Swamp')).toBe('SwampRain');
      expect(getWeatherForPeriod(seed, 'Mistlands')).toBe('Darklands dark');
      expect(getWeatherForPeriod(seed, 'Ashlands')).toBe('Ashrain');
    }
  });
  it('Mountain only produces Snow or SnowStorm', () => {
    for (let seed = 0; seed < 100; seed++) {
      const w = getWeatherForPeriod(seed, 'Mountain');
      expect(['Snow', 'SnowStorm']).toContain(w);
    }
  });
});

describe('getForecast', () => {
  it('returns the requested number of days', () => {
    const forecast = getForecast(1, 'Meadows', 10);
    expect(forecast).toHaveLength(10);
  });
  it('day numbers are sequential starting from startDay', () => {
    const forecast = getForecast(5, 'Meadows', 3);
    expect(forecast.map(f => f.day)).toEqual([5, 6, 7]);
  });
  it('each day has at least 2 periods', () => {
    const forecast = getForecast(1, 'Meadows', 5);
    for (const day of forecast) {
      expect(day.periods.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('dominant weather is the most frequent across periods', () => {
    const forecast = getForecast(1, 'Swamp', 1);
    expect(forecast[0].dominant).toBe('SwampRain');
    expect(forecast[0].dominantEffects).toEqual(['wet']);
  });
  it('is deterministic — same inputs produce same output', () => {
    const a = getForecast(42, 'Mountain', 5);
    const b = getForecast(42, 'Mountain', 5);
    expect(a).toEqual(b);
  });
  it('produces forecasts for all biomes without error', () => {
    for (const biome of ALL_BIOMES) {
      const forecast = getForecast(1, biome, 3);
      expect(forecast).toHaveLength(3);
      for (const day of forecast) {
        expect(day.periods.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getWeatherIcon', () => {
  it('maps clear-type weathers to clear icon', () => {
    expect(getWeatherIcon('Clear')).toBe('clear');
    expect(getWeatherIcon('Heath clear')).toBe('clear');
    expect(getWeatherIcon('Twilight Clear')).toBe('clear');
  });
  it('maps rain-type weathers to rain icon', () => {
    expect(getWeatherIcon('Rain')).toBe('rain');
    expect(getWeatherIcon('LightRain')).toBe('rain');
    expect(getWeatherIcon('SwampRain')).toBe('rain');
  });
  it('maps ThunderStorm to thunderstorm icon', () => {
    expect(getWeatherIcon('ThunderStorm')).toBe('thunderstorm');
  });
  it('maps snow-type weathers to snow icon', () => {
    expect(getWeatherIcon('Snow')).toBe('snow');
    expect(getWeatherIcon('Twilight Snow')).toBe('snow');
  });
  it('maps snowstorm-type weathers to snowstorm icon', () => {
    expect(getWeatherIcon('SnowStorm')).toBe('snowstorm');
    expect(getWeatherIcon('Twilight Snowstorm')).toBe('snowstorm');
  });
  it('maps Darklands dark to dark icon', () => {
    expect(getWeatherIcon('Darklands dark')).toBe('dark');
  });
  it('maps Ashrain to ashrain icon', () => {
    expect(getWeatherIcon('Ashrain')).toBe('ashrain');
  });
});

describe('getWeatherLabel', () => {
  it('returns human-friendly names', () => {
    expect(getWeatherLabel('DeepForest Mist')).toBe('Forest Mist');
    expect(getWeatherLabel('ThunderStorm')).toBe('Thunderstorm');
    expect(getWeatherLabel('LightRain')).toBe('Light Rain');
    expect(getWeatherLabel('Heath clear')).toBe('Clear');
  });
  it('passes through simple names unchanged', () => {
    expect(getWeatherLabel('Clear')).toBe('Clear');
    expect(getWeatherLabel('Rain')).toBe('Rain');
    expect(getWeatherLabel('Snow')).toBe('Snow');
    expect(getWeatherLabel('Misty')).toBe('Misty');
  });
});
