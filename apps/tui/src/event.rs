use crate::message::Message;
use crossterm::event::{self, Event, KeyEventKind};
use std::time::Duration;

pub fn poll_event(timeout: Duration) -> Option<Message> {
    if event::poll(timeout).ok()? {
        match event::read().ok()? {
            Event::Key(key) if key.kind == KeyEventKind::Press => Some(Message::Key(key)),
            Event::Mouse(mouse) => Some(Message::Mouse(mouse)),
            Event::Resize(w, h) => Some(Message::Resize(w, h)),
            _ => None,
        }
    } else {
        Some(Message::Tick)
    }
}
