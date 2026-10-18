export type MascotArchetype = 'gaja' | 'kalu' | 'singha' | 'chuti';

export type HeadwearId =
  | 'none'
  | 'crown'
  | 'explorer'
  | 'helmet'
  | 'flower'
  | 'scholar'
  | 'wizard';

export type EyewearId =
  | 'none'
  | 'shades'
  | 'star_glasses'
  | 'round_specs';

export type OutfitId =
  | 'none'
  | 'sarong'
  | 'vest'
  | 'cape'
  | 'suit';

export type AuraId =
  | 'amber'
  | 'emerald'
  | 'indigo'
  | 'cyan'
  | 'rose'
  | 'gold';

export type CompanionPace = 'cheerful' | 'calm';

export interface CompanionConfig {
  archetype: MascotArchetype;
  nickname: string;
  headwear: HeadwearId;
  eyewear: EyewearId;
  outfit: OutfitId;
  aura: AuraId;
  pace: CompanionPace;
}

export interface AccessoryOption<T extends string> {
  id: T;
  name: { si: string; en: string };
  icon: string;
  badge?: string;
  description?: { si: string; en: string };
}

export interface AuraOption extends AccessoryOption<AuraId> {
  hex: string;
  glow: string;
}

export const MASCOT_ARCHETYPES: AccessoryOption<MascotArchetype>[] = [
  {
    id: 'gaja',
    name: { si: 'ගජා පැටියා (අලි පැටියා)', en: 'Gaja the Baby Elephant' },
    icon: '🐘',
    description: { si: 'ඥානවන්ත, කරුණාවන්ත විශ්වාසවන්ත මිතුරා', en: 'Wise, gentle, and loyal study buddy' },
  },
  {
    id: 'kalu',
    name: { si: 'කළු පැටියා (වඳුරු පැටියා)', en: 'Kalu the Playful Monkey' },
    icon: '🐵',
    description: { si: 'ක්‍රියාශීලී, කඩිසර සහ විනෝදකාමී මිතුරා', en: 'Energetic, curious fruit collector' },
  },
  {
    id: 'singha',
    name: { si: 'සිංහා (සිංහ පැටියා)', en: 'Singha the Brave Lion Cub' },
    icon: '🦁',
    description: { si: 'ධෛර්යවන්ත ගවේෂක නායකයා', en: 'Brave quest leader and explorer' },
  },
  {
    id: 'chuti',
    name: { si: 'චූටි (හාවා පැටියා)', en: 'Chuti the Gentle Bunny' },
    icon: '🐰',
    description: { si: 'සන්සුන්, මෘදු හා සංවේදී මිතුරා', en: 'Gentle, soft companion for sensory calm' },
  },
];

export const HEADWEAR_OPTIONS: AccessoryOption<HeadwearId>[] = [
  { id: 'none', name: { si: 'හිස්වැසුම් නැත', en: 'No Hat' }, icon: '🚫' },
  { id: 'crown', name: { si: 'රාජකීය ඔටුන්න', en: 'Royal Crown' }, icon: '👑', badge: 'VIP' },
  { id: 'explorer', name: { si: 'සෆාරි තොප්පිය', en: 'Safari Explorer Hat' }, icon: '🤠' },
  { id: 'helmet', name: { si: 'අභ්‍යවකාශ හිස්වැස්ම', en: 'Space Helmet' }, icon: '👨‍🚀' },
  { id: 'flower', name: { si: 'මල් මාලය', en: 'Flower Garland' }, icon: '🌸' },
  { id: 'scholar', name: { si: 'විද්වත් තොප්පිය', en: 'Scholar Cap' }, icon: '🎓' },
  { id: 'wizard', name: { si: 'මැජික් තරු තොප්පිය', en: 'Wizard Star Hat' }, icon: '🧙' },
];

export const EYEWEAR_OPTIONS: AccessoryOption<EyewearId>[] = [
  { id: 'none', name: { si: 'කණ්ණාඩි නැත', en: 'No Glasses' }, icon: '🚫' },
  { id: 'shades', name: { si: 'කළු අව් කණ්ණාඩි', en: 'Cool Shades' }, icon: '🕶️' },
  { id: 'star_glasses', name: { si: 'තරු කණ්ණාඩි', en: 'Star Goggles' }, icon: '⭐' },
  { id: 'round_specs', name: { si: 'වටකුරු බුද්ධිමත් කණ්ණාඩි', en: 'Smart Round Specs' }, icon: '👓' },
];

export const OUTFIT_OPTIONS: AccessoryOption<OutfitId>[] = [
  { id: 'none', name: { si: 'ඇඳුම් නැත', en: 'Natural' }, icon: '🚫' },
  { id: 'sarong', name: { si: 'ගමේ සරම / සාළුව', en: 'Village Sarong & Sash' }, icon: '🧣' },
  { id: 'vest', name: { si: 'කැලෑ ගවේෂක කබාය', en: 'Jungle Explorer Vest' }, icon: '🦺' },
  { id: 'cape', name: { si: 'සුපිරි වීර සළුව', en: 'Superhero Cape' }, icon: '🦸' },
  { id: 'suit', name: { si: 'අභ්‍යවකාශ ඇඳුම', en: 'Cosmic Star Suit' }, icon: '🚀' },
];

export const AURA_OPTIONS: AuraOption[] = [
  {
    id: 'amber',
    name: { si: 'සූර්ය රන්වන්', en: 'Solar Amber' },
    icon: '☀️',
    hex: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'emerald',
    name: { si: 'වනස්පති කොළ', en: 'Forest Emerald' },
    icon: '🌿',
    hex: '#10B981',
    glow: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'indigo',
    name: { si: 'අභ්‍යවකාශ නිල්', en: 'Cosmic Indigo' },
    icon: '🌌',
    hex: '#6366F1',
    glow: 'rgba(99, 102, 241, 0.45)',
  },
  {
    id: 'cyan',
    name: { si: 'සාගර තද නිල්', en: 'Ocean Cyan' },
    icon: '🌊',
    hex: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.45)',
  },
  {
    id: 'rose',
    name: { si: 'රෝස මැණික', en: 'Rosy Ruby' },
    icon: '💖',
    hex: '#F43F5E',
    glow: 'rgba(244, 63, 94, 0.45)',
  },
  {
    id: 'gold',
    name: { si: 'දිව්‍ය රන්', en: 'Divine Gold' },
    icon: '✨',
    hex: '#EAB308',
    glow: 'rgba(234, 179, 8, 0.55)',
  },
];

export const DEFAULT_COMPANION_CONFIG: CompanionConfig = {
  archetype: 'gaja',
  nickname: 'ගජා (Gaja)',
  headwear: 'none',
  eyewear: 'none',
  outfit: 'none',
  aura: 'amber',
  pace: 'cheerful',
};

export const NAME_SUGGESTIONS = [
  'ගජා (Gaja)',
  'චූටි බෝල (Chuti Bola)',
  'පැංචා (Pancha)',
  'රත්තරන් (Raththaran)',
  'සුපිරි මිතුරා (Super Buddy)',
  'තරු පැටියා (Star Cub)',
  'චැම්පියන් (Champion)',
  'Math Buddy',
];
