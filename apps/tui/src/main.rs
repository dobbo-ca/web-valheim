mod component;
mod event;
mod message;
mod tabs;
mod theme;
mod widgets;

use component::{Action, Component};
use crossterm::{
    event::KeyCode,
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode},
};
use message::{Message, Tab};
use ratatui::{
    Frame,
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::Style,
    text::Span,
    widgets::{Block, Paragraph, Tabs},
    Terminal,
};
use std::sync::Arc;
use std::time::Duration;

struct App {
    active_tab: Tab,
    should_quit: bool,
    items_tab: tabs::items::ItemsTab,
}

impl App {
    fn new(data: Arc<valheim_data::GameData>) -> Self {
        Self {
            active_tab: Tab::Items,
            should_quit: false,
            items_tab: tabs::items::ItemsTab::new(data),
        }
    }

    fn tab_index(&self) -> usize {
        match self.active_tab {
            Tab::Items => 0,
            Tab::Weather => 1,
            Tab::Cart => 2,
        }
    }

    fn next_tab(&self) -> Tab {
        match self.active_tab {
            Tab::Items => Tab::Weather,
            Tab::Weather => Tab::Cart,
            Tab::Cart => Tab::Items,
        }
    }

    fn prev_tab(&self) -> Tab {
        match self.active_tab {
            Tab::Items => Tab::Cart,
            Tab::Weather => Tab::Items,
            Tab::Cart => Tab::Weather,
        }
    }
}

impl Component for App {
    fn update(&mut self, msg: &Message) -> Action {
        // Forward key events to the active tab first.
        if let Message::Key(key) = msg {
            // Handle global quit / tab-switch keys before delegating.
            let is_quit = matches!(key.code, KeyCode::Char('q'))
                || (key.code == KeyCode::Char('c')
                    && key
                        .modifiers
                        .contains(crossterm::event::KeyModifiers::CONTROL));
            let is_tab_switch = matches!(
                key.code,
                KeyCode::Tab
                    | KeyCode::BackTab
                    | KeyCode::Char('1')
                    | KeyCode::Char('2')
                    | KeyCode::Char('3')
            );

            if is_quit {
                return Action::Quit;
            }

            if !is_tab_switch {
                // Let the active tab handle it; if it returns None we fall through.
                match self.active_tab {
                    Tab::Items => {
                        let action = self.items_tab.update(msg);
                        if !matches!(action, Action::None) {
                            return action;
                        }
                    }
                    _ => {}
                }
            }

            // Tab-switching (or key not consumed by tab)
            match key.code {
                KeyCode::Char('1') => {
                    self.active_tab = Tab::Items;
                    return Action::None;
                }
                KeyCode::Char('2') => {
                    self.active_tab = Tab::Weather;
                    return Action::None;
                }
                KeyCode::Char('3') => {
                    self.active_tab = Tab::Cart;
                    return Action::None;
                }
                KeyCode::Tab => {
                    self.active_tab = self.next_tab();
                    return Action::None;
                }
                KeyCode::BackTab => {
                    self.active_tab = self.prev_tab();
                    return Action::None;
                }
                _ => {}
            }
            return Action::None;
        }

        match msg {
            Message::Quit => Action::Quit,
            _ => Action::None,
        }
    }

    fn view(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(1),
                Constraint::Min(0),
                Constraint::Length(1),
            ])
            .split(area);

        // Tab bar
        let tab_titles = vec![
            Span::raw(" Items [1] "),
            Span::raw(" Weather [2] "),
            Span::raw(" Cart [3] "),
        ];
        let tabs = Tabs::new(tab_titles)
            .select(self.tab_index())
            .style(Style::default().fg(theme::TEXT_MUTED))
            .highlight_style(theme::tab_active());
        frame.render_widget(tabs, chunks[0]);

        // Content area
        match self.active_tab {
            Tab::Items => {
                self.items_tab.view(frame, chunks[1]);
            }
            Tab::Weather => {
                let content = Paragraph::new("Weather tab — coming soon")
                    .style(Style::default().fg(theme::TEXT_SECONDARY))
                    .block(Block::default());
                frame.render_widget(content, chunks[1]);
            }
            Tab::Cart => {
                let content = Paragraph::new("Cart tab — coming soon")
                    .style(Style::default().fg(theme::TEXT_SECONDARY))
                    .block(Block::default());
                frame.render_widget(content, chunks[1]);
            }
        }

        // Status bar / key hints
        let hints = self
            .key_hints()
            .iter()
            .map(|(key, desc)| format!(" {key} {desc} "))
            .collect::<Vec<_>>()
            .join("  ");
        let status = Paragraph::new(hints).style(Style::default().fg(theme::TEXT_MUTED));
        frame.render_widget(status, chunks[2]);
    }

    fn key_hints(&self) -> Vec<(&str, &str)> {
        let mut hints = vec![
            ("q", "quit"),
            ("Tab", "next tab"),
            ("1-3", "switch tab"),
        ];
        if self.active_tab == Tab::Items {
            hints.extend(self.items_tab.key_hints());
        }
        hints
    }
}

fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;

    enable_raw_mode()?;
    let mut stdout = std::io::stdout();
    execute!(stdout, EnterAlternateScreen)?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let data_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../src/data");
    let data = Arc::new(valheim_data::load_all(&data_dir)?);

    let mut app = App::new(data);

    loop {
        terminal.draw(|frame| {
            let area = frame.area();
            app.view(frame, area);
        })?;

        if let Some(msg) = event::poll_event(Duration::from_millis(50)) {
            match app.update(&msg) {
                Action::Quit => break,
                Action::Send(inner_msg) => {
                    if let Action::Quit = app.update(&inner_msg) {
                        break;
                    }
                }
                _ => {}
            }
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    Ok(())
}
