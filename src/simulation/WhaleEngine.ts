import type { Whale, BrainrotAsset, MarketCondition } from '../types';

export interface WhaleTrade {
  whaleId: string;
  whaleName: string;
  assetId: string;
  ticker: string;
  type: 'Buy' | 'Sell';
  quantity: number;
  price: number;
  totalValue: number;
}

export class WhaleEngine {
  private whales: Whale[];
  private tickCounter = 0;

  constructor(whales: Whale[]) {
    this.whales = whales.map(w => ({
      ...w,
      holdings: { ...w.holdings },
    }));
  }

  setWhales(whales: Whale[]): void {
    this.whales = whales.map(w => ({
      ...w,
      holdings: { ...w.holdings },
    }));
  }

  tick(
    brainrots: BrainrotAsset[],
    marketCondition: MarketCondition,
  ): WhaleTrade[] {
    this.tickCounter++;
    const trades: WhaleTrade[] = [];

    // Evaluate trades at randomized intervals
    for (const whale of this.whales) {
      const evalInterval = Math.floor(5 + Math.random() * 10); // 5-15 ticks
      if (this.tickCounter % evalInterval !== 0) continue;

      // Determine if whale trades (based on risk tolerance and market condition)
      let tradeChance = 0.3;
      if (marketCondition === 'Flash Crash' || marketCondition === 'Meme Rally') {
        tradeChance = 0.5; // More active during extreme conditions
      }
      if (Math.random() > tradeChance) continue;

      const trade = this.evaluateWhaleTrade(whale, brainrots, marketCondition);
      if (trade) trades.push(trade);
    }

    return trades;
  }

