/** Tooltip text for combat stats that need explanation. */
export const STAT_TOOLTIPS: Record<string, string> = {
  backstab:
    'Damage multiplier when attacking an unaware enemy from behind.',
  stagger:
    'Stagger damage per hit. Based on physical + lightning damage. When the target\'s stagger bar fills, they are stunned and take 2× damage.',
  adrenaline:
    'Adrenaline gained per action. Each point increases damage by 1%. Decays over time when not attacking.',
  eitr:
    'Magical energy cost per cast. Eitr regenerates over time from food.',
  healthCost:
    'Percentage of max health consumed per cast (blood magic).',
  blockArmor:
    'Damage absorbed when blocking. Reduces incoming damage by this amount. Scales with blocking skill.',
  parryBlockArmor:
    'Damage absorbed when parrying (blocking within 0.25s). Equals Block Armor × Parry Bonus.',
  blockForce:
    'How far enemies are pushed back when you block their attack.',
  parryBonus:
    'Multiplier applied to Block Armor on a successful parry (block within 0.25s of incoming hit).',
  blockAdrenaline:
    'Adrenaline gained when blocking an attack.',
  parryAdrenaline:
    'Adrenaline gained when successfully parrying an attack.',
  knockback:
    'How far enemies are pushed back on hit.',
};
