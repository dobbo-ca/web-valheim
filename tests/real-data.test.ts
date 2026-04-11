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
});
