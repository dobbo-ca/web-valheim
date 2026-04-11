# Valheim Helper Site — Design

**Date:** 2026-04-09
**Status:** Draft (pending implementation plan)
**Owner:** @cdobbyn

## Summary

A static helper site for Valheim, published at `https://www.dobbo.ca/valheim/`.
The MVP is a single interactive filterable table of crafting and cooking recipes
with reverse lookup via clickable ingredient chips, plus per-recipe detail pages
for linkable permalinks. The project is structured so future sections (weather,
stations, biomes) can be added as additive routes without restructuring.

## Goals

- Replace "tabbing through wiki pages" with a single fast lookup surface.
- Support both forward lookup ("what does Iron Sword need?") and reverse lookup
  ("what recipes use Iron?").
- Show the required station and upgrade level at a glance.
- Ship something useful in the first release; defer weather and other
  extensions to v2.
- Stay maintainable: data lives as hand-editable YAML, no runtime dependencies
  on external services.

## Non-Goals (MVP)

- **No weather feature in MVP.** Weather (reference or seed-based forecast)
  is explicitly deferred to v2.
- **No building pieces or raw material pages.** MVP is crafting recipes and
  cooking recipes only.
- **No live game integration.** The site does not talk to a running Valheim
  server, Discord bot, or similar.
- **No user accounts, favorites, or server-side state.**
- **No mobile-native app.** Web only, responsive enough to be usable on phones.

## Users & Usage

Primary user: @cdobbyn (and anyone else who finds the public site useful).
Typical tasks:

1. "I'm at the forge — what can I make at my current level?"
2. "Iron Sword — what do I need and where do I craft it?"
3. "I just collected a pile of Iron — what's worth making with it?"
4. "What food gives the best stamina for exploration?"

## Architecture

### Stack

| Layer            | Choice                                   |
|------------------|------------------------------------------|
| Meta-framework   | Astro (SSG, `base: '/valheim/'`)         |
| Interactive UI   | SolidJS via `@astrojs/solid-js`          |
| Language         | TypeScript                               |
| Styling          | Vanilla CSS (scoped), no Tailwind        |
| Data format      | YAML, validated with Zod at build time   |
| Fuzzy search     | `uFuzzy` (small, fast, good ranking)     |
| Unit tests       | Vitest + `@solidjs/testing-library`      |
| E2E smoke tests  | Playwright                               |
| Package manager  | pnpm                                     |

**Why this stack:** Astro ships zero JS by default for static pages, which is
perfect for the detail pages and about page. The one interactive piece (the
filterable table) is isolated as a Solid island — rich reactivity where it
matters, no framework weight where it doesn't. SolidJS was specifically
requested. YAML + Zod gives easy hand-editing with build-time safety.

### Repo Layout

```
web-valheim/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── README.md
├── docs/
│   └── superpowers/specs/           # this file lives here
├── scripts/
│   └── scrape-wiki.ts               # one-off seed scraper (dev tool)
├── src/
│   ├── data/
│   │   ├── stations.yaml
│   │   ├── items.yaml
│   │   └── recipes/
│   │       ├── crafting.yaml
│   │       └── cooking.yaml
│   ├── lib/
│   │   ├── schema.ts                # Zod schemas + inferred TS types
│   │   ├── loader.ts                # YAML → validated objects → flat recipes.json
│   │   └── filter.ts                # pure filter/search function (heavily tested)
│   ├── components/
│   │   ├── RecipeTable.tsx          # Solid island (the one interactive piece)
│   │   ├── FilterBar.tsx            # subcomponent of the island
│   │   └── IngredientChip.tsx       # subcomponent of the island
│   ├── layouts/
│   │   └── Base.astro               # dark-dashboard shell, nav
│   ├── pages/
│   │   ├── index.astro              # home — mounts <RecipeTable client:load />
│   │   ├── recipes/[slug].astro     # per-recipe detail (getStaticPaths)
│   │   └── about.astro
│   └── styles/
│       └── theme.css                # dark dashboard palette + base styles
├── tests/
│   ├── filter.test.ts
│   ├── loader.test.ts
│   ├── RecipeTable.test.tsx
│   └── e2e/
│       └── smoke.spec.ts
└── .github/
    └── workflows/
        ├── ci.yml                   # lint, typecheck, test, build (no deploy)
        └── deploy.yml               # main push → deploy to github.io
```

### Source Repo & Deployment

- **Source repo:** `dobbo-ca/web-valheim` (new, in the dobbo-ca org)
- **Publish target:** `dobbo-ca/dobbo-ca.github.io` (existing), under its
  `valheim/` subdirectory. Served at `https://www.dobbo.ca/valheim/` via the
  existing CNAME on the Pages repo.

**Deploy auth:** A dedicated GitHub App, installed on both repos in the `dobbo-ca` org:

