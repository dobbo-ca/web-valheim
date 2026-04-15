export interface FilterCategory {
  label: string;
  tag: string;
  subtypes: string[];
}

export const categories: FilterCategory[] = [
  { label: 'Melee',    tag: 'melee',  subtypes: ['sword', 'axe', 'mace', 'fists', 'knife', 'spear', 'atgeir'] },
  { label: 'Ranged',   tag: 'ranged', subtypes: ['bow', 'crossbow', 'staff'] },
  { label: 'Ammo',     tag: 'ammo',   subtypes: ['arrow', 'bolt', 'missile'] },
  { label: 'Armor',    tag: 'armor',  subtypes: ['helmet', 'chest', 'legs', 'cape', 'buckler', 'shield', 'tower'] },
  { label: 'Tools',    tag: 'tool',   subtypes: ['pickaxe', 'bait'] },
  { label: 'Building', tag: 'build',  subtypes: [] },
  { label: 'Food',     tag: 'food',   subtypes: ['raw', 'cooked', 'baked', 'feast'] },
  { label: 'Mead',     tag: 'mead',   subtypes: ['healing', 'stamina', 'eitr', 'resistance', 'utility'] },
];

export const biomes = [
  { label: 'Meadows',      tag: 'meadows' },
  { label: 'Black Forest', tag: 'black-forest' },
  { label: 'Swamp',        tag: 'swamp' },
  { label: 'Mountain',     tag: 'mountain' },
  { label: 'Plains',       tag: 'plains' },
  { label: 'Mistlands',    tag: 'mistlands' },
  { label: 'Ashlands',     tag: 'ashlands' },
  { label: 'Ocean',        tag: 'ocean' },
  { label: 'Deep North',   tag: 'deep-north' },
] as const;

export const foodStatFocus = [
  { label: 'HP',       tag: 'hp' },
  { label: 'Balanced', tag: 'balanced' },
  { label: 'Stamina',  tag: 'stamina' },
  { label: 'Eitr',     tag: 'eitr' },
] as const;

export const handedness = [
  { label: 'One-Handed', tag: '1h' },
  { label: 'Two-Handed', tag: '2h' },
  { label: 'Dual Wield', tag: 'dual-wield' },
] as const;

export const damageTypes = [
  { label: 'Fire',      tag: 'fire' },
  { label: 'Frost',     tag: 'frost' },
  { label: 'Lightning', tag: 'lightning' },
  { label: 'Poison',    tag: 'poison' },
  { label: 'Spirit',    tag: 'spirit' },
  { label: 'Pure',      tag: 'pure' },
] as const;

export const tagDisplayNames: Record<string, string> = {
  '1h': 'One-Handed',
  '2h': 'Two-Handed',
  'dual-wield': 'Dual Wield',
  'atgeir': 'Polearm',
  'tower': 'Tower Shield',
  'build': 'Building',
  'melee': 'Melee',
  'ranged': 'Ranged',
  'ammo': 'Ammo',
  'hp': 'HP',
  'balanced': 'Balanced',
};

export type SubFilterKey = 'handedness' | 'biome' | 'statFocus' | 'damageType' | 'found';

export const categorySubFilters: Record<string, SubFilterKey[]> = {
  melee:  ['handedness', 'biome', 'damageType'],
  ranged: ['handedness', 'biome', 'damageType'],
  ammo:   ['biome', 'damageType'],
  armor:  ['biome'],
  tool:   ['biome'],
  build:  ['biome', 'found'],
  food:   ['biome', 'statFocus', 'found'],
  mead:   ['biome'],
};

export const defaultSubFilters: SubFilterKey[] = ['biome'];
