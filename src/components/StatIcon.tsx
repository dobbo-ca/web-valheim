import type { Component } from 'solid-js';

/** Maps stat keys to their icon filenames in public/icons/stats/ */
const STAT_ICON_MAP: Record<string, string> = {
  knockback: 'knockback',
  backstab: 'backstab',
  stagger: 'stagger',
  stamina: 'stamina',
  staminaPerSecond: 'stamina',
  adrenaline: 'adrenaline',
  eitr: 'stamina',
  healthCost: 'adrenaline',
  recoilForce: 'knockback',
  durability: 'durability',
  weight: 'weight',
  movementPenalty: 'movement-speed',
  blockArmor: 'block-armor',
  parryBlockArmor: 'parry-block-armor',
  blockForce: 'block-force',
  parryBonus: 'parry-bonus',
  blockAdrenaline: 'block-adrenaline',
  parryAdrenaline: 'parry-adrenaline',
};

interface Props {
  stat: string;
  size?: number;
  baseHref?: string;
}

export const StatIcon: Component<Props> = (props) => {
  const s = () => props.size ?? 14;
  const base = () => props.baseHref ?? '/valheim/';
  const icon = () => STAT_ICON_MAP[props.stat];

  return (
    <>
      {icon() && (
        <img
          class="damage-icon"
          src={`${base()}icons/stats/${icon()}.svg`}
          alt=""
          width={s()}
          height={s()}
          loading="lazy"
        />
      )}
    </>
  );
};
