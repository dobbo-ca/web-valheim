use serde::Deserialize;

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ItemCategory {
    Material,
    Ingredient,
    Food,
    Weapon,
    Armor,
    Tool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Biome {
    Meadows,
    BlackForest,
    Swamp,
    Mountain,
    Plains,
    Mistlands,
    Ashlands,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecipeType {
    Crafting,
    Cooking,
    Building,
}

// ── Structs ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id: String,
    pub name: String,
    pub category: ItemCategory,
    pub stack_size: Option<u32>,
    pub biome: Option<Biome>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IngredientRef {
    pub item_id: String,
    pub qty: u32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StationUpgrade {
    pub level: u32,
    pub name: Option<String>,
    pub requires: Vec<IngredientRef>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Station {
    pub id: String,
    pub name: String,
    pub max_level: u32,
    #[serde(default)]
    pub upgrades: Vec<StationUpgrade>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DamageMap {
    pub slash: Option<f64>,
    pub pierce: Option<f64>,
    pub blunt: Option<f64>,
    pub fire: Option<f64>,
    pub frost: Option<f64>,
    pub lightning: Option<f64>,
    pub poison: Option<f64>,
    pub spirit: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeaponStats {
    pub damage: Option<DamageMap>,
    pub knockback: Option<f64>,
    pub backstab: Option<f64>,
    pub durability: Option<f64>,
    pub weight: Option<f64>,
    pub armor: Option<f64>,
    pub block: Option<f64>,
    pub movement_penalty: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FoodStats {
    pub hp: f64,
    pub stamina: f64,
    pub duration: f64,
    #[serde(alias = "healPerTick")]
    pub regen: f64,
    pub eitr: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecondaryStep {
    pub station: String,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemUpgrade {
    pub quality: u32,
    pub station_level: u32,
    pub repair_level: u32,
    pub ingredients: Vec<IngredientRef>,
    pub stats: Option<WeaponStats>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Recipe {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub recipe_type: RecipeType,
    pub station: String,
    pub station_level: u32,
    pub repair_level: Option<u32>,
    #[serde(default)]
    pub ingredients: Vec<IngredientRef>,
    pub yields: Option<IngredientRef>,
    pub skill: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub food: Option<FoodStats>,
    pub secondary_step: Option<SecondaryStep>,
    pub stats: Option<WeaponStats>,
    #[serde(default)]
    pub upgrades: Vec<ItemUpgrade>,
    pub biome: Option<Biome>,
}

// ── GameData ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct GameData {
    pub items: Vec<Item>,
    pub stations: Vec<Station>,
    pub recipes: Vec<Recipe>,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_item() {
        let yaml = "{ id: iron, name: Iron, category: material }";
        let item: Item = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(item.id, "iron");
        assert_eq!(item.name, "Iron");
        assert_eq!(item.category, ItemCategory::Material);
        assert_eq!(item.stack_size, None);
        assert_eq!(item.biome, None);
    }

    #[test]
    fn deserialize_item_with_optional_fields() {
        let yaml = "{ id: wood, name: Wood, category: material, stackSize: 50, biome: meadows }";
        let item: Item = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(item.id, "wood");
        assert_eq!(item.stack_size, Some(50));
        assert_eq!(item.biome, Some(Biome::Meadows));
    }

    #[test]
    fn deserialize_station() {
        let yaml = r#"
id: workbench
name: Workbench
maxLevel: 5
upgrades:
  - level: 2
    name: Chopping Block
    requires:
      - { itemId: wood, qty: 10 }
      - { itemId: flint, qty: 10 }
"#;
        let station: Station = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(station.id, "workbench");
        assert_eq!(station.max_level, 5);
        assert_eq!(station.upgrades.len(), 1);
        let upgrade = &station.upgrades[0];
        assert_eq!(upgrade.level, 2);
        assert_eq!(upgrade.name, Some("Chopping Block".to_string()));
        assert_eq!(upgrade.requires.len(), 2);
        assert_eq!(upgrade.requires[0].item_id, "wood");
        assert_eq!(upgrade.requires[0].qty, 10);
    }

    #[test]
    fn deserialize_crafting_recipe() {
        let yaml = r#"
id: club
name: Club
type: crafting
station: workbench
stationLevel: 1
repairLevel: 1
ingredients:
  - { itemId: wood, qty: 6 }
yields: { itemId: club, qty: 1 }
tags: [melee, mace, 1h, tier-0]
stats:
  damage: { blunt: 12 }
  knockback: 20
  backstab: 3
  durability: 100
  weight: 0.5
"#;
        let recipe: Recipe = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(recipe.id, "club");
        assert_eq!(recipe.recipe_type, RecipeType::Crafting);
        assert_eq!(recipe.station, "workbench");
        assert_eq!(recipe.station_level, 1);
        let stats = recipe.stats.as_ref().expect("stats should be present");
        let damage = stats.damage.as_ref().expect("damage should be present");
        assert_eq!(damage.blunt, Some(12.0));
        assert_eq!(stats.knockback, Some(20.0));
        assert_eq!(stats.backstab, Some(3.0));
    }

    #[test]
    fn deserialize_cooking_recipe() {
        let yaml = r#"
id: queens-jam
name: Queens Jam
type: cooking
station: cauldron
stationLevel: 1
ingredients:
  - { itemId: raspberries, qty: 8 }
  - { itemId: blueberries, qty: 6 }
food:
  hp: 32
  stamina: 44
  duration: 1800
  regen: 2
"#;
        let recipe: Recipe = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(recipe.id, "queens-jam");
        assert_eq!(recipe.recipe_type, RecipeType::Cooking);
        let food = recipe.food.as_ref().expect("food should be present");
        assert_eq!(food.hp, 32.0);
        assert_eq!(food.stamina, 44.0);
        assert_eq!(food.duration, 1800.0);
        assert_eq!(food.regen, 2.0);
    }

    #[test]
    fn deserialize_recipe_with_upgrades() {
        let yaml = r#"
id: hammer
name: Hammer
type: crafting
station: workbench
stationLevel: 1
repairLevel: 1
ingredients:
  - { itemId: wood, qty: 3 }
  - { itemId: stone, qty: 2 }
yields: { itemId: hammer, qty: 1 }
tags: [tool, tier-0]
stats:
  durability: 100
  weight: 1.0
upgrades:
  - quality: 2
    stationLevel: 2
    repairLevel: 2
    ingredients:
      - { itemId: wood, qty: 3 }
      - { itemId: stone, qty: 2 }
    stats:
      durability: 150
  - quality: 3
    stationLevel: 3
    repairLevel: 3
    ingredients:
      - { itemId: wood, qty: 6 }
      - { itemId: stone, qty: 4 }
    stats:
      durability: 200
"#;
        let recipe: Recipe = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(recipe.id, "hammer");
        assert_eq!(recipe.upgrades.len(), 2);
        let upgrade = &recipe.upgrades[0];
        assert_eq!(upgrade.quality, 2);
        assert_eq!(upgrade.station_level, 2);
        assert_eq!(upgrade.repair_level, 2);
        assert_eq!(upgrade.ingredients.len(), 2);
        let stats = upgrade.stats.as_ref().expect("upgrade stats should be present");
        assert_eq!(stats.durability, Some(150.0));
    }

    #[test]
    fn deserialize_recipe_with_secondary_step() {
        let yaml = r#"
id: minor-healing-mead
name: Minor Healing Mead
type: cooking
station: mead-ketill
stationLevel: 1
ingredients:
  - { itemId: honey, qty: 10 }
  - { itemId: blueberries, qty: 5 }
yields: { itemId: minor-healing-mead, qty: 6 }
secondaryStep:
  station: fermenter
  description: "Ferment for 2 in-game days. Produces x6."
tags: [mead, tier-1, meadows, healing]
"#;
        let recipe: Recipe = serde_yaml::from_str(yaml).expect("should deserialize");
        assert_eq!(recipe.id, "minor-healing-mead");
        let step = recipe
            .secondary_step
            .as_ref()
            .expect("secondaryStep should be present");
        assert_eq!(step.station, "fermenter");
        assert_eq!(step.description, "Ferment for 2 in-game days. Produces x6.");
    }
}
