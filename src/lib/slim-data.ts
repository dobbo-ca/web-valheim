import type { Recipe } from './types';
import type { DataSet } from './loader';

/**
 * Fields needed for the initial list render:
 * - id, name, type, station, stationLevel, ingredients, tags, biome, yields
 * - food stats (shown in list expansion)
 * - armorStats.armor (shown as "X armor" in stats column)
 * - stats.primaryAttack.damage (shown as damage summary in stats column)
 * - stats.blocking.blockArmor (shown as "X block" in stats column)
 */
export function slimRecipe(r: Recipe): Recipe {
  const slim: Recipe = {
    id: r.id,
    name: r.name,
    type: r.type,
    station: r.station,
    stationLevel: r.stationLevel,
    ingredients: r.ingredients,
  };
  if (r.tags) slim.tags = r.tags;
  if (r.biome) slim.biome = r.biome;
  if (r.yields) slim.yields = r.yields;
  if (r.food) slim.food = r.food;
  if (r.notes) slim.notes = r.notes;

  // Minimal stat summaries for the list view
  if (r.armorStats) {
    slim.armorStats = { armor: r.armorStats.armor, durability: r.armorStats.durability, weight: r.armorStats.weight };
  }
  if (r.stats?.primaryAttack?.damage) {
    slim.stats = { primaryAttack: { damage: r.stats.primaryAttack.damage } };
  } else if (r.stats?.blocking?.blockArmor != null) {
    slim.stats = { blocking: { blockArmor: r.stats.blocking.blockArmor } };
  }

  return slim;
}

export function slimDataSet(data: DataSet): DataSet {
  return {
    items: data.items,
    stations: data.stations,
    recipes: data.recipes.map(slimRecipe),
  };
}
