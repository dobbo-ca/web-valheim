use ratatui::style::{Color, Modifier, Style};

// Tokyo Night Dark palette
pub const PRIMARY: Color = Color::Rgb(0x7a, 0xa2, 0xf7); // blue
pub const ACCENT: Color = Color::Rgb(0xbb, 0x9a, 0xf7); // purple
pub const SUCCESS: Color = Color::Rgb(0x73, 0xda, 0xca); // teal
pub const WARNING: Color = Color::Rgb(0xe0, 0xaf, 0x68); // yellow
pub const ERROR: Color = Color::Rgb(0xf7, 0x76, 0x8e); // red
#[allow(dead_code)]
pub const GREEN: Color = Color::Rgb(0x9e, 0xce, 0x6a); // green
#[allow(dead_code)]
pub const CYAN: Color = Color::Rgb(0x7d, 0xcf, 0xff); // cyan

pub const TEXT: Color = Color::Rgb(0xc0, 0xca, 0xf5); // primary text
pub const TEXT_SECONDARY: Color = Color::Rgb(0xa9, 0xb1, 0xd6); // secondary text
pub const TEXT_MUTED: Color = Color::Rgb(0x56, 0x5f, 0x89); // muted text

pub const BG: Color = Color::Rgb(0x1a, 0x1b, 0x26); // background
pub const SURFACE: Color = Color::Rgb(0x29, 0x2e, 0x42); // surface/selection
#[allow(dead_code)]
pub const BORDER: Color = Color::Rgb(0x39, 0x3e, 0x56); // borders

#[allow(dead_code)]
pub const HIGHLIGHT_BG: Color = Color::Rgb(0x33, 0x39, 0x5a); // selected row bg

pub fn header() -> Style {
    Style::default().fg(PRIMARY).add_modifier(Modifier::BOLD)
}

pub fn selected() -> Style {
    Style::default().fg(TEXT).bg(SURFACE)
}

#[allow(dead_code)]
pub fn muted() -> Style {
    Style::default().fg(TEXT_MUTED)
}

pub fn tab_active() -> Style {
    Style::default()
        .fg(BG)
        .bg(PRIMARY)
        .add_modifier(Modifier::BOLD)
}

#[allow(dead_code)]
pub fn tab_inactive() -> Style {
    Style::default().fg(TEXT_MUTED)
}

#[allow(dead_code)]
pub fn status_bar() -> Style {
    Style::default().fg(TEXT_MUTED)
}

/// Color-code a quantity for the cart grocery list.
#[allow(dead_code)]
pub fn quantity_color(qty: u32) -> Color {
    if qty >= 20 {
        ERROR
    } else if qty >= 5 {
        WARNING
    } else {
        TEXT_SECONDARY
    }
}
