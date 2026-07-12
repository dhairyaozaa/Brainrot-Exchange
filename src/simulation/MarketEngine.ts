import type { BrainrotAsset, MarketCondition, NewsStory, RotterPost } from '../types';
import { BRAINROTS } from '../data/brainrots';
import { TimeEngine } from './TimeEngine';
import { PriceEngine } from './PriceEngine';
import { NewsEngine } from './NewsEngine';
import { WhaleEngine, type WhaleTrade } from './WhaleEngine';
import { WHALES } from '../data/whales';
import { generateRotterPost } from '../data/rotterAccounts';
import { tickPhase, initPhaseData } from './PhaseEngine';

export interface MarketTickResult {
  brainrots: BrainrotAsset[];
  newNews: NewsStory | null;
  whaleTrades: WhaleTrade[];
  newRotterPosts: RotterPost[];
  marketCondition: MarketCondition;
  globalSentiment: number;
  chartDataPoints: { assetId: string; price: number; tick: number }[];
}

export class MarketEngine {
  timeEngine: TimeEngine;
  priceEngine: PriceEngine;
  newsEngine: NewsEngine;
  whaleEngine: WhaleEngine;

  brainrots: BrainrotAsset[] = [];
  globalSentiment = 50;
  marketCondition: MarketCondition = 'Normal';
  rotterPosts: RotterPost[] = [];
  private rotterCooldown = 0;
  private marketConditionTimer = 100 + Math.floor(Math.random() * 200); // Longer market cycles
  private chartTickCounter = 0;
  private activeRumourStrength = 0;

  // Player supply/demand pressure
  private playerDemand: Record<string, number> = {};
  private playerSupply: Record<string, number> = {};

  // Intraday phase tracking
  private dayStartBias = 0;
  private dayMidBias = 0;
  private dayEndBias = 0;
  private currentIntradayPhase: 'start' | 'mid' | 'end' = 'start';

  // Track previous market status for day-open detection
  private _prevMarketStatus: 'Open' | 'Closed' = 'Open';

  // Crash counters for achievements
  private crashCount = 0;

  constructor() {
    this.timeEngine = new TimeEngine();
    this.priceEngine = new PriceEngine();
    this.newsEngine = new NewsEngine();
    this.whaleEngine = new WhaleEngine(WHALES.map(w => ({ ...w })));
    this.brainrots = BRAINROTS.map(b => ({
      ...b,
      historicalPrices: [b.startingPrice],
      candles: [],
      currentPrice: b.startingPrice,
      allTimeHigh: b.startingPrice,
      allTimeLow: b.startingPrice,
      dayOpenPrice: b.startingPrice,
    }));
    // Initialize phase data for each asset
    for (const asset of this.brainrots) {
      initPhaseData(asset);
    }
  }

