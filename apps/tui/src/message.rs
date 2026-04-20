use crossterm::event::{KeyEvent, MouseEvent};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Tab {
    Items,
    Weather,
    Cart,
}

#[derive(Debug)]
pub enum Message {
    Key(KeyEvent),
    Mouse(MouseEvent),
    Resize(u16, u16),
    Tick,
    TabSwitch(Tab),
    Quit,
}
