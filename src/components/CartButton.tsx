import { Show, type Component } from 'solid-js';

interface Props {
  count: number;
  onClick: () => void;
}

export const CartButton: Component<Props> = (props) => {
  return (
    <Show when={props.count > 0}>
      <button
        type="button"
        class="cart-badge"
        onClick={props.onClick}
        aria-label={`Shopping cart: ${props.count} recipe${props.count === 1 ? '' : 's'}`}
      >
        <span class="cart-badge__icon" aria-hidden="true">🛒</span>
        <span class="cart-badge__count">{props.count}</span>
      </button>
    </Show>
  );
};
