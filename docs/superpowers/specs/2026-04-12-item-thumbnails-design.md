# Item Thumbnails Design Spec

## Summary

Add pixel-art thumbnails for items appearing in the recipe table and ingredient chips. Icons are drawn at 48x48 pixels and scaled down using CSS `image-rendering: pixelated`. Art takes inspiration from Valheim wiki and other sources for color/shape reference but is original pixel art.

Items are rolled out in batches by station level, with user approval per batch before proceeding to the next.

## Icon Style

- **Pixel art**, 48x48 source resolution
- Inline SVGs composed of rects/shapes to approximate the blocky pixel aesthetic
- Each icon is a standalone `.svg` file in `public/icons/items/`
- Scaled via CSS with `image-rendering: pixelated` (or `crisp-edges` fallback)
- Color palette drawn from the game's visual language — earthy tones, muted metals, vibrant berries

## Where Icons Appear

### Recipe Table — Name Column
- 24x24 thumbnail to the left of the recipe name in each row
- Visible in both collapsed and expanded states
- Falls back to no icon (text-only, as today) when icon file is missing

### Ingredient Chips
- 16x16 icon inside the chip, to the left of the label text
- Applies to chips in expanded recipe rows and active filter pills
- Falls back gracefully — chip renders as text-only without icon

### Not in Scope (Yet)
- Detail pages (`/recipes/[slug]`) — will use larger sizes when shopping cart lands
- Station icons

## Asset Pipeline

### File Structure
```
public/
  icons/
    items/
      wood.svg
      stone.svg
      deer-hide.svg
      ...
```

### SVG Format
Each file is a 48x48 viewBox SVG using simple shapes (rect, polygon, circle, path). No embedded raster images. Files should be compact — targeting under 1KB each.

### Referencing in Components
Icons are referenced by item ID convention: `/icons/items/{itemId}.svg`. Components check for icon existence at build time via a generated manifest or at runtime with graceful fallback.

**Approach:** At build time, scan `public/icons/items/` to produce a `Set<string>` of available item IDs with icons. Pass this set to components. This avoids broken `<img>` tags and lets chips/rows decide whether to render an icon.

## Component Changes

### `IngredientChip.tsx`
- Accept optional `hasIcon: boolean` prop
- When true, render `<img>` before the label text at 16x16
- CSS: `image-rendering: pixelated; vertical-align: middle;`

### `RecipeRow.tsx`
- In the recipe name cell, render a 24x24 `<img>` before the name text
- The recipe's own item ID is used (the recipe `id` maps to the crafted item)
- Only shown when an icon exists for that recipe ID

### `RecipeTable.tsx`
- Accept `iconSet: Set<string>` prop (set of item IDs that have icons)
- Pass `hasIcon` down to `IngredientChip` and `RecipeRow`

### Page-Level Wiring (`index.astro`)
- At build time, glob `public/icons/items/*.svg` to build the icon set
- Serialize and pass to `RecipeTable`

## Styling

Add to `theme.css`:

```css
.item-icon {
  image-rendering: pixelated;
  image-rendering: crisp-edges; /* Safari fallback */
  vertical-align: middle;
  flex-shrink: 0;
}

.item-icon--sm { width: 16px; height: 16px; }
.item-icon--md { width: 24px; height: 24px; }
```

## Batch Rollout

Items are batched by station + level. Each batch includes all unique items (recipe outputs + ingredients) for recipes at that station/level combination. User approves each batch before the next begins.

### Batch 1 — Workbench L1 + Cauldron L1 (40 items)

Early-game essentials. Covers the items new players encounter first.

**Materials (9):** wood, stone, flint, core-wood, fine-wood, deer-hide, leather-scraps, feathers, hard-antler, resin, bone-fragments

**Cooking Ingredients (5):** raspberries, blueberries, mushroom, carrot, turnip, boar-meat

**Recipe Outputs — Tools (4):** hammer, hoe, stone-axe, flint-axe, antler-pickaxe

**Recipe Outputs — Weapons (6):** club, flint-knife, flint-spear, crude-bow, finewood-bow, wood-arrow, flinthead-arrow, fire-arrow

**Recipe Outputs — Armor/Shields (6):** leather-helmet, leather-tunic, leather-pants, deer-hide-cape, wood-shield, wood-tower-shield, bone-tower-shield

**Recipe Outputs — Food (3):** queens-jam, carrot-soup, turnip-stew

### Subsequent Batches (TBD)
- Batch 2: Workbench L2-L3 + Cauldron L2
- Batch 3: Forge L1
- Further batches determined after initial batches land

## Graceful Degradation

- Missing icon = no icon rendered, text-only as today
- No broken image indicators — icons are conditionally rendered based on the build-time manifest
- Progressive enhancement: the table is fully functional without any icons

## Testing

- Unit test: icon manifest generation produces correct set from filesystem
- E2E test: verify at least one recipe row shows a thumbnail image
- E2E test: verify ingredient chips show icons when available
- Visual check: icons render crisp at 16px and 24px sizes
