use std::collections::HashSet;
use std::path::Path;

use thiserror::Error;

use crate::model::{GameData, Item, Recipe, RecipeType, Station};

// ── Error ──────────────────────────────────────────────────────────────────────

#[derive(Debug, Error)]
pub enum LoadError {
    #[error("failed to read {path}: {source}")]
    Io { path: String, source: std::io::Error },
    #[error("failed to parse {path}: {source}")]
    Yaml { path: String, source: serde_yaml::Error },
    #[error("validation errors:\n{0}")]
    Validation(String),
}

// ── Helpers ────────────────────────────────────────────────────────────────────

fn read_yaml<T: serde::de::DeserializeOwned>(path: &Path) -> Result<T, LoadError> {
    let contents = std::fs::read_to_string(path).map_err(|e| LoadError::Io {
        path: path.display().to_string(),
        source: e,
    })?;
    serde_yaml::from_str(&contents).map_err(|e| LoadError::Yaml {
        path: path.display().to_string(),
        source: e,
    })
}

// ── Public loader functions ────────────────────────────────────────────────────

pub fn load_items(data_dir: &Path) -> Result<Vec<Item>, LoadError> {
    read_yaml(&data_dir.join("items.yaml"))
}

pub fn load_stations(data_dir: &Path) -> Result<Vec<Station>, LoadError> {
    read_yaml(&data_dir.join("stations.yaml"))
}

pub fn load_recipes(data_dir: &Path) -> Result<Vec<Recipe>, LoadError> {
    let recipes_dir = data_dir.join("recipes");
    let mut crafting: Vec<Recipe> = read_yaml(&recipes_dir.join("crafting.yaml"))?;
    let cooking: Vec<Recipe> = read_yaml(&recipes_dir.join("cooking.yaml"))?;
    crafting.extend(cooking);
    Ok(crafting)
}

// ── Building recipe generation ─────────────────────────────────────────────────

pub fn generate_building_recipes(stations: &[Station]) -> Vec<Recipe> {
    let mut recipes = Vec::new();
    for station in stations {
        for upgrade in &station.upgrades {
            let level = upgrade.level;
            let id = format!("upgrade-{}-{}", station.id, level);
            let name = upgrade
                .name
                .clone()
                .unwrap_or_else(|| format!("{} Level {}", station.name, level));
            let recipe = Recipe {
                id,
                name,
                recipe_type: RecipeType::Building,
                station: station.id.clone(),
                station_level: level.saturating_sub(1),
                repair_level: None,
                ingredients: upgrade.requires.clone(),
                yields: None,
                skill: None,
                tags: vec!["station-upgrade".to_string()],
                notes: None,
                food: None,
                secondary_step: None,
                stats: None,
                upgrades: vec![],
                biome: None,
            };
            recipes.push(recipe);
        }
    }
    recipes
}

// ── Cross-reference validation ─────────────────────────────────────────────────

pub fn validate_cross_references(
    items: &[Item],
    stations: &[Station],
    recipes: &[Recipe],
) -> Result<(), LoadError> {
    let item_ids: HashSet<&str> = items.iter().map(|i| i.id.as_str()).collect();
    let station_map: std::collections::HashMap<&str, u32> = stations
        .iter()
        .map(|s| (s.id.as_str(), s.max_level))
        .collect();

    let mut errors: Vec<String> = Vec::new();

    for recipe in recipes {
        // Check 1: recipe.station must exist (skip for Building recipes)
        if recipe.recipe_type != RecipeType::Building {
            if !station_map.contains_key(recipe.station.as_str()) {
                errors.push(format!(
                    "recipe '{}': unknown station '{}'",
                    recipe.id, recipe.station
                ));
            } else {
                // Check 2: station_level <= station.max_level
                let max = station_map[recipe.station.as_str()];
                if recipe.station_level > max {
                    errors.push(format!(
                        "recipe '{}': station_level {} exceeds max_level {} for station '{}'",
                        recipe.id, recipe.station_level, max, recipe.station
                    ));
                }
            }
        }

        // Check 3: ingredient item_ids must exist
        for ing in &recipe.ingredients {
            if !item_ids.contains(ing.item_id.as_str()) {
                errors.push(format!(
                    "recipe '{}': unknown ingredient item_id '{}'",
                    recipe.id, ing.item_id
                ));
            }
        }

        // Check 4: yields item_id must exist
        if let Some(yields) = &recipe.yields {
            if !item_ids.contains(yields.item_id.as_str()) {
                errors.push(format!(
                    "recipe '{}': unknown yields item_id '{}'",
                    recipe.id, yields.item_id
                ));
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(LoadError::Validation(errors.join("\n")))
    }
}

// ── load_all ───────────────────────────────────────────────────────────────────

pub fn load_all(data_dir: &Path) -> Result<GameData, LoadError> {
    let items = load_items(data_dir)?;
    let stations = load_stations(data_dir)?;
    let mut recipes = load_recipes(data_dir)?;
    let building_recipes = generate_building_recipes(&stations);
    recipes.extend(building_recipes);
    validate_cross_references(&items, &stations, &recipes)?;
    Ok(GameData {
        items,
        stations,
        recipes,
    })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn data_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../src/data")
    }

    #[test]
    fn load_items_from_yaml() {
        let items = load_items(&data_dir()).expect("should load items");
        assert!(!items.is_empty(), "items should be non-empty");
        assert!(
            items.iter().any(|i| i.id == "iron"),
            "items should contain 'iron'"
        );
    }

    #[test]
    fn load_stations_from_yaml() {
        let stations = load_stations(&data_dir()).expect("should load stations");
        let forge = stations
            .iter()
            .find(|s| s.id == "forge")
            .expect("forge station should exist");
        assert_eq!(forge.max_level, 7, "forge should have max_level 7");
    }

    #[test]
    fn load_recipes_from_yaml() {
        let recipes = load_recipes(&data_dir()).expect("should load recipes");
        assert!(
            recipes.iter().any(|r| r.recipe_type == RecipeType::Crafting),
            "should contain crafting recipes"
        );
        assert!(
            recipes.iter().any(|r| r.recipe_type == RecipeType::Cooking),
            "should contain cooking recipes"
        );
    }

    #[test]
    fn load_all_validates_cross_references() {
        load_all(&data_dir()).expect("load_all should succeed with valid cross-references");
    }

    #[test]
    fn load_all_generates_building_recipes() {
        let data = load_all(&data_dir()).expect("should load all data");
        assert!(
            data.recipes
                .iter()
                .any(|r| r.recipe_type == RecipeType::Building),
            "should contain building recipes"
        );
    }
}
