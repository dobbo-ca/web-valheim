# Shopping Cart & Grocery List — Design

**Date:** 2026-04-11
**Status:** Draft
**Owner:** @cdobbyn

## Summary

Add a shopping cart feature to the Valheim recipe table. Users select recipes,
set a quantity for each (e.g., 3× Hammer), and the app aggregates all
ingredients into a single grocery list. The cart lives in a slide-out drawer
that appears when the first item is added.

## Goals

- Let users build a collection of recipes with per-recipe quantities.
- Aggregate ingredients across all selected recipes into one flat grocery list.
- Provide a "Copy to clipboard" button for pasting the list into Discord/notes.
- Persist the cart across sessions (localStorage) and make it shareable via URL.
- Keep the URL short using `lz-string` compression.

## Non-Goals

- No user accounts or server-side persistence.
- No checklist/tick-off functionality for gathered items.
- No grouping by station or recipe in the copied output.
- No max quantity cap.

## Data Model & State

### Cart Store

A Solid.js `createStore` holding a record of recipe ID to quantity:

```ts
type CartStore = Record<string, number>;
// Example: { "hammer": 3, "queens-jam": 5 }
```

### Operations

- `addToCart(recipeId: string)` — sets qty to 1 if not present.
- `removeFromCart(recipeId: string)` — deletes the entry.
- `setQty(recipeId: string, n: number)` — sets qty directly; removes if `n <= 0`.
- `clearCart()` — empties the store.

### Grocery List Derivation

A `createMemo` that:
1. Iterates the cart store entries.
2. Looks up each recipe's `ingredients` array.
3. Multiplies each ingredient qty by the cart qty.
4. Aggregates into a `Map<itemId, totalQty>`, merging duplicates.
5. Sorts alphabetically by item name.

### Persistence

**Dual persistence — localStorage + URL:**

- **localStorage:** Cart serialized as JSON on every change via `createEffect`.
  On page load, hydrate from localStorage if no URL cart param is present.
- **URL:** Compressed using `lz-string`'s `compressToEncodedURIComponent`.
  Encoded into `?cart=<compressed>` query param via `history.replaceState`.
  URL takes precedence over localStorage when present (shared links override
  local cart).
- Clearing the cart removes the `?cart` param from the URL and clears
  localStorage.

### URL Encoding Details

Uses `lz-string` (~5KB, zero dependencies). The library provides
`compressToEncodedURIComponent` / `decompressFromEncodedURIComponent` which
produce URL-safe strings without additional base64 encoding.

Encoding flow:
1. Cart store → `JSON.stringify` → `compressToEncodedURIComponent` → URL param.
2. URL param → `decompressFromEncodedURIComponent` → `JSON.parse` → hydrate store.

## UI Components

### New Components

**`CartButton.tsx`**
- Floating badge/button in the top-right area of the recipe table.
- Shows the total number of distinct recipes in the cart.
- Hidden when the cart is empty.
- Clicking toggles the drawer open/closed.

**`CartDrawer.tsx`**
- Slide-out panel from the right edge, overlays the table.
- Semi-transparent backdrop behind it; clicking outside closes the drawer.
- Contents:
  - Header: "Cart" title + close (×) button.
  - Cart items list: each shows recipe name, −/+ quantity buttons, remove (×)
    button. Hitting − at qty 1 removes the item.
  - Divider.
  - Grocery list section: aggregated ingredients with `×qty` display, sorted
    alphabetically.
  - "Copy List" button: copies flat-format grocery list to clipboard. Button
    text changes to "Copied!" for 2 seconds, then reverts.

**`AddToCartButton.tsx`**
- Rendered in each recipe row.
- Default state: "+ Add" button.
- When recipe is in cart: shows "✓ In Cart". Clicking opens the drawer
  (does not double-add).

### Modifications to Existing Components

**`RecipeTable.tsx`**
- Creates the cart store and cart operations.
- Passes cart props down to `RecipeRow`.
- Renders `CartButton` and `CartDrawer`.

**`RecipeRow.tsx`**
- Receives `onAdd`, `onOpenCart`, and `isInCart` props.
- Renders `AddToCartButton` in each row.

### No New Pages

Everything lives within the existing recipe table page.

## Interactions & Edge Cases

### Adding to Cart
- Click "+ Add" on a row → adds recipe with qty 1, cart badge appears.
- If recipe is already in cart, "✓ In Cart" button opens the drawer instead of
  double-adding.

### Quantity Controls
- −/+ buttons in the drawer. Min qty is 1.
- Hitting − at qty 1 removes the item from the cart.
- No maximum cap.

### Drawer Behavior
- Opens on: clicking cart badge, or clicking "✓ In Cart" on a row.
- Closes on: close (×) button, or clicking outside the drawer overlay.
- No body scroll lock — table remains scrollable behind the overlay.

### Copy to Clipboard
- Flat format, one ingredient per line:
  ```
  Wood ×9
  Stone ×6
  Raspberry ×40
  Blueberries ×40
  ```
- Sorted alphabetically by item name.
- "Copied!" confirmation on button for 2 seconds, then reverts.

### URL Sync
- Cart change → compress → update `?cart=` param via `replaceState`.
- Page load with `?cart` param → decompress → hydrate store (overrides
  localStorage).
- Page load without `?cart` → hydrate from localStorage.
- Clearing cart removes `?cart` from URL.

### Empty State
- Cart badge is hidden. Drawer is inaccessible.
- Removing the last item from the cart auto-closes the drawer.

## Styling

Follow existing vanilla CSS patterns in `theme.css`. New classes for cart
components use the existing design token variables (`--bg`, `--text`,
`--primary`, `--accent`, etc.). Drawer uses `position: fixed` with a
semi-transparent backdrop. Animations via CSS transitions on `transform`.

## Dependencies

- **`lz-string`** — URL compression. ~5KB, zero transitive dependencies.

## Testing

- **Unit tests (Vitest):**
  - Cart store operations (add, remove, setQty, clear).
  - Grocery list aggregation logic (multiplied quantities, merging duplicates).
  - URL encoding/decoding round-trip with lz-string.
  - Clipboard copy output format.
- **E2E tests (Playwright):**
  - Add recipe to cart, verify badge appears.
  - Adjust quantity, verify grocery list updates.
  - Copy list, verify clipboard content.
  - Share URL with cart, verify hydration on load.
  - Clear cart, verify badge disappears and URL cleans up.
