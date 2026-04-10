# Valheim Helper Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an MVP static site with a filterable Valheim recipe table (crafting + cooking), reverse lookup, and per-recipe detail pages, published at `https://www.dobbo.ca/valheim/`.

**Architecture:** Astro meta-framework (SSG, `base: '/valheim/'`) with a single SolidJS island for the interactive filterable table. Data lives as hand-editable YAML validated by Zod at build time, flattened into a single JSON artifact served to the client. Source repo `dobbo-ca/valheim-helper`; GitHub Action deploys built output to a subdirectory of `cdobbyn/cdobbyn.github.io` via a dedicated GitHub App for cross-org auth.

**Tech Stack:** Astro · SolidJS (`@astrojs/solid-js`) · TypeScript · Zod · uFuzzy · YAML · Vitest + `@solidjs/testing-library` · Playwright · pnpm · GitHub Actions

**Spec:** `docs/superpowers/specs/2026-04-09-valheim-helper-site-design.md`

---

## Working Directory

All tasks run from `/Users/christopherdobbyn/Documents/valheim/` (referred to as `<repo>` below). The repo has already been initialized with `git init -b main` and a `.gitignore`. One commit exists (the design spec).

## Conventions

- **Package manager:** `pnpm` exclusively. Never mix `npm` / `yarn` commands.
- **Commits:** after each task passes its final step. Use conventional commit prefixes: `feat:`, `test:`, `chore:`, `docs:`, `fix:`, `ci:`.
- **Tests first.** For any code step that needs a test, the test is written and run (failing) before the implementation.
- **Expected output** is shown for every command so you can verify success without guessing.

---

## File Structure (target)

```
valheim-helper/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── astro.config.mjs
├── docs/superpowers/
│   ├── specs/2026-04-09-valheim-helper-site-design.md
│   └── plans/2026-04-09-valheim-helper-site.md     # this file
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── README.md
├── scripts/scrape-wiki.ts                          # dev tool, not run on build
├── src/
│   ├── components/
│   │   ├── FilterBar.tsx
│   │   ├── IngredientChip.tsx
│   │   ├── RecipeRow.tsx
│   │   └── RecipeTable.tsx
│   ├── data/
│   │   ├── items.yaml
│   │   ├── stations.yaml
│   │   └── recipes/
│   │       ├── crafting.yaml
│   │       └── cooking.yaml
│   ├── layouts/Base.astro
│   ├── lib/
│   │   ├── filter.ts
│   │   ├── loader.ts
│   │   ├── schema.ts
│   │   ├── url-state.ts
│   │   └── types.ts
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   └── recipes/[slug].astro
│   └── styles/theme.css
├── tests/
│   ├── filter.test.ts
│   ├── loader.test.ts
│   ├── schema.test.ts
│   ├── url-state.test.ts
│   ├── components/
│   │   ├── FilterBar.test.tsx
│   │   ├── RecipeTable.test.tsx
│   │   └── RecipeRow.test.tsx
│   └── e2e/smoke.spec.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Astro project with SolidJS and TypeScript

**Files:**
- Create: `<repo>/package.json`
- Create: `<repo>/astro.config.mjs`
- Create: `<repo>/tsconfig.json`
- Create: `<repo>/src/pages/index.astro`
- Create: `<repo>/README.md`

- [ ] **Step 1: Initialize pnpm + Astro minimal template**

Run from `<repo>`:

```bash
pnpm dlx create-astro@latest . --template minimal --typescript strict --no-git --install --skip-houston --yes
```

Expected: creates `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/pages/index.astro`, `.gitignore` (merge with existing), and installs dependencies into `node_modules/`.

If `create-astro` adds entries to `.gitignore` that duplicate the existing file, keep the existing one (it already covers `node_modules/`, `dist/`, `.astro/`).

- [ ] **Step 2: Add SolidJS integration**

Run from `<repo>`:

```bash
pnpm astro add solid --yes
```

Expected: installs `@astrojs/solid-js` and `solid-js`, updates `astro.config.mjs` to include the Solid integration, adds `jsxImportSource: "solid-js"` to `tsconfig.json`.

- [ ] **Step 3: Set the site base path to `/valheim/`**

Edit `<repo>/astro.config.mjs`. After the existing `defineConfig({` call, ensure the config reads exactly:

```js
import { defineConfig } from 'astro/config';
import solid from '@astrojs/solid-js';

export default defineConfig({
  site: 'https://www.dobbo.ca',
  base: '/valheim/',
  trailingSlash: 'always',
  integrations: [solid()],
});
```

- [ ] **Step 4: Replace starter index.astro with a placeholder home**

Overwrite `<repo>/src/pages/index.astro`:

```astro
---
// Placeholder home — filled in during Phase 5
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Valheim Helper</title>
  </head>
  <body>
    <h1>Valheim Helper</h1>
    <p>Coming soon.</p>
  </body>
</html>
```

- [ ] **Step 5: Write the README stub**

Create `<repo>/README.md`:

```markdown
# Valheim Helper

A filterable recipe reference for Valheim. Published at https://www.dobbo.ca/valheim/.

## Development

```bash
pnpm install
pnpm dev        # local dev server
pnpm build      # static build into dist/
pnpm test       # unit + component tests
pnpm test:e2e   # Playwright smoke tests
```

See `docs/superpowers/specs/2026-04-09-valheim-helper-site-design.md` for the design
and `docs/superpowers/plans/2026-04-09-valheim-helper-site.md` for the implementation plan.
```

- [ ] **Step 6: Verify build**

Run from `<repo>`:

```bash
pnpm build
```

Expected: build succeeds, `dist/valheim/index.html` exists (because of `base: '/valheim/'`). Check with:

```bash
ls dist/valheim/index.html
```

Expected: file path printed (no error).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs tsconfig.json src/pages/index.astro README.md
git commit -m "chore: scaffold Astro + SolidJS project"
```

---

### Task 2: Add dev dependencies (Zod, YAML, uFuzzy, Vitest, Playwright)

**Files:**
- Modify: `<repo>/package.json` (via pnpm add)
- Create: `<repo>/vitest.config.ts`
- Create: `<repo>/playwright.config.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add zod yaml @leeoniya/ufuzzy
```

Expected: `dependencies` in `package.json` now includes `zod`, `yaml`, `@leeoniya/ufuzzy`.

- [ ] **Step 2: Install test dependencies**

```bash
pnpm add -D vitest @solidjs/testing-library @testing-library/jest-dom jsdom @playwright/test
```

Expected: `devDependencies` includes all of the above.

- [ ] **Step 3: Install Playwright browsers**

```bash
pnpm exec playwright install chromium
```

Expected: Chromium downloaded (one-time).

- [ ] **Step 4: Create vitest.config.ts**

Create `<repo>/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
});
```

- [ ] **Step 5: Install vite-plugin-solid (required by vitest config)**

```bash
pnpm add -D vite-plugin-solid
```

- [ ] **Step 6: Create tests/setup.ts**

Create `<repo>/tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Create playwright.config.ts**

Create `<repo>/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/valheim/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4321',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

- [ ] **Step 8: Add test scripts to package.json**

Edit `<repo>/package.json` — in the `"scripts"` object, ensure these entries exist (add any missing):

```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "astro check && tsc --noEmit"
  }
}
```

- [ ] **Step 9: Install astro check**

```bash
pnpm add -D @astrojs/check typescript
```

- [ ] **Step 10: Verify setup**

```bash
pnpm typecheck
```

Expected: no errors (the project has no custom code yet, just the placeholder home page).

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts playwright.config.ts tests/setup.ts
git commit -m "chore: add test tooling (vitest, playwright) and core deps"
```

---

## Phase 2: Data Layer (Schemas, Loader, Filter)

### Task 3: Define Zod schemas and inferred types

**Files:**
- Create: `<repo>/src/lib/schema.ts`
- Create: `<repo>/src/lib/types.ts`
- Create: `<repo>/tests/schema.test.ts`

- [ ] **Step 1: Write the failing schema test**

Create `<repo>/tests/schema.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm test tests/schema.test.ts
```

Expected: FAIL — module `../src/lib/schema` not found.

- [ ] **Step 3: Write src/lib/schema.ts**

Create `<repo>/src/lib/schema.ts`:

```ts
import { z } from 'zod';

export const ItemCategorySchema = z.enum([
  'material',
  'ingredient',
  'food',
  'weapon',
  'armor',
  'tool',
]);

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: ItemCategorySchema,
});

export const IngredientRefSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().positive(),
});

export const StationUpgradeSchema = z.object({
  level: z.number().int().positive(),
  requires: z.array(IngredientRefSchema),
});

export const StationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  maxLevel: z.number().int().positive(),
  upgrades: z.array(StationUpgradeSchema).default([]),
});

export const FoodStatsSchema = z.object({
  hp: z.number().nonnegative(),
  stamina: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  regen: z.number().nonnegative(),
});

export const RecipeTypeSchema = z.enum(['crafting', 'cooking']);

export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: RecipeTypeSchema,
  station: z.string().min(1),
  stationLevel: z.number().int().positive(),
  ingredients: z.array(IngredientRefSchema),
  yields: IngredientRefSchema.optional(),
  skill: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  food: FoodStatsSchema.optional(),
});

export const StationsFileSchema = z.array(StationSchema);
export const ItemsFileSchema = z.array(ItemSchema);
export const RecipesFileSchema = z.array(RecipeSchema);
```

- [ ] **Step 4: Write src/lib/types.ts (type re-exports)**

Create `<repo>/src/lib/types.ts`:

```ts
import type { z } from 'zod';
import type {
  ItemSchema,
  StationSchema,
  RecipeSchema,
  FoodStatsSchema,
  IngredientRefSchema,
  RecipeTypeSchema,
  ItemCategorySchema,
} from './schema';

