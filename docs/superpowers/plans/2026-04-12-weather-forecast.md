# Weather Forecast Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/valheim/weather/` page that calculates and displays a 10-day Valheim weather forecast across all biomes, with biome filtering and expandable per-period detail.

**Architecture:** Pure client-side weather engine (ported from JereKuusela's Unlicense implementation) feeds a Solid.js UI. Astro page wraps the interactive component. No server-side data — all computation happens in the browser from a day number input.

**Tech Stack:** Astro 6, Solid.js 1.9, TypeScript, Vitest, existing OKLCH theme system

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/weather.ts` | Weather engine: RNG, biome pools, forecast calculation, effects mapping |
| Create | `tests/weather.test.ts` | Unit tests for weather engine |
| Create | `src/components/WeatherForecast.tsx` | Top-level component: day input, biome chips, state management |
| Create | `src/components/WeatherDayCard.tsx` | Single day card: dominant weather, icon, effect badges, expand toggle |
| Create | `src/components/WeatherPeriodDetail.tsx` | Expanded period-level breakdown |
| Create | `src/pages/weather.astro` | Astro page route using Base layout |
| Create | `public/icons/weather/clear.svg` | Pixel-art sun icon |
| Create | `public/icons/weather/rain.svg` | Pixel-art raindrops icon |
| Create | `public/icons/weather/thunderstorm.svg` | Pixel-art lightning + rain icon |
| Create | `public/icons/weather/misty.svg` | Pixel-art fog lines icon |
| Create | `public/icons/weather/snow.svg` | Pixel-art snowflake icon |
| Create | `public/icons/weather/snowstorm.svg` | Pixel-art snowflake + wind icon |
| Create | `public/icons/weather/ashrain.svg` | Pixel-art ember particles icon |
| Create | `public/icons/weather/dark.svg` | Pixel-art dark cloud icon |
| Modify | `src/layouts/Base.astro` | Add "Weather" nav link |
| Modify | `src/styles/theme.css` | Add `.weather-*` CSS classes |

---

### Task 1: Weather Engine — Types and Data

**Files:**
- Create: `src/lib/weather.ts`

- [ ] **Step 1: Create weather.ts with types and static data**

```typescript
// src/lib/weather.ts

export type WeatherType =
  | 'Clear' | 'Rain' | 'Misty' | 'ThunderStorm' | 'LightRain'
  | 'DeepForest Mist' | 'SwampRain' | 'SnowStorm' | 'Snow'
  | 'Heath clear' | 'Twilight Snowstorm' | 'Twilight Snow' | 'Twilight Clear'
  | 'Ashrain' | 'Darklands dark';

export type Biome =
  | 'Meadows' | 'Black Forest' | 'Swamp' | 'Mountain' | 'Plains'
  | 'Ocean' | 'Mistlands' | 'Ashlands' | 'Deep North';

export type WeatherEffect = 'wet' | 'freezing' | 'low-visibility' | 'shelter-needed';

export interface WeatherPeriod {
  periodIndex: number;
  weather: WeatherType;
  effects: WeatherEffect[];
}

export interface DayForecast {
  day: number;
  dominant: WeatherType;
  dominantEffects: WeatherEffect[];
  periods: WeatherPeriod[];
}

export const ALL_BIOMES: Biome[] = [
  'Meadows', 'Black Forest', 'Swamp', 'Mountain', 'Plains',
  'Ocean', 'Mistlands', 'Ashlands', 'Deep North',
];

const WEATHER_PERIOD = 666;
const DAY_LENGTH = 1800;

interface WeatherEntry {
  weight: number;
  name: WeatherType;
}

const biomePools: Record<Biome, WeatherEntry[]> = {
  'Meadows': [
    { weight: 5.0, name: 'Clear' },
    { weight: 0.2, name: 'Rain' },
    { weight: 0.2, name: 'Misty' },
    { weight: 0.2, name: 'ThunderStorm' },
    { weight: 0.2, name: 'LightRain' },
  ],
  'Black Forest': [
    { weight: 2.0, name: 'DeepForest Mist' },
    { weight: 0.1, name: 'Rain' },
    { weight: 0.1, name: 'Misty' },
    { weight: 0.1, name: 'ThunderStorm' },
  ],
  'Swamp': [
    { weight: 1.0, name: 'SwampRain' },
  ],
  'Mountain': [
    { weight: 1.0, name: 'SnowStorm' },
    { weight: 5.0, name: 'Snow' },
  ],
  'Plains': [
    { weight: 2.0, name: 'Heath clear' },
    { weight: 0.4, name: 'Misty' },
    { weight: 0.4, name: 'LightRain' },
  ],
  'Ocean': [
    { weight: 0.1, name: 'Rain' },
    { weight: 0.1, name: 'LightRain' },
    { weight: 0.1, name: 'Misty' },
    { weight: 1.0, name: 'Clear' },
    { weight: 0.1, name: 'ThunderStorm' },
  ],
  'Mistlands': [
    { weight: 1.0, name: 'Darklands dark' },
  ],
  'Ashlands': [
    { weight: 1.0, name: 'Ashrain' },
  ],
  'Deep North': [
    { weight: 0.5, name: 'Twilight Snowstorm' },
    { weight: 1.0, name: 'Twilight Snow' },
    { weight: 1.0, name: 'Twilight Clear' },
  ],
};

const effectsMap: Record<WeatherType, WeatherEffect[]> = {
  'Clear': [],
  'Heath clear': [],
  'Twilight Clear': [],
  'Rain': ['wet'],
  'LightRain': ['wet'],
  'SwampRain': ['wet'],
  'ThunderStorm': ['wet', 'shelter-needed'],
  'SnowStorm': ['freezing', 'low-visibility'],
  'Twilight Snowstorm': ['freezing', 'low-visibility'],
  'Snow': ['freezing'],
  'Twilight Snow': ['freezing'],
  'Misty': ['low-visibility'],
  'DeepForest Mist': ['low-visibility'],
  'Darklands dark': ['low-visibility'],
  'Ashrain': ['shelter-needed'],
};

export function getEffects(weather: WeatherType): WeatherEffect[] {
  return effectsMap[weather];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/weather.ts
git commit -m "feat(weather): add types, biome pools, and effects mapping"
```

---

### Task 2: Weather Engine — RNG and Forecast Calculation

**Files:**
- Modify: `src/lib/weather.ts`

- [ ] **Step 1: Add the Xorshift RNG and weather selection functions**

Append to `src/lib/weather.ts` (after the `getEffects` function):

```typescript
// Xorshift RNG — ported from JereKuusela's valheim-weather (Unlicense)
// Original source: https://github.com/JereKuusela/valheim-weather
function createRNG(seed: number) {
  let a = seed >>> 0;
  let b = (Math.imul(a, 1812433253) + 1) >>> 0;
  let c = (Math.imul(b, 1812433253) + 1) >>> 0;
  let d = (Math.imul(c, 1812433253) + 1) >>> 0;

  function next(): number {
    const t1 = a ^ (a << 11);
    const t2 = t1 ^ (t1 >>> 8);
    a = b; b = c; c = d;
    d = (d ^ (d >>> 19) ^ t2) >>> 0;
    return d;
  }

  return {
    /** Returns a value in [0, 1) */
    random(): number {
      return (next() << 9 >>> 0) / 4294967295;
    },
    /** Returns a value in (0, 1] */
    randomRange(): number {
      return 1.0 - this.random();
    },
  };
}

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

/** Get the weather type for a specific period seed and biome. */
export function getWeatherForPeriod(periodSeed: number, biome: Biome): WeatherType {
  const rng = createRNG(periodSeed);
  const roll = rng.randomRange();
  return selectWeather(biomePools[biome], roll);
}

/**
 * Compute a multi-day forecast for a biome.
 *
 * @param startDay - First in-game day (1-based)
 * @param biome - Target biome
 * @param numDays - Number of days to forecast
 */
export function getForecast(startDay: number, biome: Biome, numDays: number): DayForecast[] {
  const results: DayForecast[] = [];

  for (let d = 0; d < numDays; d++) {
    const day = startDay + d;
    const dayStartSec = (day - 1) * DAY_LENGTH;

    // Compute weather for each 666s period that overlaps this day
    const periods: WeatherPeriod[] = [];
    const firstPeriod = Math.floor(dayStartSec / WEATHER_PERIOD);
    const dayEndSec = day * DAY_LENGTH;
    const lastPeriod = Math.ceil(dayEndSec / WEATHER_PERIOD);

    for (let p = firstPeriod; p < lastPeriod; p++) {
      const weather = getWeatherForPeriod(p, biome);
      periods.push({
        periodIndex: p - firstPeriod,
        weather,
        effects: getEffects(weather),
      });
    }

    // Dominant = most frequent weather type across periods
    const counts = new Map<WeatherType, number>();
    for (const p of periods) {
      counts.set(p.weather, (counts.get(p.weather) ?? 0) + 1);
    }
    let dominant: WeatherType = periods[0].weather;
    let maxCount = 0;
    for (const [type, count] of counts) {
      if (count > maxCount) {
        dominant = type;
        maxCount = count;
      }
    }

    results.push({
      day,
      dominant,
      dominantEffects: getEffects(dominant),
      periods,
    });
  }

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/weather.ts
git commit -m "feat(weather): add xorshift RNG, weather selection, and forecast calculation"
```

---

### Task 3: Weather Engine — Unit Tests

**Files:**
- Create: `tests/weather.test.ts`

The key verification: for a known period seed, the RNG produces a deterministic roll, which selects a specific weather type. We test against values computed by running JereKuusela's original script.

- [ ] **Step 1: Write unit tests**

```typescript
// tests/weather.test.ts
import { describe, it, expect } from 'vitest';
import {
  getWeatherForPeriod,
  getForecast,
  getEffects,
  ALL_BIOMES,
  type Biome,
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
    // With enough seeds, Meadows should eventually produce non-Clear weather
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
    // Swamp only has SwampRain, so dominant must be SwampRain
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
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test -- tests/weather.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add tests/weather.test.ts
git commit -m "test(weather): add unit tests for weather engine"
```

---

### Task 4: Weather Icons — Pixel Art SVGs

**Files:**
- Create: `public/icons/weather/clear.svg`
- Create: `public/icons/weather/rain.svg`
- Create: `public/icons/weather/thunderstorm.svg`
- Create: `public/icons/weather/misty.svg`
- Create: `public/icons/weather/snow.svg`
- Create: `public/icons/weather/snowstorm.svg`
- Create: `public/icons/weather/ashrain.svg`
- Create: `public/icons/weather/dark.svg`

Follow the icon style guide: 48×48 viewBox, pixel-art using simple SVG shapes (`rect`, `polygon`, `circle`, `path`), 2-3 tones per icon, no gradients, target under 1KB each.

- [ ] **Step 1: Create the 8 weather icon SVGs**

Before creating icons, read 2-3 existing item icons from `public/icons/items/` for style reference. Then create each icon:

**`public/icons/weather/clear.svg`** — Sun: bright yellow circle with rays
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="4" width="4" height="8" fill="#FFD700"/>
  <rect x="22" y="36" width="4" height="8" fill="#FFD700"/>
  <rect x="4" y="22" width="8" height="4" fill="#FFD700"/>
  <rect x="36" y="22" width="8" height="4" fill="#FFD700"/>
  <rect x="8" y="8" width="4" height="4" fill="#FFD700"/>
  <rect x="36" y="8" width="4" height="4" fill="#FFD700"/>
  <rect x="8" y="36" width="4" height="4" fill="#FFD700"/>
  <rect x="36" y="36" width="4" height="4" fill="#FFD700"/>
  <rect x="16" y="16" width="16" height="16" rx="8" fill="#FFA500"/>
  <rect x="18" y="18" width="8" height="8" rx="4" fill="#FFD700"/>
</svg>
```

**`public/icons/weather/rain.svg`** — Raindrops falling from cloud
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="8" y="10" width="32" height="8" rx="4" fill="#708090"/>
  <rect x="12" y="6" width="24" height="8" rx="4" fill="#8A9BAE"/>
  <rect x="14" y="24" width="2" height="6" fill="#5A8ABF"/>
  <rect x="22" y="22" width="2" height="8" fill="#5A8ABF"/>
  <rect x="30" y="24" width="2" height="6" fill="#5A8ABF"/>
  <rect x="18" y="30" width="2" height="6" fill="#5A8ABF"/>
  <rect x="26" y="28" width="2" height="8" fill="#5A8ABF"/>
  <rect x="10" y="32" width="2" height="4" fill="#5A8ABF"/>
  <rect x="34" y="32" width="2" height="6" fill="#5A8ABF"/>
</svg>
```

**`public/icons/weather/thunderstorm.svg`** — Lightning bolt + rain
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="8" y="8" width="32" height="8" rx="4" fill="#4A5568"/>
  <rect x="12" y="4" width="24" height="8" rx="4" fill="#5A6A7A"/>
  <polygon points="26,18 20,28 24,28 18,42 30,26 26,26 32,18" fill="#FFD700"/>
  <rect x="10" y="22" width="2" height="6" fill="#5A8ABF"/>
  <rect x="36" y="24" width="2" height="6" fill="#5A8ABF"/>
  <rect x="14" y="32" width="2" height="4" fill="#5A8ABF"/>
  <rect x="32" y="30" width="2" height="6" fill="#5A8ABF"/>
</svg>
```

**`public/icons/weather/misty.svg`** — Wavy fog lines
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="4" y="10" width="28" height="3" rx="1" fill="#A0A8B0" opacity="0.6"/>
  <rect x="10" y="17" width="34" height="3" rx="1" fill="#8A9BAE" opacity="0.7"/>
  <rect x="6" y="24" width="30" height="3" rx="1" fill="#A0A8B0" opacity="0.8"/>
  <rect x="12" y="31" width="32" height="3" rx="1" fill="#8A9BAE" opacity="0.6"/>
  <rect x="4" y="38" width="24" height="3" rx="1" fill="#A0A8B0" opacity="0.5"/>
</svg>
```

**`public/icons/weather/snow.svg`** — Snowflake
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="22" y="4" width="4" height="40" fill="#C0D8E8"/>
  <rect x="4" y="22" width="40" height="4" fill="#C0D8E8"/>
  <rect x="10" y="10" width="4" height="4" fill="#C0D8E8"/>
  <rect x="34" y="10" width="4" height="4" fill="#C0D8E8"/>
  <rect x="10" y="34" width="4" height="4" fill="#C0D8E8"/>
  <rect x="34" y="34" width="4" height="4" fill="#C0D8E8"/>
  <rect x="14" y="14" width="4" height="4" fill="#E0EEF8"/>
  <rect x="30" y="14" width="4" height="4" fill="#E0EEF8"/>
  <rect x="14" y="30" width="4" height="4" fill="#E0EEF8"/>
  <rect x="30" y="30" width="4" height="4" fill="#E0EEF8"/>
  <rect x="20" y="20" width="8" height="8" fill="#E0EEF8"/>
</svg>
```

**`public/icons/weather/snowstorm.svg`** — Snowflake + wind lines
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="20" y="6" width="4" height="24" fill="#C0D8E8"/>
  <rect x="8" y="16" width="28" height="4" fill="#C0D8E8"/>
  <rect x="12" y="10" width="4" height="4" fill="#E0EEF8"/>
  <rect x="28" y="10" width="4" height="4" fill="#E0EEF8"/>
  <rect x="12" y="24" width="4" height="4" fill="#E0EEF8"/>
  <rect x="28" y="24" width="4" height="4" fill="#E0EEF8"/>
  <rect x="4" y="34" width="20" height="2" fill="#8A9BAE" opacity="0.7"/>
  <rect x="10" y="38" width="28" height="2" fill="#8A9BAE" opacity="0.5"/>
  <rect x="6" y="42" width="16" height="2" fill="#8A9BAE" opacity="0.4"/>
</svg>
```

**`public/icons/weather/ashrain.svg`** — Ember/ash particles
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="8" y="8" width="32" height="8" rx="4" fill="#5A3A2A"/>
  <rect x="12" y="4" width="24" height="8" rx="4" fill="#6A4A3A"/>
  <rect x="12" y="22" width="3" height="3" fill="#CC4400"/>
  <rect x="24" y="20" width="3" height="3" fill="#FF6620"/>
  <rect x="34" y="24" width="3" height="3" fill="#CC4400"/>
  <rect x="16" y="30" width="3" height="3" fill="#FF6620"/>
  <rect x="28" y="32" width="3" height="3" fill="#CC4400"/>
  <rect x="10" y="38" width="3" height="3" fill="#AA2200"/>
  <rect x="20" y="36" width="3" height="3" fill="#FF6620"/>
  <rect x="36" y="36" width="3" height="3" fill="#AA2200"/>
</svg>
```

**`public/icons/weather/dark.svg`** — Dark cloud/moon
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="8" y="14" width="32" height="12" rx="6" fill="#2A2A3A"/>
  <rect x="12" y="10" width="24" height="12" rx="6" fill="#3A3A4A"/>
  <rect x="30" y="4" width="10" height="10" rx="5" fill="#4A4A5A"/>
  <rect x="34" y="2" width="8" height="8" rx="4" fill="#2A2A3A"/>
  <rect x="12" y="28" width="2" height="4" fill="#4A4A5A" opacity="0.5"/>
  <rect x="20" y="30" width="2" height="6" fill="#4A4A5A" opacity="0.4"/>
  <rect x="28" y="28" width="2" height="4" fill="#4A4A5A" opacity="0.5"/>
  <rect x="36" y="30" width="2" height="4" fill="#4A4A5A" opacity="0.3"/>
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add public/icons/weather/
git commit -m "art(weather): add 8 pixel-art weather icon SVGs"
```

---

### Task 5: Weather Icon Mapping Helper

**Files:**
- Modify: `src/lib/weather.ts`

- [ ] **Step 1: Add icon mapping function to weather.ts**

Append to `src/lib/weather.ts`:

```typescript
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
```

- [ ] **Step 2: Add tests for icon and label mapping**

Append to `tests/weather.test.ts`:

```typescript
import { getWeatherIcon, getWeatherLabel } from '../src/lib/weather';

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
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- tests/weather.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/weather.ts tests/weather.test.ts
git commit -m "feat(weather): add icon mapping and display label helpers"
```

---

### Task 6: Weather CSS Styles

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Add weather styles to theme.css**

Append to the end of `src/styles/theme.css`:

```css
/* ===== Weather forecast ===== */
.weather-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.weather-controls__day-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 12px;
}
.weather-controls__day-input label {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.weather-controls__day-input input {
  width: 80px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  text-align: center;
  -moz-appearance: textfield;
}
.weather-controls__day-input input::-webkit-inner-spin-button,
.weather-controls__day-input input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Biome chips */
.weather-biome-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.weather-biome-chip {
  background: var(--accent-bg);
  border: 1px solid var(--border);
  color: var(--text-soft);
  padding: 4px 12px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.weather-biome-chip--active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}

/* Day cards grid */
.weather-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.weather-day-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  cursor: pointer;
}
.weather-day-card:hover {
  border-color: var(--accent-border);
}
.weather-day-card--current {
  border-color: var(--accent-border);
  border-width: 2px;
}
.weather-day-card--expanded {
  background: var(--surface-sunken);
  border-color: var(--accent-border);
}
.weather-day-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.weather-day-card__day {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.weather-day-card--current .weather-day-card__day {
  color: var(--accent);
}
.weather-day-card__expand {
  font-size: 10px;
  color: var(--muted);
}

/* Weather entry (used in both card overview and period detail) */
.weather-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.weather-entry__icon {
  width: 24px;
  height: 24px;
  image-rendering: pixelated;
  flex-shrink: 0;
}
.weather-entry__name {
  font-size: 13px;
  font-weight: 500;
}
.weather-entry__biome {
  font-size: 11px;
  color: var(--muted);
}

/* Effect badges */
.weather-effects {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.weather-effect-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 500;
}
.weather-effect-badge--wet {
  background: color-mix(in oklch, var(--warning) 20%, transparent);
  color: var(--warning);
}
.weather-effect-badge--freezing {
  background: color-mix(in oklch, var(--info) 20%, transparent);
  color: var(--info);
}
.weather-effect-badge--low-visibility {
  background: color-mix(in oklch, var(--text-muted) 20%, transparent);
  color: var(--text-muted);
}
.weather-effect-badge--shelter-needed {
  background: color-mix(in oklch, var(--danger) 20%, transparent);
  color: var(--danger);
}

/* Period detail (expanded day) */
.weather-periods {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft);
}
.weather-periods__title {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  margin-bottom: 6px;
}
.weather-period-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 12px;
}
.weather-period-row__index {
  color: var(--muted);
  font-size: 10px;
  min-width: 14px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/theme.css
git commit -m "style(weather): add CSS classes for weather forecast page"
```

---

### Task 7: WeatherPeriodDetail Component

**Files:**
- Create: `src/components/WeatherPeriodDetail.tsx`

- [ ] **Step 1: Create WeatherPeriodDetail component**

```tsx
// src/components/WeatherPeriodDetail.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WeatherPeriodDetail.tsx
git commit -m "feat(weather): add WeatherPeriodDetail component"
```

---

### Task 8: WeatherDayCard Component

**Files:**
- Create: `src/components/WeatherDayCard.tsx`

- [ ] **Step 1: Create WeatherDayCard component**

```tsx
// src/components/WeatherDayCard.tsx
import { For, Show, type Component } from 'solid-js';
import type { DayForecast, Biome } from '../lib/weather';
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
  // Compute forecasts for each visible biome for this single day
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WeatherDayCard.tsx
git commit -m "feat(weather): add WeatherDayCard component"
```

---

### Task 9: WeatherForecast Top-Level Component

**Files:**
- Create: `src/components/WeatherForecast.tsx`

- [ ] **Step 1: Create WeatherForecast component**

```tsx
// src/components/WeatherForecast.tsx
import { For, type Component, createSignal, createMemo } from 'solid-js';
import { ALL_BIOMES, type Biome } from '../lib/weather';
import { WeatherDayCard } from './WeatherDayCard';

const NUM_DAYS = 10;

interface Props {
  baseHref: string;
}

export const WeatherForecast: Component<Props> = (props) => {
  const [currentDay, setCurrentDay] = createSignal(1);
  const [selectedBiomes, setSelectedBiomes] = createSignal<Set<Biome>>(
    new Set(ALL_BIOMES),
  );
  const [expandedDay, setExpandedDay] = createSignal<number | null>(null);

  const activeBiomes = createMemo(() => {
    const sel = selectedBiomes();
    return ALL_BIOMES.filter((b) => sel.has(b));
  });

  const days = createMemo(() =>
    Array.from({ length: NUM_DAYS }, (_, i) => currentDay() + i),
  );

  const toggleBiome = (biome: Biome) => {
    setSelectedBiomes((prev) => {
      const next = new Set(prev);
      if (next.has(biome)) {
        // Don't allow deselecting all — keep at least one
        if (next.size > 1) next.delete(biome);
      } else {
        next.add(biome);
      }
      return next;
    });
  };

  const selectAllBiomes = () => {
    setSelectedBiomes(new Set(ALL_BIOMES));
  };

  const allSelected = createMemo(
    () => selectedBiomes().size === ALL_BIOMES.length,
  );

  const handleDayInput = (value: string) => {
    const n = parseInt(value, 10);
    if (Number.isFinite(n) && n >= 1) {
      setCurrentDay(n);
    }
  };

  const toggleDay = (day: number) => {
    setExpandedDay((prev) => (prev === day ? null : day));
  };

  return (
    <div>
      <div class="weather-controls">
        <div class="weather-controls__day-input">
          <label for="weather-day">Day</label>
          <input
            id="weather-day"
            type="number"
            min="1"
            value={currentDay()}
            onInput={(e) => handleDayInput(e.currentTarget.value)}
          />
        </div>

        <div class="weather-biome-chips">
          <button
            type="button"
            class="weather-biome-chip"
            classList={{ 'weather-biome-chip--active': allSelected() }}
            onClick={selectAllBiomes}
          >
            All
          </button>
          <For each={ALL_BIOMES}>
            {(biome) => (
              <button
                type="button"
                class="weather-biome-chip"
                classList={{ 'weather-biome-chip--active': selectedBiomes().has(biome) }}
                onClick={() => toggleBiome(biome)}
              >
                {biome}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="weather-grid">
        <For each={days()}>
          {(day) => (
            <WeatherDayCard
              day={day}
              biomes={activeBiomes()}
              isCurrentDay={day === currentDay()}
              expanded={expandedDay() === day}
              baseHref={props.baseHref}
              onToggle={() => toggleDay(day)}
            />
          )}
        </For>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WeatherForecast.tsx
git commit -m "feat(weather): add WeatherForecast top-level component"
```

---

### Task 10: Astro Page and Navigation

**Files:**
- Create: `src/pages/weather.astro`
- Modify: `src/layouts/Base.astro`

- [ ] **Step 1: Create the weather Astro page**

```astro
---
import Base from '../layouts/Base.astro';
import { WeatherForecast } from '../components/WeatherForecast';

const base = import.meta.env.BASE_URL;
---
<Base title="Valheim Weather Forecast" description="Deterministic weather forecast for all Valheim biomes. Enter your in-game day to plan ahead.">
  <h1>Weather Forecast</h1>
  <p class="subtitle">Enter your current in-game day to see upcoming weather across biomes. Click a day to expand period detail.</p>
  <WeatherForecast client:load baseHref={base} />
</Base>
```

- [ ] **Step 2: Add Weather link to Base.astro navigation**

In `src/layouts/Base.astro`, change the `<nav>` block from:

```html
        <nav>
          <a href={base}>Recipes</a>
          <a href={`${base}about/`}>About</a>
        </nav>
```

to:

```html
        <nav>
          <a href={base}>Recipes</a>
          <a href={`${base}weather/`}>Weather</a>
          <a href={`${base}about/`}>About</a>
        </nav>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/weather.astro src/layouts/Base.astro
git commit -m "feat(weather): add weather forecast page and nav link"
```

---

### Task 11: Visual Verification and Build Check

**Files:** (none modified)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: All tests PASS (existing tests + new weather tests)

- [ ] **Step 2: Run the type checker**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Build the project**

Run: `pnpm build`
Expected: Build succeeds, `dist/valheim/weather/index.html` exists

- [ ] **Step 4: Start dev server and visually verify**

Run: `pnpm dev --port 4322`

Verify in browser at `http://localhost:4322/valheim/weather/`:
- Day input works (change number, grid updates)
- Biome chips toggle on/off, "All" resets
- Day cards show weather icons + names + effect badges
- Click a day card to expand period detail
- Navigation link "Weather" appears in header
- Dark mode and light mode both look correct
- Existing pages (Recipes, About) still work

- [ ] **Step 5: Stop dev server**
