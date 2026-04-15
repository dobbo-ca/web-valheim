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
  DamageSchema,
  AttackSchema,
  BlockingSchema,
  WeaponStatsSchema,
  ItemUpgradeSchema,
  BiomeSchema,
  ArmorStatsSchema,
  ResistanceLevelSchema,
  ResistancesSchema,
  SetBonusSchema,
  MeadEffectSchema,
  MeadStatsSchema,
} from './schema';

export type Item = z.infer<typeof ItemSchema>;
export type Station = z.infer<typeof StationSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type FoodStats = z.infer<typeof FoodStatsSchema>;
export type SecondaryStep = z.infer<typeof SecondaryStepSchema>;
export type IngredientRef = z.infer<typeof IngredientRefSchema>;
export type RecipeType = z.infer<typeof RecipeTypeSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type Damage = z.infer<typeof DamageSchema>;
export type Attack = z.infer<typeof AttackSchema>;
export type Blocking = z.infer<typeof BlockingSchema>;
export type WeaponStats = z.infer<typeof WeaponStatsSchema>;
export type ItemUpgrade = z.infer<typeof ItemUpgradeSchema>;
export type Biome = z.infer<typeof BiomeSchema>;
export type ArmorStats = z.infer<typeof ArmorStatsSchema>;
export type ResistanceLevel = z.infer<typeof ResistanceLevelSchema>;
export type Resistances = z.infer<typeof ResistancesSchema>;
export type SetBonus = z.infer<typeof SetBonusSchema>;
export type MeadEffect = z.infer<typeof MeadEffectSchema>;
export type MeadStats = z.infer<typeof MeadStatsSchema>;
