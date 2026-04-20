use crossterm::event::KeyCode;
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
};

use valheim_data::weather::{self, DayForecast, WeatherBiome, WeatherEffect};

use crate::{
    component::{Action, Component},
    message::Message,
    theme,
};

// ── WeatherTab ────────────────────────────────────────────────────────────────

pub struct WeatherTab {
    current_day: u64,
    forecast_range: u64,
    selected_biome: usize,
    selected_day_offset: usize,
    biomes: Vec<WeatherBiome>,
    forecasts: Vec<Vec<DayForecast>>, // per biome
    day_input_active: bool,
    day_input_buffer: String,
}

impl WeatherTab {
    pub fn new() -> Self {
        let biomes = WeatherBiome::all().to_vec();
        let mut tab = Self {
            current_day: 1,
            forecast_range: 5,
            selected_biome: 0,
            selected_day_offset: 0,
            biomes,
            forecasts: Vec::new(),
            day_input_active: false,
            day_input_buffer: String::new(),
        };
        tab.refresh_forecasts();
        tab
    }

    fn refresh_forecasts(&mut self) {
        self.forecasts = self
            .biomes
            .iter()
            .map(|biome| weather::get_forecast(self.current_day, biome, self.forecast_range))
            .collect();
    }

    fn render_controls(&self, frame: &mut Frame, area: Rect) {
        let text = if self.day_input_active {
            format!(
                "Day: {}█  [Enter] confirm  [Esc] cancel",
                self.day_input_buffer
            )
        } else {
            format!(
                "Day: {}  │  [g] go to day  [h/l] ±1  [H/L] ±10",
                self.current_day
            )
        };
        let p = Paragraph::new(text).style(Style::default().fg(theme::TEXT_SECONDARY));
        frame.render_widget(p, area);
    }

    fn render_grid(&self, frame: &mut Frame, area: Rect) {
        let num_days = self.forecast_range as usize;
        // Build lines for the grid
        let mut lines: Vec<Line> = Vec::new();

        // Header row
        let mut header_spans: Vec<Span> = Vec::new();
        // Empty biome name cell (12 chars)
        header_spans.push(Span::styled(
            format!("{:12}", ""),
            Style::default().fg(theme::TEXT_MUTED),
        ));
        for day_offset in 0..num_days {
            let day_num = self.current_day + day_offset as u64;
            let label = format!(" Day {:>4} ", day_num);
            let label = truncate_pad(&label, 12);
            let style = if day_offset == self.selected_day_offset {
                Style::default()
                    .fg(theme::TEXT)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme::TEXT_MUTED)
            };
            header_spans.push(Span::styled(label, style));
        }
        lines.push(Line::from(header_spans));

        // Per-biome rows
        for (biome_idx, biome) in self.biomes.iter().enumerate() {
            let biome_forecasts = self.forecasts.get(biome_idx).map(|v| v.as_slice()).unwrap_or(&[]);

            let biome_style = if biome_idx == self.selected_biome {
                Style::default()
                    .fg(theme::SUCCESS)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme::SUCCESS)
            };

            let mut row_spans: Vec<Span> = Vec::new();
            let biome_label = truncate_pad(biome.display_name(), 12);
            row_spans.push(Span::styled(biome_label, biome_style));

            for day_offset in 0..num_days {
                let selected = biome_idx == self.selected_biome && day_offset == self.selected_day_offset;
                let cell_text = if let Some(forecast) = biome_forecasts.get(day_offset) {
                    let icon = weather_icon(&forecast.dominant.name);
                    let label = &forecast.dominant.label;
                    format!("{} {}", icon, label)
                } else {
                    String::from("—")
                };
                let cell = truncate_pad(&cell_text, 12);
                let style = if selected {
                    Style::default()
                        .fg(theme::TEXT)
                        .bg(theme::HIGHLIGHT_BG)
                        .add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(theme::TEXT_SECONDARY)
                };
                row_spans.push(Span::styled(cell, style));
            }

