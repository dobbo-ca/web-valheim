# Station Upgrades + Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a station upgrades list page and a landing homepage, converting the single-page recipes app into a multi-section site with nav.

**Architecture:** Replace the inline header with a responsive Nav component (hamburger mobile / horizontal desktop, matching web-skyrim pattern). Convert current index to a landing page with card grid linking to `/valheim/recipes/` and `/valheim/stations/`. The station upgrades page uses a new StationUpgradeTable component that flattens station upgrade data into sortable, filterable, paginated rows with expandable details.

**Tech Stack:** Astro 6, Solid.js, TypeScript, Zod, Vitest, Playwright

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/Nav.tsx` | Responsive nav (mobile sidebar + desktop strip) |
| Create | `src/lib/station-filter.ts` | FlatUpgrade type, flatten helper, filter function, empty state |
| Create | `src/lib/station-url-state.ts` | Encode/decode StationFilterState to/from URL params |
| Create | `src/components/StationUpgradeTable.tsx` | Table with filters, sort, pagination, expandable rows |
| Create | `src/pages/recipes.astro` | Recipes page (moved from index.astro) |
| Create | `src/pages/stations.astro` | Station upgrades page |
| Create | `tests/station-filter.test.ts` | Unit tests for flatten + filter |
| Create | `tests/station-url-state.test.ts` | Unit tests for URL encode/decode |
| Modify | `src/layouts/Base.astro` | Replace inline header with Nav component, add currentSection prop |
| Modify | `src/pages/index.astro` | Replace recipe table with landing page |
| Modify | `src/pages/recipes/[slug].astro` | Update "back" link to `/valheim/recipes/` |
| Modify | `src/styles/theme.css` | Add nav + landing CSS, remove old site-header CSS |
| Modify | `tests/e2e/smoke.spec.ts` | Update for new URL structure, add station upgrades tests |

---

### Task 1: Station Filter Logic (data layer)

**Files:**
- Create: `src/lib/station-filter.ts`
- Test: `tests/station-filter.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/station-filter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  flattenUpgrades,
  filterUpgrades,
  emptyStationFilterState,
  type StationFilterState,
  type FlatUpgrade,
} from '../src/lib/station-filter';
import type { Station, Item } from '../src/lib/types';

const stations: Station[] = [
  {
    id: 'workbench',
    name: 'Workbench',
    maxLevel: 3,
    upgrades: [
      { level: 2, name: 'Chopping Block', requires: [{ itemId: 'wood', qty: 10 }, { itemId: 'flint', qty: 10 }] },
      { level: 3, name: 'Tanning Rack', requires: [{ itemId: 'wood', qty: 10 }, { itemId: 'leather-scraps', qty: 20 }] },
    ],
  },
  {
    id: 'forge',
    name: 'Forge',
    maxLevel: 3,
    upgrades: [
      { level: 2, name: 'Forge Bellows', requires: [{ itemId: 'wood', qty: 5 }, { itemId: 'deer-hide', qty: 5 }] },
    ],
  },
  {
    id: 'stonecutter',
    name: 'Stonecutter',
    maxLevel: 1,
    upgrades: [],
  },
];

const items: Item[] = [
  { id: 'wood', name: 'Wood', category: 'material' },
  { id: 'flint', name: 'Flint', category: 'material' },
  { id: 'leather-scraps', name: 'Leather Scraps', category: 'material' },
  { id: 'deer-hide', name: 'Deer Hide', category: 'material' },
];

const empty: StationFilterState = { ...emptyStationFilterState };

describe('flattenUpgrades', () => {
  it('flattens all station upgrades into flat rows', () => {
    const flat = flattenUpgrades(stations);
    expect(flat).toHaveLength(3);
    expect(flat[0]).toEqual({
      stationId: 'workbench',
      stationName: 'Workbench',
      level: 2,
      name: 'Chopping Block',
      requires: [{ itemId: 'wood', qty: 10 }, { itemId: 'flint', qty: 10 }],
    });
  });

  it('skips stations with no upgrades', () => {
    const flat = flattenUpgrades(stations);
    expect(flat.every((u) => u.stationId !== 'stonecutter')).toBe(true);
  });
});

