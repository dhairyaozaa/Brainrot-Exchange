import type { BrainrotCategory } from '../types';
import { getCategoryColor } from '../utils/categoryColors';

/**
 * Returns a style object with text-shadow glow matching the category color.
 */
export function getCategoryGlowStyle(category: BrainrotCategory, intensity: number = 1): React.CSSProperties {
  const color = getCategoryColor(category);
  const blur = Math.round(12 * intensity);
  const spread = Math.round(24 * intensity);
  return {
    textShadow: `0 0 ${blur}px ${color.hex}50, 0 0 ${spread}px ${color.hex}25`,
  };
}
