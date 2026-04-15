# Damage Type Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace overlapping elemental/magic modifier filters with specific damage type filters (fire, frost, lightning, poison, spirit, pure).

**Architecture:** Remove `modifiers` array and `elemental`/`modifiers` sub-filter keys from filter config. Add `damageTypes` array and a single `damageType` sub-filter key. Migrate recipe tags in YAML. Update panel to render damage type chips. Wire damage icons into sprite.

**Tech Stack:** TypeScript, SolidJS, Vitest, YAML data files, SVG sprite generation

---

### Task 1: Update filter config — remove modifiers, add damageTypes

**Files:**
- Modify: `src/lib/filter-categories.ts`

- [ ] **Step 1: Replace `modifiers` with `damageTypes` and update sub-filter keys**

In `src/lib/filter-categories.ts`, make these changes:

1. Replace the `modifiers` export with `damageTypes`:

```ts
// REMOVE this:
export const modifiers = [
  { label: 'Elemental', tag: 'elemental' },
  { label: 'Magic',     tag: 'magic' },
] as const;

// ADD this:
export const damageTypes = [
  { label: 'Fire',      tag: 'fire' },
  { label: 'Frost',     tag: 'frost' },
  { label: 'Lightning', tag: 'lightning' },
  { label: 'Poison',    tag: 'poison' },
  { label: 'Spirit',    tag: 'spirit' },
  { label: 'Pure',      tag: 'pure' },
] as const;
```

2. Update `SubFilterKey` type — replace `'modifiers' | 'elemental'` with `'damageType'`:

```ts
export type SubFilterKey = 'handedness' | 'biome' | 'statFocus' | 'damageType' | 'found';
```

3. Update `categorySubFilters` — use `'damageType'` for melee, ranged, ammo:

```ts
export const categorySubFilters: Record<string, SubFilterKey[]> = {
  melee:  ['handedness', 'biome', 'damageType'],
  ranged: ['handedness', 'biome', 'damageType'],
  ammo:   ['biome', 'damageType'],
  armor:  ['biome'],
  tool:   ['biome'],
  build:  ['biome', 'found'],
  food:   ['biome', 'statFocus', 'found'],
  mead:   ['biome'],
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: Errors in `AdvancedFilterPanel.tsx` (it still imports `modifiers` and references old keys). That's expected — we'll fix it in Task 4. No errors in `filter-categories.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/filter-categories.ts
git commit -m "refactor: replace modifiers with damageTypes in filter config"
```

---

### Task 2: Migrate recipe tags in crafting.yaml

**Files:**
- Modify: `src/data/recipes/crafting.yaml`

This task removes all `elemental` and `magic` tags and adds specific damage type tags based on each recipe's `damage` field. Only non-physical damage types are added: fire, frost, lightning, poison, spirit, pure.

- [ ] **Step 1: Run a script to identify which recipes need which damage type tags**

This is a one-time diagnostic. Run from the repo root:

```bash
node --import tsx -e "
const fs = require('fs'), yaml = require('yaml');
const recipes = yaml.parse(fs.readFileSync('src/data/recipes/crafting.yaml','utf8'));
const special = new Set(['fire','frost','lightning','poison','spirit','pure']);
for (const r of recipes) {
  const dmg = r.damage ?? r.upgrades?.[0]?.damage ?? {};
  const types = Object.keys(dmg).filter(k => special.has(k));
  const has = {
    elemental: r.tags?.includes('elemental'),
    magic: r.tags?.includes('magic'),
  };
  if (types.length > 0 || has.elemental || has.magic) {
    console.log(r.id, '|', 'tags:', r.tags?.filter(t=>t==='elemental'||t==='magic').join(',') || 'none', '|', 'dmg types:', types.join(',') || 'none');
  }
}
"
```

Review the output. Each recipe with `elemental` or `magic` should have the tag removed, and each recipe with special damage types should get those types added to its tags.

- [ ] **Step 2: Run automated migration**

```bash
node --import tsx -e "
const fs = require('fs'), yaml = require('yaml');
const path = 'src/data/recipes/crafting.yaml';
let content = fs.readFileSync(path, 'utf8');
const recipes = yaml.parse(content);
const special = new Set(['fire','frost','lightning','poison','spirit','pure']);

