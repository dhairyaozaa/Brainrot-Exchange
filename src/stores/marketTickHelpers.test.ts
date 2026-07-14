import { describe, it, expect } from 'vitest';
import type { BrainrotAsset, PlayerHolding, Mission, Achievement, GameState } from '../types';
import {
  calculatePortfolioValues,
  calculateFees,
  calculateXPAndRank,
  checkMissions,
  checkAchievements,
  executeMarginCalls,
  checkBankruptcy,
  calculateFinalMetrics,
} from './marketTickHelpers';

function makeAsset(overrides: Partial<BrainrotAsset> = {}): BrainrotAsset {
  return {
    id: 'test_asset',
    name: 'Test Asset',
    ticker: 'TEST',
    category: 'Beverage Beasts',
    description: 'A test asset',
    rarity: 'Common',
    startingPrice: 100,
    currentPrice: 100,
    baseVolatility: 0.05,
    currentVolatility: 0.05,
    popularity: 50,
    hype: 10,
    publicTrust: 50,
    riskRating: 'Medium',
    volume: 10000,
    supply: 1000000,
    demand: 50000,
    historicalPrices: [100],
    candles: [],
    dailyChange: 0,
    allTimeHigh: 100,
    allTimeLow: 100,
    momentum: 0,
    traits: [],
    unlocked: true,
    icon: '📦',
    color: '#888888',
    phase: 'accumulation' as const,
    phaseTicksRemaining: 60,
    trendStrength: 0,
    candleOpen: 100,
    candleHigh: 100,
    candleLow: 100,
    dayOpenPrice: 100,
    candleTicks: 0,
    ...overrides,
  };
}

function makeHolding(overrides: Partial<PlayerHolding> = {}): PlayerHolding {
  return {
    assetId: 'test_asset',
    quantity: 0,
    averagePurchasePrice: 0,
    shortQuantity: 0,
    averageShortPrice: 0,
    longEntryTick: 0,
    shortEntryTick: 0,
    ...overrides,
  };
}

// ── calculatePortfolioValues ──

describe('calculatePortfolioValues', () => {
  it('returns zero values with no holdings', () => {
    const result = calculatePortfolioValues(1000, [], [makeAsset()]);
    expect(result.totalInvestmentValue).toBe(0);
    expect(result.totalInvested).toBe(0);
    expect(result.shortPandL).toBe(0);
    expect(result.bestAsset).toBe('');
    expect(result.worstAsset).toBe('');
    expect(result.largestHolding).toBe('');
    expect(result.netWorth).toBe(1000);
  });

  it('calculates long position correctly', () => {
    const asset = makeAsset({ currentPrice: 150, id: 'a1', name: 'Alpha' });
    const holding = makeHolding({ assetId: 'a1', quantity: 10, averagePurchasePrice: 100 });
    const result = calculatePortfolioValues(500, [holding], [asset]);

    expect(result.totalInvestmentValue).toBe(1500); // 10 * 150
    expect(result.totalInvested).toBe(1000); // 10 * 100
    expect(result.shortPandL).toBe(0);
    expect(result.bestAsset).toBe('Alpha');
    expect(result.largestHolding).toBe('Alpha');
    expect(result.netWorth).toBe(2000); // 500 + 1500
  });

  it('calculates short position P&L correctly', () => {
    const asset = makeAsset({ currentPrice: 80, id: 'a1', name: 'Beta' });
    const holding = makeHolding({ assetId: 'a1', shortQuantity: 5, averageShortPrice: 100 });
    const result = calculatePortfolioValues(1000, [holding], [asset]);

    const expectedPnl = (100 - 80) * 5; // 100 profit
    expect(result.shortPandL).toBe(100);
    expect(result.totalInvestmentValue).toBe(0);
    expect(result.totalInvested).toBe(0);
    expect(result.netWorth).toBe(1100); // 1000 + 100
  });

  it('handles both long and short positions', () => {
    const asset = makeAsset({ currentPrice: 120, id: 'a1', name: 'Gamma' });
    const holding = makeHolding({
      assetId: 'a1', quantity: 5, averagePurchasePrice: 100,
      shortQuantity: 3, averageShortPrice: 90,
    });
    const result = calculatePortfolioValues(500, [holding], [asset]);

    expect(result.totalInvestmentValue).toBe(600); // 5 * 120
    expect(result.totalInvested).toBe(500); // 5 * 100
    const shortPnl = (90 - 120) * 3; // -90 loss
    expect(result.shortPandL).toBe(-90);
    expect(result.netWorth).toBe(500 + 600 + (-90)); // 1010
  });

  it('handles multiple assets correctly', () => {
    const a1 = makeAsset({ currentPrice: 50, id: 'a1', name: 'Alpha' });
    const a2 = makeAsset({ currentPrice: 200, id: 'a2', name: 'Beta' });
    const h1 = makeHolding({ assetId: 'a1', quantity: 10, averagePurchasePrice: 40 });
    const h2 = makeHolding({ assetId: 'a2', quantity: 5, averagePurchasePrice: 150 });

    const result = calculatePortfolioValues(1000, [h1, h2], [a1, a2]);

    expect(result.totalInvestmentValue).toBe(500 + 1000); // 10*50 + 5*200 = 1500
    expect(result.totalInvested).toBe(400 + 750); // 10*40 + 5*150 = 1150
    expect(result.bestAsset).toBe('Beta'); // higher return
    expect(result.largestHolding).toBe('Beta'); // larger value
    expect(result.netWorth).toBe(1000 + 1500);
  });
});

