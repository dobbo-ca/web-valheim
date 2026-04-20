use std::sync::Arc;

use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Paragraph, Wrap},
};

use valheim_data::{GameData, model::Biome};

use crate::{
    component::{Action, Component},
    message::Message,
    theme,
    widgets::list::{Column, ItemList, ListRow, ListState},
};

// ---------------------------------------------------------------------------
// ItemsTab
// ---------------------------------------------------------------------------

pub struct ItemsTab {
    data: Arc<GameData>,
    pub filtered: Vec<usize>,
    list_state: ListState,
    columns: Vec<Column>,
}

impl ItemsTab {
    pub fn new(data: Arc<GameData>) -> Self {
        let filtered = (0..data.recipes.len()).collect();
        let columns = vec![
            Column { label: "Name".to_string(), width: 24, align_right: false },
            Column { label: "Station".to_string(), width: 14, align_right: false },
            Column { label: "Lv".to_string(), width: 3, align_right: true },
        ];
        Self {
            data,
            filtered,
            list_state: ListState::new(),
            columns,
        }
    }

    fn total(&self) -> usize {
        self.filtered.len()
    }

    fn selected_recipe_index(&self) -> Option<usize> {
        self.filtered.get(self.list_state.cursor).copied()
    }

    fn render_detail(&self, frame: &mut Frame, area: Rect) {
        let Some(recipe_idx) = self.selected_recipe_index() else {
            let p = Paragraph::new("No recipe selected.")
                .style(Style::default().fg(theme::TEXT_MUTED));
            frame.render_widget(p, area);
            return;
        };
        let recipe = &self.data.recipes[recipe_idx];

        // Helper: look up item name from id
        let item_name = |id: &str| -> String {
            self.data
                .items
                .iter()
                .find(|i| i.id == id)
                .map(|i| i.name.clone())
                .unwrap_or_else(|| id.to_string())
        };

        // Helper: look up station display name
        let station_display = |id: &str| -> String {
            self.data
                .stations
                .iter()
                .find(|s| s.id == id)
                .map(|s| s.name.clone())
                .unwrap_or_else(|| id.to_string())
        };

        let mut lines: Vec<Line> = Vec::new();

        // ── Header ──────────────────────────────────────────────────────────
        let tags_str = if recipe.tags.is_empty() {
            String::new()
        } else {
            recipe.tags.join(" · ")
        };
        lines.push(Line::from(vec![
            Span::styled(
                recipe.name.clone(),
                Style::default().fg(theme::ACCENT).add_modifier(Modifier::BOLD),
            ),
        ]));
        if !tags_str.is_empty() {
            lines.push(Line::from(vec![
                Span::styled(tags_str, Style::default().fg(theme::TEXT_MUTED)),
            ]));
        }
        lines.push(Line::from(""));

        // ── Station / Level / Biome ──────────────────────────────────────────
        let station_name = station_display(&recipe.station);
        let mut info_spans = vec![
            Span::styled("Station: ", Style::default().fg(theme::TEXT_SECONDARY)),
            Span::styled(station_name, Style::default().fg(theme::WARNING)),
            Span::styled(
                format!("  Lv {}", recipe.station_level),
                Style::default().fg(theme::SUCCESS),
            ),
        ];
        if let Some(biome) = &recipe.biome {
            let biome_str = format!("  Biome: {}", biome_name(biome));
            info_spans.push(Span::styled(biome_str, Style::default().fg(theme::SUCCESS)));
        }
        lines.push(Line::from(info_spans));
        lines.push(Line::from(""));

        // ── Food stats ──────────────────────────────────────────────────────
        if let Some(food) = &recipe.food {
            lines.push(Line::from(Span::styled(
                "Food Stats",
                Style::default().fg(theme::PRIMARY).add_modifier(Modifier::BOLD),
            )));
            lines.push(Line::from(vec![
                Span::styled("  HP: ", Style::default().fg(theme::TEXT_SECONDARY)),
                Span::styled(
                    format!("{}", food.hp),
                    Style::default().fg(theme::ERROR),
                ),
                Span::styled("  Stamina: ", Style::default().fg(theme::TEXT_SECONDARY)),
                Span::styled(
                    format!("{}", food.stamina),
                    Style::default().fg(theme::WARNING),
                ),
            ]));
            lines.push(Line::from(vec![
                Span::styled("  Duration: ", Style::default().fg(theme::TEXT_SECONDARY)),
                Span::styled(
                    format!("{}s", food.duration),
                    Style::default().fg(theme::CYAN),
                ),
                Span::styled("  Regen: ", Style::default().fg(theme::TEXT_SECONDARY)),
                Span::styled(
                    format!("{}/tick", food.regen),
                    Style::default().fg(theme::SUCCESS),
                ),
            ]));
            if let Some(eitr) = food.eitr {
                lines.push(Line::from(vec![
                    Span::styled("  Eitr: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", eitr), Style::default().fg(theme::ACCENT)),
                ]));
            }
            lines.push(Line::from(""));
        }

