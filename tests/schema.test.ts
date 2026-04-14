import { describe, it, expect } from 'vitest';
import {
  StationSchema,
  ItemSchema,
  RecipeSchema,
  ArmorStatsSchema,
} from '../src/lib/schema';

describe('StationSchema', () => {
  it('accepts a valid station', () => {
    const input = {
      id: 'forge',
      name: 'Forge',
      maxLevel: 7,
      upgrades: [
        { level: 2, requires: [{ itemId: 'forge-cooler', qty: 1 }] },
      ],
    };
    expect(() => StationSchema.parse(input)).not.toThrow();
  });

  it('rejects negative maxLevel', () => {
    const input = { id: 'forge', name: 'Forge', maxLevel: -1, upgrades: [] };
    expect(() => StationSchema.parse(input)).toThrow();
  });

  it('defaults upgrades to [] when omitted', () => {
    const parsed = StationSchema.parse({ id: 'cauldron', name: 'Cauldron', maxLevel: 5 });
    expect(parsed.upgrades).toEqual([]);
  });
});

describe('ItemSchema', () => {
  it('accepts a valid item', () => {
    const input = { id: 'iron', name: 'Iron', category: 'material' as const };
    expect(() => ItemSchema.parse(input)).not.toThrow();
  });

  it('rejects an unknown category', () => {
    const input = { id: 'iron', name: 'Iron', category: 'bogus' };
    expect(() => ItemSchema.parse(input)).toThrow();
  });

  it('accepts item with stackSize (positive integer)', () => {
    const input = { id: 'arrow-fire', name: 'Fire Arrow', category: 'material' as const, stackSize: 100 };
    expect(() => ItemSchema.parse(input)).not.toThrow();
  });

  it('accepts item without stackSize (optional)', () => {
    const input = { id: 'iron', name: 'Iron', category: 'material' as const };
    const parsed = ItemSchema.parse(input);
    expect(parsed.stackSize).toBeUndefined();
  });

  it('rejects stackSize of 0', () => {
    const input = { id: 'iron', name: 'Iron', category: 'material' as const, stackSize: 0 };
    expect(() => ItemSchema.parse(input)).toThrow();
  });
});

describe('RecipeSchema', () => {
  it('accepts a minimal crafting recipe', () => {
    const input = {
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'crafting' as const,
      station: 'forge',
      stationLevel: 2,
      ingredients: [{ itemId: 'iron', qty: 60 }],
    };
    expect(() => RecipeSchema.parse(input)).not.toThrow();
  });

  it('accepts a cooking recipe with food stats', () => {
    const input = {
      id: 'queens-jam',
      name: 'Queens Jam',
      type: 'cooking' as const,
      station: 'cauldron',
      stationLevel: 1,
      ingredients: [
        { itemId: 'raspberries', qty: 8 },
        { itemId: 'blueberries', qty: 6 },
      ],
      food: { hp: 32, stamina: 44, duration: 1800, regen: 2 },
    };
    expect(() => RecipeSchema.parse(input)).not.toThrow();
  });

  it('rejects stationLevel of 0', () => {
    const input = {
      id: 'x',
      name: 'X',
      type: 'crafting' as const,
      station: 'forge',
      stationLevel: 0,
      ingredients: [],
    };
    expect(() => RecipeSchema.parse(input)).toThrow();
  });
});

describe('RecipeSchema — secondaryStep field', () => {
  const baseRecipe = {
    id: 'minor-healing-mead',
    name: 'Minor Healing Mead',
    type: 'cooking',
    station: 'mead-ketill',
    stationLevel: 1,
    ingredients: [{ itemId: 'honey', qty: 10 }],
  };

  it('accepts a recipe with secondaryStep', () => {
    const result = RecipeSchema.parse({
      ...baseRecipe,
      yields: { itemId: 'minor-healing-mead', qty: 6 },
      secondaryStep: {
        station: 'fermenter',
        description: 'Ferment for 2 in-game days. Produces ×6.',
      },
    });
    expect(result.secondaryStep?.station).toBe('fermenter');
    expect(result.secondaryStep?.description).toBe('Ferment for 2 in-game days. Produces ×6.');
  });

  it('accepts a recipe without secondaryStep', () => {
    const result = RecipeSchema.parse(baseRecipe);
    expect(result.secondaryStep).toBeUndefined();
  });

  it('rejects secondaryStep with missing station', () => {
    expect(() =>
      RecipeSchema.parse({
        ...baseRecipe,
        secondaryStep: { description: 'Bake in an Oven.' },
      }),
    ).toThrow();
  });

  it('rejects secondaryStep with missing description', () => {
    expect(() =>
      RecipeSchema.parse({
        ...baseRecipe,
        secondaryStep: { station: 'oven' },
      }),
    ).toThrow();
  });
});

