import { Show, type Component } from 'solid-js';

interface Props {
  count: number;
  onClick: () => void;
}

export const CartButton: Component<Props> = (props) => {
  return (
    <button
      type="button"
      class="cart-badge"
      classList={{ 'cart-badge--empty': props.count === 0 }}
      disabled={props.count === 0}
      onClick={props.onClick}
      aria-label={props.count > 0 ? `Shopping cart: ${props.count} recipe${props.count === 1 ? '' : 's'}` : 'Shopping cart: empty'}
    >
      <span class="cart-badge__icon" aria-hidden="true">🛒</span>
      <Show when={props.count > 0}>
        <span class="cart-badge__count">{props.count}</span>
      </Show>
    </button>
  );
};
