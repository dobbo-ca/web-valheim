use nucleo_matcher::pattern::{AtomKind, CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};

use crate::model::Recipe;

// ── Types ─────────────────────────────────────────────────────────────────────

pub struct SearchIndex {
    entries: Vec<SearchEntry>,
}

struct SearchEntry {
    id: String,
    text: String,
}

// ── Impl ──────────────────────────────────────────────────────────────────────

impl SearchIndex {
    pub fn new(entries: Vec<(String, String)>) -> Self {
        Self {
            entries: entries
                .into_iter()
                .map(|(id, text)| SearchEntry { id, text })
                .collect(),
        }
    }

    pub fn from_recipes(recipes: &[Recipe]) -> Self {
        let entries = recipes
            .iter()
            .map(|r| {
                let text = if r.tags.is_empty() {
                    r.name.clone()
                } else {
                    format!("{} {}", r.name, r.tags.join(" "))
                };
                (r.id.clone(), text)
            })
            .collect();
        Self::new(entries)
    }

    pub fn search(&self, query: &str) -> Vec<(String, u32)> {
        if query.is_empty() {
            return Vec::new();
        }

        let mut matcher = Matcher::new(Config::DEFAULT);
        let pattern = Pattern::new(
            query,
            CaseMatching::Ignore,
            Normalization::Smart,
            AtomKind::Fuzzy,
        );

        let mut results: Vec<(String, u32)> = self
            .entries
            .iter()
            .filter_map(|entry| {
                let mut buf = Vec::new();
                let haystack = Utf32Str::new(&entry.text, &mut buf);
                pattern.score(haystack, &mut matcher).map(|score| (entry.id.clone(), score))
            })
            .collect();

        results.sort_by(|a, b| b.1.cmp(&a.1));
        results
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_index() -> SearchIndex {
        SearchIndex::new(vec![
            ("iron-sword".to_string(), "Iron Sword melee sword 1h tier-2".to_string()),
            ("iron-mace".to_string(), "Iron Mace melee mace 1h tier-2".to_string()),
            ("queens-jam".to_string(), "Queens Jam food cooking tier-1".to_string()),
            ("serpent-stew".to_string(), "Serpent Stew food cooking tier-3".to_string()),
        ])
    }

    #[test]
    fn exact_match() {
        let index = test_index();
        let results = index.search("Iron Sword");
        assert!(!results.is_empty(), "should find iron-sword");
        assert_eq!(results[0].0, "iron-sword", "iron-sword should be first");
    }

    #[test]
    fn fuzzy_match() {
        let index = test_index();
        let results = index.search("irn swd");
        assert!(!results.is_empty(), "should find iron-sword via fuzzy");
        assert_eq!(results[0].0, "iron-sword", "iron-sword should be first");
    }

    #[test]
    fn search_by_tags() {
        let index = test_index();
        let results = index.search("food");
        let ids: Vec<&str> = results.iter().map(|(id, _)| id.as_str()).collect();
        assert!(ids.contains(&"queens-jam"), "should find queens-jam");
        assert!(ids.contains(&"serpent-stew"), "should find serpent-stew");
    }

    #[test]
    fn empty_query_returns_nothing() {
        let index = test_index();
        let results = index.search("");
        assert!(results.is_empty(), "empty query should return nothing");
    }
}
