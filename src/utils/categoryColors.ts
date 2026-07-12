import type { BrainrotCategory } from '../types';

export interface CategoryColor {
  /** Primary hex color for the category */
  hex: string;
  /** Tailwind-compatible class for text color (needs arbitrary value) */
  twClass: string;
  /** Background class with transparency */
  bgClass: string;
  /** Border class with transparency */
  borderClass: string;
  /** Short display label */
  label: string;
}

/**
 * Unique color palette for each BrainrotCategory.
 * Colors are chosen for visual distinctiveness across the 10 categories.
 */
export const CATEGORY_COLORS: Record<BrainrotCategory, CategoryColor> = {
  'Beverage Beasts': {
    hex: '#d4a574',
    twClass: 'text-[#d4a574]',
    bgClass: 'bg-[#d4a574]/10',
    borderClass: 'border-[#d4a574]/30',
    label: 'Bev',
  },
  'Electronic Animals': {
    hex: '#33ddff',
    twClass: 'text-[#33ddff]',
    bgClass: 'bg-[#33ddff]/10',
    borderClass: 'border-[#33ddff]/30',
    label: 'Elec',
  },
  'Corporate Creatures': {
    hex: '#ff6633',
    twClass: 'text-[#ff6633]',
    bgClass: 'bg-[#ff6633]/10',
    borderClass: 'border-[#ff6633]/30',
    label: 'Corp',
  },
  'Government Birds': {
    hex: '#6688aa',
    twClass: 'text-[#6688aa]',
    bgClass: 'bg-[#6688aa]/10',
    borderClass: 'border-[#6688aa]/30',
    label: 'Gov',
  },
  'Radioactive Rodents': {
    hex: '#44ff44',
    twClass: 'text-[#44ff44]',
    bgClass: 'bg-[#44ff44]/10',
    borderClass: 'border-[#44ff44]/30',
    label: 'Rad',
  },
  'Internet Predators': {
    hex: '#ff44aa',
    twClass: 'text-[#ff44aa]',
    bgClass: 'bg-[#ff44aa]/10',
    borderClass: 'border-[#ff44aa]/30',
    label: 'Net',
  },
  'Financial Primates': {
    hex: '#ffcc33',
    twClass: 'text-[#ffcc33]',
    bgClass: 'bg-[#ffcc33]/10',
    borderClass: 'border-[#ffcc33]/30',
    label: 'Fin',
  },
  'Household Horrors': {
    hex: '#cc4466',
    twClass: 'text-[#cc4466]',
    bgClass: 'bg-[#cc4466]/10',
    borderClass: 'border-[#cc4466]/30',
    label: 'Home',
  },
  'Quantum Creatures': {
    hex: '#aa44ff',
    twClass: 'text-[#aa44ff]',
    bgClass: 'bg-[#aa44ff]/10',
    borderClass: 'border-[#aa44ff]/30',
    label: 'Qtm',
  },
  'Space Organisms': {
    hex: '#aaddff',
    twClass: 'text-[#aaddff]',
    bgClass: 'bg-[#aaddff]/10',
    borderClass: 'border-[#aaddff]/30',
    label: 'Spc',
  },
};

/**
 * Get the color info for a given BrainrotCategory.
 * Falls back to a default gray if category is unknown.
 */
export function getCategoryColor(category: BrainrotCategory): CategoryColor {
  return CATEGORY_COLORS[category] ?? {
    hex: '#888888',
    twClass: 'text-[#888888]',
    bgClass: 'bg-[#888888]/10',
    borderClass: 'border-[#888888]/30',
    label: '?',
  };
}

/**
 * Get the hex color string for a given BrainrotCategory.
 */
export function getCategoryHex(category: BrainrotCategory): string {
  return getCategoryColor(category).hex;
}

/**
 * Get inline style object for applying category color directly.
 */
export function getCategoryStyle(category: BrainrotCategory): { color: string } {
  return { color: getCategoryHex(category) };
}