export type Item = z.infer<typeof ItemSchema>;
export type Station = z.infer<typeof StationSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type FoodStats = z.infer<typeof FoodStatsSchema>;
export type IngredientRef = z.infer<typeof IngredientRefSchema>;
export type RecipeType = z.infer<typeof RecipeTypeSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
pnpm test tests/schema.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schema.ts src/lib/types.ts tests/schema.test.ts
git commit -m "feat(data): add Zod schemas for items, stations, recipes"
```

---

### Task 4: YAML loader with cross-reference validation

**Files:**
- Create: `<repo>/src/lib/loader.ts`
- Create: `<repo>/tests/loader.test.ts`
- Create: `<repo>/tests/fixtures/valid/items.yaml`
- Create: `<repo>/tests/fixtures/valid/stations.yaml`
- Create: `<repo>/tests/fixtures/valid/recipes/crafting.yaml`
- Create: `<repo>/tests/fixtures/valid/recipes/cooking.yaml`
- Create: `<repo>/tests/fixtures/invalid-missing-station/items.yaml`
- Create: `<repo>/tests/fixtures/invalid-missing-station/stations.yaml`
- Create: `<repo>/tests/fixtures/invalid-missing-station/recipes/crafting.yaml`
- Create: `<repo>/tests/fixtures/invalid-missing-station/recipes/cooking.yaml`

- [ ] **Step 1: Write fixture files (valid set)**

Create `<repo>/tests/fixtures/valid/items.yaml`:

```yaml
- id: iron
  name: Iron
  category: material
- id: wood
  name: Wood
  category: material
- id: leather-scraps
  name: Leather Scraps
  category: material
- id: raspberries
  name: Raspberries
  category: ingredient
- id: blueberries
  name: Blueberries
  category: ingredient
```

Create `<repo>/tests/fixtures/valid/stations.yaml`:

```yaml
- id: forge
  name: Forge
  maxLevel: 7
  upgrades: []
- id: cauldron
  name: Cauldron
  maxLevel: 5
  upgrades: []
```

Create `<repo>/tests/fixtures/valid/recipes/crafting.yaml`:

```yaml
- id: iron-sword
  name: Iron Sword
  type: crafting
  station: forge
  stationLevel: 2
  ingredients:
    - { itemId: iron, qty: 60 }
    - { itemId: wood, qty: 2 }
    - { itemId: leather-scraps, qty: 2 }
```

Create `<repo>/tests/fixtures/valid/recipes/cooking.yaml`:

```yaml
- id: queens-jam
  name: Queens Jam
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: raspberries, qty: 8 }
    - { itemId: blueberries, qty: 6 }
  food:
    hp: 32
    stamina: 44
    duration: 1800
    regen: 2
```

- [ ] **Step 2: Write fixture files (invalid: recipe references non-existent station)**

Create `<repo>/tests/fixtures/invalid-missing-station/items.yaml`:

```yaml
- id: iron
  name: Iron
  category: material
```

Create `<repo>/tests/fixtures/invalid-missing-station/stations.yaml`:

```yaml
- id: forge
  name: Forge
  maxLevel: 7
  upgrades: []
```

Create `<repo>/tests/fixtures/invalid-missing-station/recipes/crafting.yaml`:

```yaml
- id: ghost-hammer
  name: Ghost Hammer
  type: crafting
  station: nonexistent-station
  stationLevel: 1
  ingredients:
    - { itemId: iron, qty: 1 }
