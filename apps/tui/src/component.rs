use crate::message::Message;
use ratatui::Frame;
use ratatui::layout::Rect;

pub enum Action {
    None,
    Send(Message),
    Batch(Vec<Action>),
    Quit,
}

pub trait Component {
    fn update(&mut self, msg: &Message) -> Action;
    fn view(&self, frame: &mut Frame, area: Rect);
    fn key_hints(&self) -> Vec<(&str, &str)> {
        Vec::new()
    }
}
