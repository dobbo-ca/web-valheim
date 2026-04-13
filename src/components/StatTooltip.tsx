import { Show, type Component } from 'solid-js';
import { STAT_TOOLTIPS } from '../lib/stat-tooltips';

interface Props {
  /** The stat key matching STAT_TOOLTIPS (e.g. 'stagger', 'blockForce') */
  stat: string;
  /** Display label shown before the tooltip icon */
  label: string;
}

export const StatTooltip: Component<Props> = (props) => {
  const tip = () => STAT_TOOLTIPS[props.stat];

  return (
    <span class="stat-label">
      {props.label}
      <Show when={tip()}>
        <span class="stat-tooltip" title={tip()} aria-label={tip()}>
          ⓘ
        </span>
      </Show>
    </span>
  );
};