for (const r of recipes) {
  if (!r.tags) continue;
  const oldTags = r.tags.join(', ');

  // Remove elemental and magic
  r.tags = r.tags.filter(t => t !== 'elemental' && t !== 'magic');

  // Add specific damage types from damage field
  const dmg = r.damage ?? r.upgrades?.[0]?.damage ?? {};
  const types = Object.keys(dmg).filter(k => special.has(k));
  for (const t of types) {
    if (!r.tags.includes(t)) r.tags.push(t);
  }

  // Replace in file content if tags changed
  const newTags = r.tags.join(', ');
  if (oldTags !== newTags) {
    content = content.replace('tags: [' + oldTags + ']', 'tags: [' + newTags + ']');
    console.log(r.id + ': [' + oldTags + '] → [' + newTags + ']');
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done.');
"
```

- [ ] **Step 3: Verify no `elemental` or `magic` tags remain**

```bash
grep -n 'elemental\|magic' src/data/recipes/crafting.yaml
```

Expected: Zero matches. If any remain, fix them manually.

- [ ] **Step 4: Spot-check a few recipes**

Verify manually that:
- `draugr-fang` (has poison+frost damage) now has tags `poison, frost` instead of `elemental`
- `staff-of-embers` (has fire damage) no longer has `magic`, now has `fire`
- `fire-arrow` (has fire damage) no longer has `elemental`, now has `fire`
- A plain physical weapon like `iron-sword` has no damage type tags

```bash
grep -A2 'id: draugr-fang' src/data/recipes/crafting.yaml | head -5
grep -A2 'id: staff-of-embers' src/data/recipes/crafting.yaml | head -5
grep -A2 'id: fire-arrow' src/data/recipes/crafting.yaml | head -5
grep -A2 'id: iron-sword' src/data/recipes/crafting.yaml | head -5
```

- [ ] **Step 5: Commit**

```bash
git add src/data/recipes/crafting.yaml
git commit -m "refactor: replace elemental/magic tags with specific damage types"
```

---

### Task 3: Update filter test

**Files:**
- Modify: `tests/filter.test.ts`

- [ ] **Step 1: Update test fixture and modifier test**

In `tests/filter.test.ts`, the `draugr-fang` sample recipe has `tags: ['ranged', 'bow', '2h', 'elemental', 'mountain']`. Update it to use specific damage types, and update the test that filters by modifier.

Change the `draugr-fang` fixture:

```ts
  {
    id: 'draugr-fang',
    name: 'Draugr Fang',
    type: 'crafting',
    station: 'forge',
    stationLevel: 3,
    ingredients: [
      { itemId: 'ancient-bark', qty: 10 },
      { itemId: 'silver', qty: 20 },
    ],
    tags: ['ranged', 'bow', '2h', 'poison', 'frost', 'mountain'],
  },
```

Change the test `'filters by modifier tag'` (line 129-133):

```ts
  it('filters by damage type tag', () => {
    expect(
      filterRecipes(sample, { ...empty, tags: ['poison'] }).map((r) => r.id),
    ).toEqual(['draugr-fang']);
  });
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `pnpm test -- tests/filter.test.ts`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/filter.test.ts
git commit -m "test: update filter test for damage type tags"
```

---

### Task 4: Update AdvancedFilterPanel

**Files:**
- Modify: `src/components/AdvancedFilterPanel.tsx`

- [ ] **Step 1: Update imports**

Replace the `modifiers` import with `damageTypes`:

```ts
// Change this line:
import {
  categories,
  biomes,
  foodStatFocus,
  handedness,
  modifiers,
  categorySubFilters,
  defaultSubFilters,
  tagDisplayNames,
  type SubFilterKey,
} from '../lib/filter-categories';

// To this:
import {
  categories,
  biomes,
  foodStatFocus,
  handedness,
  damageTypes,
  categorySubFilters,
  defaultSubFilters,
  tagDisplayNames,
  type SubFilterKey,
} from '../lib/filter-categories';
```

- [ ] **Step 2: Update selectCategory clearSet**

In the `selectCategory` function (~line 63-68), replace the `allSubFilters` array. Remove `modifiers` and `'elemental'`, add `damageTypes`:

```ts
    const allSubFilters = [
      ...handedness.map((h) => h.tag),
      ...foodStatFocus.map((f) => f.tag),
      ...damageTypes.map((d) => d.tag),
      'found',
    ];
```

- [ ] **Step 3: Remove the old Modifiers and Elemental sections**

Delete the entire `{/* ── Modifiers (Melee/Ranged/Ammo only) */}` section (the `<Show when={isSubFilterVisible('modifiers')}>` block).

Delete the entire `{/* ── Elemental only (Melee/Ammo) */}` section (the `<Show when={isSubFilterVisible('elemental')}>` block).

- [ ] **Step 4: Add the Damage Type section**

Add this JSX after the Stat Focus section and before the Found section:

```tsx
      {/* ── Damage Type (Melee/Ranged/Ammo) ─────────────────────────── */}
      <Show when={isSubFilterVisible('damageType')}>
        <div class="adv-filter__section">
          <span class="adv-filter__label">Damage Type</span>
          <div class="adv-filter__tags" role="group" aria-label="Damage type">
            <For each={damageTypes}>
              {(d) => (
                <button
                  type="button"
                  class="filter-chip filter-chip--sm"
                  classList={{ 'filter-chip--active': hasTags(d.tag) }}
                  onClick={() => toggleModifier(d.tag)}
                  aria-pressed={hasTags(d.tag)}
                >
                  <FilterIcon name={d.tag} />
                  {d.label}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
```

Note: `toggleModifier` still works correctly for this — it's a generic tag toggle. No rename needed.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/AdvancedFilterPanel.tsx
git commit -m "feat: replace modifier sections with damage type filter"
```

---

### Task 5: Wire damage icons into sprite

**Files:**
- Modify: `scripts/generate-sprite.ts`

The damage icons exist at `public/icons/damage/*.svg` but the sprite generator only scans `items/` and `filters/`. The FilterIcon component uses `#filter-{name}` IDs, so we need these icons in the sprite with the `filter-` prefix.

- [ ] **Step 1: Add damage directory to sprite generator**

In `scripts/generate-sprite.ts`, add a third entry to the `iconSources` array (~line 22-25):

```ts
const iconSources: { dir: string; prefix: string }[] = [
  { dir: ITEMS_DIR, prefix: '' },
  { dir: FILTERS_DIR, prefix: 'filter-' },
  { dir: resolve(import.meta.dirname, '../public/icons/damage'), prefix: 'filter-' },
];
```

This will create sprite symbols like `filter-fire`, `filter-frost`, etc. from the damage directory. If a `fire.svg` also exists in `filters/`, both will be processed — the damage one will overwrite since it comes later. To avoid duplicates, check if any damage-type SVGs exist in `filters/`:

```bash
ls public/icons/filters/{fire,frost,lightning,poison,spirit,pure}.svg 2>/dev/null
```

If any exist, delete them — the canonical source is `public/icons/damage/`.

- [ ] **Step 2: Add the DAMAGE_DIR constant**

Add this constant near the top of the file, after `FILTERS_DIR`:

```ts
const DAMAGE_DIR = resolve(import.meta.dirname, '../public/icons/damage');
```

Then reference it in `iconSources`:

```ts
const iconSources: { dir: string; prefix: string }[] = [
  { dir: ITEMS_DIR, prefix: '' },
  { dir: FILTERS_DIR, prefix: 'filter-' },
  { dir: DAMAGE_DIR, prefix: 'filter-' },
];
```

- [ ] **Step 3: Regenerate sprite**

Run: `pnpm icons`

Expected output similar to: `Sprite generated: 488 icons → ...KB → sprite.{hash}.svg`

- [ ] **Step 4: Verify damage type icons are in sprite**

```bash
grep -o 'id="filter-[^"]*"' public/icons/sprite.*.svg | grep -E 'fire|frost|lightning|poison|spirit|pure'
```

Expected: `filter-fire`, `filter-frost`, `filter-lightning`, `filter-poison`, `filter-spirit`, `filter-pure` all present.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sprite.ts public/icons/sprite.*.svg public/icons/sprite-manifest.json
git commit -m "feat: add damage type icons to filter sprite"
```

---

### Task 6: Run full test suite and verify

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `pnpm test`

Expected: All tests pass.

- [ ] **Step 2: Check for stale references**

```bash
grep -rn 'elemental\|magic' src/lib/filter-categories.ts src/components/AdvancedFilterPanel.tsx tests/filter.test.ts
```

Expected: Zero matches. If any remain, fix them.

- [ ] **Step 3: Verify no remaining `modifiers` import/reference in panel**

```bash
grep -n 'modifiers' src/components/AdvancedFilterPanel.tsx
```

Expected: Zero matches (the `modifiers` section and import should be gone). The `toggleModifier` function name is fine — it's a generic toggle helper.

- [ ] **Step 4: Build check**

Run: `pnpm build 2>&1 | tail -5`

Expected: Build succeeds.

- [ ] **Step 5: Commit if any fixes were needed**

Only if previous steps required fixes:

```bash
git add -u
git commit -m "fix: clean up stale modifier references"
```