            lines.push(Line::from(row_spans));
        }

        let p = Paragraph::new(lines);
        frame.render_widget(p, area);
    }

    fn render_detail(&self, frame: &mut Frame, area: Rect) {
        let biome = &self.biomes[self.selected_biome];
        let forecast = self
            .forecasts
            .get(self.selected_biome)
            .and_then(|v| v.get(self.selected_day_offset));

        let Some(forecast) = forecast else {
            let p = Paragraph::new("No forecast data.").style(Style::default().fg(theme::TEXT_MUTED));
            frame.render_widget(p, area);
            return;
        };

        let mut lines: Vec<Line> = Vec::new();

        // Header: Day N — Biome | Dominant: icon label
        let day_biome = format!("Day {} — {}", forecast.day, biome.display_name());
        let dom_icon = weather_icon(&forecast.dominant.name);
        let dom_label = &forecast.dominant.label;
        let dominant_str = format!("  Dominant: {} {}", dom_icon, dom_label);
        lines.push(Line::from(vec![
            Span::styled(
                day_biome,
                Style::default()
                    .fg(theme::ACCENT)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(dominant_str, Style::default().fg(theme::WARNING)),
        ]));

        // Weather Periods section header
        lines.push(Line::from(Span::styled(
            "☁ Weather Periods",
            Style::default()
                .fg(theme::WARNING)
                .add_modifier(Modifier::BOLD),
        )));

        // Per period
        for period in &forecast.periods {
            let period_start = &period.label;
            // Compute end label: use next period's label or "End"
            let period_idx_in_day = forecast
                .periods
                .iter()
                .position(|p| p.period_index == period.period_index)
                .unwrap_or(0);
            let end_label = forecast
                .periods
                .get(period_idx_in_day + 1)
                .map(|p| p.label.clone())
                .unwrap_or_else(|| "24:00".to_string());

            let icon = weather_icon(&period.weather.name);
            let label = &period.weather.label;
            let effects_str = if period.weather.effects.is_empty() {
                String::new()
            } else {
                let ef: Vec<&str> = period
                    .weather
                    .effects
                    .iter()
                    .map(|e| effect_label(e))
                    .collect();
                format!(" [{}]", ef.join(", "))
            };
            lines.push(Line::from(vec![
                Span::styled("  ", Style::default()),
                Span::styled(
                    format!("{} – {}", period_start, end_label),
                    Style::default().fg(theme::TEXT_MUTED),
                ),
                Span::styled("  ", Style::default()),
                Span::styled(
                    format!("{} {}", icon, label),
                    Style::default().fg(theme::TEXT),
                ),
                Span::styled(effects_str, Style::default().fg(theme::WARNING)),
            ]));
        }

        // Wind section header
        lines.push(Line::from(Span::styled(
            "💨 Wind",
            Style::default()
                .fg(theme::WARNING)
                .add_modifier(Modifier::BOLD),
        )));

        // Horizontal wind strip: time row, arrow row, intensity row
        // Use wind snapshots from the forecast
        let winds = &forecast.winds;
        if !winds.is_empty() {
            // Find period transition times for highlighting
            let period_times: Vec<String> = forecast.periods.iter().map(|p| p.label.clone()).collect();

            // Build three rows
            let mut time_spans: Vec<Span> = Vec::new();
            let mut arrow_spans: Vec<Span> = Vec::new();
            let mut pct_spans: Vec<Span> = Vec::new();

            for wind in winds {
                let time_label = right_pad(&wind.label, 7);
                let arrow = compass_to_arrow(&wind.direction);
                let arrow_cell = right_pad(arrow, 7);
                let pct = format!("{:.0}%", wind.intensity * 100.0);
                let pct_cell = right_pad(&pct, 7);

                let is_transition = period_times.contains(&wind.label);
                let time_style = if is_transition {
                    Style::default().fg(theme::PRIMARY)
                } else {
                    Style::default().fg(theme::TEXT_MUTED)
                };

                time_spans.push(Span::styled(time_label, time_style));
                arrow_spans.push(Span::styled(arrow_cell, Style::default().fg(theme::TEXT)));
                pct_spans.push(Span::styled(pct_cell, Style::default().fg(theme::TEXT_SECONDARY)));
            }

            lines.push(Line::from(time_spans));
            lines.push(Line::from(arrow_spans));
            lines.push(Line::from(pct_spans));
        }

        let p = Paragraph::new(lines);
        frame.render_widget(p, area);
    }
}

