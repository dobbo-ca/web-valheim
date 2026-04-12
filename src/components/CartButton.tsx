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
      onClick={props.onClick}
      aria-label={`Shopping cart${props.count > 0 ? `: ${props.count} recipe${props.count === 1 ? '' : 's'}` : ''}`}
    >
      <span class="cart-badge__icon" aria-hidden="true">🛒</span>
      <Show when={props.count > 0}>
        <span class="cart-badge__count">{props.count}</span>
      </Show>
    </button>
  );
};
