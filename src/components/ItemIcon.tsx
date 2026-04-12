import type { Component } from 'solid-js';

interface Props {
  id: string;
  size?: 'sm' | 'md';
  spriteHref?: string;
}

const sizes = { sm: 16, md: 24 } as const;

export const ItemIcon: Component<Props> = (props) => {
  const s = () => sizes[props.size ?? 'md'];
  const href = () => `${props.spriteHref ?? '/icons/sprite.svg'}#${props.id}`;

  return (
    <svg
      class={`item-icon item-icon--${props.size ?? 'md'}`}
      width={s()}
      height={s()}
      aria-hidden="true"
    >
      <use href={href()} />
    </svg>
  );
};