  private evaluateWhaleTrade(
    whale: Whale,
    brainrots: BrainrotAsset[],
    marketCondition: MarketCondition,
  ): WhaleTrade | null {
    // Filter to available assets
    const available = brainrots.filter(b => b.unlocked);
    if (available.length === 0) return null;

    // Favourite assets get priority
    const favourites = available.filter(b => whale.favouriteCategories.includes(b.category));
    const pool = favourites.length > 0 && Math.random() < 0.6 ? favourites : available;

    const target = pool[Math.floor(Math.random() * pool.length)];
    if (!target) return null;

    const currentPrice = target.currentPrice;
    const whaleWealth = whale.wealth;

    switch (whale.tradingStyle) {
      case 'Aggressive': {
        const maxTrade = whaleWealth * 0.1;
        const quantity = Math.floor(maxTrade / currentPrice);
        if (quantity <= 0) return null;

        const type = Math.random() < 0.4 ? 'Buy' : 'Sell';
        if (type === 'Sell' && (!whale.holdings[target.id] || whale.holdings[target.id] <= 0)) return null;

        const actualQty = type === 'Sell'
          ? Math.min(quantity, whale.holdings[target.id] || 0)
          : quantity;
        if (actualQty <= 0) return null;

        return {
          whaleId: whale.id,
          whaleName: whale.name,
          assetId: target.id,
          ticker: target.ticker,
          type,
          quantity: actualQty,
          price: currentPrice,
          totalValue: actualQty * currentPrice,
        };
      }
      case 'Cautious': {
        if (marketCondition === 'Flash Crash' || marketCondition === 'Bear Market') {
          // Sell to protect
          if (whale.holdings[target.id] && whale.holdings[target.id] > 0) {
            const sellQty = Math.floor(whale.holdings[target.id] * 0.3);
            if (sellQty > 0) {
              return {
                whaleId: whale.id,
                whaleName: whale.name,
                assetId: target.id,
                ticker: target.ticker,
                type: 'Sell',
                quantity: sellQty,
                price: currentPrice,
                totalValue: sellQty * currentPrice,
              };
            }
          }
        }
        // Buy on dips
        if (target.dailyChange < -0.05) {
          const maxTrade = whaleWealth * 0.02;
          const quantity = Math.floor(maxTrade / currentPrice);
          if (quantity > 0) {
            return {
              whaleId: whale.id,
              whaleName: whale.name,
              assetId: target.id,
              ticker: target.ticker,
              type: 'Buy',
              quantity,
              price: currentPrice,
              totalValue: quantity * currentPrice,
            };
          }
        }
        return null;
      }
      case 'Momentum': {
        // Follow the trend
        if (Math.abs(target.momentum) < 0.001) return null;
        const type = target.momentum > 0 ? 'Buy' : 'Sell';
        if (type === 'Sell' && (!whale.holdings[target.id] || whale.holdings[target.id] <= 0)) return null;

        const tradeSize = Math.abs(target.momentum) * 100;
        const maxTrade = whaleWealth * Math.min(0.05, tradeSize);
        const quantity = Math.floor(maxTrade / currentPrice);
        if (quantity <= 0) return null;

        const actualQty = type === 'Sell'
          ? Math.min(quantity, whale.holdings[target.id] || 0)
          : quantity;
        if (actualQty <= 0) return null;

        return {
          whaleId: whale.id,
          whaleName: whale.name,
          assetId: target.id,
          ticker: target.ticker,
          type,
          quantity: actualQty,
          price: currentPrice,
          totalValue: actualQty * currentPrice,
        };
      }
      case 'Value': {
        // Buy undervalued, sell overvalued
        const priceToStart = currentPrice / target.startingPrice;
        if (priceToStart < 0.8) {
          // Undervalued - buy
          const maxTrade = whaleWealth * 0.03;
          const quantity = Math.floor(maxTrade / currentPrice);
          if (quantity > 0) {
            return {
              whaleId: whale.id,
              whaleName: whale.name,
              assetId: target.id,
              ticker: target.ticker,
              type: 'Buy',
              quantity,
              price: currentPrice,
              totalValue: quantity * currentPrice,
            };
          }
        } else if (priceToStart > 1.5 && whale.holdings[target.id] && whale.holdings[target.id] > 0) {
          // Overvalued - sell
          const sellQty = Math.floor(whale.holdings[target.id] * 0.5);
          if (sellQty > 0) {
            return {
              whaleId: whale.id,
              whaleName: whale.name,
              assetId: target.id,
              ticker: target.ticker,
              type: 'Sell',
              quantity: sellQty,
              price: currentPrice,
              totalValue: sellQty * currentPrice,
            };
          }
        }
        return null;
      }
      case 'Random': {
        const type = Math.random() < 0.5 ? 'Buy' : 'Sell';
        if (type === 'Sell' && (!whale.holdings[target.id] || whale.holdings[target.id] <= 0)) {
          return null;
        }

        const quantity = Math.floor((Math.random() * whaleWealth * 0.05) / currentPrice);
        if (quantity <= 0) return null;

        const actualQty = type === 'Sell'
          ? Math.min(quantity, whale.holdings[target.id] || 0)
          : quantity;
        if (actualQty <= 0) return null;

        return {
          whaleId: whale.id,
          whaleName: whale.name,
          assetId: target.id,
          ticker: target.ticker,
          type,
          quantity: actualQty,
          price: currentPrice,
          totalValue: actualQty * currentPrice,
        };
      }
      default:
        return null;
    }
  }

  applyTrade(trade: WhaleTrade): void {
    const whale = this.whales.find(w => w.id === trade.whaleId);
    if (!whale) return;

    if (trade.type === 'Buy') {
      whale.holdings[trade.assetId] = (whale.holdings[trade.assetId] || 0) + trade.quantity;
      whale.wealth -= trade.totalValue;
    } else {
      const current = whale.holdings[trade.assetId] || 0;
      whale.holdings[trade.assetId] = Math.max(0, current - trade.quantity);
      whale.wealth += trade.totalValue;
    }
  }

  getWhales(): Whale[] {
    return this.whales;
  }

  getWhaleById(id: string): Whale | undefined {
    return this.whales.find(w => w.id === id);
  }

  getState() {
    return {
      whales: this.whales,
    };
  }
}
