import type { WeaponStats } from './types';

/** Merge base weapon stats with a sparse upgrade overlay. */
export function mergeStats(base: WeaponStats, overlay?: WeaponStats): WeaponStats {
  if (!overlay) return base;
  const merged = { ...base };
  if (overlay.durability != null) merged.durability = overlay.durability;
  if (overlay.weight != null) merged.weight = overlay.weight;
  if (overlay.movementPenalty != null) merged.movementPenalty = overlay.movementPenalty;
  if (overlay.primaryAttack) {
    merged.primaryAttack = {
      ...base.primaryAttack,
      ...overlay.primaryAttack,
      damage: { ...base.primaryAttack?.damage, ...overlay.primaryAttack?.damage },
    };
  }
  if (overlay.secondaryAttack) {
    merged.secondaryAttack = {
      ...base.secondaryAttack,
      ...overlay.secondaryAttack,
      damage: { ...base.secondaryAttack?.damage, ...overlay.secondaryAttack?.damage },
    };
  }
  if (overlay.blocking) {
    merged.blocking = { ...base.blocking, ...overlay.blocking };
  }
  return merged;
}
