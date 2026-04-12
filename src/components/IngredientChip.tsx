import { Show, type Component } from 'solid-js';

interface Props {
  itemId: string;
  label: string;
  qty?: number;
  onClick?: (itemId: string) => void;
  variant?: 'ingredient' | 'active-filter';
  hasIcon?: boolean;
  iconBase?: string;
}

export const IngredientChip: Component<Props> = (props) => {
  const clickable = typeof props.onClick === 'function';
  const variant = () => props.variant ?? 'ingredient';
  const iconBase = () => props.iconBase ?? '/icons/items';

  return (
    <button
      type="button"
      class={`chip chip--${variant()}`}
      data-item-id={props.itemId}
      disabled={!clickable}
      onClick={() => props.onClick?.(props.itemId)}
    >
      <Show when={props.hasIcon}>
        <img
          class="item-icon item-icon--sm"
          src={`${iconBase()}/${props.itemId}.svg`}
          alt=""
          width={16}
          height={16}
        />
      </Show>
      {props.label}{props.qty != null && <>{' '}<span class="chip__qty">×{props.qty}</span></>}
    </button>
  );
};