  tick(): MarketTickResult {
    const chartDataPoints: { assetId: string; price: number; tick: number }[] = [];

    // Time tick
    this.timeEngine.tick();
    const totalTicks = this.timeEngine.getTotalTicks();
    const marketOpen = this.timeEngine.getMarketStatus() === 'Open';

    // News tick (every few ticks)
    const newNews = this.newsEngine.tick();

    // ROTTER posts
    this.rotterCooldown--;
    const newRotterPosts: RotterPost[] = [];
    if (this.rotterCooldown <= 0) {
      const tickers = this.brainrots.map(b => b.ticker);
      for (let i = 0; i < Math.floor(1 + Math.random() * 3); i++) {
        const { accountId, content } = generateRotterPost(tickers);
        const post: RotterPost = {
          id: `post_${totalTicks}_${i}`,
          accountId,
          content,
          timestamp: totalTicks,
          likes: Math.floor(Math.random() * 1000),
          reposts: Math.floor(Math.random() * 100),
          relatedAssets: [],
          hypeEffect: (Math.random() - 0.5) * 0.3,
          trustEffect: (Math.random() - 0.5) * 0.2,
        };
        newRotterPosts.push(post);
        this.rotterPosts.push(post);
      }
      this.rotterCooldown = Math.floor(5 + Math.random() * 15);

      // Limit rotter posts history
      if (this.rotterPosts.length > 200) {
        this.rotterPosts = this.rotterPosts.slice(-200);
      }
    }

    // Market condition updates
    this.marketConditionTimer--;
    if (this.marketConditionTimer <= 0) {
      this.updateMarketCondition();
      this.marketConditionTimer = Math.floor(100 + Math.random() * 200); // Longer market cycles
    }

    // Global sentiment drift
    this.globalSentiment += (Math.random() - 0.5) * 0.5;
    this.globalSentiment = Math.max(10, Math.min(90, this.globalSentiment));

    // Whale trades
    const whaleTrades = marketOpen
      ? this.whaleEngine.tick(this.brainrots, this.marketCondition)
      : [];

    // Apply whale trades
    for (const trade of whaleTrades) {
      this.whaleEngine.applyTrade(trade);
      const asset = this.brainrots.find(b => b.id === trade.assetId);
      if (asset) {
        if (trade.type === 'Buy') {
          asset.demand += trade.quantity * 0.1;
          asset.volume += trade.quantity;
        } else {
          asset.supply += trade.quantity * 0.1;
          asset.volume += trade.quantity;
        }
      }
    }

    // Update asset prices using phase-driven trends
    // ── Intraday phase tracking ──
    // Determine which third of the trading day we're in
    const ticksInDay = this.timeEngine.getState().ticksInDay;
    const dayThird = this.timeEngine.getTicksPerDay() / 3;
    let intradayPhase: 'start' | 'mid' | 'end';
    if (ticksInDay < dayThird) {
      intradayPhase = 'start';
    } else if (ticksInDay < dayThird * 2) {
      intradayPhase = 'mid';
    } else {
      intradayPhase = 'end';
    }

    // Randomize biases when intraday phase changes
    if (intradayPhase !== this.currentIntradayPhase) {
      this.currentIntradayPhase = intradayPhase;
      if (intradayPhase === 'start') {
        // Day start: pick a random direction for the day opening
        this.dayStartBias = (Math.random() - 0.5) * 0.008; // -0.004 to +0.004
        this.dayMidBias = 0;
        this.dayEndBias = 0;
      } else if (intradayPhase === 'mid') {
        // Mid-day: can continue or reverse the start trend
        const continuationChance = 0.4;
        if (Math.random() < continuationChance) {
          this.dayMidBias = this.dayStartBias * (0.5 + Math.random() * 0.5); // continue weaker
        } else {
          this.dayMidBias = (Math.random() - 0.5) * 0.006; // new random direction
        }
      } else if (intradayPhase === 'end') {
        // Day end: often a reversal or acceleration of mid trend
        const reversalChance = 0.5;
        if (Math.random() < reversalChance) {
          this.dayEndBias = -this.dayMidBias * (0.5 + Math.random() * 0.8); // flip direction
        } else {
          this.dayEndBias = this.dayMidBias * (1 + Math.random() * 0.5); // continue stronger
        }
      }
    }

    // Combined intraday bias for this tick
    let intradayBias = 0;
    switch (this.currentIntradayPhase) {
      case 'start': intradayBias = this.dayStartBias; break;
      case 'mid': intradayBias = this.dayMidBias; break;
      case 'end': intradayBias = this.dayEndBias; break;
    }
    // Add per-tick noise to the bias so it's not a straight line
    intradayBias += (Math.random() - 0.5) * 0.001;

    for (const asset of this.brainrots) {
      if (!marketOpen) continue;

      // Phase engine tick - computes trend bias and volatility from current phase
      const phaseData = tickPhase(asset, totalTicks, this.marketCondition);

      const newsEffect = this.newsEngine.getTotalEffectForAsset(asset.id);
      const categoryNewsEffect = this.newsEngine.getTotalEffectForCategory(asset.category);

      const supplyDemandRatio = asset.supply > 0 ? asset.demand / asset.supply : 1;
      const supplyDemandPressure = Math.log(supplyDemandRatio) * 0.1;

      // Player demand/supply pressure
      const playerPressure = (this.playerDemand[asset.id] || 0) - (this.playerSupply[asset.id] || 0);

      // Player market impact: large positions relative to volume move the price
      const playerNet = (this.playerDemand[asset.id] || 0) - (this.playerSupply[asset.id] || 0);
      const playerImpact = asset.volume > 0 ? (playerNet / asset.volume) * 0.5 : 0;

      const priceChange = this.priceEngine.calculatePriceChange(
        asset,
        this.globalSentiment,
        this.marketCondition,
        this.newsEngine.getActiveNews(),
        this.activeRumourStrength,
        newsEffect + categoryNewsEffect,
        supplyDemandPressure + playerPressure * 0.02,
        totalTicks,
        phaseData.trendBias,
        phaseData.volatilityMultiplier,
        playerImpact,
        intradayBias,
      );

      const newPrice = this.priceEngine.calculateNewPrice(asset, priceChange);

      // Update asset metrics
      asset.currentVolatility = this.priceEngine.updateVolatility(asset, this.marketCondition);
      asset.momentum = this.priceEngine.updateMomentum(asset.momentum, priceChange);
      asset.hype = this.priceEngine.updateHype(asset.hype, newsEffect, this.activeRumourStrength);
      asset.popularity = this.priceEngine.updatePopularity(asset.popularity, priceChange);
      asset.publicTrust = this.priceEngine.updatePublicTrust(asset.publicTrust, newsEffect);

      asset.currentPrice = newPrice;
      asset.allTimeHigh = Math.max(asset.allTimeHigh, newPrice);
      asset.allTimeLow = Math.min(asset.allTimeLow, newPrice);

      // Apply volume spike from phase (lower base volume = more impact from trades)
      const baseVolume = 5000;
      asset.volume = Math.floor(baseVolume * phaseData.volumeMultiplier * (1 + Math.random() * 0.3));

      // Update supply/demand
      asset.supply += (1000000 - asset.supply) * 0.0005;
      asset.demand += (50000 - asset.demand) * 0.0005;

      // Store historical price data (every 2 ticks for backward compat)
      this.chartTickCounter = (this.chartTickCounter + 1) % 1000;
      if (this.chartTickCounter % 2 === 0) {
        asset.historicalPrices.push(newPrice);
        chartDataPoints.push({ assetId: asset.id, price: newPrice, tick: totalTicks });

        // Limit history to 1000 points
        if (asset.historicalPrices.length > 1000) {
          asset.historicalPrices = asset.historicalPrices.slice(-1000);
        }
      }
    }

    // Decay player demand/supply (slower decay = longer lasting impact)
    for (const key of Object.keys(this.playerDemand)) {
      this.playerDemand[key] *= 0.92;
      if (this.playerDemand[key] < 0.1) delete this.playerDemand[key];
    }
    for (const key of Object.keys(this.playerSupply)) {
      this.playerSupply[key] *= 0.92;
      if (this.playerSupply[key] < 0.1) delete this.playerSupply[key];
    }

    // Active rumour decay
    this.activeRumourStrength *= 0.98;

    // ── Day open price tracking ──
    // When market transitions from closed to open, set dayOpenPrice for all assets
    if (this.timeEngine.getMarketStatus() === 'Open') {
      const prevStatus = this._prevMarketStatus ?? 'Open';
      if (prevStatus === 'Closed') {
        for (const asset of this.brainrots) {
          asset.dayOpenPrice = asset.currentPrice;
        }
      }
    }
    this._prevMarketStatus = this.timeEngine.getMarketStatus();

    return {
      brainrots: this.brainrots,
      newNews,
      whaleTrades,
      newRotterPosts,
      marketCondition: this.marketCondition,
      globalSentiment: this.globalSentiment,
      chartDataPoints,
    };
  }