// ── calculateFees ──

describe('calculateFees', () => {
  it('returns zero fees with no holdings and same day', () => {
    const result = calculateFees([], [], 1000, 1, 1);
    expect(result.holdingCosts).toBe(0);
    expect(result.shortBorrowFees).toBe(0);
    expect(result.totalFees).toBe(0);
  });

  it('charges holding costs only when day changes', () => {
    const asset = makeAsset();
    const holding = makeHolding({ assetId: 'test_asset', quantity: 5 });
    const result = calculateFees([holding], [asset], 1000, 2, 1);

    expect(result.holdingCosts).toBe(5); // 1 asset * ₹5
    expect(result.totalFees).toBe(5);
  });

  it('charges per unique asset on day change', () => {
    const a1 = makeAsset({ id: 'a1' });
    const a2 = makeAsset({ id: 'a2' });
    const h1 = makeHolding({ assetId: 'a1', quantity: 10 });
    const h2 = makeHolding({ assetId: 'a2', shortQuantity: 3 });
    const result = calculateFees([h1, h2], [a1, a2], 1000, 2, 1);

    expect(result.holdingCosts).toBe(10); // 2 assets * ₹5
  });

  it('calculates short borrow fees', () => {
    const asset = makeAsset({ currentPrice: 200 });
    const holding = makeHolding({ assetId: 'test_asset', shortQuantity: 10 });
    const result = calculateFees([holding], [asset], 10000, 1, 1);

    expect(result.shortBorrowFees).toBe(1); // Math.floor(200 * 10 * 0.0005)
    expect(result.totalFees).toBe(1);
  });

  it('caps short borrow fees at 50% of cash', () => {
    const asset = makeAsset({ currentPrice: 100000 });
    const holding = makeHolding({ assetId: 'test_asset', shortQuantity: 1000 });
    const result = calculateFees([holding], [asset], 100, 1, 1);

    expect(result.shortBorrowFees).toBe(50); // capped at 100 * 0.5
  });
});

// ── calculateXPAndRank ──

describe('calculateXPAndRank', () => {
  it('gains XP from news, whales, and rotter posts', () => {
    const result = calculateXPAndRank(0, 1, 0, true, 3, 5, 1, 1);
    expect(result.xpGain).toBe(8); // 5 (news) + 2 (whales) + 1 (posts)
    expect(result.newXp).toBe(8);
  });

  it('applies XP boost multipliers', () => {
    const result = calculateXPAndRank(0, 1, 0, true, 0, 0, 1.1, 1.2);
    expect(result.xpGain).toBe(5);
    expect(result.newXp).toBe(6.6); // 5 * 1.1 * 1.2
  });

  it('levels up when XP threshold is reached', () => {
    // xpForNextLevel = level * 150 + 50 = 1 * 150 + 50 = 200
    const result = calculateXPAndRank(195, 1, 0, true, 0, 0, 1, 1);
    expect(result.newLevel).toBe(2);
    expect(result.newXp).toBe(200);
  });

  it('does not level up below threshold', () => {
    const result = calculateXPAndRank(190, 1, 0, true, 0, 0, 1, 1);
    expect(result.newLevel).toBe(1);
  });

  it('advances rank based on level thresholds', () => {
    // RANK_XP_THRESHOLDS = [0, 500, 2000, 5000, 15000, 50000, 150000, 500000, 2000000, 10000000]
    // Level 600 should give rankIndex 1 (threshold 500)
    const result = calculateXPAndRank(10000, 600, 0, true, 0, 0, 1, 1);
    expect(result.newRankIndex).toBeGreaterThan(0);
  });
});

