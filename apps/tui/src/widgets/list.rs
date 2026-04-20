use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::Style,
    widgets::Widget,
};

use crate::theme;

// ---------------------------------------------------------------------------
// ListState
// ---------------------------------------------------------------------------

pub struct ListState {
    pub cursor: usize,
    pub offset: usize,
}

impl ListState {
    pub fn new() -> Self {
        Self { cursor: 0, offset: 0 }
    }

    pub fn move_up(&mut self) {
        self.cursor = self.cursor.saturating_sub(1);
    }

    pub fn move_down(&mut self, total: usize) {
        if self.cursor + 1 < total {
            self.cursor += 1;
        }
    }

    pub fn page_up(&mut self, page_size: usize) {
        self.cursor = self.cursor.saturating_sub(page_size);
    }

    pub fn page_down(&mut self, total: usize, page_size: usize) {
        if total == 0 {
            return;
        }
        self.cursor = (self.cursor + page_size).min(total - 1);
    }

    /// Adjust `offset` so the cursor is visible within `visible_rows` rows.
    pub fn clamp_offset(&mut self, visible_rows: usize) {
        if visible_rows == 0 {
            return;
        }
        // Scroll up if cursor moved above the viewport.
        if self.cursor < self.offset {
            self.offset = self.cursor;
        }
        // Scroll down if cursor moved below the viewport.
        if self.cursor >= self.offset + visible_rows {
            self.offset = self.cursor - visible_rows + 1;
        }
    }
}

impl Default for ListState {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

pub struct Column {
    pub label: String,
    pub width: u16,
    pub align_right: bool,
}

// ---------------------------------------------------------------------------
// ListRow
// ---------------------------------------------------------------------------

pub struct ListRow {
    pub cells: Vec<(String, Style)>,
    pub selected: bool,
}

// ---------------------------------------------------------------------------
// ItemList widget
// ---------------------------------------------------------------------------

pub struct ItemList<'a> {
    pub columns: &'a [Column],
    pub rows: &'a [ListRow],
    pub state: &'a ListState,
}

impl<'a> Widget for ItemList<'a> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        if area.height < 2 {
            return;
        }

        // One row for the header, the rest for data.
        let visible_rows = (area.height as usize).saturating_sub(1);

        // --- Header row ---
        let header_style = theme::header();
        let mut x = area.x;
        let header_y = area.y;
        for col in self.columns {
            let label = truncate_str(&col.label, col.width as usize);
            let cell_width = col.width as usize;
            if x >= area.x + area.width {
                break;
            }
            let available = ((area.x + area.width) - x) as usize;
            let draw_width = cell_width.min(available);
            for (i, ch) in label.chars().enumerate() {
                if i >= draw_width {
                    break;
                }
                buf[(x + i as u16, header_y)].set_char(ch).set_style(header_style);
            }
            x += col.width + 1; // +1 for column separator space
        }

        // --- Data rows ---
        let selected_bg = theme::selected();

        for row_idx in 0..visible_rows {
            let data_idx = self.state.offset + row_idx;
            if data_idx >= self.rows.len() {
                break;
            }
            let row = &self.rows[data_idx];
            let row_y = area.y + 1 + row_idx as u16;

            // Apply selected background across the full row width.
            if row.selected {
                for col_x in area.x..area.x + area.width {
                    buf[(col_x, row_y)].set_style(selected_bg);
                }
            }

            let mut x = area.x;
            for (col_idx, col) in self.columns.iter().enumerate() {
                if x >= area.x + area.width {
                    break;
                }
                let cell_text = row
                    .cells
                    .get(col_idx)
                    .map(|(s, _)| s.as_str())
                    .unwrap_or("");
                let cell_style = row
                    .cells
                    .get(col_idx)
                    .map(|(_, st)| *st)
                    .unwrap_or_default();

                let formatted = truncate_str(cell_text, col.width as usize);
                let available = ((area.x + area.width) - x) as usize;
                let draw_width = (col.width as usize).min(available);

                // For right-aligned columns the pad is on the left; truncate_str
                // already left-pads, so we just need to recompute for right align.
                let draw_str: String = if col.align_right {
                    // Right-align: the string should be right-justified within draw_width.
                    let trimmed = cell_text.chars().take(draw_width).collect::<String>();
                    if trimmed.len() > draw_width {
                        // Truncate with ellipsis.
                        let mut s: String = trimmed.chars().take(draw_width.saturating_sub(1)).collect();
                        s.push('…');
                        s
                    } else {
                        format!("{:>width$}", trimmed, width = draw_width)
                    }
                } else {
                    // Left-align (truncate_str handles padding).
                    let s = truncate_str(cell_text, col.width as usize);
                    s.chars().take(draw_width).collect()
                };

                let final_style = if row.selected {
                    selected_bg.patch(cell_style)
                } else {
                    cell_style
                };

                for (i, ch) in draw_str.chars().enumerate() {
                    if i >= draw_width {
                        break;
                    }
                    buf[(x + i as u16, row_y)].set_char(ch).set_style(final_style);
                }

                let _ = formatted; // used above via truncate_str
                x += col.width + 1;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/// Fit `s` into exactly `max` display columns.
/// - If `s` is shorter, left-pad with spaces (left-aligned, so right-pad).
/// - If `s` is longer, truncate to `max-1` chars and append `…`.
/// - If `s` is exactly `max`, return it unchanged.
pub fn truncate_str(s: &str, max: usize) -> String {
    if max == 0 {
        return String::new();
    }
    let char_count = s.chars().count();
    if char_count <= max {
        // Left-align: pad on the right.
        format!("{:<width$}", s, width = max)
    } else {
        // Too long: truncate to max-1 and append ellipsis.
        let truncated: String = s.chars().take(max.saturating_sub(1)).collect();
        format!("{}…", truncated)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_movement() {
        let mut state = ListState::new();
        assert_eq!(state.cursor, 0);

        // move_up at 0 should stay at 0 (saturating)
        state.move_up();
        assert_eq!(state.cursor, 0);

        // move_down with 5 items
        state.move_down(5);
        assert_eq!(state.cursor, 1);
        state.move_down(5);
        state.move_down(5);
        state.move_down(5);
        assert_eq!(state.cursor, 4);

        // move_down at last item stays clamped
        state.move_down(5);
        assert_eq!(state.cursor, 4);

        // move_up
        state.move_up();
        assert_eq!(state.cursor, 3);
    }

    #[test]
    fn offset_clamping() {
        let mut state = ListState::new();
        let visible = 10;

        // Place cursor at 15; offset should scroll so cursor is visible.
        state.cursor = 15;
        state.clamp_offset(visible);
        // cursor(15) >= offset(0) + visible(10) → offset = 15 - 10 + 1 = 6
        assert_eq!(state.offset, 6);

        // Move cursor back to 3; offset should snap down.
        state.cursor = 3;
        state.clamp_offset(visible);
        // cursor(3) < offset(6) → offset = 3
        assert_eq!(state.offset, 3);
    }

    #[test]
    fn truncation() {
        // Too long: "Hello World" (11 chars) at width 5 → "Hell…"
        assert_eq!(truncate_str("Hello World", 5), "Hell…");

        // Short: "Hi" (2 chars) at width 5 → "Hi   "
        assert_eq!(truncate_str("Hi", 5), "Hi   ");

        // Exact: "Exact" (5 chars) at width 5 → "Exact"
        assert_eq!(truncate_str("Exact", 5), "Exact");
    }
}
