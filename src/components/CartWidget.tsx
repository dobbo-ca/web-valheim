/**
 * Standalone cart button + drawer for the site header.
 * Reads cart state from localStorage so it persists across pages.
 * Lazy-loads recipe data when the drawer is opened for grocery aggregation.
 */
import { createSignal, createEffect, createMemo, onMount, onCleanup, type Component } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type { Cart } from '../lib/cart';
import {
  removeFromCart,
  setQty,
  clearCart,
  aggregateGroceryList,
  parseCartKey,
} from '../lib/cart';
import type { DataSet } from '../lib/loader';
import type { Recipe, Item } from '../lib/types';
import { CartButton } from './CartButton';
import { CartDrawer } from './CartDrawer';

const CART_STORAGE_KEY = 'valheim-cart';

function readCart(): Cart {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return {};
}

function writeCart(cart: Cart) {
  try {
    const keys = Object.keys(cart);
    if (keys.length === 0) {
      localStorage.removeItem(CART_STORAGE_KEY);
    } else {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  } catch {}
}

interface Props {
  baseHref: string;
}

export const CartWidget: Component<Props> = (props) => {
  const [cart, setCart] = createStore<Cart>({});
  const [drawerOpen, setDrawerOpen] = createSignal(false);
  const [fullData, setFullData] = createSignal<DataSet | null>(null);

  // Hydrate from localStorage
  onMount(() => {
    setCart(reconcile(readCart()));

    // Listen for cart changes from other components/pages
    const handler = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY) {
        setCart(reconcile(readCart()));
      }
    };
    window.addEventListener('storage', handler);
    onCleanup(() => window.removeEventListener('storage', handler));

    // Also poll for same-page cart changes (RecipeTable writes to localStorage)
    const interval = setInterval(() => {
      const current = readCart();
      const keys = Object.keys(cart);
      const currentKeys = Object.keys(current);
      if (keys.length !== currentKeys.length || keys.some(k => cart[k] !== current[k])) {
        setCart(reconcile(current));
      }
    }, 500);
    onCleanup(() => clearInterval(interval));
  });

  // Persist cart changes back to localStorage
  createEffect(() => {
    const keys = Object.keys(cart);
    const snapshot = Object.fromEntries(keys.map((k) => [k, cart[k]]));
    writeCart(snapshot);
  });

  // Lazy-load full recipe data when drawer opens
  createEffect(() => {
    if (drawerOpen() && !fullData()) {
      fetch(`${props.baseHref}data/recipes-full.json`)
        .then((r) => r.json())
        .then((data) => setFullData(data))
        .catch(() => {});
    }
  });

  const cartKeys = createMemo(() => Object.keys(cart));
  const cartCount = createMemo(() => cartKeys().length);

  const recipesById = createMemo(() => {
    const data = fullData();
    if (!data) return new Map<string, Recipe>();
    return new Map(data.recipes.map((r) => [r.id, r]));
  });

  const itemsById = createMemo(() => {
    const data = fullData();
    if (!data) return new Map<string, Item>();
    return new Map(data.items.map((i) => [i.id, i]));
  });

  const groceryList = createMemo(() =>
    aggregateGroceryList(
      Object.fromEntries(cartKeys().map((k) => [k, cart[k]])),
      recipesById(),
      itemsById(),
    ),
  );

  const cartEntries = createMemo(() =>
    cartKeys().map((cartKey) => {
      const { baseId, quality } = parseCartKey(cartKey);
      const recipe = recipesById().get(baseId);
      let name = recipe?.name ?? baseId;
      if (quality != null) name += ` +${quality}`;
      return {
        recipeId: cartKey,
        recipeName: name,
        qty: cart[cartKey],
        yieldQty: recipe?.yields?.qty ?? 1,
      };
    }),
  );

  const handleSetQty = (recipeId: string, qty: number) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    const next = setQty(snapshot, recipeId, qty);
    setCart(reconcile(next));
    if (Object.keys(next).length === 0) setDrawerOpen(false);
  };

  const handleRemove = (recipeId: string) => {
    const snapshot = Object.fromEntries(cartKeys().map((k) => [k, cart[k]]));
    const next = removeFromCart(snapshot, recipeId);
    setCart(reconcile(next));
    if (Object.keys(next).length === 0) setDrawerOpen(false);
  };

  const handleClear = () => {
    setCart(reconcile(clearCart()));
    setDrawerOpen(false);
  };

  return (
    <>
      <CartButton count={cartCount()} onClick={() => setDrawerOpen(true)} />
      <CartDrawer
        open={drawerOpen()}
        entries={cartEntries()}
        groceryList={groceryList()}
        onClose={() => setDrawerOpen(false)}
        onSetQty={handleSetQty}
        onRemove={handleRemove}
        onClear={handleClear}
      />
    </>
  );
};
