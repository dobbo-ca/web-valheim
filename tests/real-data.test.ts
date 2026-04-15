import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAll } from '../src/lib/loader';

const CLASSIFICATION_TAGS = ['melee', 'ranged', 'ammo', 'armor', 'tool', 'build', 'food', 'mead'] as const;
const REMOVED_TAGS = ['weapon', 'club', 'battleaxe', 'sledge', 'tower-shield', 'building', 'one-handed', 'two-handed'] as const;
const BIOME_TAGS = ['meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean', 'deep-north'] as const;
const FOOD_STAT_TAGS = ['hp', 'balanced', 'stamina', 'eitr'] as const;
const MEAD_SUBTYPE_TAGS = ['healing', 'stamina', 'eitr', 'resistance', 'utility'] as const;

describe('real src/data', () => {
  it('loads without errors', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.stations.length).toBeGreaterThan(0);
    expect(data.recipes.length).toBeGreaterThan(0);
  });

  it('every recipe has exactly one classification tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = CLASSIFICATION_TAGS.filter((c) => tags.includes(c));
      if (found.length !== 1) {
        violations.push(`${recipe.id} has ${found.length} classifications: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no recipe has removed tags', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = REMOVED_TAGS.filter((t) => tags.includes(t));
      if (found.length > 0) {
        violations.push(`${recipe.id} has removed tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every melee or ranged item has exactly one handedness tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('melee') && !tags.includes('ranged')) continue;
      const hand = ['1h', '2h'].filter((h) => tags.includes(h));
      if (hand.length !== 1) {
        violations.push(`${recipe.id} has ${hand.length} handedness tags: [${hand.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every recipe has at most one biome tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = BIOME_TAGS.filter((b) => tags.includes(b));
      if (found.length > 1) {
        violations.push(`${recipe.id} has ${found.length} biome tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every food item has exactly one stat focus tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('food')) continue;
      const found = FOOD_STAT_TAGS.filter((s) => tags.includes(s));
      if (found.length !== 1) {
        violations.push(`${recipe.id} has ${found.length} stat focus tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every mead item has exactly one mead subtype tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('mead')) continue;
      const found = MEAD_SUBTYPE_TAGS.filter((s) => tags.includes(s));
      if (found.length !== 1) {
        violations.push(`${recipe.id} has ${found.length} mead subtype tags: [${found.join(', ')}]`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every found item also has a classification tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (!tags.includes('found')) continue;
      const cls = CLASSIFICATION_TAGS.filter((c) => tags.includes(c));
      if (cls.length !== 1) {
        violations.push(`${recipe.id} is found but has ${cls.length} classifications`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('food and mead are mutually exclusive on a recipe', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (recipe.food && recipe.mead) {
        violations.push(`${recipe.id} has both food and mead`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every mead recipe has duration and cooldown', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (!recipe.mead) continue;
      if (recipe.mead.duration == null || recipe.mead.cooldown == null) {
        violations.push(recipe.id);
      }
    }
    expect(violations).toEqual([]);
  });

  it('no recipe has biome field (migrated to tag)', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if ('biome' in recipe && recipe.biome != null) {
        violations.push(`${recipe.id} still has biome field: ${recipe.biome}`);
      }
    }
    expect(violations).toEqual([]);
  });
});
