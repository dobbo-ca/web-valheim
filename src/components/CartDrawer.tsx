import { For, Show, createSignal, type Component } from 'solid-js';
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

  const handleCopy = async () => {
    const text = formatGroceryList(props.groceryList);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('cart-drawer__overlay')) {
      props.onClose();
    }
  };

  return (
    <Show when={props.open}>
      <div class="cart-drawer__overlay" onClick={handleOverlayClick}>
        <div class="cart-drawer" role="dialog" aria-label="Shopping cart">
          <div class="cart-drawer__header">
            <h2 class="cart-drawer__title">Cart</h2>
            <button
              type="button"
              class="cart-drawer__close"
              onClick={props.onClose}
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
                      <span class="cart-drawer__qty-value">{entry.qty}</span>
                      <button
                        type="button"
                        class="cart-drawer__qty-btn"
                        onClick={() => props.onSetQty(entry.recipeId, entry.qty + 1)}
                        aria-label={`Increase ${entry.recipeName} quantity`}
                      >
                        +
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
