# Station Upgrades List + Homepage Design

## Summary

Add a station upgrades list page and convert the current single-page app into a multi-page site with a landing homepage, following the same pattern used in web-skyrim.

## Changes

### 1. Nav Component (`src/components/Nav.tsx`)

New Solid.js component matching web-skyrim's pattern:
- Mobile: hamburger button + slide-out sidebar + overlay backdrop
- Desktop (>=768px): horizontal strip with bottom-border active indicator
- Brand link: "Valheim Helper" linking to `/valheim/`
- Section links: Recipes (`/valheim/recipes/`), Station Upgrades (`/valheim/stations/`)
- `currentSection` prop: `'home' | 'recipes' | 'stations'`
- Active link highlighting via class comparison

### 2. Layout Update (`src/layouts/Base.astro`)

- Replace inline `<header class="site-header">` with `<Nav client:load currentSection={currentSection} />`
- Add `currentSection` prop to the layout interface (same type as Nav)
- Remove old `.site-header` / `.site-header-inner` / `.brand` CSS (replaced by nav styles)

### 3. Homepage (`src/pages/index.astro`)

Landing page with card grid, adapted from web-skyrim:
- Hero: title "Valheim Helper", subtitle "Quick references for your playthrough"
- Two section cards in a responsive grid (2-col desktop, 1-col mobile):
  - **Recipes** (link to `/valheim/recipes/`) -- "Filterable crafting + cooking reference"
  - **Station Upgrades** (link to `/valheim/stations/`) -- "Browse upgrade paths and material costs"

### 4. Recipes Page (`src/pages/recipes.astro`)

Move current `index.astro` content (RecipeTable) here. Same markup, just re-routed. Pass `currentSection="recipes"` to Base layout.

### 5. Station Upgrades Page (`src/pages/stations.astro`)

New page with `<StationUpgradeTable client:load>`.

### 6. StationUpgradeTable Component (`src/components/StationUpgradeTable.tsx`)

Mirrors RecipeTable structure. Data source: flatten `stations[].upgrades[]` into rows, each carrying its parent station name/id.

**Columns** (grid: `2fr 1fr 60px 3fr`):
| Name | Station | Level | Materials |

**Filters** (reuse FilterBar pattern inline):
- Station dropdown (All + each station with upgrades)
- Search input (matches upgrade name, station name, material names)

No type chips or level slider needed -- simpler than recipes.

**Sorting**: clickable column headers for Name, Station, Level (same 3-state toggle: asc/desc/none).

**Pagination**: same pattern -- page signals, page size selector (10/20/50), visible page buttons with ellipsis.

**Expandable rows**: click row to expand detail section showing:
- Full material list as IngredientChip components (reuse existing)
- Station name + level context

**URL state**: encode station filter + search query + page + sort into query params via the same `replaceState` pattern. New encode/decode functions in `src/lib/url-state.ts` (or a new `station-url-state.ts`).

### 7. CSS Additions (`src/styles/theme.css`)

Add styles for:
- `.nav-hamburger`, `.nav-overlay`, `.nav-sidebar`, `.nav-desktop`, `.nav-link`, `.nav-brand` -- port from web-skyrim, using existing Valheim theme tokens
- `.landing`, `.landing-hero`, `.landing-title`, `.landing-subtitle` -- landing page layout
- `.section-cards`, `.section-card`, `.section-card-icon`, `.section-card-body`, `.section-card-name`, `.section-card-desc` -- card grid
- Remove old `.site-header` block

Station upgrade table reuses existing `.recipe-table__*` class names (rename to generic `.data-table__*` or just reuse as-is). Recommendation: reuse as-is to avoid churn, since the visual treatment is identical.

### 8. Data Layer

No schema or data file changes needed. Station upgrade data already exists in `stations.yaml` with full `StationUpgrade` schema validation. The loader already parses it.

Add a helper to flatten station upgrades for the table:

```typescript
// in loader.ts or a new stations-filter.ts
type FlatUpgrade = {
  stationId: string;
  stationName: string;
  level: number;
  name: string;
  requires: IngredientRef[];
};
```

Filter function: match on station dropdown + text search across upgrade name, station name, and material item names.

### 9. Existing Recipe Detail Pages

`src/pages/recipes/[slug].astro` stays at `/valheim/recipes/[slug]/`. No changes needed -- these are sub-routes of the recipes section.

## Out of Scope

- Station detail pages (e.g. `/valheim/stations/forge/`) -- can add later
- Ingredient reverse-lookup on station upgrades page (can add later)
- Shared/abstract table component extraction -- not worth the abstraction cost for two tables
