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
  label: string;
  weather: WeatherType;
  effects: WeatherEffect[];
  wind: WindInfo;
};

export type WindInfo = {
  intensity: number;  // 0–1 scale (biome-adjusted)
  angle: number;      // degrees, -180 to 180
  direction: string;  // compass label: N, NE, E, SE, S, SW, W, NW
};

export type WindSnapshot = {
  time: number;       // seconds into day (0–1800)
  label: string;      // in-game HH:MM
  intensity: number;  // 0–1 biome-adjusted
  angle: number;
  direction: string;
};

export type DayForecast = {
  day: number;
  dominant: WeatherType;
  dominantEffects: WeatherEffect[];
  periods: WeatherPeriod[];
  winds: WindSnapshot[];
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

/** Ordered by in-game progression (boss/biome tier order). */
export const ALL_BIOMES: Biome[] = [
  'Meadows',       // Eikthyr
  'Black Forest',  // Elder
  'Swamp',         // Bonemass
  'Mountain',      // Moder
  'Plains',        // Yagluth
  'Mistlands',     // Queen
  'Ashlands',      // Fader
  'Deep North',    // (future)
  'Ocean',         // (traversed throughout)
];

/** Biomes with only one weather type — no forecast variation. */
export const STATIC_BIOMES: Set<Biome> = new Set(
  ALL_BIOMES.filter((b) => BIOME_POOLS[b].length === 1),
);

/** Biomes with actual weather variation — useful default selection. */
export const VARIABLE_BIOMES: Biome[] = ALL_BIOMES.filter((b) => !STATIC_BIOMES.has(b));

// ---------------------------------------------------------------------------
// Wind ranges per weather type (from JereKuusela's tool)
// ---------------------------------------------------------------------------

const WIND_RANGES: Record<WeatherType, { windMin: number; windMax: number }> = {
  Clear: { windMin: 0.1, windMax: 0.6 },
  Rain: { windMin: 0.5, windMax: 1.0 },
  Misty: { windMin: 0.1, windMax: 0.3 },
  ThunderStorm: { windMin: 0.8, windMax: 1.0 },
  LightRain: { windMin: 0.1, windMax: 0.6 },
  'DeepForest Mist': { windMin: 0.1, windMax: 0.6 },
  SwampRain: { windMin: 0.1, windMax: 0.3 },
  SnowStorm: { windMin: 0.8, windMax: 1.0 },
  Snow: { windMin: 0.1, windMax: 0.6 },
  'Heath clear': { windMin: 0.4, windMax: 0.8 },
  'Twilight Snowstorm': { windMin: 0.7, windMax: 1.0 },
  'Twilight Snow': { windMin: 0.3, windMax: 0.6 },
  'Twilight Clear': { windMin: 0.2, windMax: 0.6 },
  Ashrain: { windMin: 0.1, windMax: 0.5 },
  'Darklands dark': { windMin: 0.1, windMax: 0.6 },
};

// ---------------------------------------------------------------------------
// Time-of-day slots for consistent period display
// ---------------------------------------------------------------------------

/** Convert game-seconds offset within a day to in-game HH:MM. */
function secsToGameTime(secsIntoDay: number): string {
  const realSecs = (secsIntoDay / DAY_LENGTH) * 24 * 3600;
  const hours = Math.floor(realSecs / 3600);
  const minutes = Math.floor((realSecs - hours * 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

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
// Wind calculation — ported from JereKuusela/valheim-weather (Unlicense)
// ---------------------------------------------------------------------------

const WIND_PERIOD = 1000 / 8;

function addOctave(time: number, octave: number, wind: { angle: number; intensity: number }) {
  const period = Math.floor(time / (WIND_PERIOD * 8 / octave));
  const rng = createRNG(period);
  wind.angle += rng.random() * 2 * Math.PI / octave;
  wind.intensity += (rng.random() - 0.5) / octave;
}

function getGlobalWind(time: number): { angle: number; intensity: number } {
  const wind = { angle: 0, intensity: 0.5 };
  addOctave(time, 1, wind);
  addOctave(time, 2, wind);
  addOctave(time, 4, wind);
  addOctave(time, 8, wind);
  wind.intensity = Math.min(1, Math.max(0, wind.intensity));
  wind.angle = wind.angle * 180 / Math.PI;
  while (wind.angle > 180) wind.angle -= 360;
  while (wind.angle < -180) wind.angle += 360;
  return wind;
}

function angleToDirection(angle: number): string {
  // Wind blows FROM this direction (opposite of angle)
  let from = angle + 180;
  while (from > 180) from -= 360;
  if (from < -22.5) from += 360;
  if (from <= 22.5) return 'N';
  if (from <= 67.5) return 'NE';
  if (from <= 112.5) return 'E';
  if (from <= 157.5) return 'SE';
  if (from <= 202.5) return 'S';
  if (from <= 247.5) return 'SW';
  if (from <= 292.5) return 'W';
  if (from <= 337.5) return 'NW';
  return 'N';
}

function getWindForTime(time: number, weather: WeatherType): WindInfo {
  const global = getGlobalWind(time);
  const { windMin, windMax } = WIND_RANGES[weather];
  const intensity = windMin + (windMax - windMin) * global.intensity;
  return {
    intensity: Math.round(intensity * 100) / 100,
    angle: Math.round(global.angle),
    direction: angleToDirection(global.angle),
  };
}

// ---------------------------------------------------------------------------
// Exported forecast functions
// ---------------------------------------------------------------------------

export function getWeatherForPeriod(periodSeed: number, biome: Biome): WeatherType {
  const rng = createRNG(periodSeed);
  const roll = rng.randomRange();
  return selectWeather(BIOME_POOLS[biome], roll);
}

/**
 * Compute a multi-day forecast using actual weather period boundaries.
 * Each day shows the real weather transitions (typically 2–4 per day).
 */
export function getForecast(startDay: number, biome: Biome, numDays: number): DayForecast[] {
  const forecasts: DayForecast[] = [];

  for (let i = 0; i < numDays; i++) {
    const day = startDay + i;
    const dayStartSec = (day - 1) * DAY_LENGTH;
    const dayEndSec = day * DAY_LENGTH;

    // Find all weather period boundaries that overlap this day
    const firstPeriod = Math.floor(dayStartSec / WEATHER_PERIOD);
    const lastPeriod = Math.ceil(dayEndSec / WEATHER_PERIOD);

    const periods: WeatherPeriod[] = [];
    const freq = new Map<WeatherType, number>();

    for (let p = firstPeriod; p < lastPeriod; p++) {
      const periodStartSec = p * WEATHER_PERIOD;
      const secsIntoDay = Math.max(0, periodStartSec - dayStartSec);
      const weather = getWeatherForPeriod(p, biome);
      const effects = getEffects(weather);
      const wind = getWindForTime(periodStartSec, weather);
      periods.push({
        periodIndex: p - firstPeriod,
        label: secsToGameTime(secsIntoDay),
        weather,
        effects,
        wind,
      });
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

    // Compute all wind snapshots (every WIND_PERIOD = 125s across the day)
    const winds: WindSnapshot[] = [];
    for (let t = dayStartSec; t < dayEndSec; t = (Math.floor(t / WIND_PERIOD) + 1) * WIND_PERIOD) {
      const wp = Math.floor(t / WEATHER_PERIOD);
      const weather = getWeatherForPeriod(wp, biome);
      const wind = getWindForTime(t, weather);
      const secsIntoDay = t - dayStartSec;
      winds.push({
        time: secsIntoDay,
        label: secsToGameTime(secsIntoDay),
        intensity: wind.intensity,
        angle: wind.angle,
        direction: wind.direction,
      });
    }

    forecasts.push({
      day,
      dominant,
      dominantEffects: getEffects(dominant),
      periods,
      winds,
    });
  }

  return forecasts;
}

// ---------------------------------------------------------------------------
// Icon and label helpers
// ---------------------------------------------------------------------------

/** Map a weather type to its icon filename (without extension). */
export function getWeatherIcon(weather: WeatherType): string {
  switch (weather) {
    case 'Clear':
    case 'Heath clear':
    case 'Twilight Clear':
      return 'clear';
    case 'Rain':
    case 'LightRain':
    case 'SwampRain':
      return 'rain';
    case 'ThunderStorm':
      return 'thunderstorm';
    case 'Misty':
    case 'DeepForest Mist':
      return 'misty';
    case 'Snow':
    case 'Twilight Snow':
      return 'snow';
    case 'SnowStorm':
    case 'Twilight Snowstorm':
      return 'snowstorm';
    case 'Ashrain':
      return 'ashrain';
    case 'Darklands dark':
      return 'dark';
  }
}

/** Human-friendly display name for a weather type. */
export function getWeatherLabel(weather: WeatherType): string {
  switch (weather) {
    case 'DeepForest Mist': return 'Forest Mist';
    case 'SwampRain': return 'Swamp Rain';
    case 'Heath clear': return 'Clear';
    case 'Twilight Snowstorm': return 'Snowstorm';
    case 'Twilight Snow': return 'Snow';
    case 'Twilight Clear': return 'Clear';
    case 'Darklands dark': return 'Darkness';
    case 'Ashrain': return 'Ash Rain';
    case 'SnowStorm': return 'Snowstorm';
    case 'LightRain': return 'Light Rain';
    case 'ThunderStorm': return 'Thunderstorm';
    default: return weather;
  }
}
