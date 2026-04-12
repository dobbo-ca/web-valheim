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
