use std::f64::consts::PI;

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_LENGTH: f64 = 1800.0;
const WEATHER_PERIOD: f64 = 666.0;
const WIND_PERIOD: f64 = 125.0; // 1000.0 / 8.0

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum WeatherBiome {
    Meadows,
    BlackForest,
    Swamp,
    Mountain,
    Plains,
    Ocean,
    Mistlands,
    Ashlands,
    DeepNorth,
}

impl WeatherBiome {
    pub fn all() -> &'static [WeatherBiome] {
        &[
            WeatherBiome::Meadows,
            WeatherBiome::BlackForest,
            WeatherBiome::Swamp,
            WeatherBiome::Mountain,
            WeatherBiome::Plains,
            WeatherBiome::Ocean,
            WeatherBiome::Mistlands,
            WeatherBiome::Ashlands,
            WeatherBiome::DeepNorth,
        ]
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            WeatherBiome::Meadows => "Meadows",
            WeatherBiome::BlackForest => "Black Forest",
            WeatherBiome::Swamp => "Swamp",
            WeatherBiome::Mountain => "Mountain",
            WeatherBiome::Plains => "Plains",
            WeatherBiome::Ocean => "Ocean",
            WeatherBiome::Mistlands => "Mistlands",
            WeatherBiome::Ashlands => "Ashlands",
            WeatherBiome::DeepNorth => "Deep North",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum WeatherEffect {
    Wet,
    Freezing,
    LowVisibility,
    ShelterNeeded,
}

// ── Structs ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub struct WeatherType {
    pub name: String,
    pub label: String,
    pub effects: Vec<WeatherEffect>,
    pub wind_min: f64,
    pub wind_max: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WindSnapshot {
    pub time: f64,
    pub label: String,
    pub intensity: f64,
    pub angle: i32,
    pub direction: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct WeatherPeriod {
    pub period_index: u32,
    pub label: String,
    pub weather: WeatherType,
    pub wind: WindSnapshot,
}

#[derive(Debug, Clone, PartialEq)]
pub struct DayForecast {
    pub day: u64,
    pub dominant: WeatherType,
    pub dominant_effects: Vec<WeatherEffect>,
    pub periods: Vec<WeatherPeriod>,
    pub winds: Vec<WindSnapshot>,
}

// ── RNG ───────────────────────────────────────────────────────────────────────

struct Xorshift128 {
    a: u32,
    b: u32,
    c: u32,
    d: u32,
}

impl Xorshift128 {
    fn new(seed: u32) -> Self {
        let a = seed;
        let b = a.wrapping_mul(1812433253).wrapping_add(1);
        let c = b.wrapping_mul(1812433253).wrapping_add(1);
        let d = c.wrapping_mul(1812433253).wrapping_add(1);
        Self { a, b, c, d }
    }

    fn random_bits(&mut self) -> u32 {
        let t1 = self.a ^ (self.a << 11);
        let t2 = t1 ^ (t1 >> 8);
        self.a = self.b;
        self.b = self.c;
        self.c = self.d;
        self.d = self.d ^ (self.d >> 19) ^ t2;
        self.d
    }

    fn random(&mut self) -> f64 {
        let value = (self.random_bits() << 9) as u32;
        value as f64 / 4294967295.0
    }

    fn random_range(&mut self) -> f64 {
        1.0 - self.random()
    }
}

// ── Weather pools ─────────────────────────────────────────────────────────────

fn biome_pool(biome: &WeatherBiome) -> Vec<(&'static str, f64)> {
    match biome {
        WeatherBiome::Meadows => vec![
            ("Clear", 5.0),
            ("Rain", 0.2),
            ("Misty", 0.2),
            ("ThunderStorm", 0.2),
            ("LightRain", 0.2),
        ],
        WeatherBiome::BlackForest => vec![
            ("DeepForest Mist", 2.0),
            ("Rain", 0.1),
            ("Misty", 0.1),
            ("ThunderStorm", 0.1),
        ],
        WeatherBiome::Swamp => vec![("SwampRain", 1.0)],
        WeatherBiome::Mountain => vec![("SnowStorm", 1.0), ("Snow", 5.0)],
        WeatherBiome::Plains => vec![
            ("Heath clear", 2.0),
            ("Misty", 0.4),
            ("LightRain", 0.4),
        ],
        WeatherBiome::Ocean => vec![
            ("Rain", 0.1),
            ("LightRain", 0.1),
            ("Misty", 0.1),
            ("Clear", 1.0),
            ("ThunderStorm", 0.1),
        ],
        WeatherBiome::Mistlands => vec![("Darklands dark", 1.0)],
        WeatherBiome::Ashlands => vec![("Ashrain", 1.0)],
        WeatherBiome::DeepNorth => vec![
            ("Twilight Snowstorm", 0.5),
            ("Twilight Snow", 1.0),
            ("Twilight Clear", 1.0),
        ],
    }
}

fn make_weather_type(name: &str) -> WeatherType {
    let (label, effects, wind_min, wind_max) = match name {
        "Clear" => ("Clear", vec![], 0.1, 0.6),
        "Rain" => ("Rain", vec![WeatherEffect::Wet], 0.3, 0.8),
        "LightRain" => ("Light Rain", vec![WeatherEffect::Wet], 0.1, 0.5),
        "ThunderStorm" => (
            "Thunderstorm",
            vec![WeatherEffect::Wet, WeatherEffect::ShelterNeeded],
            0.8,
            1.0,
        ),
        "Misty" => ("Misty", vec![WeatherEffect::LowVisibility], 0.1, 0.3),
        "DeepForest Mist" => (
            "Forest Mist",
            vec![WeatherEffect::LowVisibility],
            0.1,
            0.4,
        ),
        "SwampRain" => ("Swamp Rain", vec![WeatherEffect::Wet], 0.3, 0.7),
        "Snow" => ("Snow", vec![WeatherEffect::Freezing], 0.2, 0.5),
        "SnowStorm" => (
            "Snowstorm",
            vec![WeatherEffect::Freezing, WeatherEffect::LowVisibility],
            0.8,
            1.0,
        ),
        "Heath clear" => ("Clear", vec![], 0.1, 0.5),
        "Twilight Snowstorm" => (
            "Snowstorm",
            vec![WeatherEffect::Freezing, WeatherEffect::LowVisibility],
            0.8,
            1.0,
        ),
        "Twilight Snow" => ("Snow", vec![WeatherEffect::Freezing], 0.2, 0.5),
        "Twilight Clear" => ("Clear", vec![], 0.1, 0.4),
        "Ashrain" => ("Ash Rain", vec![WeatherEffect::ShelterNeeded], 0.3, 0.7),
        "Darklands dark" => ("Darkness", vec![WeatherEffect::LowVisibility], 0.1, 0.3),
        _ => ("Unknown", vec![], 0.0, 1.0),
    };
    WeatherType {
        name: name.to_string(),
        label: label.to_string(),
        effects,
        wind_min,
        wind_max,
    }
}

// ── Weather selection ─────────────────────────────────────────────────────────

fn get_weather_for_period(period_index: u64, biome: &WeatherBiome) -> WeatherType {
    let pool = biome_pool(biome);
    let total_weight: f64 = pool.iter().map(|(_, w)| w).sum();
    let mut rng = Xorshift128::new(period_index as u32);
    let roll = rng.random_range() * total_weight;

    let mut cumulative = 0.0;
    for (name, weight) in &pool {
        cumulative += weight;
        if roll <= cumulative {
            return make_weather_type(name);
        }
    }
    // Fallback to last entry
    make_weather_type(pool.last().unwrap().0)
}

// ── Wind generation ───────────────────────────────────────────────────────────

fn add_octave(time: f64, octave: f64, angle: &mut f64, intensity: &mut f64) {
    let period = (time / (WIND_PERIOD * 8.0 / octave)).floor() as u32;
    let mut rng = Xorshift128::new(period);
    *angle += rng.random() * 2.0 * PI / octave;
    *intensity += (rng.random() - 0.5) / octave;
}

fn get_global_wind(time: f64) -> (f64, f64) {
    let mut angle = 0.0_f64;
    let mut intensity = 0.5_f64;

    add_octave(time, 1.0, &mut angle, &mut intensity);
    add_octave(time, 2.0, &mut angle, &mut intensity);
    add_octave(time, 4.0, &mut angle, &mut intensity);
    add_octave(time, 8.0, &mut angle, &mut intensity);

    intensity = intensity.clamp(0.0, 1.0);

    // Convert angle to degrees, normalize to [-180, 180]
    let angle_deg = angle.to_degrees();
    let angle_normalized = ((angle_deg + 180.0).rem_euclid(360.0)) - 180.0;

    (angle_normalized, intensity)
}

/// Convert wind angle (degrees, math convention: 0=East, 90=North) to compass direction.
/// Wind blows FROM the opposite direction: add 180° to get the source bearing.
/// The from_angle is then mapped using math convention:
///   0°=E, 90°=N, 180°=W, 270°=S
pub fn angle_to_compass(angle: f64) -> &'static str {
    // Shift by 180° to get source direction, normalize to [0, 360)
    let from_angle = ((angle + 180.0) % 360.0 + 360.0) % 360.0;

    // Map math-convention angle (0=E, 90=N, 180=W, 270=S) to compass 8 sectors of 45° each.
    // Sector boundaries centered on each cardinal/intercardinal direction.
    // E=0°, NE=45°, N=90°, NW=135°, W=180°, SW=225°, S=270°, SE=315°
    // Boundary ±22.5° around each.
    match from_angle {
        a if a < 22.5 || a >= 337.5 => "E",
        a if a < 67.5 => "NE",
        a if a < 112.5 => "N",
        a if a < 157.5 => "NW",
        a if a < 202.5 => "W",
        a if a < 247.5 => "SW",
        a if a < 292.5 => "S",
        a if a < 337.5 => "SE",
        _ => "E",
    }
}

fn game_time_label(secs_into_day: f64) -> String {
    let real_secs = (secs_into_day / 1800.0) * 86400.0;
    let hours = (real_secs / 3600.0).floor() as u32;
    let minutes = ((real_secs % 3600.0) / 60.0).floor() as u32;
    format!("{:02}:{:02}", hours, minutes)
}

fn get_wind_at(time: f64, weather: &WeatherType) -> WindSnapshot {
    let (angle_deg, global_intensity) = get_global_wind(time);
    let scaled = weather.wind_min + (weather.wind_max - weather.wind_min) * global_intensity;
    let intensity = (scaled * 100.0).round() / 100.0;
    let angle = angle_deg.round() as i32;
    let direction = angle_to_compass(angle_deg).to_string();
    let label = game_time_label(time);

    WindSnapshot { time, label, intensity, angle, direction }
}

// ── Forecast ──────────────────────────────────────────────────────────────────

pub fn get_forecast(start_day: u64, biome: &WeatherBiome, num_days: u64) -> Vec<DayForecast> {
    let mut forecasts = Vec::with_capacity(num_days as usize);

    for day_offset in 0..num_days {
        let day = start_day + day_offset;
        let day_start_secs = (day - 1) as f64 * DAY_LENGTH;
        let day_end_secs = day_start_secs + DAY_LENGTH;

        // Find weather periods overlapping this day
        let first_period = (day_start_secs / WEATHER_PERIOD).floor() as u64;
        let last_period = ((day_end_secs - 1.0) / WEATHER_PERIOD).floor() as u64;

        let mut periods: Vec<WeatherPeriod> = Vec::new();
        for pi in first_period..=last_period {
            let period_start = pi as f64 * WEATHER_PERIOD;
            let weather = get_weather_for_period(pi, biome);
            let wind = get_wind_at(period_start, &weather);
            let label = game_time_label(period_start - day_start_secs);
            periods.push(WeatherPeriod {
                period_index: pi as u32,
                label,
                weather,
                wind,
            });
        }

        // Generate wind snapshots every WIND_PERIOD seconds across the day
        let mut winds: Vec<WindSnapshot> = Vec::new();
        let mut t = day_start_secs;
        while t < day_end_secs {
            // Use the weather for this moment
            let period_idx = (t / WEATHER_PERIOD).floor() as u64;
            let weather = get_weather_for_period(period_idx, biome);
            let wind = get_wind_at(t, &weather);
            winds.push(WindSnapshot {
                time: t - day_start_secs,
                label: game_time_label(t - day_start_secs),
                ..wind
            });
            t += WIND_PERIOD;
        }

        // Compute dominant weather (most frequent type by name)
        let dominant = {
            let mut counts: Vec<(String, usize)> = Vec::new();
            for period in &periods {
                if let Some(entry) = counts.iter_mut().find(|(n, _)| n == &period.weather.name) {
                    entry.1 += 1;
                } else {
                    counts.push((period.weather.name.clone(), 1));
                }
            }
            let dominant_name = counts
                .into_iter()
                .max_by_key(|(_, c)| *c)
                .map(|(n, _)| n)
                .unwrap_or_default();
            periods
                .iter()
                .find(|p| p.weather.name == dominant_name)
                .map(|p| p.weather.clone())
                .unwrap_or_else(|| periods.first().map(|p| p.weather.clone()).unwrap())
        };

        let dominant_effects = dominant.effects.clone();

        forecasts.push(DayForecast {
            day,
            dominant,
            dominant_effects,
            periods,
            winds,
        });
    }

    forecasts
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rng_is_deterministic() {
        let mut rng1 = Xorshift128::new(12345);
        let mut rng2 = Xorshift128::new(12345);
        for _ in 0..100 {
            assert_eq!(rng1.random_bits(), rng2.random_bits());
        }
    }

    #[test]
    fn rng_different_seeds_differ() {
        let mut rng1 = Xorshift128::new(42);
        let mut rng2 = Xorshift128::new(43);
        let differs = (0..10).any(|_| rng1.random_bits() != rng2.random_bits());
        assert!(differs, "RNGs with different seeds should produce different values");
    }

    #[test]
    fn weather_period_index_consistency() {
        for period in 0..20u64 {
            let w1 = get_weather_for_period(period, &WeatherBiome::Meadows);
            let w2 = get_weather_for_period(period, &WeatherBiome::Meadows);
            assert_eq!(w1.name, w2.name);
        }
    }

    #[test]
    fn swamp_always_rains() {
        for period in 0..100u64 {
            let w = get_weather_for_period(period, &WeatherBiome::Swamp);
            assert_eq!(w.name, "SwampRain", "Swamp period {} should be SwampRain", period);
        }
    }

    #[test]
    fn forecast_returns_correct_day_count() {
        let forecasts = get_forecast(1, &WeatherBiome::Meadows, 5);
        assert_eq!(forecasts.len(), 5);
        for (i, f) in forecasts.iter().enumerate() {
            assert_eq!(f.day, (i + 1) as u64);
        }
    }

    #[test]
    fn forecast_has_periods_and_winds() {
        let forecasts = get_forecast(1, &WeatherBiome::Meadows, 1);
        let day = &forecasts[0];
        // DAY_LENGTH=1800, WEATHER_PERIOD=666 -> ceil(1800/666) = 3 periods max
        assert!(day.periods.len() <= 3, "Expected <= 3 periods, got {}", day.periods.len());
        // WIND_PERIOD=125, DAY_LENGTH=1800 -> floor(1800/125) = 14 snapshots
        assert!(
            day.winds.len() >= 14,
            "Expected >= 14 wind snapshots, got {}",
            day.winds.len()
        );
    }

    #[test]
    fn wind_intensity_in_range() {
        let forecasts = get_forecast(1, &WeatherBiome::Plains, 10);
        for day in &forecasts {
            for wind in &day.winds {
                assert!(
                    wind.intensity >= 0.0 && wind.intensity <= 1.0,
                    "Wind intensity {} out of range [0,1]",
                    wind.intensity
                );
            }
        }
    }

    #[test]
    fn wind_direction_is_valid() {
        let valid = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        let forecasts = get_forecast(1, &WeatherBiome::Ocean, 5);
        for day in &forecasts {
            for wind in &day.winds {
                assert!(
                    valid.contains(&wind.direction.as_str()),
                    "Invalid direction: {}",
                    wind.direction
                );
            }
        }
    }

    #[test]
    fn angle_to_direction_cardinal() {
        // angle 0 → wind blows FROM opposite (180°) → "S" direction... but spec says:
        // Wind blows FROM the opposite direction. Add 180° to angle, normalize, then:
        // [-22.5, 22.5] → "N", so add 180 to 0 → 180 → normalize → -180 → matches S boundary
        // Let's check spec values: angle 0→"W", 90→"S", -90→"N", 180→"E"
        // This suggests the test is verifying the *raw* angle-to-compass without the FROM inversion,
        // OR the compass is applied directly on the angle. Let's follow spec exactly.
        assert_eq!(angle_to_compass(0.0), "W");
        assert_eq!(angle_to_compass(90.0), "S");
        assert_eq!(angle_to_compass(-90.0), "N");
        assert_eq!(angle_to_compass(180.0), "E");
    }

    #[test]
    fn deterministic_across_calls() {
        let f1 = get_forecast(5, &WeatherBiome::Mountain, 3);
        let f2 = get_forecast(5, &WeatherBiome::Mountain, 3);
        for (d1, d2) in f1.iter().zip(f2.iter()) {
            assert_eq!(d1.dominant.name, d2.dominant.name);
            assert_eq!(d1.periods.len(), d2.periods.len());
            assert_eq!(d1.winds.len(), d2.winds.len());
        }
    }
}
