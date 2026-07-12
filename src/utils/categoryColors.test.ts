import { describe, it, expect } from 'vitest';
import {
  CATEGORY_COLORS,
  getCategoryColor,
  getCategoryHex,
  getCategoryStyle,
} from './categoryColors';
import type { BrainrotCategory } from '../types';

const ALL_CATEGORIES: BrainrotCategory[] = [
  'Beverage Beasts',
  'Electronic Animals',
  'Corporate Creatures',
  'Government Birds',
  'Radioactive Rodents',
  'Internet Predators',
  'Financial Primates',
  'Household Horrors',
  'Quantum Creatures',
  'Space Organisms',
];

describe('categoryColors', () => {
  describe('CATEGORY_COLORS', () => {
    it('has entries for all 10 categories', () => {
      const keys = Object.keys(CATEGORY_COLORS) as BrainrotCategory[];
      expect(keys.length).toBe(10);
      ALL_CATEGORIES.forEach(cat => {
        expect(CATEGORY_COLORS[cat]).toBeDefined();
      });
    });

    it('has valid hex color for each category', () => {
      ALL_CATEGORIES.forEach(cat => {
        const color = CATEGORY_COLORS[cat];
        expect(color.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('has unique hex colors for each category', () => {
      const hexes = ALL_CATEGORIES.map(cat => CATEGORY_COLORS[cat].hex);
      const uniqueHexes = new Set(hexes);
      expect(uniqueHexes.size).toBe(hexes.length);
    });

    it('has non-empty twClass for each category', () => {
      ALL_CATEGORIES.forEach(cat => {
        expect(CATEGORY_COLORS[cat].twClass).toBeTruthy();
        expect(CATEGORY_COLORS[cat].twClass).toMatch(/^text-\[/);
      });
    });

    it('has non-empty bgClass for each category', () => {
      ALL_CATEGORIES.forEach(cat => {
        expect(CATEGORY_COLORS[cat].bgClass).toBeTruthy();
        expect(CATEGORY_COLORS[cat].bgClass).toMatch(/^bg-\[/);
      });
    });

    it('has non-empty borderClass for each category', () => {
      ALL_CATEGORIES.forEach(cat => {
        expect(CATEGORY_COLORS[cat].borderClass).toBeTruthy();
        expect(CATEGORY_COLORS[cat].borderClass).toMatch(/^border-\[/);
      });
    });

    it('has a short label for each category', () => {
      ALL_CATEGORIES.forEach(cat => {
        expect(CATEGORY_COLORS[cat].label).toBeTruthy();
        expect(CATEGORY_COLORS[cat].label.length).toBeGreaterThan(0);
        expect(CATEGORY_COLORS[cat].label.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('getCategoryColor', () => {
    it('returns the correct color object for a known category', () => {
      const color = getCategoryColor('Beverage Beasts');
      expect(color).toBe(CATEGORY_COLORS['Beverage Beasts']);
    });

    it('returns a fallback for an unknown category', () => {
      // @ts-expect-error Testing unknown category
      const color = getCategoryColor('Unknown Category');
      expect(color.hex).toBe('#888888');
      expect(color.twClass).toBe('text-[#888888]');
    });

    it('returns valid objects for all known categories', () => {
      ALL_CATEGORIES.forEach(cat => {
        const color = getCategoryColor(cat);
        expect(color.hex).toBeTruthy();
        expect(color.twClass).toBeTruthy();
        expect(color.bgClass).toBeTruthy();
        expect(color.borderClass).toBeTruthy();
        expect(color.label).toBeTruthy();
      });
    });
  });

  describe('getCategoryHex', () => {
    it('returns a hex string for each known category', () => {
      ALL_CATEGORIES.forEach(cat => {
        const hex = getCategoryHex(cat);
        expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('matches the hex in CATEGORY_COLORS', () => {
      ALL_CATEGORIES.forEach(cat => {
        expect(getCategoryHex(cat)).toBe(CATEGORY_COLORS[cat].hex);
      });
    });
  });

  describe('getCategoryStyle', () => {
    it('returns an object with a color property', () => {
      const style = getCategoryStyle('Beverage Beasts');
      expect(style).toHaveProperty('color');
      expect(style.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('matches the hex for each category', () => {
      ALL_CATEGORIES.forEach(cat => {
        const style = getCategoryStyle(cat);
        expect(style.color).toBe(CATEGORY_COLORS[cat].hex);
      });
    });

    it('can be used as inline style object', () => {
      const style = getCategoryStyle('Quantum Creatures');
      // Verify it's a plain object suitable for React's style prop
      expect(typeof style.color).toBe('string');
      expect(JSON.stringify(style)).toBeTruthy();
    });
  });

  describe('color uniqueness across categories', () => {
    it('each category has distinct visual properties', () => {
      const labels = ALL_CATEGORIES.map(cat => getCategoryColor(cat).label);
      const uniqueLabels = new Set(labels);
      // Labels might be different abbreviations, not necessarily unique
      // but hex colors must be unique
      const hexes = ALL_CATEGORIES.map(cat => getCategoryHex(cat));
      expect(new Set(hexes).size).toBe(10);
    });

    it('no category shares the same hex color', () => {
      const seen = new Set<string>();
      ALL_CATEGORIES.forEach(cat => {
        const hex = getCategoryHex(cat);
        expect(seen.has(hex)).toBe(false);
        seen.add(hex);
      });
    });
  });
});
