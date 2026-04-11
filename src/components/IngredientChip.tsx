import type { Component } from 'solid-js';

interface Props {
  itemId: string;
  label: string;
  qty?: number;
  onClick?: (itemId: string) => void;
  variant?: 'ingredient' | 'active-filter';
}

export const IngredientChip: Component<Props> = (props) => {
  const clickable = typeof props.onClick === 'function';
  const variant = () => props.variant ?? 'ingredient';

  return (
    <button
      type="button"
      class={`chip chip--${variant()}`}
      data-item-id={props.itemId}
      disabled={!clickable}
      onClick={() => props.onClick?.(props.itemId)}
    >
      {props.label}
      {props.qty != null && <span class="chip__qty"> ×{props.qty}</span>}
    </button>
  );
};