  recordPlayerBuy(assetId: string, quantity: number): void {
    this.playerDemand[assetId] = (this.playerDemand[assetId] || 0) + quantity;
    const asset = this.brainrots.find(b => b.id === assetId);
    if (asset) {
      asset.demand += quantity;
      asset.volume += quantity;
    }
  }

  recordPlayerSell(assetId: string, quantity: number): void {
    this.playerSupply[assetId] = (this.playerSupply[assetId] || 0) + quantity;
    const asset = this.brainrots.find(b => b.id === assetId);
    if (asset) {
      asset.supply += quantity;
      asset.volume += quantity;
    }
  }

  private updateMarketCondition(): void {
    const conditions: MarketCondition[] = [
      'Normal', 'Normal', 'Normal',
      'Bull Market', 'Bull Market',
      'Bear Market',
      'Correction',
      'Meme Rally',
      'Short Squeeze',
    ];

    // Rare conditions
    if (Math.random() < 0.05) {
      conditions.push('Flash Crash');
    }
    if (Math.random() < 0.03) {
      conditions.push('Market Bubble');
    }
    if (Math.random() < 0.02) {
      conditions.push('Recession');
    }

    // Weight by sentiment
    if (this.globalSentiment > 65) {
      for (let i = 0; i < 3; i++) conditions.push('Bull Market');
    } else if (this.globalSentiment < 35) {
      for (let i = 0; i < 3; i++) conditions.push('Bear Market');
    }

    this.marketCondition = conditions[Math.floor(Math.random() * conditions.length)];

    if (this.marketCondition === 'Flash Crash') {
      this.crashCount++;
    }
  }

  setNewsActive(news: NewsStory[]): void {
    this.newsEngine.setNews(news);
  }

  getState() {
    return {
      brainrots: this.brainrots,
      globalSentiment: this.globalSentiment,
      marketCondition: this.marketCondition,
      rotterPosts: this.rotterPosts,
      crashCount: this.crashCount,
      time: this.timeEngine.getState(),
      news: this.newsEngine.getState(),
      whales: this.whaleEngine.getState(),
    };
  }

  setState(state: ReturnType<typeof this.getState>): void {
    this.brainrots = state.brainrots;
    this.globalSentiment = state.globalSentiment;
    this.marketCondition = state.marketCondition;
    this.rotterPosts = state.rotterPosts;
    this.crashCount = state.crashCount;
    this.timeEngine.setState(state.time);
    this.newsEngine.setNews(state.news.activeNews);
    this.whaleEngine.setWhales(state.whales.whales);
  }
}