// ── checkMissions ──

describe('checkMissions', () => {
  it('returns zero rewards when no missions complete', () => {
    const missions: Mission[] = [
      {
        id: 'm1', title: 'Test', description: '', objective: '',
        reward: 100, rewardXP: 10, completed: false,
        condition: () => false,
      },
    ];
    const result = checkMissions(missions, () => ({}) as GameState);
    expect(result.missionRewards).toBe(0);
    expect(result.updatedMissions[0].completed).toBe(false);
  });

  it('rewards when mission condition is met', () => {
    const missions: Mission[] = [
      {
        id: 'm1', title: 'Test', description: '', objective: '',
        reward: 500, rewardXP: 50, completed: false,
        condition: () => true,
      },
    ];
    const result = checkMissions(missions, () => ({}) as GameState);
    expect(result.missionRewards).toBe(500);
    expect(result.updatedMissions[0].completed).toBe(true);
  });

  it('skips already completed missions', () => {
    const missions: Mission[] = [
      {
        id: 'm1', title: 'Done', description: '', objective: '',
        reward: 500, rewardXP: 50, completed: true,
        condition: () => { throw new Error('should not be called'); },
      },
    ];
    const result = checkMissions(missions, () => ({}) as GameState);
    expect(result.missionRewards).toBe(0);
    expect(result.updatedMissions[0].completed).toBe(true);
  });

  it('rewards multiple missions completing simultaneously', () => {
    const missions: Mission[] = [
      {
        id: 'm1', title: 'A', description: '', objective: '',
        reward: 100, rewardXP: 10, completed: false,
        condition: () => true,
      },
      {
        id: 'm2', title: 'B', description: '', objective: '',
        reward: 200, rewardXP: 20, completed: false,
        condition: () => true,
      },
    ];
    const result = checkMissions(missions, () => ({}) as GameState);
    expect(result.missionRewards).toBe(300); // 100 + 200
    expect(result.updatedMissions.every(m => m.completed)).toBe(true);
  });
});

// ── checkAchievements ──

describe('checkAchievements', () => {
  it('unlocks achievements when condition is met', () => {
    const achievements: Achievement[] = [
      {
        id: 'a1', title: 'Test', description: '', icon: '🏆',
        unlocked: false,
        condition: () => true,
      },
    ];
    const result = checkAchievements(achievements, () => ({}) as GameState);
    expect(result[0].unlocked).toBe(true);
    expect(result[0].unlockedAt).toBeDefined();
  });

  it('skips already unlocked achievements', () => {
    const achievements: Achievement[] = [
      {
        id: 'a1', title: 'Done', description: '', icon: '🏆',
        unlocked: true,
        condition: () => { throw new Error('should not be called'); },
      },
    ];
    const result = checkAchievements(achievements, () => ({}) as GameState);
    expect(result[0].unlocked).toBe(true);
  });
});

// ── executeMarginCalls ──