        // ── Weapon stats ────────────────────────────────────────────────────
        if let Some(stats) = &recipe.stats {
            lines.push(Line::from(Span::styled(
                "Weapon Stats",
                Style::default().fg(theme::PRIMARY).add_modifier(Modifier::BOLD),
            )));
            if let Some(dmg) = &stats.damage {
                let mut dmg_spans: Vec<Span> = vec![
                    Span::styled("  Damage: ", Style::default().fg(theme::TEXT_SECONDARY)),
                ];
                let pairs = [
                    ("slash", dmg.slash),
                    ("pierce", dmg.pierce),
                    ("blunt", dmg.blunt),
                    ("fire", dmg.fire),
                    ("frost", dmg.frost),
                    ("lightning", dmg.lightning),
                    ("poison", dmg.poison),
                    ("spirit", dmg.spirit),
                ];
                let mut first = true;
                for (label, val) in &pairs {
                    if let Some(v) = val {
                        if !first {
                            dmg_spans.push(Span::raw("  "));
                        }
                        dmg_spans.push(Span::styled(
                            format!("{}: {}", label, v),
                            Style::default().fg(theme::ERROR),
                        ));
                        first = false;
                    }
                }
                lines.push(Line::from(dmg_spans));
            }
            if let Some(kb) = stats.knockback {
                lines.push(Line::from(vec![
                    Span::styled("  Knockback: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", kb), Style::default().fg(theme::WARNING)),
                ]));
            }
            if let Some(bs) = stats.backstab {
                lines.push(Line::from(vec![
                    Span::styled("  Backstab: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}x", bs), Style::default().fg(theme::ACCENT)),
                ]));
            }
            if let Some(dur) = stats.durability {
                lines.push(Line::from(vec![
                    Span::styled("  Durability: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", dur), Style::default().fg(theme::SUCCESS)),
                ]));
            }
            if let Some(w) = stats.weight {
                lines.push(Line::from(vec![
                    Span::styled("  Weight: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", w), Style::default().fg(theme::TEXT)),
                ]));
            }
            if let Some(armor) = stats.armor {
                lines.push(Line::from(vec![
                    Span::styled("  Armor: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", armor), Style::default().fg(theme::PRIMARY)),
                ]));
            }
            if let Some(block) = stats.block {
                lines.push(Line::from(vec![
                    Span::styled("  Block: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", block), Style::default().fg(theme::PRIMARY)),
                ]));
            }
            if let Some(mp) = stats.movement_penalty {
                lines.push(Line::from(vec![
                    Span::styled("  Movement Penalty: ", Style::default().fg(theme::TEXT_SECONDARY)),
                    Span::styled(format!("{}", mp), Style::default().fg(theme::ERROR)),
                ]));
            }
            lines.push(Line::from(""));
        }

        // ── Ingredients ─────────────────────────────────────────────────────
        if !recipe.ingredients.is_empty() {
            lines.push(Line::from(Span::styled(
                "Ingredients",
                Style::default().fg(theme::PRIMARY).add_modifier(Modifier::BOLD),
            )));
            for ing in &recipe.ingredients {
                let name = item_name(&ing.item_id);
                lines.push(Line::from(vec![
                    Span::styled("  • ", Style::default().fg(theme::TEXT_MUTED)),
                    Span::styled(
                        format!("{} × {}", ing.qty, name),
                        Style::default().fg(theme::TEXT),
                    ),
                ]));
            }
            lines.push(Line::from(""));
        }

        // ── Secondary step ──────────────────────────────────────────────────
        if let Some(step) = &recipe.secondary_step {
            let step_station = station_display(&step.station);
            lines.push(Line::from(vec![
                Span::styled("Next: ", Style::default().fg(theme::TEXT_SECONDARY)),
                Span::styled(step_station, Style::default().fg(theme::WARNING)),
                Span::styled(" — ", Style::default().fg(theme::TEXT_MUTED)),
                Span::styled(&step.description, Style::default().fg(theme::TEXT)),
            ]));
            lines.push(Line::from(""));
        }

        // ── Upgrades ────────────────────────────────────────────────────────
        if !recipe.upgrades.is_empty() {
            lines.push(Line::from(Span::styled(
                "Upgrades",
                Style::default().fg(theme::PRIMARY).add_modifier(Modifier::BOLD),
            )));
            for upgrade in &recipe.upgrades {
                let stars = "★".repeat(upgrade.quality as usize);
                lines.push(Line::from(vec![
                    Span::styled(
                        format!("  {} ", stars),
                        Style::default().fg(theme::WARNING),
                    ),
                    Span::styled(
                        format!("(Station Lv {})", upgrade.station_level),
                        Style::default().fg(theme::SUCCESS),
                    ),
                ]));
                for ing in &upgrade.ingredients {
                    let name = item_name(&ing.item_id);
                    lines.push(Line::from(vec![
                        Span::styled("    • ", Style::default().fg(theme::TEXT_MUTED)),
                        Span::styled(
                            format!("{} × {}", ing.qty, name),
                            Style::default().fg(theme::TEXT),
                        ),
                    ]));
                }
            }
        }

        let paragraph = Paragraph::new(lines)
            .block(Block::default())
            .wrap(Wrap { trim: false });
        frame.render_widget(paragraph, area);
    }
}

