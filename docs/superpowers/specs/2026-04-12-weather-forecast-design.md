# Weather Forecast Page — Design Spec

## Purpose

A Valheim weather forecast tool that lets players enter their current in-game day and see upcoming weather across all biomes. Deterministic calculation — no server required. Helps players plan activities (sailing, building, exploring) around weather conditions.

## User Flow

1. User navigates to `/valheim/weather/`
2. Enters current in-game day number (numeric input, defaults to day 1)
3. Sees 10-day forecast as day cards, all biomes shown by default
4. Filters biomes via chip toggles (same pattern as recipe type chips)
5. Clicks any day card to expand and see per-period weather detail (~3 periods per day)
6. Each weather entry shows icon, name, and gameplay effect badges (wet, freezing, low visibility)

## Architecture

### Page & Routing

- **`src/pages/weather.astro`** — Astro page using `Base.astro` layout
- Wraps a `<WeatherForecast client:load />` Solid.js component for interactivity
- Nav link added to `src/layouts/Base.astro`: `Weather`

### Components (Solid.js, `src/components/`)

| Component | Responsibility |
|-----------|---------------|
| `WeatherForecast.tsx` | Top-level: day input, biome chips, renders day cards, manages state |
| `WeatherDayCard.tsx` | Single day card: dominant weather icon/name, effect badges, expand toggle |
| `WeatherPeriodDetail.tsx` | Expanded view: shows each 666s period within a day with weather + effects |

### Weather Engine (`src/lib/weather.ts`)

Pure functions, no side effects. Ported from JereKuusela's implementation (Unlicense).

```typescript
// Core types
type WeatherType = 'Clear' | 'Rain' | 'Misty' | 'ThunderStorm' | 'LightRain'
  | 'DeepForest Mist' | 'SwampRain' | 'SnowStorm' | 'Snow'
  | 'Heath clear' | 'Twilight Snowstorm' | 'Twilight Snow' | 'Twilight Clear'
  | 'Ashrain' | 'Darklands dark'

type Biome = 'Meadows' | 'Black Forest' | 'Swamp' | 'Mountain' | 'Plains'
  | 'Ocean' | 'Mistlands' | 'Ashlands' | 'Deep North'

type WeatherEffect = 'wet' | 'freezing' | 'low-visibility' | 'shelter-needed'

interface WeatherPeriod {
  periodIndex: number      // which 666s period within the day
  weather: WeatherType
  effects: WeatherEffect[]
}

interface DayForecast {
  day: number
  dominant: WeatherType    // most frequent weather that day
  dominantEffects: WeatherEffect[]
  periods: WeatherPeriod[]
}

// Public API
function getForecast(day: number, biome: Biome, numDays: number): DayForecast[]
function getWeatherForPeriod(periodSeed: number, biome: Biome): WeatherType
function getEffects(weather: WeatherType): WeatherEffect[]
```

**Algorithm (from JereKuusela's tool):**
- Weather period = 666 seconds
- In-game day = 1800 seconds
- ~2.7 periods per day (we show 3: early, mid, late)
- Period seed = `Math.floor(gameTimeSeconds / 666)`
- Game time for day N start = `(N - 1) * 1800` (day 1 starts at time 0)
- Xorshift RNG from period seed selects weather via weighted random from biome's pool

**Biome weather pools (weights):**

| Biome | Weather Types (weight) |
|-------|----------------------|
| Meadows | Clear (5.0), Rain (0.2), Misty (0.2), ThunderStorm (0.2), LightRain (0.2) |
| Black Forest | DeepForest Mist (2.0), Rain (0.1), Misty (0.1), ThunderStorm (0.1) |
| Swamp | SwampRain (1.0) |
| Mountain | Snow (5.0), SnowStorm (1.0) |
| Plains | Heath clear (2.0), Misty (0.4), LightRain (0.4) |
| Ocean | Clear (1.0), Rain (0.1), LightRain (0.1), Misty (0.1), ThunderStorm (0.1) |
| Mistlands | Darklands dark (1.0) |
| Ashlands | Ashrain (1.0) |
| Deep North | Twilight Snow (1.0), Twilight Clear (1.0), Twilight Snowstorm (0.5) |

**Weather effects mapping:**

| Weather | Effects |
|---------|---------|
| Rain, LightRain, SwampRain | wet |
| ThunderStorm | wet, shelter-needed |
| SnowStorm, Twilight Snowstorm | freezing, low-visibility |
| Snow, Twilight Snow | freezing |
| Misty, DeepForest Mist, Darklands dark | low-visibility |
| Ashrain | shelter-needed |
| Clear, Heath clear, Twilight Clear | (none) |

### Weather Icons (`public/icons/weather/`)

Pixel-art SVGs following the same style as item icons: 48×48 viewBox, simple shapes, 2-3 tones. Rendered at 24px with `image-rendering: pixelated`.

Icons needed (8 distinct visuals):
- `clear.svg` — sun
- `rain.svg` — raindrops
- `thunderstorm.svg` — lightning bolt + rain
- `misty.svg` — wavy fog lines
- `snow.svg` — snowflake
- `snowstorm.svg` — snowflake + wind lines
- `ashrain.svg` — ember particles
- `dark.svg` — dark cloud/moon

Biome-specific variants (e.g., SwampRain, DeepForest Mist) reuse the base icon — the biome context is already clear from the chip/row.

### Styling

- CSS classes prefixed `.weather-*` added to `src/styles/theme.css`
- Reuses existing design tokens: `--surface`, `--accent`, `--border`, `--text-muted`, etc.
- Biome chip colors: subtle tinted backgrounds per biome (similar to recipe type chips)
- Effect badges: small pill-shaped badges using `--warning` (wet), `--info` (freezing), `--text-muted` (low-visibility), `--danger` (shelter-needed)
- Day cards: `--surface` background, `--border` outline, `--accent-border` for current day highlight
- Dark/light mode via existing OKLCH `prefers-color-scheme` setup

### State Management

All client-side Solid.js signals:
- `currentDay: number` — user input
- `selectedBiomes: Set<Biome>` — chip filter state (all selected by default)
- `expandedDay: number | null` — which day card is expanded
- Forecast computed via `createMemo` from `currentDay` + `selectedBiomes`
- No URL state encoding needed (unlike recipes, weather state is ephemeral)

## Testing

- **Unit tests** for weather engine: verify known period seeds produce expected weather types against JereKuusela's tool output
- **Unit tests** for effects mapping: each weather type maps to correct effects
- **Component rendering**: day cards show correct icons, biome chips toggle, expand works

## Future: Server Integration

The day input will be designed to accept a value programmatically. When dobbo.ca's Valheim status server can expose the current in-game day, a "Connect to Server" button can auto-populate the input. This requires separate work in the valheim server repo.

## Out of Scope

- Wind speed/direction display (can add later)
- Real-time countdown to next weather period
- Multiple world seed support (Valheim weather is seed-independent per the algorithm)
- Save/bookmark forecasts
