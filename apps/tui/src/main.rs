mod component;
mod event;
mod message;
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
use std::time::Duration;

struct App {
    active_tab: Tab,
    should_quit: bool,
}

impl App {
    fn new() -> Self {
        Self {
            active_tab: Tab::Items,
            should_quit: false,
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
        match msg {
            Message::Key(key) => match key.code {
                KeyCode::Char('q') => Action::Quit,
                KeyCode::Char('c')
                    if key
                        .modifiers
                        .contains(crossterm::event::KeyModifiers::CONTROL) =>
                {
                    Action::Quit
                }
                KeyCode::Char('1') => {
                    self.active_tab = Tab::Items;
                    Action::None
                }
                KeyCode::Char('2') => {
                    self.active_tab = Tab::Weather;
                    Action::None
                }
                KeyCode::Char('3') => {
                    self.active_tab = Tab::Cart;
                    Action::None
                }
                KeyCode::Tab => {
                    self.active_tab = self.next_tab();
                    Action::None
                }
                KeyCode::BackTab => {
                    self.active_tab = self.prev_tab();
                    Action::None
                }
                _ => Action::None,
            },
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
        let content_label = match self.active_tab {
            Tab::Items => "Items tab — coming soon",
            Tab::Weather => "Weather tab — coming soon",
            Tab::Cart => "Cart tab — coming soon",
        };
        let content = Paragraph::new(content_label)
            .style(Style::default().fg(theme::TEXT_SECONDARY))
            .block(Block::default());
        frame.render_widget(content, chunks[1]);

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
        vec![
            ("q", "quit"),
            ("Tab", "next tab"),
            ("1-3", "switch tab"),
        ]
    }
}

fn main() -> color_eyre::Result<()> {
    color_eyre::install()?;

    enable_raw_mode()?;
    let mut stdout = std::io::stdout();
    execute!(stdout, EnterAlternateScreen)?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();

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
