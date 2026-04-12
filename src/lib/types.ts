import type { z } from 'zod';
import type {
  ItemSchema,
  StationSchema,
  RecipeSchema,
  FoodStatsSchema,
  MeadInfoSchema,
  IngredientRefSchema,
  RecipeTypeSchema,
  ItemCategorySchema,
} from './schema';

export type Item = z.infer<typeof ItemSchema>;
export type Station = z.infer<typeof StationSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type FoodStats = z.infer<typeof FoodStatsSchema>;
export type MeadInfo = z.infer<typeof MeadInfoSchema>;
export type IngredientRef = z.infer<typeof IngredientRefSchema>;
export type RecipeType = z.infer<typeof RecipeTypeSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
