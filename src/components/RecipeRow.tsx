import { Show, For, type Component } from 'solid-js';
import type { Recipe, Item, Station } from '../lib/types';
import { AddToCartButton } from './AddToCartButton';
import { ItemIcon } from './ItemIcon';
import { CompactUpgradeGrid } from './CompactUpgradeGrid';

interface Props {
  recipe: Recipe;
  itemsById: Map<string, Item>;
  stationsById: Map<string, Station>;
  expanded: boolean;
  baseHref: string;
  inCart: boolean;
  onToggle: (recipeId: string) => void;
  onAddToCart: (recipeId: string) => void;
  onOpenCart: () => void;
  iconIds?: Set<string>;
  spriteHref?: string;
  upgradeKeysInCart: Set<string>;
  onAddUpgradeToCart: (cartKey: string) => void;
  onAddMaxUpgrades: (recipeId: string) => void;
  visibleColumns?: string[];
}

function formatStatSummary(recipe: Recipe): string | null {
  // Weapon stats
  if (recipe.stats) {
    const dmg = recipe.stats.primaryAttack?.damage;
    if (dmg) {
      const parts = Object.entries(dmg)
        .filter(([, v]) => v != null && v > 0)
        .map(([type, val]) => `${val} ${type}`);
      if (parts.length > 0) return parts.join(' / ');
    }
    const blockArmor = recipe.stats.blocking?.blockArmor;
    if (blockArmor != null) return `${blockArmor} block`;
  }

  // Armor stats
  if (recipe.armorStats) {
    return `${recipe.armorStats.armor} armor`;
  }

  return null;
}

function formatIngredients(
  recipe: Recipe,
  itemsById: Map<string, Item>,
): string {
  return (recipe.ingredients ?? [])
    .map((i) => `${itemsById.get(i.itemId)?.name ?? i.itemId} ×${i.qty}`)
    .join(', ');
}