- `dobbo-ca/web-valheim` — permissions: `contents: read`, `actions: read`
- `dobbo-ca/dobbo-ca.github.io` — permissions: `contents: write`

The deploy workflow uses `actions/create-github-app-token@v1` with the App ID
and private key (stored as repo secrets on `dobbo-ca/web-valheim`) to mint a
short-lived installation token. The workflow then checks out the Pages repo,
removes the existing `valheim/` directory, copies `dist/*` into it, commits,
and pushes.

**Why a GitHub App instead of a PAT:** short-lived tokens, fine-grained
permissions per repo, revocable centrally, no personal account entanglement.

### Build & Deploy Flow

1. Push to `main` on `dobbo-ca/web-valheim`
2. `ci.yml` runs lint, typecheck, tests, build (PR and main)
3. On main: `deploy.yml` runs after CI passes:
   - `pnpm install && pnpm build` → `dist/`
   - Mint App installation token
   - Checkout `dobbo-ca/dobbo-ca.github.io`
   - `rm -rf valheim/ && cp -r dist/* valheim/`
   - Commit `"deploy: web-valheim @ <short-sha>"` and push
4. GitHub Pages picks up the push automatically

Astro's `base: '/valheim/'` ensures all asset URLs resolve correctly when
served from a subpath.

## Data Model

### Files

```
src/data/
├── stations.yaml       # workbench, forge, cauldron, etc.
├── items.yaml          # anything referenceable as ingredient or result
└── recipes/
    ├── crafting.yaml   # weapons, armor, tools
    └── cooking.yaml    # food, meads
```

### Schemas

Defined in `src/lib/schema.ts` as Zod schemas; TypeScript types are inferred.

```ts
Station = {
  id: string           // "forge"
  name: string         // "Forge"
  maxLevel: number     // 7
  upgrades: {
    level: number      // which level this entry unlocks
    requires: { itemId: string; qty: number }[]
  }[]
}

Item = {
  id: string           // "iron"
  name: string         // "Iron"
  category: 'material' | 'ingredient' | 'food' | 'weapon' | 'armor' | 'tool'
}

Recipe = {
  id: string           // "iron-sword" (also URL slug)
  name: string         // "Iron Sword"
  type: 'crafting' | 'cooking'
  station: string      // Station.id
  stationLevel: number // 1..Station.maxLevel
  ingredients: { itemId: string; qty: number }[]
  yields?: { itemId: string; qty: number }  // default { itemId: id, qty: 1 }
  skill?: string
  tags?: string[]      // drives filter chips & search
  notes?: string       // markdown, shown in expanded row + detail page
  food?: {             // only for type === 'cooking'
    hp: number
    stamina: number
    duration: number   // seconds
    regen: number
  }
}
```

### Validation (build-time)

`src/lib/loader.ts` runs before Astro renders:

1. Parse all YAML files.
2. Validate each against its Zod schema; collect errors with file+line.
3. Cross-check references:
   - Every `Recipe.station` must match a `Station.id`.
   - Every `Recipe.stationLevel` must be ≤ `Station.maxLevel`.
   - Every `Recipe.ingredients[].itemId` and `yields.itemId` must match an
     `Item.id`.
   - No duplicate `Recipe.id` values.
4. Flatten into a single `recipes.json` artifact shipped with the build.
5. Any failure → loud build error (file, line, message). The site won't
   deploy broken data.

### Seed Data

`scripts/scrape-wiki.ts` is a one-off throwaway that pulls initial data from
the official Valheim wiki and emits YAML. It is:

- **Committed** to the repo as a dev tool (reproducible, auditable).
- **Not run on build.** YAML is the source of truth after the first seed.
- Bugs in scraped entries are fixed by editing YAML, not re-running the scraper.

### Data Lifecycle

After seeding, updates happen by editing YAML by hand when game patches ship.
A PR that changes YAML triggers CI; if validation passes and tests pass,
merging redeploys within a minute.

## Interactive Recipe Table (the Solid Island)

One component (`src/components/RecipeTable.tsx`) mounted on the home page.
It owns all interactive state.

### Filter Dimensions

All combine with AND:

- **Type chips:** All / Crafting / Cooking (single select)
- **Station dropdown:** All / Workbench / Forge / Cauldron / Artisan / Black
  Forge / Stonecutter / ...
- **Max station level slider:** "only show recipes I can make at ≤ this
  station level". Defaults to max.
- **Text search:** fuzzy match on recipe name, ingredient name, tags via
  `uFuzzy`
- **Ingredient filter chips:** activated by clicking an ingredient in an
  expanded row or detail page. Rendered as a removable chip above the table.
  Multiple ingredient chips combine with AND.

### Table Columns

`Name · Station · Lvl · Ingredients (compact list) · Tags`

