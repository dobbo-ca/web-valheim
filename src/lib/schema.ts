import { z } from 'zod';

export const ItemCategorySchema = z.enum([
  'material',
  'ingredient',
  'food',
  'weapon',
  'armor',
  'tool',
]);

export const BiomeSchema = z.enum([
  'meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands',
]);

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ItemCategorySchema,
  stackSize: z.number().int().positive().optional(),
  biome: BiomeSchema.optional(),
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
  eitr: z.number().nonnegative().optional(),
});

export const SecondaryStepSchema = z.object({
  station: z.string().min(1),
  description: z.string().min(1),
});

export const RecipeTypeSchema = z.enum(['crafting', 'cooking', 'building']);

export const DamageStatsSchema = z.object({
  slash: z.number().nonnegative().optional(),
  pierce: z.number().nonnegative().optional(),
  blunt: z.number().nonnegative().optional(),
  fire: z.number().nonnegative().optional(),
  frost: z.number().nonnegative().optional(),
  lightning: z.number().nonnegative().optional(),
  poison: z.number().nonnegative().optional(),
  spirit: z.number().nonnegative().optional(),
});

export const ItemStatsSchema = z.object({
  damage: DamageStatsSchema.optional(),
  armor: z.number().nonnegative().optional(),
  block: z.number().nonnegative().optional(),
  parry: z.number().nonnegative().optional(),
  knockback: z.number().nonnegative().optional(),
  backstab: z.number().nonnegative().optional(),
  durability: z.number().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  movementPenalty: z.number().optional(),
});

export const ItemUpgradeSchema = z.object({
  quality: z.number().int().positive(),
  stationLevel: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  stats: ItemStatsSchema.optional(),
});

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
  secondaryStep: SecondaryStepSchema.optional(),
  stats: ItemStatsSchema.optional(),
  upgrades: z.array(ItemUpgradeSchema).optional(),
  biome: BiomeSchema.optional(),
});

export const StationsFileSchema = z.array(StationSchema);
export const ItemsFileSchema = z.array(ItemSchema);
export const RecipesFileSchema = z.array(RecipeSchema);