impl Component for WeatherTab {
    fn update(&mut self, msg: &Message) -> Action {
        if let Message::Key(key) = msg {
            if self.day_input_active {
                match key.code {
                    KeyCode::Enter => {
                        if let Ok(day) = self.day_input_buffer.parse::<u64>() {
                            self.current_day = day.max(1);
                            self.selected_day_offset = 0;
                            self.refresh_forecasts();
                        }
                        self.day_input_active = false;
                        self.day_input_buffer.clear();
                        return Action::None;
                    }
                    KeyCode::Esc => {
                        self.day_input_active = false;
                        self.day_input_buffer.clear();
                        return Action::None;
                    }
                    KeyCode::Char(c) if c.is_ascii_digit() => {
                        self.day_input_buffer.push(c);
                        return Action::None;
                    }
                    KeyCode::Backspace => {
                        self.day_input_buffer.pop();
                        return Action::None;
                    }
                    _ => return Action::None,
                }
            }

            // Normal mode
            match key.code {
                KeyCode::Char('g') => {
                    self.day_input_active = true;
                    self.day_input_buffer.clear();
                    return Action::None;
                }
                KeyCode::Char('j') | KeyCode::Down => {
                    let max = self.biomes.len().saturating_sub(1);
                    if self.selected_biome < max {
                        self.selected_biome += 1;
                    }
                    return Action::None;
                }
                KeyCode::Char('k') | KeyCode::Up => {
                    self.selected_biome = self.selected_biome.saturating_sub(1);
                    return Action::None;
                }
                KeyCode::Char('l') | KeyCode::Right => {
                    let max_offset = self.forecast_range as usize - 1;
                    if self.selected_day_offset < max_offset {
                        self.selected_day_offset += 1;
                    } else {
                        self.current_day += 1;
                        self.refresh_forecasts();
                    }
                    return Action::None;
                }
                KeyCode::Char('h') | KeyCode::Left => {
                    if self.selected_day_offset > 0 {
                        self.selected_day_offset -= 1;
                    } else if self.current_day > 1 {
                        self.current_day -= 1;
                        self.refresh_forecasts();
                    }
                    return Action::None;
                }
                KeyCode::Char('L') => {
                    self.current_day += 10;
                    self.refresh_forecasts();
                    return Action::None;
                }
                KeyCode::Char('H') => {
                    self.current_day = self.current_day.saturating_sub(10).max(1);
                    self.refresh_forecasts();
                    return Action::None;
                }
                _ => {}
            }
        }
        Action::None
    }

    fn view(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // controls bar
                Constraint::Length(1), // spacer
                Constraint::Min(10),   // forecast grid
                Constraint::Length(1), // spacer
                Constraint::Min(5),    // detail
            ])
            .split(area);

        self.render_controls(frame, chunks[0]);
        // chunks[1] is spacer — leave blank
        self.render_grid(frame, chunks[2]);
        // chunks[3] is spacer — leave blank
        self.render_detail(frame, chunks[4]);
    }

    fn key_hints(&self) -> Vec<(&str, &str)> {
        if self.day_input_active {
            vec![("Enter", "confirm"), ("Esc", "cancel")]
        } else {
            vec![
                ("g", "go to day"),
                ("j/k", "biome"),
                ("h/l", "±1 day"),
                ("H/L", "±10 days"),
            ]
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn weather_icon(name: &str) -> &'static str {
    match name {
        "Clear" | "Heath clear" | "Twilight Clear" => "☀️",
        "Rain" | "LightRain" | "SwampRain" => "🌧",
        "ThunderStorm" => "⛈",
        "Misty" | "DeepForest Mist" => "🌫",
        "Snow" | "Twilight Snow" => "❄️",
        "SnowStorm" | "Twilight Snowstorm" => "🌨",
        "Ashrain" => "🌋",
        "Darklands dark" => "🌑",
        _ => "?",
    }
}

fn compass_to_arrow(direction: &str) -> &'static str {
    match direction {
        "N" => "↓",
        "NE" => "↙",
        "E" => "←",
        "SE" => "↖",
        "S" => "↑",
        "SW" => "↗",
        "W" => "→",
        "NW" => "↘",
        _ => "?",
    }
}

fn effect_label(effect: &WeatherEffect) -> &'static str {
    match effect {
        WeatherEffect::Wet => "Wet",
        WeatherEffect::Freezing => "Freezing",
        WeatherEffect::LowVisibility => "Low Vis",
        WeatherEffect::ShelterNeeded => "Shelter",
    }
}

/// Truncate or right-pad a string to exactly `width` chars.
fn truncate_pad(s: &str, width: usize) -> String {
    let char_count = s.chars().count();
    if char_count >= width {
        s.chars().take(width).collect()
    } else {
        let mut out = s.to_string();
        for _ in char_count..width {
            out.push(' ');
        }
        out
    }
}

/// Right-pad a string to at least `width` chars (no truncation).
fn right_pad(s: &str, width: usize) -> String {
    let char_count = s.chars().count();
    if char_count >= width {
        s.to_string()
    } else {
        let mut out = s.to_string();
        for _ in char_count..width {
            out.push(' ');
        }
        out
    }
}
