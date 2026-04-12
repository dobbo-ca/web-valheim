import { z } from 'zod';

export const ItemCategorySchema = z.enum([
  'material',
  'ingredient',
  'food',
  'weapon',
  'armor',
  'tool',
]);

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ItemCategorySchema,
  stackSize: z.number().int().positive().optional(),
});

export const IngredientRefSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
});

export const StationUpgradeSchema = z.object({
  level: z.number().int().positive(),
  name: z.string().optional(),
  requires: z.array(IngredientRefSchema),
});

export const StationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  maxLevel: z.number().int().positive(),
  upgrades: z.array(StationUpgradeSchema).default([]),
});

export const FoodStatsSchema = z.object({
  hp: z.number().nonnegative(),
  stamina: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  regen: z.number().nonnegative(),
});

export const MeadInfoSchema = z.object({
  baseName: z.string().min(1),
  fermenterDuration: z.number().int().positive(),
});

export const RecipeTypeSchema = z.enum(['crafting', 'cooking']);

export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: RecipeTypeSchema,
  station: z.string().min(1),
  stationLevel: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  yields: IngredientRefSchema.optional(),
  skill: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  food: FoodStatsSchema.optional(),
  mead: MeadInfoSchema.optional(),
});

export const StationsFileSchema = z.array(StationSchema);
export const ItemsFileSchema = z.array(ItemSchema);
export const RecipesFileSchema = z.array(RecipeSchema);