describe('ArmorStatsSchema', () => {
  it('accepts full armor stats with resistances and set bonus', () => {
    const input = {
      armor: 8,
      durability: 800,
      weight: 10.0,
      movementPenalty: -2,
      resistances: { poison: 'resistant', fire: 'weak' },
      effects: ['+15 Bows'],
      setBonus: { name: 'Root Set', pieces: 3, effect: 'Improved archery — +15 Bows' },
    };
    expect(() => ArmorStatsSchema.parse(input)).not.toThrow();
  });

  it('accepts minimal armor stats (no resistances, effects, or set bonus)', () => {
    const input = { armor: 2, durability: 400, weight: 1.0 };
    const parsed = ArmorStatsSchema.parse(input);
    expect(parsed.resistances).toBeUndefined();
    expect(parsed.effects).toBeUndefined();
    expect(parsed.setBonus).toBeUndefined();
    expect(parsed.movementPenalty).toBeUndefined();
  });

  it('rejects invalid resistance level', () => {
    expect(() => ArmorStatsSchema.parse({
      armor: 10, durability: 1000, weight: 5,
      resistances: { fire: 'immune' },
    })).toThrow();
  });

  it('rejects invalid resistance damage type key', () => {
    expect(() => ArmorStatsSchema.parse({
      armor: 10, durability: 1000, weight: 5,
      resistances: { arcane: 'resistant' },
    })).toThrow();
  });

  it('rejects negative armor value', () => {
    expect(() => ArmorStatsSchema.parse({
      armor: -1, durability: 400, weight: 1.0,
    })).toThrow();
  });
});

describe('RecipeSchema — armorStats field', () => {
  it('accepts a recipe with armorStats', () => {
    const result = RecipeSchema.parse({
      id: 'leather-helmet',
      name: 'Leather Helmet',
      type: 'crafting',
      station: 'workbench',
      stationLevel: 1,
      ingredients: [{ itemId: 'deer-hide', qty: 6 }],
      armorStats: { armor: 2, durability: 400, weight: 1.0 },
    });
    expect(result.armorStats?.armor).toBe(2);
  });

  it('accepts a recipe without armorStats', () => {
    const result = RecipeSchema.parse({
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'crafting',
      station: 'forge',
      stationLevel: 2,
      ingredients: [{ itemId: 'iron', qty: 60 }],
    });
    expect(result.armorStats).toBeUndefined();
  });
});

describe('RecipeSchema — food with eitr', () => {
  it('accepts food stats with eitr', () => {
    const result = RecipeSchema.parse({
      id: 'mushrooms-galore',
      name: 'Mushrooms Galore',
      type: 'cooking',
      station: 'food-table',
      stationLevel: 1,
      ingredients: [{ itemId: 'magecap', qty: 3 }],
      food: { hp: 65, stamina: 65, duration: 3000, regen: 5, eitr: 33 },
    });
    expect(result.food?.eitr).toBe(33);
  });

  it('accepts food stats without eitr', () => {
    const result = RecipeSchema.parse({
      id: 'bread',
      name: 'Bread',
      type: 'cooking',
      station: 'food-table',
      stationLevel: 1,
      ingredients: [{ itemId: 'barley-flour', qty: 10 }],
      food: { hp: 23, stamina: 70, duration: 1500, regen: 2 },
    });
    expect(result.food?.eitr).toBeUndefined();
  });
});
