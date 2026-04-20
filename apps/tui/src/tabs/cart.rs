use std::collections::BTreeMap;
use std::sync::Arc;

use crossterm::event::KeyCode;
use ratatui::{
    Frame,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
};
use valheim_data::GameData;

use crate::{
    component::{Action, Component},
    message::Message,
    persistence::CartStore,
    theme,
};

// ── Input mode ────────────────────────────────────────────────────────────────

enum InputMode {
    Normal,
    NewList,
    RenameList,
}

// ── CartTab ───────────────────────────────────────────────────────────────────

pub struct CartTab {
    data: Arc<GameData>,
    pub store: CartStore,
    cursor: usize,
    input_mode: InputMode,
    input_buffer: String,
}

impl CartTab {
    pub fn new(data: Arc<GameData>, store: CartStore) -> Self {
        Self {
            data,
            store,
            cursor: 0,
            input_mode: InputMode::Normal,
            input_buffer: String::new(),
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn items_len(&self) -> usize {
        self.store
            .active_list()
            .map(|l| l.items.len())
            .unwrap_or(0)
    }

    /// Aggregate all ingredients in the active cart list.
    fn aggregate_ingredients(&self) -> BTreeMap<String, u32> {
        let mut totals: BTreeMap<String, u32> = BTreeMap::new();
        let Some(cart) = self.store.active_list() else {
            return totals;
        };
        for (recipe_id, &cart_qty) in &cart.items {
            let Some(recipe) = self.data.recipes.iter().find(|r| &r.id == recipe_id) else {
                continue;
            };
            for ing in &recipe.ingredients {
                let entry = totals.entry(ing.item_id.clone()).or_insert(0);
                *entry += ing.qty * cart_qty;
            }
        }
        totals
    }

    // ── Rendering helpers ─────────────────────────────────────────────────────

    fn render_list_selector(&self, frame: &mut Frame, area: Rect) {
        let mut spans: Vec<Span> = Vec::new();

        for (i, list) in self.store.lists.iter().enumerate() {
            let is_active = i == self.store.active;
            let style = if is_active {
                Style::default()
                    .fg(theme::BG)
                    .bg(theme::ACCENT)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(theme::TEXT_MUTED)
            };
            spans.push(Span::styled(format!(" {} ", list.name), style));
            spans.push(Span::raw(" "));
        }

        // Append input field or "+ New [n]"
        match &self.input_mode {
            InputMode::NewList => {
                spans.push(Span::styled(" New: ", Style::default().fg(theme::TEXT_SECONDARY)));
                spans.push(Span::styled(
                    format!("{}▌", self.input_buffer),
                    Style::default().fg(theme::ACCENT),
                ));
            }
            InputMode::RenameList => {
                spans.push(Span::styled(
                    " Rename: ",
                    Style::default().fg(theme::TEXT_SECONDARY),
                ));
                spans.push(Span::styled(
                    format!("{}▌", self.input_buffer),
                    Style::default().fg(theme::WARNING),
                ));
            }
            InputMode::Normal => {
                spans.push(Span::styled(
                    " + New [n] ",
                    Style::default().fg(theme::TEXT_MUTED),
                ));
            }
        }

        let line = Line::from(spans);
        let paragraph = Paragraph::new(line);
        frame.render_widget(paragraph, area);
    }

    fn render_cart_items(&self, frame: &mut Frame, area: Rect) {
        let title_style = Style::default()
            .fg(theme::WARNING)
            .add_modifier(Modifier::BOLD);

        let Some(list) = self.store.active_list() else {
            let lines = vec![
                Line::from(Span::styled("Items (no list)", title_style)),
                Line::from(""),
                Line::from(Span::styled(
                    "Press [n] to create a list.",
                    Style::default().fg(theme::TEXT_MUTED),
                )),
            ];
            frame.render_widget(Paragraph::new(lines), area);
            return;
        };

        let header = format!("Items in '{}'", list.name);
        let mut lines: Vec<Line> = vec![
            Line::from(Span::styled(header, title_style)),
            Line::from(""),
        ];

        if list.items.is_empty() {
            lines.push(Line::from(Span::styled(
                "Cart is empty. Add items from the Items tab.",
                Style::default().fg(theme::TEXT_MUTED),
            )));
        } else {
            for (row_idx, (recipe_id, &qty)) in list.items.iter().enumerate() {
                // Look up a friendly name
                let name = self
                    .data
                    .recipes
                    .iter()
                    .find(|r| &r.id == recipe_id)
                    .map(|r| r.name.as_str())
                    .unwrap_or(recipe_id.as_str());

                let selected = row_idx == self.cursor;
                let row_style = if selected {
                    theme::selected()
                } else {
                    Style::default().fg(theme::TEXT)
                };
                lines.push(Line::from(Span::styled(
                    format!(" {} ×{} ", name, qty),
                    row_style,
                )));
            }
        }

        frame.render_widget(Paragraph::new(lines), area);
    }

    fn render_grocery(&self, frame: &mut Frame, area: Rect) {
        let title_style = Style::default()
            .fg(theme::WARNING)
            .add_modifier(Modifier::BOLD);

        let mut lines: Vec<Line> = vec![
            Line::from(Span::styled(
                "\u{1f6d2} Total Materials Needed",
                title_style,
            )),
            Line::from(""),
        ];

        let totals = self.aggregate_ingredients();

        if totals.is_empty() {
            lines.push(Line::from(Span::styled(
                "No ingredients yet.",
                Style::default().fg(theme::TEXT_MUTED),
            )));
        } else {
            // Sort by total qty descending
            let mut sorted: Vec<(String, u32)> = totals.into_iter().collect();
            sorted.sort_by(|a, b| b.1.cmp(&a.1));

            for (item_id, qty) in sorted {
                let name = self
                    .data
                    .items
                    .iter()
                    .find(|i| i.id == item_id)
                    .map(|i| i.name.clone())
                    .unwrap_or_else(|| item_id.clone());

                let color = theme::quantity_color(qty);
                lines.push(Line::from(vec![
                    Span::styled(
                        format!(" {:>4}× ", qty),
                        Style::default().fg(color),
                    ),
                    Span::styled(name, Style::default().fg(theme::TEXT)),
                ]));
            }
        }

        frame.render_widget(Paragraph::new(lines), area);
    }
}

// ── Component impl ────────────────────────────────────────────────────────────

impl Component for CartTab {
    fn update(&mut self, msg: &Message) -> Action {
        if let Message::Key(key) = msg {
            match &self.input_mode {
                InputMode::NewList | InputMode::RenameList => {
                    match key.code {
                        KeyCode::Enter => {
                            let name = self.input_buffer.trim().to_string();
                            if !name.is_empty() {
                                match self.input_mode {
                                    InputMode::NewList => self.store.create_list(&name),
                                    InputMode::RenameList => self.store.rename_active(&name),
                                    InputMode::Normal => {}
                                }
                            }
                            self.input_buffer.clear();
                            self.input_mode = InputMode::Normal;
                            self.cursor = 0;
                        }
                        KeyCode::Esc => {
                            self.input_buffer.clear();
                            self.input_mode = InputMode::Normal;
                        }
                        KeyCode::Char(c) => {
                            self.input_buffer.push(c);
                        }
                        KeyCode::Backspace => {
                            self.input_buffer.pop();
                        }
                        _ => {}
                    }
                    return Action::None;
                }
                InputMode::Normal => {}
            }

            // Normal mode key handling
            match key.code {
                KeyCode::Char('n') => {
                    self.input_buffer.clear();
                    self.input_mode = InputMode::NewList;
                }
                KeyCode::Char('r') => {
                    self.input_buffer = self
                        .store
                        .active_list()
                        .map(|l| l.name.clone())
                        .unwrap_or_default();
                    self.input_mode = InputMode::RenameList;
                }
                KeyCode::Char('d') => {
                    let items_len = self.items_len();
                    if items_len > 0 {
                        if let Some(list) = self.store.active_list() {
                            let key_to_remove = list
                                .items
                                .keys()
                                .nth(self.cursor)
                                .cloned();
                            if let Some(k) = key_to_remove {
                                if let Some(list_mut) = self.store.active_list_mut() {
                                    list_mut.remove(&k);
                                }
                                self.store.save_active();
                                if self.cursor >= self.items_len() && self.cursor > 0 {
                                    self.cursor -= 1;
                                }
                            }
                        }
                    }
                }
                KeyCode::Char('j') | KeyCode::Down => {
                    let len = self.items_len();
                    if len > 0 && self.cursor + 1 < len {
                        self.cursor += 1;
                    }
                }
                KeyCode::Char('k') | KeyCode::Up => {
                    if self.cursor > 0 {
                        self.cursor -= 1;
                    }
                }
                KeyCode::Char(']') => {
                    let len = self.store.lists.len();
                    if len > 0 {
                        self.store.active = (self.store.active + 1) % len;
                        self.cursor = 0;
                    }
                }
                KeyCode::Char('[') => {
                    let len = self.store.lists.len();
                    if len > 0 {
                        self.store.active = self
                            .store
                            .active
                            .checked_sub(1)
                            .unwrap_or(len - 1);
                        self.cursor = 0;
                    }
                }
                KeyCode::Char('+') | KeyCode::Char('=') => {
                    let cursor = self.cursor;
                    if let Some(list) = self.store.active_list() {
                        let key_opt = list.items.keys().nth(cursor).cloned();
                        if let Some(k) = key_opt {
                            let new_qty = list.items[&k] + 1;
                            if let Some(list_mut) = self.store.active_list_mut() {
                                list_mut.set_qty(&k, new_qty);
                            }
                            self.store.save_active();
                        }
                    }
                }
                KeyCode::Char('-') => {
                    let cursor = self.cursor;
                    if let Some(list) = self.store.active_list() {
                        let key_opt = list.items.keys().nth(cursor).cloned();
                        if let Some(k) = key_opt {
                            let current_qty = list.items[&k];
                            let new_qty = current_qty.saturating_sub(1);
                            if let Some(list_mut) = self.store.active_list_mut() {
                                list_mut.set_qty(&k, new_qty);
                            }
                            self.store.save_active();
                            if new_qty == 0 {
                                if self.cursor >= self.items_len() && self.cursor > 0 {
                                    self.cursor -= 1;
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        Action::None
    }

    fn view(&self, frame: &mut Frame, area: Rect) {
        let rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1), // list selector bar
                Constraint::Length(1), // spacer
                Constraint::Min(0),    // content
            ])
            .split(area);

        self.render_list_selector(frame, rows[0]);

        // Spacer row: render nothing (ratatui will just leave it blank)
        let _ = rows[1];

        // Content: 50/50 horizontal split
        let content_panes = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
            .split(rows[2]);

        self.render_cart_items(frame, content_panes[0]);
        self.render_grocery(frame, content_panes[1]);
    }

    fn key_hints(&self) -> Vec<(&str, &str)> {
        match self.input_mode {
            InputMode::NewList | InputMode::RenameList => {
                vec![("Enter", "confirm"), ("Esc", "cancel")]
            }
            InputMode::Normal => vec![
                ("n", "new list"),
                ("r", "rename"),
                ("d", "delete item"),
                ("j/k", "navigate"),
                ("[/]", "prev/next list"),
                ("+/-", "qty"),
            ],
        }
    }
}