describe('filterUpgrades', () => {
  let flat: FlatUpgrade[];
  const itemsById = new Map(items.map((i) => [i.id, i]));

  beforeEach(() => {
    flat = flattenUpgrades(stations);
  });

  it('returns everything when filters are empty', () => {
    expect(filterUpgrades(flat, empty, itemsById).map((u) => u.name)).toEqual([
      'Chopping Block',
      'Tanning Rack',
      'Forge Bellows',
    ]);
  });

  it('filters by station', () => {
    expect(
      filterUpgrades(flat, { ...empty, station: 'forge' }, itemsById).map((u) => u.name),
    ).toEqual(['Forge Bellows']);
  });

  it('filters by text query matching upgrade name', () => {
    expect(
      filterUpgrades(flat, { ...empty, query: 'bellows' }, itemsById).map((u) => u.name),
    ).toEqual(['Forge Bellows']);
  });

  it('filters by text query matching station name', () => {
    expect(
      filterUpgrades(flat, { ...empty, query: 'workbench' }, itemsById).map((u) => u.name),
    ).toEqual(['Chopping Block', 'Tanning Rack']);
  });

  it('filters by text query matching material name', () => {
    expect(
      filterUpgrades(flat, { ...empty, query: 'deer hide' }, itemsById).map((u) => u.name),
    ).toEqual(['Forge Bellows']);
  });

  it('combines station and query with AND', () => {
    expect(
      filterUpgrades(flat, { station: 'workbench', query: 'tanning' }, itemsById).map((u) => u.name),
    ).toEqual(['Tanning Rack']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/station-filter.test.ts`
Expected: FAIL — cannot find module `../src/lib/station-filter`

- [ ] **Step 3: Write the implementation**

Create `src/lib/station-filter.ts`:

```typescript
import type { Station, Item, IngredientRef } from './types';

export interface FlatUpgrade {
  stationId: string;
  stationName: string;
  level: number;
  name: string;
  requires: IngredientRef[];
}

export interface StationFilterState {
  station: string; // station id or 'all'
  query: string;
}

export const emptyStationFilterState: StationFilterState = {
  station: 'all',
  query: '',
};

export function flattenUpgrades(stations: Station[]): FlatUpgrade[] {
  const result: FlatUpgrade[] = [];
  for (const s of stations) {
    for (const u of s.upgrades) {
      result.push({
        stationId: s.id,
        stationName: s.name,
        level: u.level,
        name: u.name ?? `Level ${u.level}`,
        requires: u.requires,
      });
    }
  }
  return result;
}

export function filterUpgrades(
  upgrades: FlatUpgrade[],
  state: StationFilterState,
  itemsById: Map<string, Item>,
): FlatUpgrade[] {
  const q = state.query.trim().toLowerCase();
  return upgrades.filter((u) => {
    if (state.station !== 'all' && u.stationId !== state.station) return false;
    if (q.length > 0) {
      const haystacks: string[] = [
        u.name.toLowerCase(),
        u.stationName.toLowerCase(),
        ...u.requires.map((r) => (itemsById.get(r.itemId)?.name ?? r.itemId).toLowerCase()),
      ];
      if (!haystacks.some((h) => h.includes(q))) return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/station-filter.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/station-filter.ts tests/station-filter.test.ts
git commit -m "feat: add station upgrade flatten and filter logic"
```

---

### Task 2: Station URL State

**Files:**
- Create: `src/lib/station-url-state.ts`
- Test: `tests/station-url-state.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/station-url-state.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  encodeStationFilterState,
  decodeStationFilterState,
} from '../src/lib/station-url-state';
import { emptyStationFilterState, type StationFilterState } from '../src/lib/station-filter';

describe('station URL state', () => {
  it('encodes all fields', () => {
    const params = encodeStationFilterState({
      station: 'forge',
      query: 'bellows',
    });
    expect(params.get('station')).toBe('forge');
    expect(params.get('q')).toBe('bellows');
  });

  it('omits default values', () => {
    const params = encodeStationFilterState({ station: 'all', query: '' });
    expect([...params.keys()]).toEqual([]);
  });

  it('decodes back to equivalent state', () => {
    const params = new URLSearchParams('station=workbench&q=chopping');
    const state = decodeStationFilterState(params);
    expect(state.station).toBe('workbench');
    expect(state.query).toBe('chopping');
  });

  it('returns defaults when params are missing', () => {
    const state = decodeStationFilterState(new URLSearchParams(''));
    expect(state).toEqual(emptyStationFilterState);
  });

  it('round-trips a populated state', () => {
    const original: StationFilterState = { station: 'forge', query: 'iron' };
    expect(
      decodeStationFilterState(encodeStationFilterState(original)),
    ).toEqual(original);
  });

  it('round-trips empty state', () => {
    expect(
      decodeStationFilterState(encodeStationFilterState(emptyStationFilterState)),
    ).toEqual(emptyStationFilterState);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/station-url-state.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Write the implementation**

Create `src/lib/station-url-state.ts`:

```typescript
import type { StationFilterState } from './station-filter';

export function encodeStationFilterState(
  state: StationFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.station !== 'all') params.set('station', state.station);
  if (state.query.trim().length > 0) params.set('q', state.query.trim());
  return params;
}

export function decodeStationFilterState(
  params: URLSearchParams,
): StationFilterState {
  return {
    station: params.get('station') ?? 'all',
    query: params.get('q') ?? '',
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/station-url-state.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/station-url-state.ts tests/station-url-state.test.ts
git commit -m "feat: add station upgrade URL state encode/decode"
```

---

### Task 3: Nav Component + Layout Update

**Files:**
- Create: `src/components/Nav.tsx`
- Modify: `src/layouts/Base.astro`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create the Nav component**

Create `src/components/Nav.tsx`:

```tsx
import { createSignal } from 'solid-js';

interface NavProps {
  currentSection: 'home' | 'recipes' | 'stations';
  base: string;
}

export default function Nav(props: NavProps) {
  const [open, setOpen] = createSignal(false);

  const links: { section: NavProps['currentSection']; label: string; href: string }[] = [
    { section: 'recipes', label: 'Recipes', href: `${props.base}recipes/` },
    { section: 'stations', label: 'Station Upgrades', href: `${props.base}stations/` },
  ];

  return (
    <>
      <button
        class="nav-hamburger"
        aria-label={open() ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open()}
        onClick={() => setOpen((o) => !o)}
      >
        ☰
      </button>

      <div
        class={`nav-overlay${open() ? ' visible' : ''}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <nav class={`nav-sidebar${open() ? ' open' : ''}`} aria-label="Main navigation">
        <a href={props.base} class="nav-brand sidebar-brand">
          <span class="brand-mark">⚔</span> Valheim
        </a>
        {links.map((link) => (
          <a
            href={link.href}
            class={`nav-link${props.currentSection === link.section ? ' active' : ''}`}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <nav class="nav-desktop" aria-label="Main navigation">
        <a href={props.base} class="nav-brand">
          <span class="brand-mark">⚔</span> Valheim
        </a>
        {links.map((link) => (
          <a
            href={link.href}
            class={`nav-link${props.currentSection === link.section ? ' active' : ''}`}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Update Base.astro layout**

Replace the full contents of `src/layouts/Base.astro` with:

```astro
---
import '../styles/theme.css';
import Nav from '../components/Nav';

interface Props {
  title: string;
  description?: string;
  currentSection?: 'home' | 'recipes' | 'stations';
}

const {
  title,
  description = 'Valheim helper — recipes, stations, reverse lookup.',
  currentSection = 'home',
} = Astro.props;
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
    <Nav client:load currentSection={currentSection} base={base} />
    <main class="container">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 3: Add nav CSS to theme.css**

In `src/styles/theme.css`, replace the old `.site-header` block (lines 101–129) with nav styles. Remove these rules:

```css
.site-header { ... }
.site-header-inner { ... }
.site-header .brand { ... }
.site-header nav { ... }
.site-header nav a { ... }
.site-header nav a:hover,
.site-header nav a[aria-current="page"] { ... }
```

Add in their place:

```css
/* ===== Nav — mobile hamburger + sidebar ===== */
.nav-hamburger {
  display: block;
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 300;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius);
  padding: 0.35rem 0.6rem;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  transition: background 120ms, border-color 120ms;
}

.nav-hamburger:hover {
  background: var(--bg-light);
  border-color: var(--border);
}

.nav-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 200;
  background: oklch(0 0 0 / 0.45);
}

.nav-overlay.visible {
  display: block;
}

.nav-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 250;
  width: 220px;
  background: var(--bg);
  border-right: 1px solid var(--border-muted);
  padding: 3.5rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transform: translateX(-100%);
  transition: transform 220ms ease;
}

.nav-sidebar.open {
  transform: translateX(0);
}

.nav-link {
  display: block;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 120ms, background 120ms;
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg-light);
}

.nav-link.active {
  color: var(--primary);
  background: color-mix(in oklab, var(--primary) 12%, var(--bg));
  font-weight: 600;
}

.nav-brand {
  color: var(--accent);
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.04em;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.7rem 1rem 0.7rem 0;
  margin-right: 0.5rem;
  user-select: none;
  transition: opacity 120ms;
}

.nav-brand:hover { opacity: 0.8; }

.sidebar-brand {
  padding: 0 0.5rem 0.75rem;
  margin-right: 0;
  border-bottom: 1px solid var(--border-muted);
  margin-bottom: 0.25rem;
}

/* ===== Nav — desktop horizontal strip ===== */
.nav-desktop {
  display: none;
  background: var(--bg);
  border-bottom: 1px solid var(--border-muted);
  padding: 0 1rem;
  gap: 0.25rem;
}

.nav-desktop .nav-link {
  padding: 0.7rem 0.9rem;
  border-radius: 0;
  border-bottom: 2px solid transparent;
}

.nav-desktop .nav-link:hover {
  background: transparent;
  color: var(--text);
  border-bottom-color: var(--border);
}

.nav-desktop .nav-link.active {
  background: transparent;
  color: var(--primary);
  border-bottom-color: var(--primary);
}

@media (min-width: 768px) {
  .nav-hamburger { display: none; }
  .nav-overlay { display: none !important; }
  .nav-sidebar { display: none !important; }
  .nav-desktop { display: flex; }
}
```

- [ ] **Step 4: Verify it builds**

Run: `npx astro build`
Expected: Build succeeds (pages still render, nav shows)

- [ ] **Step 5: Commit**

```bash
git add src/components/Nav.tsx src/layouts/Base.astro src/styles/theme.css
git commit -m "feat: replace site header with responsive nav component"
```

---

### Task 4: Landing Homepage + Recipes Page Route

**Files:**
- Create: `src/pages/recipes.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/recipes/[slug].astro`
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Create recipes.astro**

Create `src/pages/recipes.astro` (content moved from index.astro):

```astro
---
import Base from '../layouts/Base.astro';
import { getDataSet } from '../lib/data';
import { RecipeTable } from '../components/RecipeTable';

const data = await getDataSet();
const base = import.meta.env.BASE_URL;
---
<Base title="Recipes — Valheim Helper" currentSection="recipes">
  <h1>Recipes</h1>
  <p class="subtitle">Filterable crafting + cooking reference. Click a row to expand; click an ingredient to reverse-lookup.</p>
  <RecipeTable client:load data={data} baseHref={base} />
</Base>
```

- [ ] **Step 2: Convert index.astro to landing page**

Replace the full contents of `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
const base = import.meta.env.BASE_URL;
---
<Base title="Valheim Helper" currentSection="home">
  <main class="landing">
    <div class="landing-hero">
      <h1 class="landing-title"><span class="brand-mark">⚔</span> Valheim Helper</h1>
      <p class="landing-subtitle">Quick references for your playthrough</p>
    </div>
    <div class="section-cards">
      <a href={`${base}recipes/`} class="section-card">
        <div class="section-card-icon">🔨</div>
        <div class="section-card-body">
          <div class="section-card-name">Recipes</div>
          <div class="section-card-desc">Filterable crafting + cooking reference</div>
        </div>
      </a>
      <a href={`${base}stations/`} class="section-card">
        <div class="section-card-icon">⚒</div>
        <div class="section-card-body">
          <div class="section-card-name">Station Upgrades</div>
          <div class="section-card-desc">Browse upgrade paths and material costs</div>
        </div>
      </a>
    </div>
  </main>
</Base>
```

- [ ] **Step 3: Update [slug].astro back link**

In `src/pages/recipes/[slug].astro`, change the "back" link from:

```astro
<p><a href={base}>← Back to all recipes</a></p>
```

to:

```astro
<p><a href={`${base}recipes/`}>← Back to all recipes</a></p>
```

- [ ] **Step 4: Add landing page CSS**

Append the following to `src/styles/theme.css`:

```css
/* ===== Landing page ===== */
.landing {
  max-width: 600px;
  margin: 0 auto;
  padding: 3rem 1.5rem 2rem;
}

.landing-hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.landing-title {
  font-size: 2rem;
  color: var(--accent);
  letter-spacing: 0.03em;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.landing-subtitle {
  color: var(--text-muted);
  font-size: 1rem;
  margin: 0;
}

.section-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 480px) {
  .section-cards {
    grid-template-columns: 1fr;
  }
}

.section-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--text);
  transition: background 150ms, border-color 150ms;
}

.section-card:hover {
  background: var(--bg-light);
  border-color: var(--border);
}

.section-card-icon {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
}

.section-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.section-card-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text);
}

.section-card-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}
```

- [ ] **Step 5: Verify it builds**

Run: `npx astro build`
Expected: Build succeeds. Landing page at `/valheim/`, recipes at `/valheim/recipes/`, detail pages at `/valheim/recipes/[slug]/`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/pages/recipes.astro src/pages/recipes/\[slug\].astro src/styles/theme.css
git commit -m "feat: add landing homepage and move recipes to /recipes/"
```

---

### Task 5: StationUpgradeTable Component

**Files:**
- Create: `src/components/StationUpgradeTable.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/StationUpgradeTable.tsx`:

```tsx
import { For, Show, createMemo, createSignal, onMount, type Component } from 'solid-js';
import type { DataSet } from '../lib/loader';
import type { FlatUpgrade, StationFilterState } from '../lib/station-filter';
import {
  flattenUpgrades,
  filterUpgrades,
  emptyStationFilterState,
} from '../lib/station-filter';
import {
  encodeStationFilterState,
  decodeStationFilterState,
} from '../lib/station-url-state';
import { IngredientChip } from './IngredientChip';

type SortKey = 'name' | 'station' | 'level';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 50] as const;

interface Props {
  data: DataSet;
}

export const StationUpgradeTable: Component<Props> = (props) => {
  const [state, setState] = createSignal<StationFilterState>(emptyStationFilterState);
  const [expandedIdx, setExpandedIdx] = createSignal<number | null>(null);
  const [sortKey, setSortKey] = createSignal<SortKey | null>(null);
  const [sortDir, setSortDir] = createSignal<SortDir>('asc');
  const [page, setPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal<number>(20);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setState(decodeStationFilterState(params));
  });

  const itemsById = createMemo(
    () => new Map(props.data.items.map((i) => [i.id, i])),
  );

  const stationsWithUpgrades = createMemo(() =>
    props.data.stations.filter((s) => s.upgrades.length > 0),
  );

  const allUpgrades = createMemo(() => flattenUpgrades(props.data.stations));

  const filtered = createMemo(() =>
    filterUpgrades(allUpgrades(), state(), itemsById()),
  );

  const sorted = createMemo(() => {
    const key = sortKey();
    const rows = filtered();
    if (!key) return rows;
    const dir = sortDir() === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (key === 'name') {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      } else if (key === 'station') {
        av = a.stationName.toLowerCase();
        bv = b.stationName.toLowerCase();
      } else {
        av = a.level;
        bv = b.level;
      }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  });

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(sorted().length / pageSize())),
  );

  const clampedPage = createMemo(() => Math.min(page(), totalPages()));

  const paginated = createMemo(() => {
    const p = clampedPage();
    const size = pageSize();
    return sorted().slice((p - 1) * size, p * size);
  });

  const visiblePages = createMemo((): (number | null)[] => {
    const total = totalPages();
    const cur = clampedPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const set = new Set<number>([1, total]);
    for (let i = Math.max(1, cur - 1); i <= Math.min(total, cur + 1); i++) set.add(i);
    const nums = [...set].sort((a, b) => a - b);
    const result: (number | null)[] = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) result.push(null);
      result.push(n);
      prev = n;
    }
    return result;
  });

  const commit = (next: StationFilterState) => {
    setState(next);
    setPage(1);
    const params = encodeStationFilterState(next);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey() !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir() === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey() !== key) return ' ⇅';
    return sortDir() === 'asc' ? ' ▲' : ' ▼';
  };

  const upgradeKey = (u: FlatUpgrade) => `${u.stationId}-${u.level}`;

  const toggleRow = (idx: number) => {
    setExpandedIdx((current) => (current === idx ? null : idx));
  };

  const formatMaterials = (u: FlatUpgrade): string =>
    u.requires
      .map((r) => `${itemsById().get(r.itemId)?.name ?? r.itemId} ×${r.qty}`)
      .join(', ');

  const start = () => (clampedPage() - 1) * pageSize() + 1;
  const end = () => Math.min(clampedPage() * pageSize(), sorted().length);

  return (
    <div class="recipe-table">
      <div class="filter-bar">
        <label>
          <span class="sr-only">Station</span>
          <select
            aria-label="Station"
            value={state().station}
            onChange={(e) => commit({ ...state(), station: e.currentTarget.value })}
          >
            <option value="all">All stations</option>
            <For each={stationsWithUpgrades()}>
              {(s) => <option value={s.id}>{s.name}</option>}
            </For>
          </select>
        </label>

        <input
          type="search"
          class="filter-bar__search"
          placeholder="Search upgrades, stations, materials…"
          value={state().query}
          onInput={(e) => commit({ ...state(), query: e.currentTarget.value })}
        />
      </div>

      <div class="recipe-table__grid" role="table">
        <div class="recipe-table__header" role="row">
          <span role="columnheader">
            <button
              class="recipe-table__sort-btn"
              classList={{ 'recipe-table__sort-btn--active': sortKey() === 'name' }}
              onClick={() => toggleSort('name')}
            >
              Name{sortIndicator('name')}
            </button>
          </span>
          <span role="columnheader">
            <button
              class="recipe-table__sort-btn"
              classList={{ 'recipe-table__sort-btn--active': sortKey() === 'station' }}
              onClick={() => toggleSort('station')}
            >
              Station{sortIndicator('station')}
            </button>
          </span>
          <span role="columnheader">
            <button
              class="recipe-table__sort-btn"
              classList={{ 'recipe-table__sort-btn--active': sortKey() === 'level' }}
              onClick={() => toggleSort('level')}
            >
              Lvl{sortIndicator('level')}
            </button>
          </span>
          <span role="columnheader">Materials</span>
        </div>

        <For
          each={paginated()}
          fallback={<div class="recipe-table__empty">No upgrades match these filters.</div>}
        >
          {(upgrade, idx) => {
            const key = upgradeKey(upgrade);
            return (
              <>
                <button
                  type="button"
                  class="recipe-row"
                  classList={{ 'recipe-row--expanded': expandedIdx() === idx() }}
                  aria-expanded={expandedIdx() === idx()}
                  aria-controls={`upgrade-detail-${key}`}
                  onClick={() => toggleRow(idx())}
                >
                  <span class="recipe-row__name">
                    {expandedIdx() === idx() ? '▾ ' : ''}
                    {upgrade.name}
                  </span>
                  <span class="recipe-row__station">{upgrade.stationName}</span>
                  <span class="recipe-row__lvl">{upgrade.level}</span>
                  <Show when={expandedIdx() !== idx()}>
                    <span class="recipe-row__ings">{formatMaterials(upgrade)}</span>
                  </Show>
                </button>

                <Show when={expandedIdx() === idx()}>
                  <div class="recipe-row__detail" id={`upgrade-detail-${key}`}>
                    <div class="recipe-row__section">
                      <span class="label">Materials</span>
                      <div class="chips">
                        <For each={upgrade.requires}>
                          {(req) => (
                            <IngredientChip
                              itemId={req.itemId}
                              label={itemsById().get(req.itemId)?.name ?? req.itemId}
                              qty={req.qty}
                            />
                          )}
                        </For>
                      </div>
                    </div>
                    <div class="recipe-row__section">
                      <span class="label">Station</span>
                      <span>{upgrade.stationName} → Level {upgrade.level}</span>
                    </div>
                  </div>
                </Show>
              </>
            );
          }}
        </For>
      </div>

      <div class="recipe-table__footer">
        <span>
          {sorted().length === 0
            ? 'No upgrades match these filters.'
            : `${start()}–${end()} of ${sorted().length} upgrades`}
        </span>

        <Show when={totalPages() > 1}>
          <div class="recipe-table__pagination">
            <button
              class="recipe-table__page-btn"
              disabled={clampedPage() === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              ‹
            </button>

            <For each={visiblePages()}>
              {(p) =>
                p === null ? (
                  <span class="recipe-table__page-ellipsis">…</span>
                ) : (
                  <button
                    class="recipe-table__page-btn"
                    classList={{ 'recipe-table__page-btn--active': p === clampedPage() }}
                    onClick={() => setPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === clampedPage() ? 'page' : undefined}
                  >
                    {p}
                  </button>
                )
              }
            </For>

            <button
              class="recipe-table__page-btn"
              disabled={clampedPage() === totalPages()}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </Show>

        <div class="recipe-table__page-size">
          <span>Per page:</span>
          <For each={PAGE_SIZES}>
            {(size) => (
              <button
                class="recipe-table__page-btn"
                classList={{ 'recipe-table__page-btn--active': pageSize() === size }}
                onClick={() => { setPageSize(size); setPage(1); }}
              >
                {size}
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npx astro build`
Expected: Build succeeds (component not yet wired to a page, but TypeScript compiles clean)

- [ ] **Step 3: Commit**

```bash
git add src/components/StationUpgradeTable.tsx
git commit -m "feat: add StationUpgradeTable component"
```

---

### Task 6: Stations Page

**Files:**
- Create: `src/pages/stations.astro`

- [ ] **Step 1: Create stations.astro**

Create `src/pages/stations.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import { getDataSet } from '../lib/data';
import { StationUpgradeTable } from '../components/StationUpgradeTable';

const data = await getDataSet();
---
<Base title="Station Upgrades — Valheim Helper" currentSection="stations">
  <h1>Station Upgrades</h1>
  <p class="subtitle">Browse upgrade paths and material costs for each crafting station.</p>
  <StationUpgradeTable client:load data={data} />
</Base>
```

- [ ] **Step 2: Verify full build**

Run: `npx astro build`
Expected: Build succeeds. Output includes `/valheim/`, `/valheim/recipes/`, `/valheim/stations/`, `/valheim/recipes/[slug]/`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/stations.astro
git commit -m "feat: add station upgrades page"
```

---

### Task 7: Update E2E Tests

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Rewrite the E2E tests**

Replace the full contents of `tests/e2e/smoke.spec.ts` with:

```typescript
import { test, expect } from '@playwright/test';

test.describe('landing page', () => {
  test('shows section cards linking to recipes and stations', async ({ page }) => {
    await page.goto('/valheim/');
    await expect(page.getByRole('heading', { name: 'Valheim Helper' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Recipes/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Station Upgrades/ })).toBeVisible();
  });

  test('recipes card navigates to recipes page', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('link', { name: /Recipes/ }).first().click();
    await expect(page).toHaveURL(/\/valheim\/recipes\//);
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
  });

  test('station upgrades card navigates to stations page', async ({ page }) => {
    await page.goto('/valheim/');
    await page.getByRole('link', { name: /Station Upgrades/ }).first().click();
    await expect(page).toHaveURL(/\/valheim\/stations\//);
    await expect(page.getByRole('heading', { name: 'Station Upgrades' })).toBeVisible();
  });
});

test.describe('recipes page', () => {
  test('loads and shows recipes', async ({ page }) => {
    await page.goto('/valheim/recipes/');
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await page.goto('/valheim/recipes/?q=iron+sword');
    await expect(page.getByText('Iron Sword')).toBeVisible();
    await page.goto('/valheim/recipes/?type=cooking');
    await expect(page.getByText('Queens Jam')).toBeVisible();
  });

  test('type chip filters the table', async ({ page }) => {
    await page.goto('/valheim/recipes/');
    await page.getByRole('button', { name: 'Cooking' }).click();
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('expanding a row reveals ingredient chips', async ({ page }) => {
    await page.goto('/valheim/recipes/?q=iron+sword');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await expect(page.getByRole('button', { name: /Iron ×60/ })).toBeVisible();
  });

  test('clicking an ingredient chip reverse-filters', async ({ page }) => {
    await page.goto('/valheim/recipes/?q=iron+sword');
    await page.getByRole('button', { name: /Iron Sword/ }).click();
    await page.getByRole('button', { name: /Iron ×60/ }).click();
    await expect(page.getByText('Uses ingredient:')).toBeVisible();
    await expect(page.getByText('Queens Jam')).not.toBeVisible();
  });

  test('URL state survives reload', async ({ page }) => {
    await page.goto('/valheim/recipes/?type=cooking');
    await expect(page.getByText('Queens Jam')).toBeVisible();
    await expect(page.getByText('Iron Sword')).not.toBeVisible();
  });

  test('detail page is reachable', async ({ page }) => {
    await page.goto('/valheim/recipes/iron-sword/');
    await expect(page.getByRole('heading', { name: 'Iron Sword' })).toBeVisible();
    await expect(page.getByText(/Used as ingredient in|Ingredients/)).toBeVisible();
  });
});

test.describe('station upgrades page', () => {
  test('loads and shows upgrades', async ({ page }) => {
    await page.goto('/valheim/stations/');
    await expect(page.getByRole('heading', { name: 'Station Upgrades' })).toBeVisible();
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Forge Bellows')).toBeVisible();
  });

  test('station dropdown filters upgrades', async ({ page }) => {
    await page.goto('/valheim/stations/');
    await page.getByLabel('Station').selectOption('forge');
    await expect(page.getByText('Forge Bellows')).toBeVisible();
    await expect(page.getByText('Chopping Block')).not.toBeVisible();
  });

  test('search filters upgrades', async ({ page }) => {
    await page.goto('/valheim/stations/?q=chopping');
    await expect(page.getByText('Chopping Block')).toBeVisible();
    await expect(page.getByText('Forge Bellows')).not.toBeVisible();
  });

  test('expanding a row reveals material chips', async ({ page }) => {
    await page.goto('/valheim/stations/');
    await page.getByRole('button', { name: /Chopping Block/ }).click();
    await expect(page.getByRole('button', { name: /Wood ×10/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Flint ×10/ })).toBeVisible();
  });

  test('URL state persists station filter', async ({ page }) => {
    await page.goto('/valheim/stations/?station=forge');
    await expect(page.getByText('Forge Bellows')).toBeVisible();
    await expect(page.getByText('Chopping Block')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run unit tests**

Run: `npx vitest run`
Expected: All unit tests pass (station-filter, station-url-state, filter, url-state, schema, loader, real-data, components)

- [ ] **Step 3: Build and run E2E tests**

Run: `npx astro build && npx playwright test`
Expected: All E2E tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/smoke.spec.ts
git commit -m "test: update e2e tests for new page structure and station upgrades"
```

---

### Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run && npx astro build && npx playwright test`
Expected: All unit tests pass, build succeeds, all E2E tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npx astro check && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Manual spot check**

Run: `npx astro dev`

Verify in browser:
- `/valheim/` shows landing page with two cards
- `/valheim/recipes/` shows recipe table with all existing functionality
- `/valheim/stations/` shows station upgrade table with filtering, sorting, pagination
- Nav highlights active section
- Mobile nav hamburger works (resize browser to <768px)
- Recipe detail pages still work at `/valheim/recipes/[slug]/`
