use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

// ── CartList ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartList {
    pub name: String,
    pub items: BTreeMap<String, u32>, // recipe_id → quantity
}

impl CartList {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            items: BTreeMap::new(),
        }
    }

    /// Add `qty` to the existing quantity for `item_id` (creates entry if absent).
    pub fn add(&mut self, item_id: &str, qty: u32) {
        let entry = self.items.entry(item_id.to_string()).or_insert(0);
        *entry += qty;
    }

    /// Remove `item_id` entirely from the list.
    pub fn remove(&mut self, item_id: &str) {
        self.items.remove(item_id);
    }

    /// Set the quantity for `item_id`; removes the entry if qty is 0.
    pub fn set_qty(&mut self, item_id: &str, qty: u32) {
        if qty == 0 {
            self.items.remove(item_id);
        } else {
            self.items.insert(item_id.to_string(), qty);
        }
    }
}

// ── CartStore ─────────────────────────────────────────────────────────────────

pub struct CartStore {
    pub dir: PathBuf,
    pub lists: Vec<CartList>,
    pub active: usize,
}

impl CartStore {
    /// Load all `.yaml` cart lists from `dir`, sorted by name.
    /// Creates the directory if it does not exist.
    pub fn load(dir: &Path) -> Self {
        std::fs::create_dir_all(dir).ok();

        let mut lists: Vec<CartList> = std::fs::read_dir(dir)
            .into_iter()
            .flatten()
            .flatten()
            .filter(|entry| {
                entry
                    .path()
                    .extension()
                    .map(|e| e == "yaml")
                    .unwrap_or(false)
            })
            .filter_map(|entry| {
                let content = std::fs::read_to_string(entry.path()).ok()?;
                serde_yaml::from_str::<CartList>(&content).ok()
            })
            .collect();

        lists.sort_by(|a, b| a.name.cmp(&b.name));

        Self {
            dir: dir.to_path_buf(),
            lists,
            active: 0,
        }
    }

    pub fn active_list(&self) -> Option<&CartList> {
        self.lists.get(self.active)
    }

    pub fn active_list_mut(&mut self) -> Option<&mut CartList> {
        self.lists.get_mut(self.active)
    }

    /// Create a new list, make it active, and persist it.
    pub fn create_list(&mut self, name: &str) {
        let list = CartList::new(name);
        self.lists.push(list);
        self.lists.sort_by(|a, b| a.name.cmp(&b.name));
        // Find the index of the newly created list by name.
        self.active = self
            .lists
            .iter()
            .position(|l| l.name == name)
            .unwrap_or(0);
        self.save_active();
    }

    /// Rename the active list. Removes the old file and saves under the new slug.
    pub fn rename_active(&mut self, new_name: &str) {
        if let Some(list) = self.active_list() {
            let old_path = self.dir.join(format!("{}.yaml", slug(&list.name)));
            std::fs::remove_file(&old_path).ok();
        }
        if let Some(list) = self.active_list_mut() {
            list.name = new_name.to_string();
        }
        self.save_active();
    }

    /// Delete the active list: remove the file and the entry from the vec.
    pub fn delete_active(&mut self) {
        if let Some(list) = self.active_list() {
            let path = self.dir.join(format!("{}.yaml", slug(&list.name)));
            std::fs::remove_file(&path).ok();
        }
        if !self.lists.is_empty() {
            self.lists.remove(self.active);
        }
        if self.active >= self.lists.len() && !self.lists.is_empty() {
            self.active = self.lists.len() - 1;
        }
        if self.lists.is_empty() {
            self.active = 0;
        }
    }

    /// Persist the active list to `{slug(name)}.yaml`.
    pub fn save_active(&self) {
        if let Some(list) = self.active_list() {
            let filename = format!("{}.yaml", slug(&list.name));
            let path = self.dir.join(filename);
            if let Ok(content) = serde_yaml::to_string(list) {
                std::fs::write(path, content).ok();
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Convert a name to a filesystem-safe slug: lowercase, non-alphanumeric → '-'.
pub fn slug(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cart_list_operations() {
        let mut list = CartList::new("Test");

        // add a new item
        list.add("iron-sword", 2);
        assert_eq!(list.items["iron-sword"], 2);

        // add again — should accumulate
        list.add("iron-sword", 3);
        assert_eq!(list.items["iron-sword"], 5);

        // set_qty to a positive value
        list.set_qty("iron-sword", 10);
        assert_eq!(list.items["iron-sword"], 10);

        // set_qty to 0 should remove the entry
        list.set_qty("iron-sword", 0);
        assert!(!list.items.contains_key("iron-sword"));
    }

    #[test]
    fn cart_store_persistence() {
        let dir = std::env::temp_dir().join(format!("valheim-tui-test-{}", std::process::id()));
        let dir_path = dir.as_path();
        // Clean up any leftover from a previous run.
        std::fs::remove_dir_all(dir_path).ok();

        // Create a store, add a list, populate it, and save.
        let mut store = CartStore::load(dir_path);
        store.create_list("Shopping");
        if let Some(list) = store.active_list_mut() {
            list.add("wood", 10);
            list.add("stone", 5);
        }
        store.save_active();

        // Reload and verify.
        let store2 = CartStore::load(dir_path);
        assert_eq!(store2.lists.len(), 1);
        let list = &store2.lists[0];
        assert_eq!(list.name, "Shopping");
        assert_eq!(list.items["wood"], 10);
        assert_eq!(list.items["stone"], 5);
    }
}
