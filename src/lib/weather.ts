// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeatherType =
  | 'Clear'
  | 'Rain'
  | 'Misty'
  | 'ThunderStorm'
  | 'LightRain'
  | 'DeepForest Mist'
  | 'SwampRain'
  | 'SnowStorm'
  | 'Snow'
  | 'Heath clear'
  | 'Twilight Snowstorm'
  | 'Twilight Snow'
  | 'Twilight Clear'
  | 'Ashrain'
  | 'Darklands dark';

export type Biome =
  | 'Meadows'
  | 'Black Forest'
  | 'Swamp'
  | 'Mountain'
  | 'Plains'
  | 'Ocean'
  | 'Mistlands'
  | 'Ashlands'
  | 'Deep North';

export type WeatherEffect = 'wet' | 'freezing' | 'low-visibility' | 'shelter-needed';

export type WeatherPeriod = {
  periodIndex: number;
  weather: WeatherType;
  effects: WeatherEffect[];
};

export type DayForecast = {
  day: number;
  dominant: WeatherType;
  dominantEffects: WeatherEffect[];
  periods: WeatherPeriod[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const WEATHER_PERIOD = 666;
export const DAY_LENGTH = 1800;

// ---------------------------------------------------------------------------
// Biome weather pools
// ---------------------------------------------------------------------------

type WeatherEntry = { name: WeatherType; weight: number };

const BIOME_POOLS: Record<Biome, WeatherEntry[]> = {
  Meadows: [
    { name: 'Clear', weight: 5.0 },
    { name: 'Rain', weight: 0.2 },
    { name: 'Misty', weight: 0.2 },
    { name: 'ThunderStorm', weight: 0.2 },
    { name: 'LightRain', weight: 0.2 },
  ],
  'Black Forest': [
    { name: 'DeepForest Mist', weight: 2.0 },
    { name: 'Rain', weight: 0.1 },
    { name: 'Misty', weight: 0.1 },
    { name: 'ThunderStorm', weight: 0.1 },
  ],
  Swamp: [{ name: 'SwampRain', weight: 1.0 }],
  Mountain: [
    { name: 'SnowStorm', weight: 1.0 },
    { name: 'Snow', weight: 5.0 },
  ],
  Plains: [
    { name: 'Heath clear', weight: 2.0 },
    { name: 'Misty', weight: 0.4 },
    { name: 'LightRain', weight: 0.4 },
  ],
  Ocean: [
    { name: 'Rain', weight: 0.1 },
    { name: 'LightRain', weight: 0.1 },
    { name: 'Misty', weight: 0.1 },
    { name: 'Clear', weight: 1.0 },
    { name: 'ThunderStorm', weight: 0.1 },
  ],
  Mistlands: [{ name: 'Darklands dark', weight: 1.0 }],
  Ashlands: [{ name: 'Ashrain', weight: 1.0 }],
  'Deep North': [
    { name: 'Twilight Snowstorm', weight: 0.5 },
    { name: 'Twilight Snow', weight: 1.0 },
    { name: 'Twilight Clear', weight: 1.0 },
  ],
};

export const ALL_BIOMES: Biome[] = Object.keys(BIOME_POOLS) as Biome[];

// ---------------------------------------------------------------------------
// Effects mapping
// ---------------------------------------------------------------------------

const EFFECTS: Record<WeatherType, WeatherEffect[]> = {
  Rain: ['wet'],
  LightRain: ['wet'],
  SwampRain: ['wet'],
  ThunderStorm: ['wet', 'shelter-needed'],
  SnowStorm: ['freezing', 'low-visibility'],
  'Twilight Snowstorm': ['freezing', 'low-visibility'],
  Snow: ['freezing'],
  'Twilight Snow': ['freezing'],
  Misty: ['low-visibility'],
  'DeepForest Mist': ['low-visibility'],
  'Darklands dark': ['low-visibility'],
  Ashrain: ['shelter-needed'],
  Clear: [],
  'Heath clear': [],
  'Twilight Clear': [],
};

export function getEffects(weather: WeatherType): WeatherEffect[] {
  return EFFECTS[weather];
}

// ---------------------------------------------------------------------------
// RNG — ported from JereKuusela/valheim-weather (Unlicense)
// https://github.com/JereKuusela/valheim-weather
// ---------------------------------------------------------------------------

function createRNG(seed: number): { random: () => number; randomRange: () => number } {
  let a = seed >>> 0;
  let b = Math.imul(a, 1812433253) + 1;
  let c = Math.imul(b, 1812433253) + 1;
  let d = Math.imul(c, 1812433253) + 1;

  const next = (): number => {
    const t1 = a ^ (a << 11);
    const t2 = t1 ^ (t1 >>> 8);
    a = b;
    b = c;
    c = d;
    d = d ^ (d >>> 19) ^ t2;
    return d;
  };

  const random = (): number => {
    const value = (next() << 9) >>> 0;
    return value / 4294967295;
  };

  const randomRange = (): number => {
    return 1.0 - random();
  };

  return { random, randomRange };
}

// ---------------------------------------------------------------------------
// Weather selection
// ---------------------------------------------------------------------------

function selectWeather(pool: WeatherEntry[], roll: number): WeatherType {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  const target = total * roll;
  let sum = 0;
  for (const entry of pool) {
    sum += entry.weight;
    if (target < sum) return entry.name;
  }
  return pool[pool.length - 1].name;
}

// ---------------------------------------------------------------------------
// Exported forecast functions
// ---------------------------------------------------------------------------

export function getWeatherForPeriod(periodSeed: number, biome: Biome): WeatherType {
  const rng = createRNG(periodSeed);
  const roll = rng.randomRange();
  return selectWeather(BIOME_POOLS[biome], roll);
}

export function getForecast(startDay: number, biome: Biome, numDays: number): DayForecast[] {
  const forecasts: DayForecast[] = [];

  for (let i = 0; i < numDays; i++) {
    const day = startDay + i;
    const dayStartSec = (day - 1) * DAY_LENGTH;
    const dayEndSec = day * DAY_LENGTH;
    const firstPeriod = Math.floor(dayStartSec / WEATHER_PERIOD);
    const lastPeriod = Math.ceil(dayEndSec / WEATHER_PERIOD);

    const periods: WeatherPeriod[] = [];
    const freq = new Map<WeatherType, number>();

    for (let p = firstPeriod; p < lastPeriod; p++) {
      const weather = getWeatherForPeriod(p, biome);
      const effects = getEffects(weather);
      periods.push({ periodIndex: p - firstPeriod, weather, effects });
      freq.set(weather, (freq.get(weather) ?? 0) + 1);
    }

    // Dominant = most frequent weather across periods
    let dominant = periods[0].weather;
    let maxCount = 0;
    for (const [weather, count] of freq) {
      if (count > maxCount) {
        maxCount = count;
        dominant = weather;
      }
    }

    forecasts.push({
      day,
      dominant,
      dominantEffects: getEffects(dominant),
      periods,
    });
  }

  return forecasts;
}
