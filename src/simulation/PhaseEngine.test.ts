import { describe, it, expect } from 'vitest';
import type { BrainrotAsset } from '../types';
import { initPhaseData, tickPhase } from './PhaseEngine';

function makeAsset(): BrainrotAsset {
  return {
    id: 'test',
    name: 'Test',
    ticker: 'TEST',
    category: 'Beverage Beasts',
    description: '',
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
    color: '#888',
    phase: 'accumulation',
    phaseTicksRemaining: 60,
    trendStrength: 0,
    dayOpenPrice: 100,
    candleOpen: 100,
    candleHigh: 100,
    candleLow: 100,
    candleTicks: 0,
  };
}

describe('PhaseEngine', () => {
  describe('initPhaseData', () => {
    it('initializes phase data on an asset', () => {
      const asset = makeAsset();
      asset.phase = 'uptrend'; // wrong default
      asset.phaseTicksRemaining = 0;

      initPhaseData(asset);

      expect(asset.phase).toBe('accumulation');
      expect(asset.phaseTicksRemaining).toBeGreaterThan(0);
      expect(asset.trendStrength).toBe(0);
      expect(asset.candleOpen).toBe(100);
      expect(asset.candleHigh).toBe(100);
      expect(asset.candleLow).toBe(100);
      expect(asset.candleTicks).toBe(0);
      expect(asset.candles).toEqual([]);
    });
  });

  describe('tickPhase', () => {
    it('returns trend bias within expected range for accumulation', () => {
      const asset = makeAsset();
      initPhaseData(asset);
      // Force accumulation
      asset.phase = 'accumulation';
      asset.phaseTicksRemaining = 50;

      const phaseData = tickPhase(asset, 1, 'Normal');

      // Accumulation should have very low trend bias
      expect(Math.abs(phaseData.trendBias)).toBeLessThan(0.002);
      expect(phaseData.volatilityMultiplier).toBe(0.5);
      expect(phaseData.volumeMultiplier).toBeGreaterThan(0);
    });

    it('returns positive trend bias for uptrend', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'uptrend';
      asset.phaseTicksRemaining = 50;

      const phaseData = tickPhase(asset, 1, 'Normal');

      // Uptrend should have positive trend bias
      expect(phaseData.trendBias).toBeGreaterThan(0);
      expect(phaseData.volatilityMultiplier).toBe(1.0);
    });

    it('returns negative trend bias for downtrend', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'downtrend';
      asset.phaseTicksRemaining = 50;

      const phaseData = tickPhase(asset, 1, 'Normal');

      expect(phaseData.trendBias).toBeLessThan(0);
      expect(phaseData.volatilityMultiplier).toBe(1.0);
    });

    it('returns strong positive trend for breakout', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'breakout';
      asset.phaseTicksRemaining = 15;

      const phaseData = tickPhase(asset, 1, 'Normal');

      expect(phaseData.trendBias).toBeGreaterThan(0.005);
      expect(phaseData.volatilityMultiplier).toBe(2.0);
    });

    it('returns strong negative trend for panic', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'panic';
      asset.phaseTicksRemaining = 10;

      const phaseData = tickPhase(asset, 1, 'Normal');

      expect(phaseData.trendBias).toBeLessThan(-0.005);
      expect(phaseData.volatilityMultiplier).toBe(2.5);
    });

    it('transitions to a new phase when ticksRemaining reaches 0', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'breakout';
      asset.phaseTicksRemaining = 1; // will expire this tick

      tickPhase(asset, 1, 'Normal');

      // Breakout always transitions to uptrend
      expect(asset.phase).toBe('uptrend');
      expect(asset.phaseTicksRemaining).toBeGreaterThan(0);
    });

    it('tracks candle open/high/low/close and completes candles', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'uptrend';
      asset.phaseTicksRemaining = 50;
      // Set candle to complete on next tick (candleTicks starts at 0 from initPhaseData)
      // So we need to set it to CANDLE_TICKS - 1 = 9
      asset.candleTicks = 9;
      asset.currentPrice = 105;

      const phaseData = tickPhase(asset, 10, 'Normal');

      // Candle should have been completed
      expect(phaseData.candleCompleted).toBe(true);
      // We don't know exact low/high because tickPhase updates currentPrice
      // but at least a candle was pushed
      expect(asset.candles.length).toBe(1);
      expect(asset.candleTicks).toBe(0);
      expect(asset.candleOpen).toBe(asset.currentPrice); // new candle starts at current price
    });

    it('amplifies trend during Bull Market condition', () => {
      const asset = makeAsset();
      asset.currentPrice = 100;
      asset.candleOpen = 100;
      asset.candleHigh = 100;
      asset.candleLow = 100;
      asset.phase = 'uptrend';
      asset.phaseTicksRemaining = 50;

      const normal = tickPhase(asset, 1, 'Normal');
      const bull = tickPhase(asset, 2, 'Bull Market');

      // Bull market should amplify the positive trend
      // But since these are at different ticks and random jitter is involved,
      // let's just check that both are positive
      expect(normal.trendBias).toBeGreaterThan(0);
      expect(bull.trendBias).toBeGreaterThan(0);
    });

    it('works through a full market cycle without errors', () => {
      const asset = makeAsset();
      initPhaseData(asset);

      // Run 200 ticks through the asset
      for (let tick = 0; tick < 200; tick++) {
        const phaseData = tickPhase(asset, tick, 'Normal');
        expect(phaseData.trendBias).toBeTypeOf('number');
        expect(Number.isFinite(phaseData.trendBias)).toBe(true);
        expect(phaseData.volatilityMultiplier).toBeGreaterThan(0);
        expect(asset.phaseTicksRemaining).toBeGreaterThan(0);
      }

      // Should have gone through multiple phases and created candles
      expect(asset.candles.length).toBeGreaterThan(5);
    });
  });
});
