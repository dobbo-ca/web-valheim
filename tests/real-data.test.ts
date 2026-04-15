import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAll } from '../src/lib/loader';

describe('real src/data', () => {
  it('loads without errors', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.stations.length).toBeGreaterThan(0);
    expect(data.recipes.length).toBeGreaterThan(0);
  });

  it('every item has at most one classification tag (weapon, armor, ammo)', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const classifications = ['weapon', 'armor', 'ammo'] as const;

    const violations: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      const found = classifications.filter((c) => tags.includes(c));
      if (found.length > 1) {
        violations.push(`${recipe.id} has multiple classifications: ${found.join(', ')}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('armor-type items have the armor tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const armorTypes = ['helmet', 'chest', 'legs', 'cape', 'buckler', 'shield', 'tower-shield'];

    const missing: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (tags.some((t) => armorTypes.includes(t)) && !tags.includes('armor')) {
        missing.push(recipe.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('weapon-type items have the weapon tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const weaponTypes = ['sword', 'axe', 'mace', 'polearm', 'bow', 'crossbow', 'knife', 'spear', 'staff', 'fists', 'club', 'battleaxe', 'sledge', 'pickaxe', 'dual-wield'];

    const missing: string[] = [];
    for (const recipe of data.recipes) {
      const tags = recipe.tags ?? [];
      if (tags.some((t) => weaponTypes.includes(t)) && !tags.includes('weapon')) {
        missing.push(recipe.id);
      }
    }
    expect(missing).toEqual([]);
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

  it('every food recipe has a biome tag', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const biomes = ['meadows', 'black-forest', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'ocean'];
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (!recipe.food && !recipe.mead) continue;
      const tags = recipe.tags ?? [];
      if (!tags.some((t) => biomes.includes(t))) {
        violations.push(recipe.id);
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

  it('no recipe has removed food field "regen" (renamed to healPerTick)', async () => {
    const data = await loadAll(resolve(__dirname, '../src/data'));
    const violations: string[] = [];
    for (const recipe of data.recipes) {
      if (recipe.food && 'regen' in recipe.food) {
        violations.push(recipe.id);
      }
    }
    expect(violations).toEqual([]);
  });
});
