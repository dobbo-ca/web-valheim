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
  'meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean',
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
  hp: z.number().optional(),
  stamina: z.number().optional(),
  eitr: z.number().optional(),
  healPerTick: z.number().optional(),
  duration: z.number().optional(),
  weight: z.number().optional(),
  regenModifier: z.number().optional(),
});

export const MeadEffectSchema = z.object({
  health: z.number().optional(),
  stamina: z.number().optional(),
  eitr: z.number().optional(),
  resist: z.string().optional(),
  healthRegen: z.number().optional(),
  staminaRegen: z.number().optional(),
  eitrRegen: z.number().optional(),
  effects: z.array(z.string()).optional(),
});

export const MeadStatsSchema = z.object({
  effect: MeadEffectSchema,
  duration: z.number(),
  cooldown: z.number(),
  weight: z.number().optional(),
  cooldownGroup: z.string().optional(),
});

export const SecondaryStepSchema = z.object({
  station: z.string().min(1),
  description: z.string().min(1),
});

export const RecipeTypeSchema = z.enum(['crafting', 'cooking', 'building']);

// ── Damage types ──────────────────────────────────────────────────────────────
export const DamageSchema = z.object({
  slash: z.number().nonnegative().optional(),
  pierce: z.number().nonnegative().optional(),
  blunt: z.number().nonnegative().optional(),
  fire: z.number().nonnegative().optional(),
  frost: z.number().nonnegative().optional(),
  lightning: z.number().nonnegative().optional(),
  poison: z.number().nonnegative().optional(),
  spirit: z.number().nonnegative().optional(),
  pure: z.number().nonnegative().optional(),              // unmitigable damage
  chop: z.number().nonnegative().optional(),              // tree/greydwarf vulnerability
  pickaxe: z.number().nonnegative().optional(),           // rock/golem vulnerability
});

// ── Attack data (primary or secondary) ────────────────────────────────────────
export const AttackSchema = z.object({
  damage: DamageSchema.optional(),
  backstab: z.number().nonnegative().optional(),
  stagger: z.number().nonnegative().optional(),
  knockback: z.number().nonnegative().optional(),
  stamina: z.number().nonnegative().optional(),          // melee / bombs
  staminaPerSecond: z.number().nonnegative().optional(),  // bows (drain while drawn)
  eitr: z.number().nonnegative().optional(),              // staffs
  healthCost: z.number().nonnegative().optional(),        // blood magic (% of health)
  reloadTime: z.number().nonnegative().optional(),        // crossbows
  recoilForce: z.number().nonnegative().optional(),       // crossbows
  adrenaline: z.number().nonnegative().optional(),
  projectile: z.string().optional(),                      // staffs / description of what it fires
  effect: z.string().optional(),                          // bombs — DoT or special effect
});

// ── Blocking data ─────────────────────────────────────────────────────────────
export const BlockingSchema = z.object({
  blockArmor: z.number().nonnegative().optional(),
  parryBlockArmor: z.number().nonnegative().optional(),
  blockForce: z.number().nonnegative().optional(),        // melee only
  parryBonus: z.number().nonnegative().optional(),
  blockAdrenaline: z.number().nonnegative().optional(),
  parryAdrenaline: z.number().nonnegative().optional(),
});

// ── Armor stats ──────────────────────────────────────────────────────────────
export const ResistanceLevelSchema = z.enum(['weak', 'resistant']);

export const DamageTypeKeySchema = z.enum([
  'slash', 'pierce', 'blunt', 'fire', 'frost', 'lightning', 'poison', 'spirit',
]);

export const ResistancesSchema = z.partialRecord(DamageTypeKeySchema, ResistanceLevelSchema);

export const SetBonusSchema = z.object({
  name: z.string().min(1),
  pieces: z.number().int().positive(),
  effect: z.string().min(1),
});

export const ArmorStatsSchema = z.object({
  armor: z.number().nonnegative(),
  durability: z.number().nonnegative(),
  weight: z.number().nonnegative(),
  movementPenalty: z.number().optional(),
  resistances: ResistancesSchema.optional(),
  effects: z.array(z.string()).optional(),
  setBonus: SetBonusSchema.optional(),
});

// ── Weapon stats (base or upgrade overlay) ────────────────────────────────────
// All fields optional so upgrades can specify only what changes.
export const WeaponStatsSchema = z.object({
  weight: z.number().nonnegative().optional(),
  durability: z.number().nonnegative().optional(),
  movementPenalty: z.number().optional(),                 // percentage, e.g. -5
  primaryAttack: AttackSchema.optional(),
  secondaryAttack: AttackSchema.optional(),               // melee only, not all weapons
  blocking: BlockingSchema.optional(),
});

// ── Item upgrade ──────────────────────────────────────────────────────────────
export const ItemUpgradeSchema = z.object({
  quality: z.number().int().positive(),
  stationLevel: z.number().int().positive(),
  repairLevel: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  stats: WeaponStatsSchema.optional(),                    // sparse overlay on base stats
  armorStats: ArmorStatsSchema.partial().optional(),
});

// ── Recipe ────────────────────────────────────────────────────────────────────
export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: RecipeTypeSchema,
  station: z.string().min(1),
  stationLevel: z.number().int().positive(),
  repairLevel: z.number().int().positive().optional(),
  ingredients: z.array(IngredientRefSchema),
  yields: IngredientRefSchema.optional(),
  skill: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  food: FoodStatsSchema.optional(),
  mead: MeadStatsSchema.optional(),
  secondaryStep: SecondaryStepSchema.optional(),
  stats: WeaponStatsSchema.optional(),                    // base weapon stats
  armorStats: ArmorStatsSchema.optional(),
  upgrades: z.array(ItemUpgradeSchema).optional(),
  biome: BiomeSchema.optional(),
});

export const StationsFileSchema = z.array(StationSchema);
export const ItemsFileSchema = z.array(ItemSchema);
export const RecipesFileSchema = z.array(RecipeSchema);