describe('executeMarginCalls', () => {
  it('does nothing when no short positions', () => {
    const result = executeMarginCalls([], [makeAsset()], 1000, 0);
    expect(result.resultCash).toBe(1000);
    expect(result.resultHoldings).toEqual([]);
    expect(result.assetsToLiquidate).toEqual([]);
  });

  it('does nothing when short is below margin call threshold', () => {
    const asset = makeAsset({ currentPrice: 110, id: 'a1' });
    const holding = makeHolding({ assetId: 'a1', shortQuantity: 10, averageShortPrice: 100 });
    // loss = (110 - 100) * 10 = 100; margin = 100 * 10 * 1.5 = 1500; lossRatio = 100/1500 = 0.067
    const result = executeMarginCalls([holding], [asset], 2000, 0);
    expect(result.assetsToLiquidate).toEqual([]);
    expect(result.resultCash).toBe(2000);
  });

  it('triggers margin call when loss exceeds 70% of margin', () => {
    const asset = makeAsset({ currentPrice: 200, id: 'a1' });
    const holding = makeHolding({ assetId: 'a1', shortQuantity: 10, averageShortPrice: 100 });
    // loss = (200 - 100) * 10 = 1000; margin = 100 * 10 * 1.5 = 1500; lossRatio = 1000/1500 = 0.667
    // 0.667 < 0.70 - JUST below threshold, so no margin call
    let result = executeMarginCalls([holding], [asset], 5000, 0);
    expect(result.assetsToLiquidate).toEqual([]);

    // Now push it over threshold
    const asset2 = makeAsset({ currentPrice: 210, id: 'a1' });
    // loss = (210 - 100) * 10 = 1100; lossRatio = 1100/1500 = 0.733 > 0.70
    result = executeMarginCalls([holding], [asset2], 5000, 0);
    expect(result.assetsToLiquidate).toEqual(['a1']);
  });

  it('deducts cover cost from cash on margin call', () => {
    const asset = makeAsset({ currentPrice: 210, id: 'a1' });
    const holding = makeHolding({ assetId: 'a1', shortQuantity: 10, averageShortPrice: 100 });
    // coverCost = 210 * 10 * 1.05 = 2205; fee = 2205 * 0.025 = 55.125; totalCost = 2260.125
    const result = executeMarginCalls([holding], [asset], 5000, 0);
    const expectedTotalCost = 210 * 10 * 1.05 * (1 + 0.025);
    expect(result.resultCash).toBeCloseTo(5000 - expectedTotalCost, 0);
    expect(result.resultHoldings.length).toBe(0); // Short removed
  });

  it('removes margin-called shorts from holdings', () => {
    const asset = makeAsset({ currentPrice: 500, id: 'a1' });
    const holding = makeHolding({ assetId: 'a1', shortQuantity: 5, averageShortPrice: 100 });
    const result = executeMarginCalls([holding], [asset], 10000, 0);
    expect(result.assetsToLiquidate).toEqual(['a1']);
    expect(result.resultHoldings.length).toBe(0); // Short removed, no long quantity
  });

  it('preserves long positions when short is margin-called', () => {
    const asset = makeAsset({ currentPrice: 500, id: 'a1' });
    const holding = makeHolding({
      assetId: 'a1', quantity: 3, averagePurchasePrice: 50,
      shortQuantity: 5, averageShortPrice: 100,
    });
    const result = executeMarginCalls([holding], [asset], 10000, 0);
    expect(result.assetsToLiquidate).toEqual(['a1']);
    expect(result.resultHoldings.length).toBe(1); // Long preserved
    expect(result.resultHoldings[0].quantity).toBe(3);
    expect(result.resultHoldings[0].shortQuantity).toBe(0); // short removed
  });
});

// ── checkBankruptcy ──

