import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadAll } from '../src/lib/loader';

const fixtureRoot = (name: string) =>
  resolve(__dirname, 'fixtures', name);

describe('loadAll', () => {
  it('loads valid fixtures without errors', async () => {
    const data = await loadAll(fixtureRoot('valid'));
    expect(data.items.length).toBe(5);
    expect(data.stations.length).toBe(2);
    expect(data.recipes.length).toBe(2);
    expect(data.recipes.find((r) => r.id === 'iron-sword')?.station).toBe('forge');
    expect(data.recipes.find((r) => r.id === 'queens-jam')?.food?.hp).toBe(32);
  });

  it('fails when a recipe references a missing station', async () => {
    await expect(loadAll(fixtureRoot('invalid-missing-station'))).rejects.toThrow(
      /nonexistent-station/
    );
  });

  it('fails when a recipe references a missing item id', async () => {
    const { validateCrossReferences } = await import('../src/lib/loader');
    expect(() =>
      validateCrossReferences({
        items: [{ id: 'iron', name: 'Iron', category: 'material' }],
        stations: [{ id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] }],
        recipes: [
          {
            id: 'x',
            name: 'X',
            type: 'crafting',
            station: 'forge',
            stationLevel: 1,
            ingredients: [{ itemId: 'missing-item', qty: 1 }],
          },
        ],
      })
    ).toThrow(/missing-item/);
  });

  it('fails on duplicate recipe ids', async () => {
    const { validateCrossReferences } = await import('../src/lib/loader');
    expect(() =>
      validateCrossReferences({
        items: [{ id: 'iron', name: 'Iron', category: 'material' }],
        stations: [{ id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] }],
        recipes: [
          {
            id: 'dup',
            name: 'Dup',
            type: 'crafting',
            station: 'forge',
            stationLevel: 1,
            ingredients: [{ itemId: 'iron', qty: 1 }],
          },
          {
            id: 'dup',
            name: 'Dup 2',
            type: 'crafting',
            station: 'forge',
            stationLevel: 1,
            ingredients: [{ itemId: 'iron', qty: 1 }],
          },
        ],
      })
    ).toThrow(/duplicate/i);
  });

  it('fails when stationLevel exceeds station maxLevel', async () => {
    const { validateCrossReferences } = await import('../src/lib/loader');
    expect(() =>
      validateCrossReferences({
        items: [{ id: 'iron', name: 'Iron', category: 'material' }],
        stations: [{ id: 'forge', name: 'Forge', maxLevel: 3, upgrades: [] }],
        recipes: [
          {
            id: 'over',
            name: 'Over',
            type: 'crafting',
            station: 'forge',
            stationLevel: 5,
            ingredients: [{ itemId: 'iron', qty: 1 }],
          },
        ],
      })
    ).toThrow(/stationLevel/);
  });
});
