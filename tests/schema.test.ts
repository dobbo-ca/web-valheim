import { describe, it, expect } from 'vitest';
import {
  StationSchema,
  ItemSchema,
  RecipeSchema,
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

describe('RecipeSchema — mead field', () => {
  const baseRecipe = {
    id: 'minor-healing-mead',
    name: 'Minor Healing Mead',
    type: 'cooking',
    station: 'cauldron',
    stationLevel: 1,
    ingredients: [{ itemId: 'honey', qty: 10 }],
  };

  it('accepts a recipe with mead info', () => {
    const result = RecipeSchema.parse({
      ...baseRecipe,
      yields: { itemId: 'minor-healing-mead', qty: 6 },
      mead: {
        baseName: 'Mead Base: Minor Healing',
        fermenterDuration: 2400,
      },
    });
    expect(result.mead?.baseName).toBe('Mead Base: Minor Healing');
    expect(result.mead?.fermenterDuration).toBe(2400);
  });

  it('accepts a recipe without mead info', () => {
    const result = RecipeSchema.parse(baseRecipe);
    expect(result.mead).toBeUndefined();
  });

  it('rejects mead with missing baseName', () => {
    expect(() =>
      RecipeSchema.parse({
        ...baseRecipe,
        mead: { fermenterDuration: 2400 },
      }),
    ).toThrow();
  });
});