### Row Interaction

- **Click row:** expand inline — full ingredient list (each ingredient a
  clickable chip), station upgrade path needed to reach the required level,
  yields, notes, food stats if applicable.
- **↗ open detail page link** inside the expanded row → navigates to
  `/valheim/recipes/<slug>/`.

### URL State Sync

Filters sync to query params on every change: `?type=crafting&station=forge&ing=iron,wood&q=sword&lvl=3`.

On mount, the component reads query params and seeds state. Back/forward works
natively. Sharing a filtered view is just copying the URL.

### Performance

Expected recipe count: ~200-500. No virtualization — render all filtered rows.
SolidJS fine-grained reactivity handles this easily. If the count ever grows
past a comfortable render budget, virtual scrolling can be added to the same
component without touching anything else.

### Accessibility

- `/` focuses search input
- Arrow keys move row focus
- Enter expands focused row
- Esc clears all filters
- All interactive elements have appropriate `aria-*` attributes
- Color contrast meets WCAG AA on the dark theme palette

### Visual Theme

Dark dashboard palette (see `src/styles/theme.css`):

- Background: `#14181d`
- Surface: `#1a1e24`
- Border: `#2a2f38`
- Text: `#d8d4c8`
- Accent (Valheim bronze): `#e8b87a`
- Muted: `#7a7668`
- System-ui / sans-serif throughout

## Detail Pages

`src/pages/recipes/[slug].astro` uses `getStaticPaths()` to emit one HTML file
per recipe at build time.

**Contents:**

- Recipe name, type, station + level required
- Ingredient list with clickable chips (each chip links to
  `/valheim/?ing=<itemId>`)
- Yields
- Food stats if cooking
- Notes (markdown-rendered)
- **Used as ingredient in:** reverse-lookup list — recipes that reference
  this recipe's `yields.itemId`. Each entry links to its own detail page.

Detail pages are pure static HTML — no JS required to render.

## Other Pages

- `/valheim/` — home, mounts `<RecipeTable client:load />`
- `/valheim/recipes/<slug>/` — per-recipe detail
- `/valheim/about/` — credits, data source notes, how to report errors
  (link to new issue on `dobbo-ca/web-valheim`)

## Extensibility Plan (v2+)

The layout is deliberately additive:

- `src/pages/weather/` — future weather calculator
- `src/pages/stations/` — dedicated station upgrade browser
- `src/pages/biomes/` — biome reference
- `src/pages/buildings/` — building piece recipes (reuses the Solid table
  component with a new dataset)

New sections slot in without modifying existing code: add YAML → add Zod schema
→ add loader → add routes. The top nav grows as sections are added.

## Testing Strategy

This follows TDD discipline during implementation — tests written before or
alongside the code they cover, not bolted on at the end.

### Unit (Vitest)

- `tests/loader.test.ts` — schema validation: accepts valid shapes, rejects
  missing station refs, rejects bad level, rejects duplicate IDs, reports
  useful error messages.
- `tests/filter.test.ts` — the pure filter function: type filter, station
  filter, level cutoff, ingredient filter (single + multi), text search, all
  combinations. Given a fixture set of recipes + filter state, the function
  must return the expected subset deterministically.

### Component (Solid testing-library)

- `tests/RecipeTable.test.tsx` — renders rows, clicking a row expands it,
  clicking an ingredient chip adds an ingredient filter, clearing filters
  resets the view, URL query params are read on mount and written on change.

### E2E Smoke (Playwright)

- `tests/e2e/smoke.spec.ts` — builds site, serves locally:
  - home page loads
  - search + filter returns expected results
  - clicking an ingredient chip filters the table
  - "open detail page" link navigates correctly
  - reloading with query params restores the filter state
  - detail page "used as ingredient in" links work

### CI (no deploy)

`ci.yml` runs on every PR and every push to main: lint, typecheck, all unit
and component tests, Playwright smoke, full build. A failing build blocks
deploy.

### Deploy (main only)

`deploy.yml` runs after `ci.yml` succeeds on main. Mints the GitHub App token
and syncs `dist/` into `dobbo-ca/dobbo-ca.github.io/valheim/`.

## Open Questions / Deferred Decisions

None currently. All of the following were explicitly settled during
brainstorming and are captured above:

- MVP scope → crafting + cooking recipes only
- Data source → curated YAML, seeded once via throwaway wiki scraper
- Stack → Astro + SolidJS + TypeScript
- Deploy → GitHub Action syncs to `dobbo-ca/dobbo-ca.github.io/valheim/`
- Repo home → `dobbo-ca/web-valheim` with a dedicated GitHub App for
  deploy auth
- Layout → filterable table, dark dashboard theme
- Row interaction → inline expand + "open detail page" link
- Reverse lookup → clickable ingredient chips that filter the table
