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
  isCounterTrade?: boolean;
}

/** Player position snapshot for whale counter-trading */
export interface PlayerPositionSnapshot {
  assetId: string;
  quantity: number;
  averagePrice: number;
  currentValue: number;
  isShort: boolean;
  shortQuantity: number;
  shortValue: number;
}

/** How concentrated the player is in a single asset (0-1) */
const COUNTER_TRADE_CONCENTRATION_THRESHOLD = 0.20; // Player has >20% of net worth in one asset (only truly concentrated bets)
const COUNTER_TRADE_CHANCE = 0.15; // 15% chance per whale per evaluation (subtle)
const COUNTER_TRADE_SIZE_RATIO = 0.05; // Counter-trade 5% of player's position (small resistance)
const MAX_COUNTER_TRADES_PER_TICK = 1; // Max 1 counter-trade per tick across all whales
const COUNTER_TRADE_COOLDOWN_MIN = 12; // Minimum ticks between evaluations
const COUNTER_TRADE_COOLDOWN_MAX = 25; // Maximum ticks between evaluations
const ASSET_COUNTER_TRADE_COOLDOWN = 20; // Minimum ticks between counter-trades on the same asset
const WEAK_PLAYER_THRESHOLD = 10000; // Below this net worth, counter-trading is much weaker

export class WhaleEngine {
  private whales: Whale[];
  private tickCounter = 0;
  private counterTradeCooldown = 0;
  private assetCounterTradeCooldowns: Record<string, number> = {};

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
    playerPositions?: PlayerPositionSnapshot[],
    playerNetWorth?: number,
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

    // ── Decay per-asset cooldowns ──
    for (const key of Object.keys(this.assetCounterTradeCooldowns)) {
      this.assetCounterTradeCooldowns[key]--;
      if (this.assetCounterTradeCooldowns[key] <= 0) {
        delete this.assetCounterTradeCooldowns[key];
      }
    }

    // ── Counter-trading (subtle market resistance) ──
    // Whales notice when the player is over-concentrated and occasionally trade against them
    this.counterTradeCooldown--;
    if (this.counterTradeCooldown <= 0 && playerPositions && playerNetWorth && playerNetWorth > 0) {
      this.counterTradeCooldown = Math.floor(COUNTER_TRADE_COOLDOWN_MIN + Math.random() * (COUNTER_TRADE_COOLDOWN_MAX - COUNTER_TRADE_COOLDOWN_MIN));

      // Wealth scaling: counter-trading is weaker for poor players, stronger for rich players
      // This prevents new players from being frustrated while making late game harder
      const wealthScale = playerNetWorth < WEAK_PLAYER_THRESHOLD
        ? 0.3 // Very weak counter-trading for new players (< ₹10K)
        : Math.min(1.0, 0.3 + (playerNetWorth - WEAK_PLAYER_THRESHOLD) / 5000000 * 0.7); // Scales up to full strength at ₹5M+

      if (trades.length < MAX_COUNTER_TRADES_PER_TICK) {
        // Find assets where player is over-concentrated
        for (const pos of playerPositions) {
          const positionValue = pos.isShort ? pos.shortValue : pos.currentValue;
          if (positionValue <= 0) continue;

          const concentration = positionValue / playerNetWorth;
          if (concentration < COUNTER_TRADE_CONCENTRATION_THRESHOLD) continue;

          // Skip if this asset was recently counter-traded
          if (this.assetCounterTradeCooldowns[pos.assetId]) continue;

          // Only Aggressive and Momentum whales counter-trade
          const counterWhales = this.whales.filter(w =>
            (w.tradingStyle === 'Aggressive' || w.tradingStyle === 'Momentum') &&
            Math.random() < COUNTER_TRADE_CHANCE * wealthScale
          );

          if (counterWhales.length === 0) continue;

          const counterWhale = counterWhales[Math.floor(Math.random() * counterWhales.length)];
          const asset = brainrots.find(b => b.id === pos.assetId);
          if (!asset) continue;

          // Counter-trade: sell if player is long, buy if player is short
          const counterType: 'Buy' | 'Sell' = pos.isShort ? 'Buy' : 'Sell';

          // Size: 3-7% of player's position (proportional to concentration, scaled by wealth)
          const sizeMultiplier = Math.min(0.07, COUNTER_TRADE_SIZE_RATIO * (concentration / COUNTER_TRADE_CONCENTRATION_THRESHOLD) * wealthScale);
          const counterQty = Math.max(1, Math.floor((pos.isShort ? pos.shortQuantity : pos.quantity) * sizeMultiplier));

          // Set per-asset cooldown
          this.assetCounterTradeCooldowns[pos.assetId] = ASSET_COUNTER_TRADE_COOLDOWN;

          // Whale needs to have enough wealth and holdings
          if (counterType === 'Sell') {
            const whaleHoldings = counterWhale.holdings[asset.id] || 0;
            const actualQty = Math.min(counterQty, whaleHoldings);
            if (actualQty <= 0) continue;

            trades.push({
              whaleId: counterWhale.id,
              whaleName: counterWhale.name,
              assetId: asset.id,
              ticker: asset.ticker,
              type: 'Sell',
              quantity: actualQty,
              price: asset.currentPrice,
              totalValue: actualQty * asset.currentPrice,
              isCounterTrade: true,
            });
          } else {
            // Buying against player's short
            const maxTrade = counterWhale.wealth * 0.03;
            const actualQty = Math.min(counterQty, Math.floor(maxTrade / asset.currentPrice));
            if (actualQty <= 0) continue;

            trades.push({
              whaleId: counterWhale.id,
              whaleName: counterWhale.name,
              assetId: asset.id,
              ticker: asset.ticker,
              type: 'Buy',
              quantity: actualQty,
              price: asset.currentPrice,
              totalValue: actualQty * asset.currentPrice,
              isCounterTrade: true,
            });
          }

          break; // Max 1 counter-trade per tick
        }
      }
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
        // Buy on dips (day-level change)
        const dayDrop = target.dayOpenPrice > 0
          ? (target.currentPrice - target.dayOpenPrice) / target.dayOpenPrice
          : 0;
        if (dayDrop < -0.05) {
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
