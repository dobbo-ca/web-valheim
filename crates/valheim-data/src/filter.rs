use crate::model::{Biome, ItemCategory, Recipe};

// ── Filter struct ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct Filter {
    pub category: Option<ItemCategory>,
    pub biome: Option<Biome>,
    pub station: Option<String>,
    pub station_level_min: Option<u32>,
    pub station_level_max: Option<u32>,
    pub tags: Vec<String>,
}

// ── apply_filter ───────────────────────────────────────────────────────────────

pub fn apply_filter<'a>(recipes: &'a [Recipe], filter: &Filter) -> Vec<&'a Recipe> {
    recipes
        .iter()
        .filter(|recipe| {
            // station filter
            if let Some(ref station) = filter.station {
                if &recipe.station != station {
                    return false;
                }
            }

            // biome filter
            if let Some(ref biome) = filter.biome {
                match &recipe.biome {
                    Some(recipe_biome) if recipe_biome == biome => {}
                    _ => return false,
                }
            }

            // station_level_min filter
            if let Some(min) = filter.station_level_min {
                if recipe.station_level < min {
                    return false;
                }
            }

            // station_level_max filter
            if let Some(max) = filter.station_level_max {
                if recipe.station_level > max {
                    return false;
                }
            }

            // tags filter — keep recipe if it has ANY of the filter tags
            if !filter.tags.is_empty() {
                let has_any = filter.tags.iter().any(|t| recipe.tags.contains(t));
                if !has_any {
                    return false;
                }
            }

            true
        })
        .collect()
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{FoodStats, IngredientRef, RecipeType};

    fn test_recipes() -> Vec<Recipe> {
        let iron_sword = Recipe {
            id: "iron-sword".to_string(),
            name: "Iron Sword".to_string(),
            recipe_type: RecipeType::Crafting,
            station: "forge".to_string(),
            station_level: 2,
            repair_level: None,
            ingredients: vec![IngredientRef {
                item_id: "iron".to_string(),
                qty: 20,
            }],
            yields: None,
            skill: None,
            tags: vec![
                "sword".to_string(),
                "one-handed".to_string(),
                "tier-3".to_string(),
            ],
            notes: None,
            food: None,
            secondary_step: None,
            stats: None,
            upgrades: vec![],
            biome: Some(Biome::Swamp),
        };

        let queens_jam = Recipe {
            id: "queens-jam".to_string(),
            name: "Queens Jam".to_string(),
            recipe_type: RecipeType::Cooking,
            station: "cauldron".to_string(),
            station_level: 1,
            repair_level: None,
            ingredients: vec![
                IngredientRef {
                    item_id: "raspberries".to_string(),
                    qty: 8,
                },
                IngredientRef {
                    item_id: "blueberries".to_string(),
                    qty: 6,
                },
            ],
            yields: None,
            skill: None,
            tags: vec![
                "food".to_string(),
                "sustain".to_string(),
                "tier-2".to_string(),
            ],
            notes: None,
            food: Some(FoodStats {
                hp: 32.0,
                stamina: 44.0,
                duration: 1800.0,
                regen: 2.0,
                eitr: None,
            }),
            secondary_step: None,
            stats: None,
            upgrades: vec![],
            biome: Some(Biome::Meadows),
        };

        vec![iron_sword, queens_jam]
    }

    #[test]
    fn filter_by_station() {
        let recipes = test_recipes();
        let filter = Filter {
            station: Some("forge".to_string()),
            ..Default::default()
        };
        let result = apply_filter(&recipes, &filter);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "iron-sword");
    }

    #[test]
    fn filter_by_biome() {
        let recipes = test_recipes();
        let filter = Filter {
            biome: Some(Biome::Swamp),
            ..Default::default()
        };
        let result = apply_filter(&recipes, &filter);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "iron-sword");
    }

    #[test]
    fn filter_by_tag() {
        let recipes = test_recipes();
        let filter = Filter {
            tags: vec!["food".to_string()],
            ..Default::default()
        };
        let result = apply_filter(&recipes, &filter);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "queens-jam");
    }

    #[test]
    fn filter_by_station_level_range() {
        let recipes = test_recipes();
        let filter = Filter {
            station_level_min: Some(2),
            station_level_max: Some(3),
            ..Default::default()
        };
        let result = apply_filter(&recipes, &filter);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "iron-sword");
    }

    #[test]
    fn empty_filter_returns_all() {
        let recipes = test_recipes();
        let filter = Filter::default();
        let result = apply_filter(&recipes, &filter);
        assert_eq!(result.len(), 2);
    }
}
