import { describe, it, expect } from 'vitest';
import { PriceEngine } from './PriceEngine';
import type { BrainrotAsset } from '../types';

function makeMockAsset(overrides: Partial<BrainrotAsset> = {}): BrainrotAsset {
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

describe('PriceEngine', () => {
  it('calculates a valid price change without crashing', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset();

    const change = engine.calculatePriceChange(
      asset, 50, 'Normal', [], 0, 0, 0, 1, 0, 1
    );

    expect(change).toBeTypeOf('number');
    expect(Number.isFinite(change)).toBe(true);
  });

  it('clamps price change within volatility bounds', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset({ currentVolatility: 0.05 });

    // Run many ticks to see if any exceed the clamp
    for (let i = 0; i < 100; i++) {
      const change = engine.calculatePriceChange(
        asset, 50, 'Normal', [], 0, 0, 0, i * 100, 0, 1
      );
      const maxChange = 0.05 * 3; // currentVolatility * 3
      expect(Math.abs(change)).toBeLessThanOrEqual(maxChange + 0.001);
    }
  });

  it('produces different results for different ticks', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset();

    const change1 = engine.calculatePriceChange(
      asset, 50, 'Normal', [], 0, 0, 0, 1, 0, 1
    );
    const change2 = engine.calculatePriceChange(
      asset, 50, 'Normal', [], 0, 0, 0, 2, 0, 1
    );

    // Different ticks should (almost certainly) give different results
    expect(change1).not.toBe(change2);
  });

  it('gives bullish effect in Bull Market', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset();

    const changeNormal = engine.calculatePriceChange(
      asset, 50, 'Normal', [], 0, 0, 0, 42, 0, 1
    );
    const changeBull = engine.calculatePriceChange(
      asset, 50, 'Bull Market', [], 0, 0, 0, 42, 0, 1
    );

    // Use a different seed to avoid same random values
    const changeNormal2 = engine.calculatePriceChange(
      asset, 50, 'Normal', [], 0, 0, 0, 43, 0, 1
    );
    const changeBull2 = engine.calculatePriceChange(
      asset, 50, 'Bull Market', [], 0, 0, 0, 43, 0, 1
    );

    // Bull market should add positive effect
    // Use the difference between bull and normal at the same tick
    const diff1 = changeBull - changeNormal;
    const diff2 = changeBull2 - changeNormal2;
    expect(diff1).toBeGreaterThan(0);
    expect(diff2).toBeGreaterThan(0);
  });

  it('gives bearish effect in Bear Market', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset();

    const changeNormal = engine.calculatePriceChange(
      asset, 50, 'Normal', [], 0, 0, 0, 100, 0, 1
    );
    const changeBear = engine.calculatePriceChange(
      asset, 50, 'Bear Market', [], 0, 0, 0, 100, 0, 1
    );

    expect(changeBear - changeNormal).toBeLessThan(0);
  });

  it('calculates new price correctly', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset({ currentPrice: 100 });

    const newPrice = engine.calculateNewPrice(asset, 0.05);
    expect(newPrice).toBeCloseTo(105, 1);

    const newPriceNegative = engine.calculateNewPrice(asset, -1);
    // Price shouldn't go below 0.01
    expect(newPriceNegative).toBeGreaterThanOrEqual(0.01);
  });

  it('updates volatility based on market condition', () => {
    const engine = new PriceEngine();
    const asset = makeMockAsset({ currentVolatility: 0.05, baseVolatility: 0.05, hype: 10 });

    const flashCrashVol = engine.updateVolatility(asset, 'Flash Crash');
    expect(flashCrashVol).toBeGreaterThan(0.05);

    const normalVol = engine.updateVolatility(asset, 'Normal');
    expect(normalVol).toBeLessThan(flashCrashVol);
  });

  it('momentum decays toward zero and reacts to price changes', () => {
    const engine = new PriceEngine();

    const momentum1 = engine.updateMomentum(0, 0.05);
    // Should be positive but less than 0.05
    expect(momentum1).toBeGreaterThan(0);
    expect(momentum1).toBeLessThan(0.01);

    // Decay test: without new input, momentum decays
    const initialMomentum = 0.05;
    const decayed = engine.updateMomentum(initialMomentum, 0);
    expect(decayed).toBeLessThan(initialMomentum);
    expect(decayed).toBeGreaterThan(0);
  });

  it('clamps hype between 0 and 100', () => {
    const engine = new PriceEngine();
    expect(engine.updateHype(50, 0, 0)).toBeLessThan(51); // decays
    expect(engine.updateHype(0, 0, 0)).toBeGreaterThanOrEqual(0);
    expect(engine.updateHype(99, 10, 0)).toBeLessThanOrEqual(100);
  });
});
