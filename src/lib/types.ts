import type { z } from 'zod';
import type {
  ItemSchema,
  StationSchema,
  RecipeSchema,
  FoodStatsSchema,
  SecondaryStepSchema,
  IngredientRefSchema,
  RecipeTypeSchema,
  ItemCategorySchema,
  DamageStatsSchema,
  ItemStatsSchema,
  ItemUpgradeSchema,
  BiomeSchema,
} from './schema';

export type Item = z.infer<typeof ItemSchema>;
export type Station = z.infer<typeof StationSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type FoodStats = z.infer<typeof FoodStatsSchema>;
export type SecondaryStep = z.infer<typeof SecondaryStepSchema>;
export type IngredientRef = z.infer<typeof IngredientRefSchema>;
export type RecipeType = z.infer<typeof RecipeTypeSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type DamageStats = z.infer<typeof DamageStatsSchema>;
export type ItemStats = z.infer<typeof ItemStatsSchema>;
export type ItemUpgrade = z.infer<typeof ItemUpgradeSchema>;
export type Biome = z.infer<typeof BiomeSchema>;
