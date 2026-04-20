use std::collections::HashMap;

use crate::model::{Biome, IngredientRef, Item, Recipe};

// ── Biome ranking ──────────────────────────────────────────────────────────────

pub fn biome_rank(biome: &Biome) -> u8 {
    match biome {
        Biome::Meadows => 0,
        Biome::BlackForest => 1,
        Biome::Swamp => 2,
        Biome::Mountain => 3,
        Biome::Plains => 4,
        Biome::Mistlands => 5,
        Biome::Ashlands => 6,
    }
}

// ── Biome computation ──────────────────────────────────────────────────────────

pub fn compute_biome_from_ingredients(
    ingredients: &[IngredientRef],
    items: &HashMap<String, &Item>,
) -> Option<Biome> {
    ingredients
        .iter()
        .filter_map(|ing| {
            items
                .get(&ing.item_id)
                .and_then(|item| item.biome.as_ref())
        })
        .max_by_key(|b| biome_rank(b))
        .cloned()
}

// ── Biome assignment ───────────────────────────────────────────────────────────

pub fn assign_biomes(recipes: &mut [Recipe], items: &[Item]) {
    let item_map: HashMap<String, &Item> = items.iter().map(|i| (i.id.clone(), i)).collect();

    for recipe in recipes.iter_mut() {
        if recipe.biome.is_none() {
            recipe.biome = compute_biome_from_ingredients(&recipe.ingredients, &item_map);
        }
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{ItemCategory, RecipeType};

    fn make_item(id: &str, biome: Option<Biome>) -> Item {
        Item {
            id: id.to_string(),
            name: id.to_string(),
            category: ItemCategory::Material,
            stack_size: None,
            biome,
        }
    }

    fn make_recipe(id: &str, ingredient_ids: &[&str]) -> Recipe {
        Recipe {
            id: id.to_string(),
            name: id.to_string(),
            recipe_type: RecipeType::Crafting,
            station: "workbench".to_string(),
            station_level: 1,
            repair_level: None,
            ingredients: ingredient_ids
                .iter()
                .map(|item_id| IngredientRef {
                    item_id: item_id.to_string(),
                    qty: 1,
                })
                .collect(),
            yields: None,
            skill: None,
            tags: vec![],
            notes: None,
            food: None,
            secondary_step: None,
            stats: None,
            upgrades: vec![],
            biome: None,
        }
    }

    #[test]
    fn biome_ordering() {
        assert!(biome_rank(&Biome::Meadows) < biome_rank(&Biome::Swamp));
        assert!(biome_rank(&Biome::Swamp) < biome_rank(&Biome::Plains));
        assert!(biome_rank(&Biome::Plains) < biome_rank(&Biome::Ashlands));
    }

    #[test]
    fn highest_biome_from_ingredients() {
        let meadows_item = make_item("wood", Some(Biome::Meadows));
        let swamp_item = make_item("iron-scrap", Some(Biome::Swamp));
        let items: HashMap<String, &Item> = [
            ("wood".to_string(), &meadows_item),
            ("iron-scrap".to_string(), &swamp_item),
        ]
        .into_iter()
        .collect();

        let ingredients = vec![
            IngredientRef { item_id: "wood".to_string(), qty: 2 },
            IngredientRef { item_id: "iron-scrap".to_string(), qty: 1 },
        ];

        let result = compute_biome_from_ingredients(&ingredients, &items);
        assert_eq!(result, Some(Biome::Swamp));
    }

    #[test]
    fn no_biome_when_no_items_have_biome() {
        let stone = make_item("stone", None);
        let wood = make_item("wood", None);
        let items: HashMap<String, &Item> = [
            ("stone".to_string(), &stone),
            ("wood".to_string(), &wood),
        ]
        .into_iter()
        .collect();

        let ingredients = vec![
            IngredientRef { item_id: "stone".to_string(), qty: 2 },
            IngredientRef { item_id: "wood".to_string(), qty: 3 },
        ];

        let result = compute_biome_from_ingredients(&ingredients, &items);
        assert_eq!(result, None);
    }

    #[test]
    fn assign_biomes_skips_recipes_with_existing_biome() {
        let item = make_item("iron-scrap", Some(Biome::Swamp));
        let items = vec![item];

        let mut recipe = make_recipe("iron-sword", &["iron-scrap"]);
        recipe.biome = Some(Biome::Meadows); // pre-assigned

        assign_biomes(&mut [recipe.clone()], &items);
        // biome should remain Meadows since it was already set
        assert_eq!(recipe.biome, Some(Biome::Meadows));
    }

    #[test]
    fn assign_biomes_sets_biome_from_ingredients() {
        let swamp_item = make_item("iron-scrap", Some(Biome::Swamp));
        let items = vec![swamp_item];

        let mut recipes = vec![make_recipe("iron-sword", &["iron-scrap"])];
        assign_biomes(&mut recipes, &items);
        assert_eq!(recipes[0].biome, Some(Biome::Swamp));
    }
}
