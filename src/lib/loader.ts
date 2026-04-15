import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  ItemsFileSchema,
  StationsFileSchema,
  RecipesFileSchema,
} from './schema';
import type { Item, Station, Recipe } from './types';


export interface DataSet {
  items: Item[];
  stations: Station[];
  recipes: Recipe[];
}

async function parseYamlFile<T>(
  path: string,
  schema: { parse: (raw: unknown) => T },
): Promise<T> {
  const raw = await readFile(path, 'utf8');
  const parsed = parseYaml(raw);
  try {
    return schema.parse(parsed);
  } catch (err) {
    throw new Error(`Invalid YAML at ${path}: ${(err as Error).message}`);
  }
}

export async function loadAll(dataRoot: string): Promise<DataSet> {
  const items = await parseYamlFile(join(dataRoot, 'items.yaml'), ItemsFileSchema);
  const stations = await parseYamlFile(
    join(dataRoot, 'stations.yaml'),
    StationsFileSchema,
  );

  const recipesDir = join(dataRoot, 'recipes');
  const files = (await readdir(recipesDir)).filter((f) => f.endsWith('.yaml'));
  const recipes: Recipe[] = [];
  for (const f of files) {
    const parsed = await parseYamlFile(join(recipesDir, f), RecipesFileSchema);
    recipes.push(...parsed);
  }

  // Generate building pseudo-recipes from station upgrades
  for (const station of stations) {
    for (const upgrade of station.upgrades) {
      recipes.push({
        id: `upgrade-${station.id}-${upgrade.level}`,
        name: upgrade.name ?? `${station.name} Level ${upgrade.level}`,
        type: 'building',
        station: station.id,
        stationLevel: upgrade.level,
        ingredients: upgrade.requires,
        tags: ['build', 'station-upgrade'],
      });
    }
  }

  const data: DataSet = { items, stations, recipes };
  validateCrossReferences(data);
  return data;
}

export function validateCrossReferences(data: DataSet): void {
  const itemIds = new Set(data.items.map((i) => i.id));
  const stationsById = new Map(data.stations.map((s) => [s.id, s]));
  const recipeIds = new Set<string>();

  for (const r of data.recipes) {
    if (recipeIds.has(r.id)) {
      throw new Error(`Duplicate recipe id: ${r.id}`);
    }
    recipeIds.add(r.id);

    const station = stationsById.get(r.station);
    if (!station) {
      throw new Error(
        `Recipe "${r.id}" references unknown station: ${r.station}`,
      );
    }
    if (r.stationLevel > station.maxLevel) {
      throw new Error(
        `Recipe "${r.id}" stationLevel ${r.stationLevel} exceeds ${station.id}.maxLevel ${station.maxLevel}`,
      );
    }

    for (const ing of r.ingredients ?? []) {
      if (!itemIds.has(ing.itemId)) {
        throw new Error(
          `Recipe "${r.id}" references unknown item id: ${ing.itemId}`,
        );
      }
    }

    if (r.yields && !itemIds.has(r.yields.itemId)) {
      throw new Error(
        `Recipe "${r.id}" yields unknown item id: ${r.yields.itemId}`,
      );
    }
  }
}