describe('checkBankruptcy', () => {
  it('does not trigger bankruptcy with positive net worth and no holdings', () => {
    const result = checkBankruptcy([], [makeAsset()], 1000, 0, 0, 0, 0);
    expect(result.forceLiquidated).toBe(false);
    expect(result.resultCash).toBe(1000);
    expect(result.resultBankruptcyCount).toBe(0);
  });

  it('triggers bankruptcy when cash is negative with no holdings', () => {
    const result = checkBankruptcy([], [makeAsset()], -100, 0, 0, 0, 0);
    expect(result.forceLiquidated).toBe(true);
    expect(result.resultCash).toBe(0);
    expect(result.resultBankruptcyCount).toBe(1);
  });

  it('triggers bankruptcy when net worth <= 0 with remaining positions', () => {
    const asset = makeAsset({ currentPrice: 50 });
    const holding = makeHolding({ assetId: 'test_asset', quantity: 10, averagePurchasePrice: 100 });
    // Net worth = cash + portfolio = 100 + 500 = 600 > 0 → no bankruptcy
    let result = checkBankruptcy([holding], [asset], 100, 0, 0, 500, 0);
    expect(result.forceLiquidated).toBe(false);

    // Net worth = cash (0) + portfolio (0 because asset worth 0) = 0 -> triggers bankruptcy
    const asset2 = makeAsset({ currentPrice: 0 });
    result = checkBankruptcy([holding], [asset2], 0, 0, 0, 0, 0);
    expect(result.forceLiquidated).toBe(true);
  });

  it('liquidates long positions at market price during bankruptcy', () => {
    const asset = makeAsset({ currentPrice: 80 });
    const holding = makeHolding({ assetId: 'test_asset', quantity: 10, averagePurchasePrice: 100 });
    // net worth = 0 + 800 + 0 = 800 > 0, cash = 0 >= 0 -> no bankruptcy
    // Set cash negative to force bankruptcy
    const result = checkBankruptcy([holding], [asset], -1, 0, 0, 800, 0);

    expect(result.forceLiquidated).toBe(true);
    expect(result.resultHoldings).toEqual([]);
    // Liquidation: 10 * 80 * (1 - 0.025) = 780; resultCash = -1 + 780 = 779
    expect(result.resultCash).toBeCloseTo(779, 0);
    expect(result.resultBankruptcyCount).toBe(1);
  });

  it('increments bankruptcy count', () => {
    const asset = makeAsset({ currentPrice: 10 });
    const holding = makeHolding({ assetId: 'test_asset', quantity: 5, averagePurchasePrice: 100 });
    // Net worth = 0 + 50 + 0 = 50 > 0, but cash = -1 < 0 -> force bankruptcy
    const result = checkBankruptcy([holding], [asset], -1, 0, 5, 50, 0);

    expect(result.resultBankruptcyCount).toBe(6);
    expect(result.forceLiquidated).toBe(true);
  });
});

// ── calculateFinalMetrics ──

describe('calculateFinalMetrics', () => {
  it('returns zero net worth with no holdings and zero cash', () => {
    const result = calculateFinalMetrics([], [makeAsset()], 0, 0);
    expect(result.finalNetWorth).toBe(0);
    expect(result.finalLongValue).toBe(0);
    expect(result.finalShortPandL).toBe(0);
    expect(result.finalUnrealized).toBe(0);
  });

  it('calculates final net worth correctly', () => {
    const asset = makeAsset({ currentPrice: 150 });
    const holding = makeHolding({ assetId: 'test_asset', quantity: 10, averagePurchasePrice: 100 });
    const result = calculateFinalMetrics([holding], [asset], 500, 1000);

    expect(result.finalLongValue).toBe(1500);
    expect(result.finalShortPandL).toBe(0);
    expect(result.finalNetWorth).toBe(2000); // 500 + 1500
    expect(result.finalUnrealized).toBe(500); // 1500 - 1000
  });

  it('calculates unrealized P&L with short positions', () => {
    const asset = makeAsset({ currentPrice: 80 });
    const holding = makeHolding({ assetId: 'test_asset', shortQuantity: 5, averageShortPrice: 100 });
    const result = calculateFinalMetrics([holding], [asset], 1000, 500);

    const shortPnl = (100 - 80) * 5;
    expect(result.finalShortPandL).toBe(100);
    expect(result.finalNetWorth).toBe(1100);
    expect(result.finalUnrealized).toBe(100 - 500); // shortPnl - totalInvested
  });

  it('clamps net worth to minimum 0 when negative due to short losses', () => {
    // Short position that's underwater: price went up, short lost money
    const asset = makeAsset({ currentPrice: 200 });
    const holding = makeHolding({
      assetId: 'test_asset',
      shortQuantity: 10,
      averageShortPrice: 100,
    });
    // short P&L = (100 - 200) * 10 = -1000
    // net worth = cash (0) + long value (0) + short P&L (-1000) = -1000 -> clamped to 0
    const result = calculateFinalMetrics([holding], [asset], 0, 0);

    expect(result.finalNetWorth).toBe(0); // clamped
    expect(result.finalShortPandL).toBe(-1000);
    expect(result.finalLongValue).toBe(0);
  });
});
