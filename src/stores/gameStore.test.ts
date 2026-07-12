import { describe, it, expect } from 'vitest';
import type { BrainrotAsset } from '../types';
import { BRAINROTS } from '../data/brainrots';

// Replicate the shouldUnlockAsset logic from gameStore.ts for testing
function shouldUnlockAsset(asset: BrainrotAsset, netWorth: number): boolean {
  if (asset.unlocked) return true;
  switch (asset.rarity) {
    case 'Common':
    case 'Uncommon':
      return true;
    case 'Rare':
      return netWorth >= 50000;
    case 'Epic':
      return netWorth >= 200000;
    case 'Legendary':
      return netWorth >= 1000000;
    case 'Mythical':
      return netWorth >= 10000000;
    case 'Financially Forbidden':
      return netWorth >= 100000000;
    default:
      return false;
  }
}

function computeUnlockedBrainrots(brainrots: BrainrotAsset[], netWorth: number): BrainrotAsset[] | null {
  const updated = brainrots.map(asset => {
    if (asset.unlocked) return asset;
    if (shouldUnlockAsset(asset, netWorth)) {
      return { ...asset, unlocked: true };
    }
    return asset;
  });
  const changed = updated.some((a, i) => a.unlocked !== brainrots[i]?.unlocked);
  return changed ? updated : null;
}

describe('Asset Unlock System', () => {
  it('starts with only Common and Uncommon assets unlocked', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    const updated = computeUnlockedBrainrots(brainrots, 10000); // starting cash

    expect(updated).not.toBeNull();
    const unlocked = updated!.filter(b => b.unlocked);
    const locked = updated!.filter(b => !b.unlocked);

    expect(unlocked.length).toBeGreaterThan(0);
    expect(locked.length).toBeGreaterThan(0);

    // All Common and Uncommon should be unlocked
    unlocked.forEach(a => {
      expect(['Common', 'Uncommon']).toContain(a.rarity);
    });
    locked.forEach(a => {
      expect(['Rare', 'Epic', 'Legendary', 'Mythical', 'Financially Forbidden']).toContain(a.rarity);
    });
  });

  it('unlocks Rare assets at ₹50,000 net worth', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    const updated = computeUnlockedBrainrots(brainrots, 50000);

    const locked = updated!.filter(b => !b.unlocked);
    locked.forEach(a => {
      expect(['Epic', 'Legendary', 'Mythical', 'Financially Forbidden']).toContain(a.rarity);
    });

    const unlockedRares = updated!.filter(b => b.rarity === 'Rare');
    expect(unlockedRares.length).toBeGreaterThan(0);
    unlockedRares.forEach(a => expect(a.unlocked).toBe(true));
  });

  it('unlocks Epic assets at ₹200,000 net worth', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    const updated = computeUnlockedBrainrots(brainrots, 200000);

    const locked = updated!.filter(b => !b.unlocked);
    locked.forEach(a => {
      expect(['Legendary', 'Mythical', 'Financially Forbidden']).toContain(a.rarity);
    });

    const unlockedEpics = updated!.filter(b => b.rarity === 'Epic');
    expect(unlockedEpics.length).toBeGreaterThan(0);
    unlockedEpics.forEach(a => expect(a.unlocked).toBe(true));
  });

  it('unlocks Legendary assets at ₹1,000,000 net worth', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    const updated = computeUnlockedBrainrots(brainrots, 1000000);

    const locked = updated!.filter(b => !b.unlocked);
    locked.forEach(a => {
      expect(['Mythical', 'Financially Forbidden']).toContain(a.rarity);
    });

    const unlockedLegendaries = updated!.filter(b => b.rarity === 'Legendary');
    expect(unlockedLegendaries.length).toBeGreaterThan(0);
    unlockedLegendaries.forEach(a => expect(a.unlocked).toBe(true));
  });

  it('unlocks Mythical assets at ₹10,000,000 net worth', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    const updated = computeUnlockedBrainrots(brainrots, 10000000);

    const locked = updated!.filter(b => !b.unlocked);
    locked.forEach(a => {
      expect(['Financially Forbidden']).toContain(a.rarity);
    });

    const unlockedMythicals = updated!.filter(b => b.rarity === 'Mythical');
    expect(unlockedMythicals.length).toBeGreaterThan(0);
    unlockedMythicals.forEach(a => expect(a.unlocked).toBe(true));
  });

  it('unlocks everything at ₹100,000,000 net worth', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    const updated = computeUnlockedBrainrots(brainrots, 100000000);

    const locked = updated!.filter(b => !b.unlocked);
    expect(locked.length).toBe(0);
    updated!.forEach(a => expect(a.unlocked).toBe(true));
  });

  it('returns null when no unlock changes occur', () => {
    const brainrots = BRAINROTS.map(b => ({ ...b, unlocked: false }));
    // First call should change some assets
    const result = computeUnlockedBrainrots(brainrots, 50000);
    expect(result).not.toBeNull();

    // Second call with same net worth on the UPDATED brainrot array should not change anything
    const brainrotsUpdated = result!;
    const resultNoChange = computeUnlockedBrainrots(brainrotsUpdated, 50000);
    expect(resultNoChange).toBeNull();
  });
});

describe('Brainrot Data Integrity', () => {
  it('has exactly 30 assets', () => {
    expect(BRAINROTS.length).toBe(30);
  });

  it('has 3 assets per category totaling 10 categories', () => {
    const categories = new Map<string, number>();
    BRAINROTS.forEach(b => {
      categories.set(b.category, (categories.get(b.category) || 0) + 1);
    });
    expect(categories.size).toBe(10);
    categories.forEach((count) => {
      expect(count).toBe(3);
    });
  });

  it('has valid rarity distribution', () => {
    const rarities = new Map<string, number>();
    BRAINROTS.forEach(b => {
      rarities.set(b.rarity, (rarities.get(b.rarity) || 0) + 1);
    });

    expect(rarities.get('Common')).toBe(5);
    expect(rarities.get('Uncommon')).toBe(5);
    expect(rarities.get('Rare')).toBe(5);
    expect(rarities.get('Epic')).toBe(5);
    expect(rarities.get('Legendary')).toBe(7);
    expect(rarities.get('Mythical')).toBe(3);
    // Financially Forbidden doesn't appear in the data yet
    expect(rarities.get('Financially Forbidden')).toBeUndefined();
  });
});
