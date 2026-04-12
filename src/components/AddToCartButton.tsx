import type { Component } from 'solid-js';

interface Props {
  inCart: boolean;
  onAdd: () => void;
  onOpenCart: () => void;
}

export const AddToCartButton: Component<Props> = (props) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.inCart) {
      props.onOpenCart();
    } else {
      props.onAdd();
    }
  };

  return (
    <button
      type="button"
      class="add-to-cart-btn"
      classList={{ 'add-to-cart-btn--in-cart': props.inCart }}
      onClick={handleClick}
      aria-label={props.inCart ? 'In cart — click to view' : 'Add to cart'}
    >
      {props.inCart ? '✓ In Cart' : '+ Add'}
    </button>
  );
};
