import { For, Show, createEffect, createSignal, onCleanup, type Component } from 'solid-js';
import type { GroceryItem } from '../lib/cart';
import { formatGroceryList } from '../lib/cart';

interface CartEntry {
  recipeId: string;
  recipeName: string;
  qty: number;
}

interface Props {
  open: boolean;
  entries: CartEntry[];
  groceryList: GroceryItem[];
  onClose: () => void;
  onSetQty: (recipeId: string, qty: number) => void;
  onRemove: (recipeId: string) => void;
  onClear: () => void;
}

export const CartDrawer: Component<Props> = (props) => {
  const [copied, setCopied] = createSignal(false);
  const [visible, setVisible] = createSignal(false);
  const [closing, setClosing] = createSignal(false);

  createEffect(() => {
    if (props.open) {
      setVisible(true);
      setClosing(false);
    } else if (visible()) {
      setClosing(true);
    }
  });

  const handleClose = () => {
    setClosing(true);
  };

  const handleAnimationEnd = () => {
    if (closing()) {
      setVisible(false);
      setClosing(false);
      props.onClose();
    }
  };

  // Close on Escape key
  createEffect(() => {
    if (!visible()) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    onCleanup(() => document.removeEventListener('keydown', handler));
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatGroceryList(props.groceryList));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed (not HTTPS, unfocused tab, etc.)
    }
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('cart-drawer__overlay')) {
      handleClose();
    }
  };

  return (
    <Show when={visible()}>
      <div
        class="cart-drawer__overlay"
        classList={{ 'cart-drawer__overlay--closing': closing() }}
        onClick={handleOverlayClick}
      >
        <div
          class="cart-drawer"
          classList={{ 'cart-drawer--closing': closing() }}
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
          onAnimationEnd={handleAnimationEnd}
        >
          <div class="cart-drawer__header">
            <h2 class="cart-drawer__title">Cart</h2>
            <button
              type="button"
              class="cart-drawer__close"
              onClick={handleClose}
              aria-label="Close cart"
            >
              ✕
            </button>
          </div>

          <div class="cart-drawer__body">
            <div class="cart-drawer__items">
              <For each={props.entries}>
                {(entry) => (
                  <div class="cart-drawer__item">
                    <span class="cart-drawer__item-name">{entry.recipeName}</span>
                    <div class="cart-drawer__qty-controls">
                      <button
                        type="button"
                        class="cart-drawer__qty-btn"
                        onClick={() => props.onSetQty(entry.recipeId, entry.qty - 1)}
                        aria-label={`Decrease ${entry.recipeName} quantity`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        class="cart-drawer__qty-input"
                        value={entry.qty}
                        min="1"
                        aria-label={`${entry.recipeName} quantity`}
                        onInput={(e) => {
                          const val = Number.parseInt(e.currentTarget.value, 10);
                          if (Number.isFinite(val) && val > 0) {
                            props.onSetQty(entry.recipeId, val);
                          }
                        }}
                      />
                      <button
                        type="button"
                        class="cart-drawer__qty-btn"
                        onClick={() => props.onSetQty(entry.recipeId, entry.qty + 1)}
                        aria-label={`Increase ${entry.recipeName} quantity by 1`}
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        class="cart-drawer__qty-btn"
                        onClick={() => props.onSetQty(entry.recipeId, entry.qty + 5)}
                        aria-label={`Increase ${entry.recipeName} quantity by 5`}
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        class="cart-drawer__remove-btn"
                        onClick={() => props.onRemove(entry.recipeId)}
                        aria-label={`Remove ${entry.recipeName} from cart`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={props.groceryList.length > 0}>
              <div class="cart-drawer__divider" />
              <div class="cart-drawer__grocery">
                <h3 class="cart-drawer__grocery-title">Grocery List</h3>
                <For each={props.groceryList}>
                  {(item) => (
                    <div class="cart-drawer__grocery-item">
                      <span>{item.name}</span>
                      <span class="cart-drawer__grocery-qty">×{item.qty}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class="cart-drawer__footer">
            <button
              type="button"
              class="cart-drawer__copy-btn"
              onClick={handleCopy}
              disabled={props.groceryList.length === 0}
            >
              {copied() ? 'Copied!' : 'Copy Grocery List'}
            </button>
            <button
              type="button"
              class="cart-drawer__clear-btn"
              onClick={props.onClear}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
