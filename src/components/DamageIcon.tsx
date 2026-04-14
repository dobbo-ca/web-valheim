import type { Component } from 'solid-js';

interface Props {
  type: string;
  size?: number;
  baseHref?: string;
}

export const DamageIcon: Component<Props> = (props) => {
  const s = () => props.size ?? 16;
  const base = () => props.baseHref ?? '/valheim/';

  return (
    <img
      class="damage-icon"
      src={`${base()}icons/damage/${props.type}.svg`}
      alt={props.type}
      width={s()}
      height={s()}
      loading="lazy"
    />
  );
};