impl Component for ItemsTab {
    fn update(&mut self, msg: &Message) -> Action {
        use crossterm::event::KeyCode;

        if let Message::Key(key) = msg {
            match key.code {
                KeyCode::Char('j') | KeyCode::Down => {
                    self.list_state.move_down(self.total());
                    return Action::None;
                }
                KeyCode::Char('k') | KeyCode::Up => {
                    self.list_state.move_up();
                    return Action::None;
                }
                KeyCode::Char('G') | KeyCode::End => {
                    let total = self.total();
                    if total > 0 {
                        self.list_state.cursor = total - 1;
                    }
                    return Action::None;
                }
                KeyCode::Char('g') | KeyCode::Home => {
                    self.list_state.cursor = 0;
                    return Action::None;
                }
                KeyCode::PageDown => {
                    // Use a reasonable default page size; will be refined at render time
                    self.list_state.page_down(self.total(), 20);
                    return Action::None;
                }
                KeyCode::PageUp => {
                    self.list_state.page_up(20);
                    return Action::None;
                }
                _ => {}
            }
        }
        Action::None
    }

    fn view(&self, frame: &mut Frame, area: Rect) {
        // Split horizontally: 42% list, 58% detail
        let panes = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(42),
                Constraint::Percentage(58),
            ])
            .split(area);

        let list_area = panes[0];
        let detail_area = panes[1];

        // Build list rows
        let rows: Vec<ListRow> = self
            .filtered
            .iter()
            .enumerate()
            .map(|(row_idx, &recipe_idx)| {
                let recipe = &self.data.recipes[recipe_idx];
                let station_name = self
                    .data
                    .stations
                    .iter()
                    .find(|s| s.id == recipe.station)
                    .map(|s| s.name.as_str())
                    .unwrap_or(&recipe.station);

                ListRow {
                    cells: vec![
                        (recipe.name.clone(), Style::default().fg(theme::TEXT)),
                        (station_name.to_string(), Style::default().fg(theme::WARNING)),
                        (
                            recipe.station_level.to_string(),
                            Style::default().fg(theme::SUCCESS),
                        ),
                    ],
                    selected: row_idx == self.list_state.cursor,
                }
            })
            .collect();

        // Clamp offset using a local copy so we don't need &mut self
        let visible = list_area.height.saturating_sub(1) as usize;
        let mut render_state = ListState {
            cursor: self.list_state.cursor,
            offset: self.list_state.offset,
        };
        render_state.clamp_offset(visible);

        let list_widget = ItemList {
            columns: &self.columns,
            rows: &rows,
            state: &render_state,
        };
        frame.render_widget(list_widget, list_area);

        // Detail pane
        self.render_detail(frame, detail_area);
    }

    fn key_hints(&self) -> Vec<(&str, &str)> {
        vec![
            ("j/k", "navigate"),
            ("g/G", "top/bottom"),
            ("PgDn/PgUp", "page"),
        ]
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn biome_name(biome: &Biome) -> &'static str {
    match biome {
        Biome::Meadows => "Meadows",
        Biome::BlackForest => "Black Forest",
        Biome::Swamp => "Swamp",
        Biome::Mountain => "Mountain",
        Biome::Plains => "Plains",
        Biome::Mistlands => "Mistlands",
        Biome::Ashlands => "Ashlands",
    }
}