```

Create `<repo>/tests/fixtures/invalid-missing-station/recipes/cooking.yaml`:

```yaml
[]
```

- [ ] **Step 3: Write failing loader test**

Create `<repo>/tests/loader.test.ts`:

```ts
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
    // We inline this test instead of another fixture dir for brevity
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
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm test tests/loader.test.ts
```

Expected: FAIL — module `../src/lib/loader` not found.

- [ ] **Step 5: Write src/lib/loader.ts**

Create `<repo>/src/lib/loader.ts`:

```ts
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

    for (const ing of r.ingredients) {
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
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm test tests/loader.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/lib/loader.ts tests/loader.test.ts tests/fixtures/
git commit -m "feat(data): add YAML loader with cross-reference validation"
```

---

### Task 5: Pure filter function

**Files:**
- Create: `<repo>/src/lib/filter.ts`
- Create: `<repo>/tests/filter.test.ts`

- [ ] **Step 1: Write failing filter test**

Create `<repo>/tests/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { filterRecipes, type FilterState } from '../src/lib/filter';
import type { Recipe } from '../src/lib/types';

const sample: Recipe[] = [
  {
    id: 'iron-sword',
    name: 'Iron Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 2,
    ingredients: [
      { itemId: 'iron', qty: 60 },
      { itemId: 'wood', qty: 2 },
    ],
    tags: ['sword', 'one-handed'],
  },
  {
    id: 'bronze-sword',
    name: 'Bronze Sword',
    type: 'crafting',
    station: 'forge',
    stationLevel: 1,
    ingredients: [
      { itemId: 'bronze', qty: 8 },
      { itemId: 'wood', qty: 2 },
      { itemId: 'leather-scraps', qty: 2 },
    ],
    tags: ['sword', 'one-handed'],
  },
  {
    id: 'queens-jam',
    name: 'Queens Jam',
    type: 'cooking',
    station: 'cauldron',
    stationLevel: 1,
    ingredients: [
      { itemId: 'raspberries', qty: 8 },
      { itemId: 'blueberries', qty: 6 },
    ],
  },
];

const empty: FilterState = {
  type: 'all',
  station: 'all',
  maxStationLevel: 10,
  ingredientIds: [],
  query: '',
};

describe('filterRecipes', () => {
  it('returns everything when filters are empty', () => {
    expect(filterRecipes(sample, empty).map((r) => r.id)).toEqual([
      'iron-sword',
      'bronze-sword',
      'queens-jam',
    ]);
  });

  it('filters by type', () => {
    expect(
      filterRecipes(sample, { ...empty, type: 'cooking' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by station', () => {
    expect(
      filterRecipes(sample, { ...empty, station: 'cauldron' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by max station level (hides recipes above cap)', () => {
    expect(
      filterRecipes(sample, { ...empty, maxStationLevel: 1 }).map((r) => r.id),
    ).toEqual(['bronze-sword', 'queens-jam']);
  });

  it('filters by ingredient (single)', () => {
    expect(
      filterRecipes(sample, { ...empty, ingredientIds: ['iron'] }).map((r) => r.id),
    ).toEqual(['iron-sword']);
  });

  it('filters by ingredient (multiple, AND)', () => {
    expect(
      filterRecipes(sample, {
        ...empty,
        ingredientIds: ['wood', 'leather-scraps'],
      }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });

  it('filters by text query (name match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'queen' }).map((r) => r.id),
    ).toEqual(['queens-jam']);
  });

  it('filters by text query (tag match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'one-handed' }).map((r) => r.id),
    ).toEqual(['iron-sword', 'bronze-sword']);
  });

  it('filters by text query (ingredient name match)', () => {
    expect(
      filterRecipes(sample, { ...empty, query: 'bronze' }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });

  it('combines all filters with AND', () => {
    expect(
      filterRecipes(sample, {
        type: 'crafting',
        station: 'forge',
        maxStationLevel: 1,
        ingredientIds: ['wood'],
        query: 'sword',
      }).map((r) => r.id),
    ).toEqual(['bronze-sword']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test tests/filter.test.ts
```

Expected: FAIL — module `../src/lib/filter` not found.

- [ ] **Step 3: Write src/lib/filter.ts**

Create `<repo>/src/lib/filter.ts`:

```ts
import type { Recipe, RecipeType } from './types';

export interface FilterState {
  type: RecipeType | 'all';
  station: string; // station id or 'all'
  maxStationLevel: number;
  ingredientIds: string[]; // AND
  query: string;
}

export const emptyFilterState: FilterState = {
  type: 'all',
  station: 'all',
  maxStationLevel: Number.POSITIVE_INFINITY,
  ingredientIds: [],
  query: '',
};

export function filterRecipes(recipes: Recipe[], state: FilterState): Recipe[] {
  const q = state.query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (state.type !== 'all' && r.type !== state.type) return false;
    if (state.station !== 'all' && r.station !== state.station) return false;
    if (r.stationLevel > state.maxStationLevel) return false;

    if (state.ingredientIds.length > 0) {
      const ingIds = new Set(r.ingredients.map((i) => i.itemId));
      if (!state.ingredientIds.every((id) => ingIds.has(id))) return false;
    }

    if (q.length > 0) {
      const haystacks: string[] = [
        r.name.toLowerCase(),
        ...(r.tags ?? []).map((t) => t.toLowerCase()),
        ...r.ingredients.map((i) => i.itemId.toLowerCase()),
      ];
      if (!haystacks.some((h) => h.includes(q))) return false;
    }

    return true;
  });
}
```

Note: this implementation uses simple substring match, not uFuzzy. Fuzzy search is a UI-layer concern; we add it on top in the component. The pure filter function stays deterministic and easy to test.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test tests/filter.test.ts
```

Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filter.ts tests/filter.test.ts
git commit -m "feat(data): add pure filterRecipes function"
```

---

### Task 6: URL state encode/decode

**Files:**
- Create: `<repo>/src/lib/url-state.ts`
- Create: `<repo>/tests/url-state.test.ts`

- [ ] **Step 1: Write failing url-state test**

Create `<repo>/tests/url-state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encodeFilterState, decodeFilterState } from '../src/lib/url-state';

describe('URL state', () => {
  it('encodes all fields', () => {
    const params = encodeFilterState({
      type: 'crafting',
      station: 'forge',
      maxStationLevel: 3,
      ingredientIds: ['iron', 'wood'],
      query: 'sword',
    });
    expect(params.get('type')).toBe('crafting');
    expect(params.get('station')).toBe('forge');
    expect(params.get('lvl')).toBe('3');
    expect(params.get('ing')).toBe('iron,wood');
    expect(params.get('q')).toBe('sword');
  });

  it('omits default values from the URL', () => {
    const params = encodeFilterState({
      type: 'all',
      station: 'all',
      maxStationLevel: Number.POSITIVE_INFINITY,
      ingredientIds: [],
      query: '',
    });
    expect([...params.keys()]).toEqual([]);
  });

  it('decodes back to an equivalent state', () => {
    const params = new URLSearchParams('type=cooking&station=cauldron&lvl=1&ing=raspberries,blueberries&q=jam');
    const state = decodeFilterState(params);
    expect(state.type).toBe('cooking');
    expect(state.station).toBe('cauldron');
    expect(state.maxStationLevel).toBe(1);
    expect(state.ingredientIds).toEqual(['raspberries', 'blueberries']);
    expect(state.query).toBe('jam');
  });

  it('returns defaults when params are missing', () => {
    const state = decodeFilterState(new URLSearchParams(''));
    expect(state.type).toBe('all');
    expect(state.station).toBe('all');
    expect(state.maxStationLevel).toBe(Number.POSITIVE_INFINITY);
    expect(state.ingredientIds).toEqual([]);
    expect(state.query).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test tests/url-state.test.ts
```

Expected: FAIL — module `../src/lib/url-state` not found.

- [ ] **Step 3: Write src/lib/url-state.ts**

Create `<repo>/src/lib/url-state.ts`:

```ts
import type { FilterState } from './filter';
import type { RecipeType } from './types';

export function encodeFilterState(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.type !== 'all') params.set('type', state.type);
  if (state.station !== 'all') params.set('station', state.station);
  if (Number.isFinite(state.maxStationLevel)) {
    params.set('lvl', String(state.maxStationLevel));
  }
  if (state.ingredientIds.length > 0) {
    params.set('ing', state.ingredientIds.join(','));
  }
  if (state.query.trim().length > 0) {
    params.set('q', state.query.trim());
  }
  return params;
}

const recipeTypes: RecipeType[] = ['crafting', 'cooking'];

export function decodeFilterState(params: URLSearchParams): FilterState {
  const rawType = params.get('type');
  const type: FilterState['type'] =
    rawType && (recipeTypes as string[]).includes(rawType)
      ? (rawType as RecipeType)
      : 'all';

  const station = params.get('station') ?? 'all';

  const lvlRaw = params.get('lvl');
  const lvlParsed = lvlRaw == null ? NaN : Number.parseInt(lvlRaw, 10);
  const maxStationLevel = Number.isFinite(lvlParsed)
    ? lvlParsed
    : Number.POSITIVE_INFINITY;

  const ingRaw = params.get('ing');
  const ingredientIds = ingRaw
    ? ingRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const query = params.get('q') ?? '';

  return { type, station, maxStationLevel, ingredientIds, query };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test tests/url-state.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/url-state.ts tests/url-state.test.ts
git commit -m "feat(data): add URL state encode/decode"
```

---

## Phase 3: Real Data (Minimal Starter Set)

### Task 7: Add starter YAML data under src/data/

**Files:**
- Create: `<repo>/src/data/items.yaml`
- Create: `<repo>/src/data/stations.yaml`
- Create: `<repo>/src/data/recipes/crafting.yaml`
- Create: `<repo>/src/data/recipes/cooking.yaml`

This is a minimal starter set. It will be expanded later (either by hand or by the wiki scraper task). The point is: enough data for the site to feel real, and enough coverage to exercise every UI affordance.

- [ ] **Step 1: Write src/data/items.yaml**

Create `<repo>/src/data/items.yaml`:

```yaml
# Materials
- { id: wood, name: Wood, category: material }
- { id: fine-wood, name: Fine Wood, category: material }
- { id: core-wood, name: Core Wood, category: material }
- { id: stone, name: Stone, category: material }
- { id: flint, name: Flint, category: material }
- { id: copper, name: Copper, category: material }
- { id: tin, name: Tin, category: material }
- { id: bronze, name: Bronze, category: material }
- { id: iron, name: Iron, category: material }
- { id: silver, name: Silver, category: material }
- { id: black-metal, name: Black Metal, category: material }
- { id: leather-scraps, name: Leather Scraps, category: material }
- { id: deer-hide, name: Deer Hide, category: material }
- { id: troll-hide, name: Troll Hide, category: material }
- { id: wolf-pelt, name: Wolf Pelt, category: material }
- { id: lox-pelt, name: Lox Pelt, category: material }
- { id: feathers, name: Feathers, category: material }
- { id: deer-trophy, name: Deer Trophy, category: material }

# Cooking ingredients
- { id: raspberries, name: Raspberries, category: ingredient }
- { id: blueberries, name: Blueberries, category: ingredient }
- { id: cloudberries, name: Cloudberries, category: ingredient }
- { id: honey, name: Honey, category: ingredient }
- { id: mushroom, name: Mushroom, category: ingredient }
- { id: yellow-mushroom, name: Yellow Mushroom, category: ingredient }
- { id: carrot, name: Carrot, category: ingredient }
- { id: turnip, name: Turnip, category: ingredient }
- { id: boar-meat, name: Raw Meat, category: ingredient }
- { id: deer-meat, name: Deer Meat, category: ingredient }
- { id: neck-tail, name: Neck Tail, category: ingredient }
- { id: fish-raw, name: Raw Fish, category: ingredient }
```

- [ ] **Step 2: Write src/data/stations.yaml**

Create `<repo>/src/data/stations.yaml`:

```yaml
- id: workbench
  name: Workbench
  maxLevel: 5
  upgrades: []
- id: forge
  name: Forge
  maxLevel: 7
  upgrades: []
- id: cauldron
  name: Cauldron
  maxLevel: 5
  upgrades: []
- id: stonecutter
  name: Stonecutter
  maxLevel: 1
  upgrades: []
- id: artisan-table
  name: Artisan Table
  maxLevel: 1
  upgrades: []
- id: black-forge
  name: Black Forge
  maxLevel: 3
  upgrades: []
```

Note: we're leaving `upgrades: []` for now. Upgrade requirements can be filled in later; they're not needed for any MVP rendering path besides the expanded row's "needs X to upgrade" line, which gracefully handles empty arrays.

- [ ] **Step 3: Write src/data/recipes/crafting.yaml**

Create `<repo>/src/data/recipes/crafting.yaml`:

```yaml
# Minimal starter set — enough to exercise filters & reverse lookup.
# Expand by hand (or via the scraper in Task 20) as needed.

- id: stone-axe
  name: Stone Axe
  type: crafting
  station: workbench
  stationLevel: 1
  ingredients:
    - { itemId: wood, qty: 5 }
    - { itemId: stone, qty: 4 }
  tags: [axe, one-handed, tier-0]

- id: flint-axe
  name: Flint Axe
  type: crafting
  station: workbench
  stationLevel: 1
  ingredients:
    - { itemId: wood, qty: 5 }
    - { itemId: flint, qty: 6 }
  tags: [axe, one-handed, tier-1]

- id: bronze-sword
  name: Bronze Sword
  type: crafting
  station: forge
  stationLevel: 1
  ingredients:
    - { itemId: bronze, qty: 8 }
    - { itemId: wood, qty: 2 }
    - { itemId: leather-scraps, qty: 2 }
  tags: [sword, one-handed, tier-2]

- id: iron-sword
  name: Iron Sword
  type: crafting
  station: forge
  stationLevel: 2
  ingredients:
    - { itemId: iron, qty: 60 }
    - { itemId: wood, qty: 2 }
    - { itemId: leather-scraps, qty: 2 }
  tags: [sword, one-handed, tier-3]
  notes: Strong vs. skeletons and stonegolems.

- id: iron-mace
  name: Iron Mace
  type: crafting
  station: forge
  stationLevel: 2
  ingredients:
    - { itemId: iron, qty: 20 }
    - { itemId: wood, qty: 4 }
    - { itemId: leather-scraps, qty: 2 }
  tags: [mace, one-handed, tier-3]

- id: iron-buckler
  name: Iron Buckler
  type: crafting
  station: forge
  stationLevel: 2
  ingredients:
    - { itemId: iron, qty: 10 }
    - { itemId: wood, qty: 8 }
  tags: [shield, tier-3]

- id: silver-sword
  name: Silver Sword
  type: crafting
  station: forge
  stationLevel: 3
  ingredients:
    - { itemId: silver, qty: 40 }
    - { itemId: wood, qty: 4 }
    - { itemId: leather-scraps, qty: 2 }
  tags: [sword, one-handed, tier-4]
```

- [ ] **Step 4: Write src/data/recipes/cooking.yaml**

Create `<repo>/src/data/recipes/cooking.yaml`:

```yaml
- id: queens-jam
  name: Queens Jam
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: raspberries, qty: 8 }
    - { itemId: blueberries, qty: 6 }
  food:
    hp: 32
    stamina: 44
    duration: 1800
    regen: 2
  tags: [food, sustain, tier-2]

- id: carrot-soup
  name: Carrot Soup
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: carrot, qty: 3 }
    - { itemId: mushroom, qty: 1 }
  food:
    hp: 20
    stamina: 60
    duration: 1500
    regen: 2
  tags: [food, stamina, tier-2]

- id: turnip-stew
  name: Turnip Stew
  type: cooking
  station: cauldron
  stationLevel: 1
  ingredients:
    - { itemId: turnip, qty: 3 }
    - { itemId: boar-meat, qty: 1 }
  food:
    hp: 55
    stamina: 25
    duration: 2000
    regen: 3
  tags: [food, hp, tier-3]
```

- [ ] **Step 5: Verify data loads without errors**

Run a quick ad-hoc Vitest to make sure your real data passes validation. Create `<repo>/tests/real-data.test.ts`:

```ts
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
```

Run:

```bash
pnpm test tests/real-data.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/ tests/real-data.test.ts
git commit -m "feat(data): add minimal starter dataset"
```

---

### Task 8: Build-time data loader (Astro content virtual module)

**Files:**
- Create: `<repo>/src/lib/data.ts`

This exports a single function the Astro pages call at build time to get the fully-validated dataset and ship it to the Solid component as a prop.

- [ ] **Step 1: Write src/lib/data.ts**

Create `<repo>/src/lib/data.ts`:

```ts
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, type DataSet } from './loader';

const here = fileURLToPath(new URL('.', import.meta.url));
const dataRoot = resolve(here, '../data');

let cache: DataSet | null = null;

export async function getDataSet(): Promise<DataSet> {
  if (cache) return cache;
  cache = await loadAll(dataRoot);
  return cache;
}
```

- [ ] **Step 2: Smoke-check it from a throwaway script**

Run from `<repo>`:

```bash
pnpm exec tsx -e "import('./src/lib/data.ts').then(async (m) => { const d = await m.getDataSet(); console.log('ok', d.recipes.length); })"
```

If `tsx` isn't installed, install it first:

```bash
pnpm add -D tsx
```

Then re-run the one-liner.

Expected: prints `ok 10` (or however many recipes you have).

- [ ] **Step 3: Commit**

```bash
git add src/lib/data.ts package.json pnpm-lock.yaml
git commit -m "feat(data): add getDataSet build-time loader"
```

---

## Phase 4: Theme and Layout

### Task 9: Theme CSS (oklch, auto dark/light)

**Files:**
- Create: `<repo>/src/styles/theme.css`

Uses the user-provided oklch palette (hue 264, neutral blue). Dark mode is
the default; light mode activates automatically via
`@media (prefers-color-scheme: light)`. Component styles reference only
the semantic aliases (`--surface`, `--text-soft`, `--accent`, etc.), so the
aliases are the only layer Phase 5 touches.

- [ ] **Step 1: Write src/styles/theme.css**

Create `<repo>/src/styles/theme.css`:

```css
/* ===== Palette — dark (default) ===== */
:root {
  --bg-dark: oklch(0.1 0.025 264);
  --bg: oklch(0.15 0.025 264);
  --bg-light: oklch(0.2 0.025 264);
  --text: oklch(0.96 0.05 264);
  --text-muted: oklch(0.76 0.05 264);
  --highlight: oklch(0.5 0.05 264);
  --border: oklch(0.4 0.05 264);
  --border-muted: oklch(0.3 0.05 264);
  --primary: oklch(0.76 0.1 264);
  --secondary: oklch(0.76 0.1 84);
  --danger: oklch(0.7 0.05 30);
  --warning: oklch(0.7 0.05 100);
  --success: oklch(0.7 0.05 160);
  --info: oklch(0.7 0.05 260);
}

/* ===== Palette — light (auto via prefers-color-scheme) ===== */
@media (prefers-color-scheme: light) {
  :root {
    --bg-dark: oklch(0.92 0.025 264);
    --bg: oklch(0.96 0.025 264);
    --bg-light: oklch(1 0.025 264);
    --text: oklch(0.15 0.05 264);
    --text-muted: oklch(0.4 0.05 264);
    --highlight: oklch(1 0.05 264);
    --border: oklch(0.6 0.05 264);
    --border-muted: oklch(0.7 0.05 264);
    --primary: oklch(0.4 0.1 264);
    --secondary: oklch(0.4 0.1 84);
    --danger: oklch(0.5 0.05 30);
    --warning: oklch(0.5 0.05 100);
    --success: oklch(0.5 0.05 160);
    --info: oklch(0.5 0.05 260);
  }
}

/* ===== Semantic aliases (used by component styles) =====
 * These let the component CSS stay stable across palette changes.
 * `color-mix` is resolved lazily per use site, so it picks up the
 * current `--primary` under both dark and light modes automatically.
 */
:root {
  --surface: var(--bg-light);       /* cards, table, filter bar */
  --surface-sunken: var(--bg-dark); /* expanded rows, pressed states */
  --border-soft: var(--border-muted);
  --text-soft: var(--text-muted);
  --muted: var(--text-muted);
  --accent: var(--primary);
  --accent-bg: color-mix(in oklch, var(--primary) 18%, transparent);
  --accent-border: var(--primary);

  --radius: 6px;
  --radius-sm: 4px;

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui,
    sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
}

a {
  color: var(--accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

h1,
h2,
h3 {
  color: var(--text);
  margin: 0 0 8px;
  font-weight: 600;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}

.site-header {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  padding: 14px 20px;
}
.site-header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20px;
}
.site-header .brand {
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.5px;
}
.site-header nav {
  display: flex;
  gap: 16px;
  font-size: 13px;
}
.site-header nav a {
  color: var(--text-soft);
}
.site-header nav a:hover,
.site-header nav a[aria-current="page"] {
  color: var(--accent);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat(theme): add oklch theme with auto dark/light mode"
```

---

### Task 10: Base layout

**Files:**
- Create: `<repo>/src/layouts/Base.astro`

- [ ] **Step 1: Write src/layouts/Base.astro**

Create `<repo>/src/layouts/Base.astro`:

```astro
---
import '../styles/theme.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Valheim helper — recipes, stations, reverse lookup.' } = Astro.props;
const base = import.meta.env.BASE_URL;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <header class="site-header">
      <div class="site-header-inner">
        <a href={base} class="brand">⚔ Valheim Helper</a>
        <nav>
          <a href={base}>Recipes</a>
          <a href={`${base}about/`}>About</a>
        </nav>
      </div>
    </header>
    <main class="container">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 2: Verify build still works**

```bash
pnpm build
```

Expected: builds cleanly. (No visual test yet — page still uses placeholder index.)

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat(layout): add Base layout with header and nav"
```

---

## Phase 5: Recipe Table Component (SolidJS Island)

### Task 11: IngredientChip subcomponent

**Files:**
- Create: `<repo>/src/components/IngredientChip.tsx`

- [ ] **Step 1: Write src/components/IngredientChip.tsx**

Create `<repo>/src/components/IngredientChip.tsx`:

```tsx
import type { Component } from 'solid-js';

interface Props {
  itemId: string;
  label: string;
  qty?: number;
  onClick?: (itemId: string) => void;
  variant?: 'ingredient' | 'active-filter';
}

export const IngredientChip: Component<Props> = (props) => {
  const clickable = typeof props.onClick === 'function';
  const variant = () => props.variant ?? 'ingredient';

  return (
    <button
      type="button"
      class={`chip chip--${variant()}`}
      data-item-id={props.itemId}
      disabled={!clickable}
      onClick={() => props.onClick?.(props.itemId)}
    >
      {props.label}
      {props.qty != null && <span class="chip__qty"> ×{props.qty}</span>}
    </button>
  );
};
```

(Styles for `.chip` are added in the RecipeTable scoped styles in a later task.)

- [ ] **Step 2: Commit**

```bash
git add src/components/IngredientChip.tsx
git commit -m "feat(component): add IngredientChip"
```

---

### Task 12: RecipeRow subcomponent

**Files:**
- Create: `<repo>/src/components/RecipeRow.tsx`
- Create: `<repo>/tests/components/RecipeRow.test.tsx`

- [ ] **Step 1: Write failing RecipeRow test**

Create `<repo>/tests/components/RecipeRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { RecipeRow } from '../../src/components/RecipeRow';
import type { Recipe, Item, Station } from '../../src/lib/types';

const recipe: Recipe = {
  id: 'iron-sword',
  name: 'Iron Sword',
  type: 'crafting',
  station: 'forge',
  stationLevel: 2,
  ingredients: [
    { itemId: 'iron', qty: 60 },
    { itemId: 'wood', qty: 2 },
  ],
  tags: ['sword', 'one-handed'],
  notes: 'Strong vs skeletons.',
};

const itemsById = new Map<string, Item>([
  ['iron', { id: 'iron', name: 'Iron', category: 'material' }],
  ['wood', { id: 'wood', name: 'Wood', category: 'material' }],
]);

const stationsById = new Map<string, Station>([
  ['forge', { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] }],
]);

describe('RecipeRow', () => {
  it('renders collapsed summary', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Forge')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Notes not shown when collapsed
    expect(screen.queryByText(/Strong vs skeletons/)).toBeNull();
  });

  it('shows notes and ingredient chips when expanded', () => {
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={() => {}}
      />
    ));
    expect(screen.getByText(/Strong vs skeletons/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iron ×60/ })).toBeInTheDocument();
  });

  it('calls onToggle when the summary is clicked', () => {
    const onToggle = vi.fn();
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={false}
        baseHref="/valheim/"
        onToggle={onToggle}
        onIngredientClick={() => {}}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    expect(onToggle).toHaveBeenCalledWith('iron-sword');
  });

  it('calls onIngredientClick when an ingredient chip is clicked (expanded)', () => {
    const onIngredientClick = vi.fn();
    render(() => (
      <RecipeRow
        recipe={recipe}
        itemsById={itemsById}
        stationsById={stationsById}
        expanded={true}
        baseHref="/valheim/"
        onToggle={() => {}}
        onIngredientClick={onIngredientClick}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: /Iron ×60/ }));
    expect(onIngredientClick).toHaveBeenCalledWith('iron');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test tests/components/RecipeRow.test.tsx
```

Expected: FAIL — module `../../src/components/RecipeRow` not found.

- [ ] **Step 3: Write src/components/RecipeRow.tsx**

Create `<repo>/src/components/RecipeRow.tsx`:

```tsx
import { For, Show, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { IngredientChip } from './IngredientChip';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  onToggle: (recipeId: string) => void;
  onIngredientClick: (itemId: string) => void;
}

function formatIngredients(
  recipe: Recipe,
  itemsById: Map<string, Item>,
): string {
  return recipe.ingredients
    .map((i) => `${itemsById.get(i.itemId)?.name ?? i.itemId} ×${i.qty}`)
    .join(', ');
}

export const RecipeRow: Component<Props> = (props) => {
  return (
    <>
      <button
        type="button"
        class="recipe-row"
        classList={{ 'recipe-row--expanded': props.expanded }}
        aria-expanded={props.expanded}
        onClick={() => props.onToggle(props.recipe.id)}
      >
        <span class="recipe-row__name">
          {props.expanded ? '▾ ' : ''}
          {props.recipe.name}
        </span>
        <span class="recipe-row__station">
          {props.stationsById.get(props.recipe.station)?.name ?? props.recipe.station}
        </span>
        <span class="recipe-row__lvl">{props.recipe.stationLevel}</span>
        <span class="recipe-row__ings">
          {formatIngredients(props.recipe, props.itemsById)}
        </span>
        <span class="recipe-row__tags">
          {(props.recipe.tags ?? []).join(' · ')}
        </span>
      </button>

      <Show when={props.expanded}>
        <div class="recipe-row__detail">
          <div class="recipe-row__section">
            <span class="label">Ingredients</span>
            <div class="chips">
              <For each={props.recipe.ingredients}>
                {(ing) => (
                  <IngredientChip
                    itemId={ing.itemId}
                    label={props.itemsById.get(ing.itemId)?.name ?? ing.itemId}
                    qty={ing.qty}
                    onClick={props.onIngredientClick}
                  />
                )}
              </For>
            </div>
          </div>

          <Show when={props.recipe.food}>
            {(food) => (
              <div class="recipe-row__section">
                <span class="label">Food stats</span>
                <div class="food-stats">
                  <span>HP {food().hp}</span>
                  <span>Stam {food().stamina}</span>
                  <span>Regen {food().regen}</span>
                  <span>Duration {Math.round(food().duration / 60)}m</span>
                </div>
              </div>
            )}
          </Show>

          <Show when={props.recipe.notes}>
            <div class="recipe-row__section recipe-row__notes">
              {props.recipe.notes}
            </div>
          </Show>

          <a
            class="recipe-row__permalink"
            href={`${props.baseHref}recipes/${props.recipe.id}/`}
          >
            ↗ open detail page
          </a>
        </div>
      </Show>
    </>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test tests/components/RecipeRow.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/RecipeRow.tsx tests/components/RecipeRow.test.tsx
git commit -m "feat(component): add RecipeRow with collapsed/expanded states"
```

---

### Task 13: FilterBar subcomponent

**Files:**
- Create: `<repo>/src/components/FilterBar.tsx`
- Create: `<repo>/tests/components/FilterBar.test.tsx`

- [ ] **Step 1: Write failing FilterBar test**

Create `<repo>/tests/components/FilterBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { FilterBar } from '../../src/components/FilterBar';
import type { FilterState } from '../../src/lib/filter';
import type { Station } from '../../src/lib/types';

const stations: Station[] = [
  { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] },
  { id: 'cauldron', name: 'Cauldron', maxLevel: 5, upgrades: [] },
];

const empty: FilterState = {
  type: 'all',
  station: 'all',
  maxStationLevel: Number.POSITIVE_INFINITY,
  ingredientIds: [],
  query: '',
};

describe('FilterBar', () => {
  it('renders type chips and station dropdown', () => {
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={() => {}} />
    ));
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crafting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cooking' })).toBeInTheDocument();
    expect(screen.getByLabelText(/station/i)).toBeInTheDocument();
  });

  it('emits a new state when a type chip is clicked', () => {
    const onChange = vi.fn();
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={onChange} />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Cooking' }));
    expect(onChange).toHaveBeenCalled();
    const newState = onChange.mock.calls[0][0] as FilterState;
    expect(newState.type).toBe('cooking');
  });

  it('emits a new state when the search input changes', () => {
    const onChange = vi.fn();
    render(() => (
      <FilterBar state={empty} stations={stations} onChange={onChange} />
    ));
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'sword' } });
    expect(onChange).toHaveBeenCalled();
    const newState = onChange.mock.calls[0][0] as FilterState;
    expect(newState.query).toBe('sword');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test tests/components/FilterBar.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write src/components/FilterBar.tsx**

Create `<repo>/src/components/FilterBar.tsx`:

```tsx
import { For, type Component } from 'solid-js';
import type { FilterState } from '../lib/filter';
import type { Station, RecipeType } from '../lib/types';

interface Props {
  state: FilterState;
  stations: Station[];
  onChange: (next: FilterState) => void;
}

const typeChips: Array<{ value: FilterState['type']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'cooking', label: 'Cooking' },
];

export const FilterBar: Component<Props> = (props) => {
  const update = (patch: Partial<FilterState>) =>
    props.onChange({ ...props.state, ...patch });

  return (
    <div class="filter-bar">
      <div class="filter-bar__chips" role="group" aria-label="Recipe type">
        <For each={typeChips}>
          {(chip) => (
            <button
              type="button"
              class="filter-chip"
              classList={{ 'filter-chip--active': props.state.type === chip.value }}
              onClick={() => update({ type: chip.value })}
            >
              {chip.label}
            </button>
          )}
        </For>
      </div>

      <label class="filter-bar__station">
        <span class="sr-only">Station</span>
        <select
          aria-label="Station"
          value={props.state.station}
          onChange={(e) => update({ station: e.currentTarget.value })}
        >
          <option value="all">All stations</option>
          <For each={props.stations}>
            {(s) => <option value={s.id}>{s.name}</option>}
          </For>
        </select>
      </label>

      <label class="filter-bar__level">
        <span class="label">Max Lvl</span>
        <input
          type="range"
          min="1"
          max="7"
          value={Number.isFinite(props.state.maxStationLevel) ? String(props.state.maxStationLevel) : '7'}
          onInput={(e) =>
            update({ maxStationLevel: Number.parseInt(e.currentTarget.value, 10) })
          }
        />
        <span class="filter-bar__level-value">
          {Number.isFinite(props.state.maxStationLevel) ? props.state.maxStationLevel : 7}
        </span>
      </label>

      <input
        type="search"
        class="filter-bar__search"
        placeholder="Search recipes, ingredients, tags…"
        value={props.state.query}
        onInput={(e) => update({ query: e.currentTarget.value })}
      />
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test tests/components/FilterBar.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterBar.tsx tests/components/FilterBar.test.tsx
git commit -m "feat(component): add FilterBar"
```

---

### Task 14: RecipeTable (top-level island)

**Files:**
- Create: `<repo>/src/components/RecipeTable.tsx`
- Create: `<repo>/tests/components/RecipeTable.test.tsx`

- [ ] **Step 1: Write failing RecipeTable test**

Create `<repo>/tests/components/RecipeTable.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@solidjs/testing-library';
import { RecipeTable } from '../../src/components/RecipeTable';
import type { DataSet } from '../../src/lib/loader';

const data: DataSet = {
  items: [
    { id: 'iron', name: 'Iron', category: 'material' },
    { id: 'wood', name: 'Wood', category: 'material' },
    { id: 'raspberries', name: 'Raspberries', category: 'ingredient' },
    { id: 'blueberries', name: 'Blueberries', category: 'ingredient' },
  ],
  stations: [
    { id: 'forge', name: 'Forge', maxLevel: 7, upgrades: [] },
    { id: 'cauldron', name: 'Cauldron', maxLevel: 5, upgrades: [] },
  ],
  recipes: [
    {
      id: 'iron-sword',
      name: 'Iron Sword',
      type: 'crafting',
      station: 'forge',
      stationLevel: 2,
      ingredients: [
        { itemId: 'iron', qty: 60 },
        { itemId: 'wood', qty: 2 },
      ],
      tags: ['sword'],
    },
    {
      id: 'queens-jam',
      name: 'Queens Jam',
      type: 'cooking',
      station: 'cauldron',
      stationLevel: 1,
      ingredients: [
        { itemId: 'raspberries', qty: 8 },
        { itemId: 'blueberries', qty: 6 },
      ],
    },
  ],
};

beforeEach(() => {
  // Reset URL so tests don't leak filter state into one another.
  window.history.replaceState({}, '', '/valheim/');
});

describe('RecipeTable', () => {
  it('renders all recipes by default', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });

  it('filters by type chip', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cooking' }));
    expect(screen.queryByText('Iron Sword')).toBeNull();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });

  it('filters by text search', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    const input = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'sword' } });
    expect(screen.getByText('Iron Sword')).toBeInTheDocument();
    expect(screen.queryByText('Queens Jam')).toBeNull();
  });

  it('expands a row when clicked', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    expect(screen.getByRole('button', { name: /Iron ×60/ })).toBeInTheDocument();
  });

  it('filters by ingredient chip click', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    fireEvent.click(screen.getByRole('button', { name: /Iron Sword/ }));
    fireEvent.click(screen.getByRole('button', { name: /Iron ×60/ }));
    // After filtering to recipes that use Iron, Queens Jam should be gone.
    expect(screen.queryByText('Queens Jam')).toBeNull();
    // The active ingredient chip should appear in the reverse-lookup strip.
    expect(screen.getByText(/Uses ingredient/)).toBeInTheDocument();
  });

  it('syncs filter state to URL query params', () => {
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cooking' }));
    expect(window.location.search).toContain('type=cooking');
  });

  it('reads initial state from URL query params', () => {
    window.history.replaceState({}, '', '/valheim/?type=cooking');
    render(() => <RecipeTable data={data} baseHref="/valheim/" />);
    expect(screen.queryByText('Iron Sword')).toBeNull();
    expect(screen.getByText('Queens Jam')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test tests/components/RecipeTable.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write src/components/RecipeTable.tsx**

Create `<repo>/src/components/RecipeTable.tsx`:

```tsx
import { For, Show, createMemo, createSignal, onMount, type Component } from 'solid-js';
import type { DataSet } from '../lib/loader';
import type { FilterState } from '../lib/filter';
import { filterRecipes, emptyFilterState } from '../lib/filter';
import { decodeFilterState, encodeFilterState } from '../lib/url-state';
import { FilterBar } from './FilterBar';
import { RecipeRow } from './RecipeRow';
import { IngredientChip } from './IngredientChip';

interface Props {
  data: DataSet;
  baseHref: string;
}

export const RecipeTable: Component<Props> = (props) => {
  const [state, setState] = createSignal<FilterState>(emptyFilterState);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setState(decodeFilterState(params));
  });

  const itemsById = createMemo(
    () => new Map(props.data.items.map((i) => [i.id, i])),
  );

  const stationsById = createMemo(
    () => new Map(props.data.stations.map((s) => [s.id, s])),
  );

  const filtered = createMemo(() => filterRecipes(props.data.recipes, state()));

  const commit = (next: FilterState) => {
    setState(next);
    const params = encodeFilterState(next);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  const addIngredient = (itemId: string) => {
    const current = state().ingredientIds;
    if (current.includes(itemId)) return;
    commit({ ...state(), ingredientIds: [...current, itemId] });
  };

  const removeIngredient = (itemId: string) => {
    commit({
      ...state(),
      ingredientIds: state().ingredientIds.filter((id) => id !== itemId),
    });
  };

  const activeIngredientLabel = (id: string) =>
    itemsById().get(id)?.name ?? id;

  return (
    <div class="recipe-table">
      <FilterBar state={state()} stations={props.data.stations} onChange={commit} />

      <Show when={state().ingredientIds.length > 0}>
        <div class="reverse-lookup-strip">
          <span class="label">Uses ingredient:</span>
          <For each={state().ingredientIds}>
            {(id) => (
              <button
                type="button"
                class="chip chip--active-filter"
                onClick={() => removeIngredient(id)}
              >
                {activeIngredientLabel(id)} ✕
              </button>
            )}
          </For>
        </div>
      </Show>

      <div class="recipe-table__grid" role="table">
        <div class="recipe-table__header" role="row">
          <span role="columnheader">Name</span>
          <span role="columnheader">Station</span>
          <span role="columnheader">Lvl</span>
          <span role="columnheader">Ingredients</span>
          <span role="columnheader">Tags</span>
        </div>

        <For each={filtered()} fallback={<div class="recipe-table__empty">No recipes match these filters.</div>}>
          {(recipe) => (
            <RecipeRow
              recipe={recipe}
              itemsById={itemsById()}
              stationsById={stationsById()}
              expanded={expandedId() === recipe.id}
              baseHref={props.baseHref}
              onToggle={toggleRow}
              onIngredientClick={addIngredient}
            />
          )}
        </For>
      </div>

      <div class="recipe-table__footer">
        Showing {filtered().length} of {props.data.recipes.length} recipes
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test tests/components/RecipeTable.test.tsx
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/RecipeTable.tsx tests/components/RecipeTable.test.tsx
git commit -m "feat(component): add RecipeTable with filter, expand, and URL sync"
```

---

### Task 15: Component styles

**Files:**
- Modify: `<repo>/src/styles/theme.css` (append component styles)

- [ ] **Step 1: Append component CSS to theme.css**

Open `<repo>/src/styles/theme.css` and append (keep all existing content — this is additive):

```css
/* ===== Filter bar ===== */
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.filter-bar__chips {
  display: flex;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.filter-chip {
  background: transparent;
  border: 0;
  color: var(--text-soft);
  padding: 8px 14px;
  font: inherit;
  cursor: pointer;
}
.filter-chip--active {
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
}
.filter-bar select,
.filter-bar__search {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  padding: 8px 12px;
  font: inherit;
}
.filter-bar__search {
  flex: 1;
  min-width: 200px;
}
.filter-bar__level {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 12px;
  color: var(--text);
  font-size: 12px;
}
.filter-bar__level-value {
  color: var(--accent);
  font-weight: 600;
  min-width: 14px;
  text-align: right;
}

/* ===== Reverse lookup strip ===== */
.reverse-lookup-strip {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
}
.reverse-lookup-strip .label {
  color: var(--muted);
  text-transform: none;
  font-size: 12px;
}

/* ===== Chips ===== */
.chip {
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  color: var(--text);
  padding: 3px 10px;
  border-radius: 999px;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.chip:disabled {
  cursor: default;
}
.chip--active-filter {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}
.chip__qty {
  color: var(--text-soft);
  margin-left: 2px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ===== Recipe table grid ===== */
.recipe-table__grid {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.recipe-table__header,
.recipe-row {
  display: grid;
  grid-template-columns: 2fr 1fr 60px 3fr 1fr;
  gap: 12px;
  padding: 10px 14px;
  align-items: center;
  font-size: 13px;
  border-bottom: 1px solid var(--border-soft);
}
.recipe-table__header {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  background: var(--surface);
}
.recipe-row {
  background: transparent;
  border-top: 0;
  border-left: 0;
  border-right: 0;
  text-align: left;
  color: var(--text);
  cursor: pointer;
  font: inherit;
}
.recipe-row:hover {
  background: var(--surface-sunken);
}
.recipe-row--expanded {
  background: var(--surface-sunken);
}
.recipe-row__name {
  font-weight: 500;
}
.recipe-row--expanded .recipe-row__name {
  color: var(--accent);
}
.recipe-row__station,
.recipe-row__lvl,
.recipe-row__ings {
  color: var(--text-soft);
}
.recipe-row__tags {
  color: var(--muted);
  font-size: 11px;
}
.recipe-row__detail {
  padding: 14px 18px 18px 34px;
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--border-soft);
  font-size: 12px;
  color: var(--text);
}
.recipe-row__section {
  margin-bottom: 10px;
}
.recipe-row__section .label {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 9px;
  display: block;
  margin-bottom: 4px;
}
.recipe-row__notes {
  color: var(--text-soft);
}
.recipe-row__permalink {
  display: inline-block;
  margin-top: 4px;
}
.food-stats {
  display: flex;
  gap: 14px;
  color: var(--text);
}
.recipe-table__empty {
  padding: 24px;
  text-align: center;
  color: var(--muted);
}
.recipe-table__footer {
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
}
```

- [ ] **Step 2: Run tests to make sure nothing regressed**

```bash
pnpm test
```

Expected: all tests PASS (schema, loader, filter, url-state, real-data, RecipeRow, FilterBar, RecipeTable).

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat(style): add component styles for recipe table"
```

---

## Phase 6: Pages

### Task 16: Wire the home page to mount RecipeTable

**Files:**
- Modify: `<repo>/src/pages/index.astro` (full rewrite)

- [ ] **Step 1: Overwrite src/pages/index.astro**

Replace the contents of `<repo>/src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import { getDataSet } from '../lib/data';
import { RecipeTable } from '../components/RecipeTable';

const data = await getDataSet();
const base = import.meta.env.BASE_URL;
---
<Base title="Valheim Recipes">
  <h1>Recipes</h1>
  <p class="subtitle">Filterable crafting + cooking reference. Click a row to expand; click an ingredient to reverse-lookup.</p>
  <RecipeTable client:load data={data} baseHref={base} />
</Base>
```

- [ ] **Step 2: Start dev server and eyeball it**

```bash
pnpm dev
```

Open `http://localhost:4321/valheim/` in a browser. Verify:

- Page loads with the dark theme
- Filter bar shows All / Crafting / Cooking + station dropdown + slider + search
- Table shows all starter recipes
- Clicking a type chip filters the rows
- Clicking a row expands it and shows ingredient chips
- Clicking an ingredient chip filters the table and shows the "Uses ingredient: X ✕" strip
- URL updates as filters change
- Reloading the page with filters preserves them

Stop the dev server with Ctrl-C once happy.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(page): wire home page to RecipeTable"
```

---

### Task 17: Recipe detail pages

**Files:**
- Create: `<repo>/src/pages/recipes/[slug].astro`

- [ ] **Step 1: Write src/pages/recipes/[slug].astro**

Create `<repo>/src/pages/recipes/[slug].astro`:

```astro
---
import Base from '../../layouts/Base.astro';
import { getDataSet } from '../../lib/data';
import type { Recipe, Item } from '../../lib/types';

export async function getStaticPaths() {
  const data = await getDataSet();
  return data.recipes.map((r) => ({ params: { slug: r.id }, props: { recipeId: r.id } }));
}

const { recipeId } = Astro.props as { recipeId: string };
const data = await getDataSet();
const recipe = data.recipes.find((r) => r.id === recipeId) as Recipe;
const itemsById = new Map<string, Item>(data.items.map((i) => [i.id, i]));
const station = data.stations.find((s) => s.id === recipe.station);

// Reverse lookup: recipes whose ingredients include this recipe's yielded item.
const yieldsId = recipe.yields?.itemId ?? recipe.id;
const usedIn = data.recipes.filter(
  (r) => r.id !== recipe.id && r.ingredients.some((i) => i.itemId === yieldsId),
);

const base = import.meta.env.BASE_URL;
---
<Base title={`${recipe.name} — Valheim Helper`}>
  <p><a href={base}>← Back to all recipes</a></p>
  <h1>{recipe.name}</h1>
  <p class="subtitle">
    {recipe.type === 'crafting' ? 'Crafting' : 'Cooking'} · {station?.name ?? recipe.station} · Level {recipe.stationLevel}
  </p>

  <section class="detail-section">
    <h2>Ingredients</h2>
    <ul class="detail-list">
      {recipe.ingredients.map((i) => (
        <li>
          <a href={`${base}?ing=${i.itemId}`}>
            {itemsById.get(i.itemId)?.name ?? i.itemId}
          </a>
          {' '}× {i.qty}
        </li>
      ))}
    </ul>
  </section>

  {recipe.food && (
    <section class="detail-section">
      <h2>Food stats</h2>
      <ul class="detail-list">
        <li>HP: {recipe.food.hp}</li>
        <li>Stamina: {recipe.food.stamina}</li>
        <li>Regen: {recipe.food.regen}</li>
        <li>Duration: {Math.round(recipe.food.duration / 60)} min</li>
      </ul>
    </section>
  )}

  {recipe.notes && (
    <section class="detail-section">
      <h2>Notes</h2>
      <p>{recipe.notes}</p>
    </section>
  )}

  {usedIn.length > 0 && (
    <section class="detail-section">
      <h2>Used as ingredient in</h2>
      <ul class="detail-list">
        {usedIn.map((r) => (
          <li>
            <a href={`${base}recipes/${r.id}/`}>{r.name}</a>
          </li>
        ))}
      </ul>
    </section>
  )}
</Base>

<style>
  .detail-section { margin: 24px 0; }
  .detail-list { list-style: disc; padding-left: 24px; }
  .detail-list li { margin: 4px 0; }
  .subtitle { color: var(--muted); margin-top: -4px; }
</style>
```

- [ ] **Step 2: Build and verify detail pages exist**

```bash
pnpm build
ls dist/valheim/recipes/iron-sword/index.html
ls dist/valheim/recipes/queens-jam/index.html
```

Expected: both files exist.

- [ ] **Step 3: Commit**

```bash
git add src/pages/recipes/[slug].astro
git commit -m "feat(page): add per-recipe detail pages"
```

---

### Task 18: About page

**Files:**
- Create: `<repo>/src/pages/about.astro`

- [ ] **Step 1: Write src/pages/about.astro**

Create `<repo>/src/pages/about.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="About — Valheim Helper">
  <h1>About</h1>
  <p>
    Valheim Helper is a filterable reference for crafting and cooking recipes.
    Pick a row to expand it; click any ingredient to reverse-lookup recipes
    that use it. Filter state is encoded in the URL so you can share filtered
    views.
  </p>

  <h2>Data</h2>
  <p>
    Recipe data is hand-curated in YAML inside the repository. If you spot
    an error or want to contribute, please open an issue or PR at
    <a href="https://github.com/dobbo-ca/valheim-helper/issues">
      dobbo-ca/valheim-helper
    </a>.
  </p>

  <h2>Credits</h2>
  <p>
    Initial data was seeded from the
    <a href="https://valheim.fandom.com/">Valheim wiki</a>.
    Valheim is © Iron Gate Studio.
  </p>
</Base>
```

- [ ] **Step 2: Build and verify**

```bash
pnpm build
ls dist/valheim/about/index.html
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat(page): add About page"
```

---

## Phase 7: End-to-End Smoke Tests

### Task 19: Playwright smoke test

**Files:**
- Create: `<repo>/tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write tests/e2e/smoke.spec.ts**

Create `<repo>/tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('valheim helper smoke', () => {
  test('home page loads and shows recipes', async ({ page }) => {
    await page.goto('/valheim/');
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await expect(page.getByText('Iron Sword')).toBeVisible();
    await expect(page.getByText('Queens Jam')).toBeVisible();
  });

  test('type chip filters the table', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: 'Cooking' }).click();
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('expanding a row reveals ingredient chips', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await expect(page.getByRole('button', { name: /Iron ×60/ })).toBeVisible();
  });

  test('clicking an ingredient chip reverse-filters', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await page.getByRole('button', { name: /Iron ×60/ }).click();
    await expect(page.getByText('Uses ingredient:')).toBeVisible();
    await expect(page.getByText('Queens Jam')).not.toBeVisible();
  });

  test('URL state survives reload', async ({ page }) => {
    await page.goto('/valheim/?type=cooking');
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('detail page is reachable', async ({ page }) => {
    await page.goto('/valheim/recipes/iron-sword/');
    await expect(page.getByRole('heading', { name: 'Iron Sword' })).toBeVisible();
    await expect(page.getByText(/Used as ingredient in|Ingredients/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the Playwright smoke tests**

```bash
pnpm build
pnpm test:e2e
```

Expected: all 6 tests PASS. (Playwright's `webServer` config will spin up `pnpm preview` and tear it down after.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test(e2e): add Playwright smoke tests"
```

---

## Phase 8: CI and Deploy

### Task 20: CI workflow (lint, test, build)

**Files:**
- Create: `<repo>/.github/workflows/ci.yml`

- [ ] **Step 1: Write .github/workflows/ci.yml**

Create `<repo>/.github/workflows/ci.yml`:

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit + component tests
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Install Playwright browser
        run: pnpm exec playwright install chromium --with-deps

      - name: E2E smoke
        run: pnpm test:e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add ci workflow (typecheck, test, build, e2e)"
```

---

### Task 21: Deploy workflow (sync to cdobbyn.github.io/valheim/)

**Files:**
- Create: `<repo>/.github/workflows/deploy.yml`
- Create: `<repo>/docs/DEPLOY.md`

This task requires one-time GitHub App setup. The workflow uses the App installation token to push into a different org's repo.

- [ ] **Step 1: Write docs/DEPLOY.md**

Create `<repo>/docs/DEPLOY.md`:

```markdown
# Deploy

The site source lives in `dobbo-ca/valheim-helper` and publishes to
`cdobbyn/cdobbyn.github.io` under the `valheim/` subdirectory. The Pages
repo serves it at `https://www.dobbo.ca/valheim/` via its existing CNAME.

## One-time GitHub App setup

1. Go to https://github.com/organizations/dobbo-ca/settings/apps/new (or your
   user settings if you prefer a user-owned App).
2. Name: `dobbo-ca-valheim-deploy`
3. Homepage URL: `https://www.dobbo.ca/valheim/`
4. Webhook: unchecked.
5. Repository permissions:
   - **Contents: Read and write**
   - **Metadata: Read** (required by default)
6. Where can this app be installed: **Any account**.
7. Create the App. Note the **App ID**.
8. Generate and download a **private key** (`.pem` file). Keep it secret.
9. Install the App on:
   - `dobbo-ca/valheim-helper` — select only this repo
   - `cdobbyn/cdobbyn.github.io` — select only this repo
10. In `dobbo-ca/valheim-helper` → Settings → Secrets and variables → Actions:
    - Add `DEPLOY_APP_ID` = the App ID
    - Add `DEPLOY_APP_PRIVATE_KEY` = the contents of the `.pem` file

## How the workflow works

`deploy.yml` runs on every push to `main` after CI succeeds:

1. Build the site (`pnpm build` → `dist/`).
2. Mint a short-lived installation token for the GitHub App
   (`actions/create-github-app-token@v1`).
3. Checkout `cdobbyn/cdobbyn.github.io` using that token.
4. Remove its existing `valheim/` directory and copy `dist/*` into it.
5. Commit and push. GitHub Pages picks up the change automatically.

## Rollback

Revert the bad commit in `cdobbyn/cdobbyn.github.io` directly:

```bash
gh repo clone cdobbyn/cdobbyn.github.io
cd cdobbyn.github.io
git revert <bad-sha>
git push
```

A fresh deploy from `dobbo-ca/valheim-helper` will overwrite the `valheim/`
directory again on the next push to `main`, so you may also need to revert
the source change.
```

- [ ] **Step 2: Write .github/workflows/deploy.yml**

Create `<repo>/.github/workflows/deploy.yml`:

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-valheim-helper
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

      - name: Mint GitHub App token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.DEPLOY_APP_ID }}
          private-key: ${{ secrets.DEPLOY_APP_PRIVATE_KEY }}
          owner: cdobbyn
          repositories: cdobbyn.github.io

      - name: Checkout Pages repo
        uses: actions/checkout@v4
        with:
          repository: cdobbyn/cdobbyn.github.io
          token: ${{ steps.app-token.outputs.token }}
          path: pages-repo
          fetch-depth: 1

      - name: Sync dist/ into pages-repo/valheim/
        run: |
          set -euo pipefail
          rm -rf pages-repo/valheim
          mkdir -p pages-repo/valheim
          cp -a dist/valheim/. pages-repo/valheim/

      - name: Commit and push
        working-directory: pages-repo
        env:
          GITHUB_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          set -euo pipefail
          git config user.name  "dobbo-ca-valheim-deploy[bot]"
          git config user.email "dobbo-ca-valheim-deploy[bot]@users.noreply.github.com"
          git add valheim
          if git diff --cached --quiet; then
            echo "No changes to deploy."
            exit 0
          fi
          SHA=$(git -C .. rev-parse --short HEAD)
          git commit -m "deploy: valheim-helper @ ${SHA}"
          git push origin HEAD
```

- [ ] **Step 3: Commit (workflow won't run until repo is pushed and App is installed)**

```bash
git add .github/workflows/deploy.yml docs/DEPLOY.md
git commit -m "ci: add deploy workflow + GitHub App setup docs"
```

---

## Phase 9: Seed Scraper (Optional, Can Defer)

### Task 22: One-off wiki scraper script

**Files:**
- Create: `<repo>/scripts/scrape-wiki.ts`
- Modify: `<repo>/package.json` (add `seed:scrape` script)

This task is optional and can be done at any time after Phase 2 is in place.
It replaces the minimal starter set with data scraped from the official
Valheim wiki. The script writes directly to `src/data/` YAML files and you
then review and hand-edit as needed before committing.

- [ ] **Step 1: Install scraper-only dev deps**

```bash
pnpm add -D cheerio node-html-parser
```

- [ ] **Step 2: Write scripts/scrape-wiki.ts**

Create `<repo>/scripts/scrape-wiki.ts`:

```ts
/**
 * One-off seed scraper for the Valheim wiki.
 *
 * Intentionally NOT wired into the build. Run manually:
 *
 *   pnpm seed:scrape
 *
 * Review the resulting YAML diffs by hand before committing. The scraper
 * produces "best-effort" data; expect to fix naming, tags, and missing
 * fields by hand.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:url';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { stringify } from 'yaml';

const here = fileURLToPath(new URL('.', import.meta.url));
const dataDir = new URL('../src/data/', import.meta.url);

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'valheim-helper-seed/1.0 (+https://www.dobbo.ca/valheim/)' },
  });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.text();
}

// ---- Scraper implementations ----
// Each function returns a structured object that matches our Zod schemas.
// These are deliberately minimal — fill in gaps by hand.

async function scrapeItems() {
  console.warn('scrapeItems: TODO — fill in once you know which wiki index page is most complete.');
  return [];
}

async function scrapeStations() {
  console.warn('scrapeStations: TODO — the wiki lists stations on the "Crafting" page.');
  return [];
}

async function scrapeCraftingRecipes() {
  console.warn('scrapeCraftingRecipes: TODO — iterate the Weapons + Armor + Tools category pages.');
  return [];
}

async function scrapeCookingRecipes() {
  console.warn('scrapeCookingRecipes: TODO — iterate the Food category page.');
  return [];
}

async function writeYaml(target: URL, data: unknown) {
  await mkdir(new URL('.', target), { recursive: true });
  const yaml = stringify(data, { lineWidth: 0 });
  await writeFile(target, yaml, 'utf8');
  console.log('wrote', target.pathname);
}

async function main() {
  const [items, stations, crafting, cooking] = await Promise.all([
    scrapeItems(),
    scrapeStations(),
    scrapeCraftingRecipes(),
    scrapeCookingRecipes(),
  ]);

  await writeYaml(new URL('items.yaml', dataDir), items);
  await writeYaml(new URL('stations.yaml', dataDir), stations);
  await writeYaml(new URL('recipes/crafting.yaml', dataDir), crafting);
  await writeYaml(new URL('recipes/cooking.yaml', dataDir), cooking);

  console.log('\nDone. Review the diffs, fix by hand, and commit when happy.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Note:** the scraper function bodies are intentionally stubbed with
`console.warn` TODOs. This task ships the **scaffold** for the scraper;
filling in the actual scraping logic is a follow-up task that requires
inspecting the live wiki HTML and writing selector logic. Expect to
spend ~an hour filling this in by hand once you're ready to expand
beyond the minimal starter set.

- [ ] **Step 3: Add seed:scrape script**

Edit `<repo>/package.json` and add to the `"scripts"` block:

```json
    "seed:scrape": "tsx scripts/scrape-wiki.ts"
```

- [ ] **Step 4: Verify the script runs (and emits TODO warnings)**

```bash
pnpm seed:scrape
```

Expected: prints four `TODO` warnings and exits cleanly. (No data is actually
overwritten because each scraper returns `[]`, but the four target files
will be written as empty arrays. **Don't commit that output.** Restore
the real YAML with `git checkout src/data/`.)

- [ ] **Step 5: Restore real data and commit the scaffold**

```bash
git checkout src/data/
git add scripts/scrape-wiki.ts package.json pnpm-lock.yaml
git commit -m "feat(seed): add wiki scraper scaffold (TODO-stubbed)"
```

---

## Phase 10: Final Verification and Push

### Task 23: Full-stack green build

**Files:** none (verification only)

- [ ] **Step 1: Run everything locally**

From `<repo>`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Expected: every command exits 0. If any fails, fix it before proceeding.

- [ ] **Step 2: Preview the built site one more time**

```bash
pnpm preview
```

Open `http://localhost:4321/valheim/` and do a final manual smoke: filter, expand, reverse lookup, detail page, about page. Stop the server.

---

### Task 24: Create GitHub repo and push

**Files:** none (remote setup)

- [ ] **Step 1: Create the repo under dobbo-ca**

```bash
gh repo create dobbo-ca/valheim-helper --public --description "Valheim helper: filterable recipe reference at www.dobbo.ca/valheim/" --source . --remote origin --push
```

Expected: repo exists on GitHub and `main` is pushed. If the `dobbo-ca` org doesn't allow you to create repos directly, create it via the GitHub UI first and then:

```bash
git remote add origin git@github.com:dobbo-ca/valheim-helper.git
git push -u origin main
```

- [ ] **Step 2: Verify CI runs and passes**

```bash
gh run watch
```

Expected: `ci.yml` passes end-to-end.

- [ ] **Step 3: Set up the GitHub App (follow `docs/DEPLOY.md`)**

Follow every step in `docs/DEPLOY.md` → "One-time GitHub App setup". This requires clicking through the GitHub UI — the plan can't automate it.

After the App is created and installed on both repos, and the two secrets are set on `dobbo-ca/valheim-helper`, trigger a deploy manually:

```bash
gh workflow run deploy.yml
gh run watch
```

Expected: deploy workflow succeeds. Check `cdobbyn/cdobbyn.github.io` for a new `deploy: valheim-helper @ <sha>` commit adding/updating `valheim/`.

- [ ] **Step 4: Verify live site**

Open `https://www.dobbo.ca/valheim/` — should show the recipe table, dark theme, everything working. Allow a minute for GitHub Pages cache to update.

- [ ] **Step 5: Final commit / push (nothing to commit at this point, but verify tree is clean)**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Success Criteria

- [ ] `https://www.dobbo.ca/valheim/` loads the dark-dashboard recipe table
- [ ] Filter bar (type chips, station dropdown, level slider, search) all work
- [ ] Clicking a row expands it inline with ingredient chips + detail link
- [ ] Clicking an ingredient chip reverse-filters the table
- [ ] URL state survives reload and is shareable
- [ ] Per-recipe detail pages exist at `/valheim/recipes/<slug>/`
- [ ] About page exists at `/valheim/about/`
- [ ] `pnpm test` passes (schema, loader, filter, url-state, all three component suites)
- [ ] `pnpm test:e2e` passes (6 smoke tests)
- [ ] CI workflow is green on `main`
- [ ] Deploy workflow pushes to `cdobbyn/cdobbyn.github.io/valheim/` via the dedicated GitHub App

## Out of Scope (Explicit)

Everything the spec marks as deferred stays deferred:

- Weather reference or seed-based forecast
- Building pieces, raw materials, biome data
- Station upgrade requirements (left as empty arrays in the starter data)
- Anything interactive beyond filter/expand/reverse-lookup
- Mobile-native app

These become the v2 backlog.

## Known Deviations from the Spec

Two small simplifications. Both are file an issue / follow-up enhancements,
not MVP blockers.

1. **uFuzzy not yet wired.** The spec lists `uFuzzy` in the stack, and Task 2
   installs it, but Task 5's `filterRecipes` uses plain substring match on
   lowercase name / tags / ingredient ids. Rationale: the MVP starter data
   has ~10 recipes — substring match is more than enough, and a pure,
   deterministic filter function is much easier to test. When the dataset
   grows past ~50 recipes, swap the query branch of `filterRecipes` to
   build a cached uFuzzy index over the recipes array. The pure interface
   doesn't need to change.

2. **Keyboard shortcuts partially implemented.** The spec lists:
   `/` focuses search, arrow keys move row focus, Enter expands focused row,
   Esc clears all filters. The plan gets **Enter expands focused row** for
   free because `RecipeRow` is a real `<button>` element. The other three
   shortcuts (`/`, arrow keys, Esc) are not wired. They're a small
   follow-up: add a top-level `keydown` listener in `RecipeTable.onMount`
   that maps the shortcuts to state updates and focus management. Defer
   until after the first deploy.

Both deviations should be filed as issues on `dobbo-ca/valheim-helper`
after Task 24.