export const RecipeRow: Component<Props> = (props) => {
  const detailId = () => `recipe-row-detail-${props.recipe.id}`;
  const spriteHref = () => props.spriteHref ?? '';
  const hasRecipeIcon = () => props.iconIds?.has(props.recipe.id) ?? false;
  const isColVisible = (col: string) => (props.visibleColumns ?? ['station', 'ingredients', 'stats']).includes(col);

  return (
    <>
      <div class="recipe-row__wrapper">
        <button
          type="button"
          class="recipe-row"
          classList={{ 'recipe-row--expanded': props.expanded }}
          aria-expanded={props.expanded}
          aria-controls={detailId()}
          onClick={() => props.onToggle(props.recipe.id)}
        >
          <span class="recipe-row__name">
            <Show when={hasRecipeIcon()}>
              <ItemIcon id={props.recipe.id} size="md" spriteHref={spriteHref()} />
            </Show>
            {props.recipe.name}
            <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
              <span class="recipe-row__yield">×{props.recipe.yields!.qty}</span>
            </Show>
          </span>
          <Show when={isColVisible('station')}>
            <span class="recipe-row__station">
              {(() => {
                const station = props.stationsById.get(props.recipe.station);
                const stationName = station?.name ?? props.recipe.station;
                if (props.recipe.stationLevel > 1) {
                  return <>{stationName}<span class="recipe-row__station-level"> (Lv {props.recipe.stationLevel})</span><span class="recipe-row__station-level-short"> +{props.recipe.stationLevel - 1}</span></>;
                }
                return stationName;
              })()}
            </span>
          </Show>
          <Show when={isColVisible('ingredients')}>
            <span class="recipe-row__ings">
              {formatIngredients(props.recipe, props.itemsById)}
            </span>
          </Show>
          <Show when={isColVisible('stats')}>
            <span class="recipe-row__stats-cell">
              {formatStatSummary(props.recipe) ?? ''}
            </span>
          </Show>
        </button>
        <div class="recipe-row__cart-cell">
          <AddToCartButton
            inCart={props.inCart}
            onAdd={() => props.onAddToCart(props.recipe.id)}
            onOpenCart={props.onOpenCart}
          />
        </div>
      </div>

      <Show when={props.expanded}>
        <div class="recipe-row__detail" id={detailId()}>
          <Show when={props.recipe.food || props.recipe.mead} fallback={
            <>
              {/* Weapons/armor/other: show upgrades */}
              <div class="recipe-row__section">
                <CompactUpgradeGrid
                  recipe={props.recipe}
                  itemsById={props.itemsById}
                  stationsById={props.stationsById}
                  upgradeKeysInCart={props.upgradeKeysInCart}
                  onAddUpgradeToCart={props.onAddUpgradeToCart}
                  onAddMaxUpgrades={props.onAddMaxUpgrades}
                  onOpenCart={props.onOpenCart}
                  iconIds={props.iconIds}
                  spriteHref={props.spriteHref}
                />
              </div>

              <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
                <div class="recipe-row__section">
                  <span class="label">Yields</span>
                  <span>×{props.recipe.yields!.qty} per craft</span>
                </div>
              </Show>

              <Show when={!props.recipe.stats && !props.recipe.armorStats && (() => {
                const yieldItemId = props.recipe.yields?.itemId ?? props.recipe.id;
                const item = props.itemsById.get(yieldItemId);
                return item?.stackSize;
              })()}>
                {(stackSize) => (
                  <div class="recipe-row__section">
                    <span class="label">Stack size</span>
                    <span>{stackSize()}</span>
                  </div>
                )}
              </Show>
            </>
          }>
            {/* Food/mead: vertical layout — stats, ingredients, yield, stack */}
              <Show when={props.recipe.food}>
                {(food) => (
                  <div class="recipe-row__section">
                    <span class="label">Stats</span>
                    <div class="food-detail-grid__stats">
                      <Show when={food().hp != null}><span class="food-stat"><span class="food-stat__val">{food().hp}</span> HP</span></Show>
                      <Show when={food().stamina != null}><span class="food-stat"><span class="food-stat__val">{food().stamina}</span> Stam</span></Show>
                      <Show when={food().eitr != null}><span class="food-stat"><span class="food-stat__val">{food().eitr}</span> Eitr</span></Show>
                      <Show when={food().healPerTick != null}><span class="food-stat"><span class="food-stat__val">{food().healPerTick}</span> hp/tick</span></Show>
                      <Show when={food().duration != null}><span class="food-stat"><span class="food-stat__val">{Math.round(food().duration! / 60)}</span>m</span></Show>
                      <Show when={food().regenModifier != null}><span class="food-stat food-stat--debuff"><span class="food-stat__val">{food().regenModifier! * 100}%</span> regen</span></Show>
                    </div>
                  </div>
                )}
              </Show>

              <Show when={props.recipe.mead}>
                {(mead) => (
                  <div class="recipe-row__section">
                    <span class="label">Effect</span>
                    <div class="food-detail-grid__stats">
                      <Show when={mead().effect.health != null}><span class="food-stat"><span class="food-stat__val">+{mead().effect.health}</span> HP</span></Show>
                      <Show when={mead().effect.stamina != null}><span class="food-stat"><span class="food-stat__val">+{mead().effect.stamina}</span> Stam</span></Show>
                      <Show when={mead().effect.eitr != null}><span class="food-stat"><span class="food-stat__val">+{mead().effect.eitr}</span> Eitr</span></Show>
                      <Show when={mead().effect.resist}><span class="food-stat"><span class="food-stat__val">{mead().effect.resist}</span> resist</span></Show>
                      <Show when={mead().effect.healthRegen != null}><span class="food-stat"><span class="food-stat__val">{mead().effect.healthRegen! > 0 ? '+' : ''}{mead().effect.healthRegen! * 100}%</span> HP regen</span></Show>
                      <Show when={mead().effect.staminaRegen != null}><span class="food-stat"><span class="food-stat__val">{mead().effect.staminaRegen! > 0 ? '+' : ''}{mead().effect.staminaRegen! * 100}%</span> Stam regen</span></Show>
                      <Show when={mead().effect.eitrRegen != null}><span class="food-stat"><span class="food-stat__val">{mead().effect.eitrRegen! > 0 ? '+' : ''}{mead().effect.eitrRegen! * 100}%</span> Eitr regen</span></Show>
                      <Show when={mead().effect.effects}>{(fx) => <For each={fx()}>{(e) => <span class="food-stat">{e}</span>}</For>}</Show>
                      <span class="food-stat"><span class="food-stat__val">{mead().duration >= 60 ? `${Math.round(mead().duration / 60)}m` : `${mead().duration}s`}</span> duration</span>
                      <span class="food-stat"><span class="food-stat__val">{mead().cooldown >= 60 ? `${Math.round(mead().cooldown / 60)}m` : `${mead().cooldown}s`}</span> cooldown</span>
                    </div>
                  </div>
                )}
              </Show>

              <Show when={(props.recipe.ingredients ?? []).length > 0}>
                <div class="recipe-row__section">
                  <span class="label">Ingredients</span>
                  <div class="food-detail-grid__ings">
                    <For each={props.recipe.ingredients ?? []}>
                      {(ing) => {
                        const name = () => props.itemsById.get(ing.itemId)?.name ?? ing.itemId;
                        const hasIcon = () => props.iconIds?.has(ing.itemId) ?? false;
                        return (
                          <span class="food-detail-grid__ing">
                            <Show when={hasIcon()}>
                              <ItemIcon id={ing.itemId} size="sm" spriteHref={spriteHref()} />
                            </Show>
                            {name()} ×{ing.qty}
                          </span>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </Show>

              <Show when={props.recipe.yields && props.recipe.yields.qty > 1}>
                <div class="recipe-row__section">
                  <span class="label">Yield</span>
                  <span>×{props.recipe.yields!.qty} per craft</span>
                </div>
              </Show>

              {(() => {
                const yieldItemId = props.recipe.yields?.itemId ?? props.recipe.id;
                const item = props.itemsById.get(yieldItemId);
                return item?.stackSize ? (
                  <div class="recipe-row__section">
                    <span class="label">Stack</span>
                    <span>{item.stackSize}</span>
                  </div>
                ) : null;
              })()}
          </Show>

          <a
            class="recipe-row__permalink"
            href={`${props.baseHref}recipes/${props.recipe.id}/`}
          >
            ↗ open detail page
          </a>
        </div>
      </Show>
    </>
  );
};
