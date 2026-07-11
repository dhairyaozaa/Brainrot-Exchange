import type { BrainrotAsset, MarketCondition, NewsStory, RotterPost } from '../types';
import { BRAINROTS } from '../data/brainrots';
import { TimeEngine } from './TimeEngine';
import { PriceEngine } from './PriceEngine';
import { NewsEngine } from './NewsEngine';
import { WhaleEngine, type WhaleTrade } from './WhaleEngine';
import { WHALES } from '../data/whales';
import { generateRotterPost } from '../data/rotterAccounts';

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
  private marketConditionTimer = 0;
  private chartTickCounter = 0;
  private activeRumourStrength = 0;

  // Player supply/demand pressure
  private playerDemand: Record<string, number> = {};
  private playerSupply: Record<string, number> = {};

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
      currentPrice: b.startingPrice,
      allTimeHigh: b.startingPrice,
      allTimeLow: b.startingPrice,
    }));
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
      this.marketConditionTimer = Math.floor(50 + Math.random() * 150);
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

    // Update asset prices
    for (const asset of this.brainrots) {
      if (!marketOpen) continue;

      const newsEffect = this.newsEngine.getTotalEffectForAsset(asset.id);
      const categoryNewsEffect = this.newsEngine.getTotalEffectForCategory(asset.category);

      const supplyDemandRatio = asset.supply > 0 ? asset.demand / asset.supply : 1;
      const supplyDemandPressure = Math.log(supplyDemandRatio) * 0.1;

      // Player demand/supply pressure
      const playerPressure = (this.playerDemand[asset.id] || 0) - (this.playerSupply[asset.id] || 0);

      const priceChange = this.priceEngine.calculatePriceChange(
        asset,
        this.globalSentiment,
        this.marketCondition,
        this.newsEngine.getActiveNews(),
        this.activeRumourStrength,
        newsEffect + categoryNewsEffect,
        supplyDemandPressure + playerPressure * 0.01,
        totalTicks,
      );

      const newPrice = this.priceEngine.calculateNewPrice(asset, priceChange);

      // Update asset metrics
      asset.currentVolatility = this.priceEngine.updateVolatility(asset, this.marketCondition);
      asset.momentum = this.priceEngine.updateMomentum(asset.momentum, priceChange);
      asset.hype = this.priceEngine.updateHype(asset.hype, newsEffect, this.activeRumourStrength);
      asset.popularity = this.priceEngine.updatePopularity(asset.popularity, priceChange);
      asset.publicTrust = this.priceEngine.updatePublicTrust(asset.publicTrust, newsEffect);

      asset.currentPrice = newPrice;
      asset.dailyChange = priceChange;
      asset.allTimeHigh = Math.max(asset.allTimeHigh, newPrice);
      asset.allTimeLow = Math.min(asset.allTimeLow, newPrice);

      // Update supply/demand (mean reverting)
      asset.supply += (1000000 - asset.supply) * 0.001;
      asset.demand += (50000 - asset.demand) * 0.001;

      // Store chart data every 2 ticks (ticks are 5s apart, so every 2nd tick = 10s granularity)
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

    // Decay player demand/supply
    for (const key of Object.keys(this.playerDemand)) {
      this.playerDemand[key] *= 0.95;
      if (this.playerDemand[key] < 0.1) delete this.playerDemand[key];
    }
    for (const key of Object.keys(this.playerSupply)) {
      this.playerSupply[key] *= 0.95;
      if (this.playerSupply[key] < 0.1) delete this.playerSupply[key];
    }

    // Active rumour decay
    this.activeRumourStrength *= 0.98;

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
