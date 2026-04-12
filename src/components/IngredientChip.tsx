import { Show, type Component } from 'solid-js';
import { ItemIcon } from './ItemIcon';

interface Props {
  itemId: string;
  label: string;
  qty?: number;
  onClick?: (itemId: string) => void;
  variant?: 'ingredient' | 'active-filter';
  hasIcon?: boolean;
  spriteHref?: string;
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
      <Show when={props.hasIcon}>
        <ItemIcon id={props.itemId} size="sm" spriteHref={props.spriteHref} />
      </Show>
      {props.label}{props.qty != null && <>{' '}<span class="chip__qty">×{props.qty}</span></>}
    </button>
  );
};
