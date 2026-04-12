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
