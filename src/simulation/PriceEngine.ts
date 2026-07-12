import type { BrainrotAsset, MarketCondition, NewsStory } from '../types';

export class PriceEngine {
  private baseSeed: number;

  constructor(seed?: number) {
    this.baseSeed = seed ?? 42;
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  calculatePriceChange(
    asset: BrainrotAsset,
    globalSentiment: number,
    marketCondition: MarketCondition,
    activeNews: NewsStory[],
    activeRumourStrength: number,
    whaleNewsPressure: number,
    supplyDemandPressure: number,
    tick: number,
    phaseTrendBias: number,
    phaseVolMultiplier: number,
    playerMarketImpact: number = 0,
    intradayBias: number = 0,
  ): number {
    const seed = tick * 9973 + this.baseSeed;

    // ── Phase-driven trend (dominant factor) ──
    // Reduced from original to make trends less guaranteed profitable
    const trendEffect = phaseTrendBias * 0.85;

    // Small wick noise on top of trend (for candle shadows)
    const wickNoise = (this.seededRandom(seed + 2) - 0.5) * asset.baseVolatility * phaseVolMultiplier * 0.12;

    // Global sentiment effect (stronger)
    const sentimentEffect = (globalSentiment - 50) * 0.0005;

    // Hype effect
    const hypeEffect = (asset.hype - 10) * 0.0004;

    // Popularity effect
    const popularityEffect = (asset.popularity - 50) * 0.00015;

    // News effects
    let newsEffect = 0;
    for (const news of activeNews) {
      if (news.relatedAssets.includes(asset.id) || news.relatedCategories.includes(asset.category)) {
        newsEffect += news.effectStrength * 0.008;
      }
    }

    // Rumour effect
    const rumourEffect = activeRumourStrength * 0.004;

    // Supply and demand (stronger impact)
    const supplyDemandEffect = supplyDemandPressure * 0.004;

    // Whale activity effect
    const whaleEffect = whaleNewsPressure * 0.002;

    // Player market impact (new - large trades affect price)
    const playerImpactEffect = playerMarketImpact * 0.001;

    // Momentum (small continuation effect)
    const momentumEffect = asset.momentum * 0.0008;

    // Mean reversion (stronger pull back to starting price range)
    const meanReversion = (asset.startingPrice - asset.currentPrice) / asset.currentPrice * 0.001;
    const meanReversionCapped = Math.max(-0.008, Math.min(0.008, meanReversion));

    // Overvaluation pressure (stronger)
    const overvaluation = (asset.currentPrice / asset.allTimeHigh) - 0.5;
    const overvaluationPressure = overvaluation * 0.0008;

    // Intraday phase bias (randomized trends at day start/mid/end)
    const intradayEffect = intradayBias;

    // Market condition effects (stronger)
    let marketEffect = 0;
    switch (marketCondition) {
      case 'Bull Market': marketEffect = 0.0008; break;
      case 'Bear Market': marketEffect = -0.002; break;
      case 'Flash Crash': marketEffect = -0.012; break;
      case 'Meme Rally': marketEffect = 0.0025; break;
      case 'Market Bubble': marketEffect = 0.0015; break;
      case 'Correction': marketEffect = -0.0015; break;
      case 'Recession': marketEffect = -0.002; break;
      case 'Short Squeeze': marketEffect = 0.003; break;
      default: marketEffect = 0;
    }

    let totalChange = trendEffect
      + wickNoise
      + sentimentEffect
      + hypeEffect
      + popularityEffect
      + newsEffect
      + rumourEffect
      + supplyDemandEffect
      + whaleEffect
      + playerImpactEffect
      + momentumEffect
      + meanReversionCapped
      - overvaluationPressure
      + marketEffect
      + intradayEffect;

    // Clamp the change to prevent extreme single-tick movements
    const maxChange = (asset.baseVolatility * phaseVolMultiplier) * 2.5;
    totalChange = Math.max(-maxChange, Math.min(maxChange, totalChange));

    return totalChange;
  }

  calculateNewPrice(asset: BrainrotAsset, priceChange: number): number {
    const newPrice = asset.currentPrice * (1 + priceChange);
    // Prevent negative prices
    return Math.max(0.01, newPrice);
  }

  updateVolatility(asset: BrainrotAsset, marketCondition: MarketCondition): number {
    let volatilityMultiplier = 1;
    switch (marketCondition) {
      case 'Flash Crash': volatilityMultiplier = 3; break;
      case 'Meme Rally': volatilityMultiplier = 2.5; break;
      case 'Bear Market': volatilityMultiplier = 1.8; break;
      case 'Bull Market': volatilityMultiplier = 1.3; break;
      case 'Short Squeeze': volatilityMultiplier = 2; break;
      case 'Market Bubble': volatilityMultiplier = 1.5; break;
      default: volatilityMultiplier = 1;
    }

    // Hype increases volatility
    const hypeVol = 1 + (asset.hype / 100) * 0.5;

    // Mean reversion of volatility
    const targetVol = asset.baseVolatility * volatilityMultiplier * hypeVol;
    const newVol = asset.currentVolatility * 0.95 + targetVol * 0.05;

    return Math.max(0.001, Math.min(0.5, newVol));
  }

  updateMomentum(currentMomentum: number, priceChange: number): number {
    const newMomentum = currentMomentum * 0.85 + priceChange * 0.15;
    return Math.max(-0.1, Math.min(0.1, newMomentum));
  }

  updateHype(currentHype: number, newsEffect: number, rumourEffect: number): number {
    let newHype = currentHype;
    // Hype decays naturally (faster decay)
    newHype *= 0.995;
    // News and rumours add hype
    newHype += newsEffect * 4;
    newHype += rumourEffect * 2;
    // Clamp
    return Math.max(0, Math.min(100, newHype));
  }

  updatePopularity(currentPopularity: number, priceChange: number): number {
    // Big price movements attract attention
    const attention = Math.abs(priceChange) * 8;
    let newPopularity = currentPopularity * 0.999 + attention * 0.001;
    return Math.max(0, Math.min(100, newPopularity));
  }

  updatePublicTrust(currentTrust: number, newsEffect: number): number {
    let newTrust = currentTrust;
    // Negative news reduces trust (stronger effect)
    if (newsEffect < -0.2) {
      newTrust -= Math.abs(newsEffect) * 6;
    }
    // Trust recovers slowly
    newTrust += 0.005;
    return Math.max(0, Math.min(100, newTrust));
  }
}
