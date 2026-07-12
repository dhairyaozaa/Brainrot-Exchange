import { create } from 'zustand';
import type {
  GameState, PlayerTrade, WhaleTradeLog,
  TradingRoomUpgrade, PrestigeUpgrade, GameSettings,
  MarketCondition, MarketStatus, BrainrotAsset,
} from '../types';
import { RANK_ORDER, RANK_XP_THRESHOLDS } from '../types';
import { BRAINROTS } from '../data/brainrots';
import { ROTTER_ACCOUNTS } from '../data/rotterAccounts';
import { WHALES } from '../data/whales';
import { MISSIONS } from '../data/missions';
import { ACHIEVEMENTS } from '../data/achievements';
import { MarketEngine } from '../simulation/MarketEngine';
import { playTradeSound, playCashSound, playNewsSound, playCrashSound, playRallySound, playUpgradeSound, playPrestigeSound } from '../utils/audio';

const BROKERAGE_FEE_RATE = 0.025; // 2.5% fee (increased for challenge)

interface GameStore extends GameState {
  marketEngine: MarketEngine;

  // Actions
  initGame: () => void;
  marketTick: () => void;
  setSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  buyShares: (assetId: string, quantity: number) => boolean;
  sellShares: (assetId: string, quantity: number) => boolean;
  shortSellShares: (assetId: string, quantity: number) => boolean;
  buyToCover: (assetId: string, quantity: number) => boolean;
  resetGame: () => void;
  togglePause: () => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
  prestige: () => void;
  purchasePrestigeUpgrade: (upgradeId: string) => boolean;
  exportSave: () => string;
  importSave: (json: string) => boolean;
  updateSettings: (settings: Partial<GameSettings>) => void;
}

function createInitialState(): Partial<GameState> {
  return {
    cash: 2500,
    holdings: [],
    netWorth: 2500,
    totalInvested: 0,
    unrealizedProfit: 0,
    realizedProfit: 0,
    totalReturn: 0,
    trades: [],
    bestAsset: '',
    worstAsset: '',
    largestHolding: '',

    currentDay: 1,
    currentWeek: 1,
    marketStatus: 'Open' as MarketStatus,
    marketCondition: 'Normal' as MarketCondition,
    globalSentiment: 50,
    ticksUntilClose: 300,
    ticksUntilOpen: 0,
    totalTicks: 0,

    xp: 0,
    level: 1,
    rank: 'Unemployed Scroller',
    rankIndex: 0,

    brainrots: BRAINROTS.map(b => ({
      ...b,
      unlocked: b.rarity === 'Common' || b.rarity === 'Uncommon',
      historicalPrices: [b.startingPrice],
      currentPrice: b.startingPrice,
      allTimeHigh: b.startingPrice,
      allTimeLow: b.startingPrice,
      dayOpenPrice: b.startingPrice,
      dailyChange: 0,
      momentum: 0,
      volume: b.volume,
      supply: 1000000,
      demand: 50000,
      hype: 10,
      popularity: 50,
      publicTrust: 50,
      currentVolatility: b.baseVolatility,
    })),

    news: [],
    rotterAccounts: ROTTER_ACCOUNTS,
    rotterPosts: [],
    whales: WHALES.map(w => ({ ...w })),
    recentWhaleTrades: [],

    missions: MISSIONS.map(m => ({ ...m })),
    achievements: ACHIEVEMENTS.map(a => ({ ...a })),
    upgrades: createInitialUpgrades(),
    prestigeUpgrades: createInitialPrestigeUpgrades(),

    speed: 1,
    paused: false,

    goldenBrainCells: 0,
    prestigeLevel: 0,
    prestigeMultiplier: 1,
    taxesPaid: 0,
    bankruptcyCount: 0,

    settings: {
      reducedMotion: false,
      reducedGlitch: false,
      soundEnabled: false,
      musicEnabled: false,
      darkMode: true,
    },
  };
}

/** Determine if an asset should be unlocked based on net worth */
function shouldUnlockAsset(asset: BrainrotAsset, netWorth: number): boolean {
  if (asset.unlocked) return true;
  switch (asset.rarity) {
    case 'Common':
    case 'Uncommon':
      return true; // Always unlocked from start
    case 'Rare':
      return netWorth >= 200000;
    case 'Epic':
      return netWorth >= 1000000;
    case 'Legendary':
      return netWorth >= 5000000;
    case 'Mythical':
      return netWorth >= 50000000;
    case 'Financially Forbidden':
      return netWorth >= 500000000;
    default:
      return false;
  }
}

/** Update brainrot assets' unlocked status based on net worth, returns updated array or null if no changes */
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

function createInitialUpgrades(): TradingRoomUpgrade[] {
  return [
    {
      id: 'cracked_phone', name: 'Cracked Phone', description: 'Displays basic prices.',
      cost: 0, purchased: true, icon: '📱', category: 'Hardware', effect: 'Basic market data',
    },
    {
      id: 'used_laptop', name: 'Used Laptop', description: 'Unlocks basic charts.',
      cost: 25000, purchased: false, icon: '💻', category: 'Hardware', effect: 'Unlocks chart view',
    },
    {
      id: 'second_monitor', name: 'Second Monitor', description: 'Displays additional market information.',
      cost: 75000, purchased: false, icon: '🖥️', category: 'Hardware', effect: 'Shows more market data',
    },
    {
      id: 'rgb_desk', name: 'RGB Trading Desk', description: 'Increases reputation for no logical reason.',
      cost: 150000, purchased: false, icon: '🌈', category: 'Hardware', effect: '+10% XP gain',
    },
    {
      id: 'news_terminal', name: 'Professional News Terminal', description: 'Reveals important news slightly earlier.',
      cost: 300000, purchased: false, icon: '📰', category: 'Software', effect: 'Early news access',
    },
    {
      id: 'sentiment_scanner', name: 'Sentiment Scanner', description: 'Estimates global market sentiment.',
      cost: 500000, purchased: false, icon: '📊', category: 'Software', effect: 'Shows sentiment data',
    },
    {
      id: 'whale_tracker', name: 'Whale Tracker', description: 'Detects large purchases and sales.',
      cost: 1000000, purchased: false, icon: '🐋', category: 'Data', effect: 'Shows whale activity',
    },
    {
      id: 'ai_predictor', name: 'AI Prediction Machine', description: 'Produces uncertain forecasts.',
      cost: 5000000, purchased: false, icon: '🤖', category: 'Software', effect: 'Shows price predictions',
    },
    {
      id: 'quantum_computer', name: 'Quantum Brainrot Computer', description: 'Unlocks advanced analytics.',
      cost: 50000000, purchased: false, icon: '⚛️', category: 'Mystical', effect: 'Advanced analytics',
    },
    {
      id: 'golden_monitor', name: 'Golden Monitor', description: 'A monitor made of pure gold. Does nothing.',
      cost: 100000000, purchased: false, icon: '✨', category: 'Hardware', effect: 'Flex on the poor',
    },
    {
      id: 'neon_wall', name: 'Neon Wall Display', description: 'Covers your wall in flashing brainrot ads.',
      cost: 200000000, purchased: false, icon: '🪩', category: 'Hardware', effect: 'Intimidates other traders',
    },
    {
      id: 'time_dilator', name: 'Time Dilator', description: 'Quantum device that slows time during crashes.',
      cost: 500000000, purchased: false, icon: '⏳', category: 'Mystical', effect: 'React faster to crashes',
    },
  ];
}

function createInitialPrestigeUpgrades(): PrestigeUpgrade[] {
  return [
    {
      id: 'lower_fees', name: 'Lower Brokerage Fees', description: 'Reduce trading fees by 0.1% per level.',
      cost: 10, effect: 'Fee -0.1%/level', purchased: false, maxLevel: 5, currentLevel: 0,
    },
    {
      id: 'more_starting_cash', name: 'More Starting Cash', description: 'Start with more money each prestige.',
      cost: 15, effect: '+₹5,000 starting cash/level', purchased: false, maxLevel: 10, currentLevel: 0,
    },
    {
      id: 'better_starting_gear', name: 'Better Starting Gear', description: 'Start with an extra upgrade already purchased.',
      cost: 25, effect: 'Extra starting upgrade', purchased: false, maxLevel: 5, currentLevel: 0,
    },
    {
      id: 'early_news', name: 'Earlier News', description: 'News appears more frequently.',
      cost: 20, effect: 'Faster news', purchased: false, maxLevel: 3, currentLevel: 0,
    },
    {
      id: 'xp_boost', name: 'XP Boost', description: 'Gain more XP from all sources.',
      cost: 30, effect: '+20% XP/level', purchased: false, maxLevel: 5, currentLevel: 0,
    },
    {
      id: 'legendary_access', name: 'Legendary Access', description: 'Unlock an exclusive Legendary asset.',
      cost: 50, effect: 'Exclusive Legendary', purchased: false, maxLevel: 1, currentLevel: 0,
    },
    {
      id: 'mythical_access', name: 'Mythical Access', description: 'Unlock an exclusive Mythical asset.',
      cost: 100, effect: 'Exclusive Mythical', purchased: false, maxLevel: 1, currentLevel: 0,
    },
  ];
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState() as GameState,
  marketEngine: new MarketEngine(),

  initGame: () => {
    const saved = loadGame();
    if (saved) {
      set(saved as any);
      // Sync the MarketEngine's entire internal state with loaded data
      const state = get();
      const engine = state.marketEngine;
      engine.brainrots = state.brainrots;
      engine.globalSentiment = state.globalSentiment;
      engine.marketCondition = state.marketCondition;
      engine.rotterPosts = state.rotterPosts;
      // Restore TimeEngine state so the ticker doesn't reset
      engine.timeEngine.setState({
        totalTicks: state.totalTicks,
        currentDay: state.currentDay,
        currentWeek: state.currentWeek,
        ticksUntilClose: state.ticksUntilClose,
        ticksUntilOpen: state.ticksUntilOpen,
        marketStatus: state.marketStatus as 'Open' | 'Closed',
      });
      // Restore whale engine state
      engine.whaleEngine.setWhales(state.whales.map(w => ({ ...w })));
      // Restore news engine
      engine.newsEngine.setNews(state.news);
    }

    // Recalculate unlocked assets based on current net worth (for both fresh and loaded games)
    const currentState = get();
    const updatedBrainrots = computeUnlockedBrainrots(currentState.brainrots, currentState.netWorth);
    if (updatedBrainrots) {
      currentState.marketEngine.brainrots = updatedBrainrots;
      set({ brainrots: updatedBrainrots });
    }
  },

  marketTick: () => {
    const state = get();
    if (state.paused) return;

    const engine = state.marketEngine;
    const result = engine.tick();

    // Audio: news alert
    if (result.newNews && state.settings.soundEnabled) {
      playNewsSound();
    }

    // Audio: market condition changes
    if (result.marketCondition !== state.marketCondition && state.settings.soundEnabled) {
      if (result.marketCondition === 'Flash Crash') playCrashSound();
      else if (result.marketCondition === 'Meme Rally' || result.marketCondition === 'Bull Market' || result.marketCondition === 'Short Squeeze') playRallySound();
    }

    const brainrots = result.brainrots;
    const timeState = engine.timeEngine.getState();

    // Calculate portfolio values (including short positions)
    const holdings = state.holdings;
    let totalInvestmentValue = 0;
    let totalInvested = 0;
    let shortPandL = 0;
    let bestAsset = '';
    let worstAsset = '';
    let bestReturn = -Infinity;
    let worstReturn = Infinity;
    let largestHolding = '';
    let largestValue = 0;

    for (const h of holdings) {
      const asset = brainrots.find(b => b.id === h.assetId);
      if (asset) {
        // Long position
        if (h.quantity > 0) {
          const value = asset.currentPrice * h.quantity;
          const invested = h.averagePurchasePrice * h.quantity;
          totalInvestmentValue += value;
          totalInvested += invested;
          const ret = (value - invested) / invested;
          if (ret > bestReturn) { bestReturn = ret; bestAsset = asset.name; }
          if (ret < worstReturn) { worstReturn = ret; worstAsset = asset.name; }
          if (value > largestValue) { largestValue = value; largestHolding = asset.name; }
        }
        // Short position
        if (h.shortQuantity > 0) {
          const shortValue = (h.averageShortPrice - asset.currentPrice) * h.shortQuantity;
          shortPandL += shortValue;
          if (shortValue > bestReturn) { bestReturn = shortValue; bestAsset = asset.name + ' (Short)'; }
          if (shortValue < worstReturn) { worstReturn = shortValue; worstAsset = asset.name + ' (Short)'; }
          if (Math.abs(shortValue) > largestValue) { largestValue = Math.abs(shortValue); largestHolding = asset.name + ' (Short)'; }
        }
      }
    }

    const netWorth = state.cash + totalInvestmentValue + shortPandL;
    const unrealizedProfit = totalInvestmentValue - totalInvested + shortPandL;
    const totalReturn = state.realizedProfit + unrealizedProfit;

    // ── Daily Holding Cost ──
    // Pay ₹5 per unique asset held (long OR short) per day
    let holdingCosts = 0;
    if (timeState.currentDay !== state.currentDay) {
      const activeAssets = new Set<string>();
      for (const h of holdings) {
        if (h.quantity > 0 || h.shortQuantity > 0) {
          activeAssets.add(h.assetId);
        }
      }
      holdingCosts = activeAssets.size * 5;
    }

    // ── Short Borrow Fee ──
    // Pay 0.05% of short position value per tick
    let shortBorrowFees = 0;
    for (const h of holdings) {
      if (h.shortQuantity > 0) {
        const asset = brainrots.find(b => b.id === h.assetId);
        if (asset) {
          shortBorrowFees += Math.floor(asset.currentPrice * h.shortQuantity * 0.0005);
        }
      }
    }
    shortBorrowFees = Math.min(shortBorrowFees, state.cash * 0.5); // Cap at 50% of cash to prevent instant bankruptcy

    const totalFees = holdingCosts + shortBorrowFees;

    // XP calculation
    let xpGain = 0;
    if (result.newNews) xpGain += 5;
    if (result.whaleTrades.length > 0) xpGain += 2;
    if (result.newRotterPosts.length > 0) xpGain += 1;

    const xpBoost = state.upgrades.find(u => u.id === 'rgb_desk')?.purchased ? 1.1 : 1;
    const prestigeXpBoost = 1 + (state.prestigeUpgrades.find(u => u.id === 'xp_boost')?.currentLevel ?? 0) * 0.2;

    const newXp = state.xp + xpGain * xpBoost * prestigeXpBoost;

    // Calculate level
    let newLevel = state.level;
    let newRankIndex = state.rankIndex;
    const xpForNextLevel = state.level * 150 + 50;
    if (newXp >= xpForNextLevel) {
      newLevel++;
    }

    // Calculate rank
    for (let i = RANK_XP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (newLevel >= RANK_XP_THRESHOLDS[i]) {
        newRankIndex = i;
        break;
      }
    }

    // Check missions (track reward cash separately instead of mutating state.cash)
    let missionRewards = 0;
    const updatedMissions = state.missions.map(m => {
      if (m.completed) return m;
      const completed = m.condition(get());
      if (completed) {
        missionRewards += m.reward;
        return { ...m, completed: true };
      }
      return m;
    });

    // Check achievements
    const updatedAchievements = state.achievements.map(a => {
      if (a.unlocked) return a;
      const unlocked = a.condition(get());
      if (unlocked) {
        return { ...a, unlocked: true, unlockedAt: Date.now() };
      }
      return a;
    });

    // Check for newly unlocked assets based on net worth
    const updatedBrainrotsUnlock = computeUnlockedBrainrots(brainrots, netWorth);
    const finalBrainrots = updatedBrainrotsUnlock ?? brainrots;
    // Keep the engine in sync
    if (updatedBrainrotsUnlock) {
      engine.brainrots = updatedBrainrotsUnlock;
    }

    // Add new news
    const updatedNews = [...state.news];
    if (result.newNews) {
      updatedNews.unshift(result.newNews);
      // Limit to 50 news items
      if (updatedNews.length > 50) updatedNews.length = 50;
    }

    // Add new rotter posts
    const updatedRotterPosts = [...state.rotterPosts, ...result.newRotterPosts];
    if (updatedRotterPosts.length > 200) {
      updatedRotterPosts.splice(0, updatedRotterPosts.length - 200);
    }

    // Track recent whale trades
    const newWhaleTrades: WhaleTradeLog[] = result.whaleTrades.map(t => ({
      whaleName: t.whaleName,
      whaleId: t.whaleId,
      assetId: t.assetId,
      ticker: t.ticker,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      totalValue: t.totalValue,
      timestamp: timeState.totalTicks,
    }));
    const updatedWhaleTrades = [...newWhaleTrades, ...state.recentWhaleTrades].slice(0, 50);

    const cashAfterFees = Math.max(0, state.cash + missionRewards - totalFees);

    // ── Bankruptcy Check ──
    // If net worth <= 0 and we have holdings, force liquidate everything
    // Use the fee-adjusted net worth for the bankruptcy check
    const netWorthAfterFees = cashAfterFees + totalInvestmentValue + shortPandL;
    let forceLiquidated = false;
    let resultHoldings = state.holdings;
    let resultCash = cashAfterFees;
    let resultBankruptcyCount = state.bankruptcyCount;
    let resultRealizedProfit = state.realizedProfit;

    if (netWorthAfterFees <= 0 && holdings.some(h => h.quantity > 0 || h.shortQuantity > 0)) {
      // Force liquidate all positions at current market prices
      forceLiquidated = true;
      let liquidationValue = 0;
      for (const h of holdings) {
        const asset = brainrots.find(b => b.id === h.assetId);
        if (asset) {
          if (h.quantity > 0) {
            const saleValue = asset.currentPrice * h.quantity;
            const fee = saleValue * BROKERAGE_FEE_RATE;
            const netSale = saleValue - fee;
            resultRealizedProfit += netSale - (h.averagePurchasePrice * h.quantity);
            liquidationValue += netSale;
          }
          if (h.shortQuantity > 0) {
            // Force cover shorts at current price (loss if price went up)
            const buybackCost = asset.currentPrice * h.shortQuantity;
            const fee = buybackCost * BROKERAGE_FEE_RATE;
            const totalCost = buybackCost + fee;
            const shortPnl = (h.averageShortPrice * h.shortQuantity) - buybackCost - fee;
            resultRealizedProfit += shortPnl;
            liquidationValue -= totalCost;
          }
        }
      }
      resultCash = Math.max(0, resultCash + liquidationValue);
      resultHoldings = [];
      resultBankruptcyCount++;
    }

    set({
      cash: resultCash,
      holdings: resultHoldings,
      realizedProfit: resultRealizedProfit,
      taxesPaid: state.taxesPaid,
      bankruptcyCount: resultBankruptcyCount,
      brainrots: [...finalBrainrots],
      news: updatedNews,
      rotterPosts: updatedRotterPosts,
      totalTicks: timeState.totalTicks,
      currentDay: timeState.currentDay,
      currentWeek: timeState.currentWeek,
      marketStatus: timeState.marketStatus,
      marketCondition: result.marketCondition,
      globalSentiment: result.globalSentiment,
      ticksUntilClose: timeState.ticksUntilClose,
      ticksUntilOpen: timeState.ticksUntilOpen,
      netWorth: netWorthAfterFees < 0 ? 0 : netWorthAfterFees,
      totalInvested,
      unrealizedProfit,
      totalReturn,
      bestAsset,
      worstAsset,
      largestHolding,
      xp: newXp,
      level: newLevel,
      rank: RANK_ORDER[newRankIndex] || 'Unemployed Scroller',
      rankIndex: newRankIndex,
      missions: updatedMissions,
      achievements: updatedAchievements,
      whales: engine.whaleEngine.getWhales(),
      recentWhaleTrades: updatedWhaleTrades,
    });

    // Auto-save after tick
    if (totalFees > 0 || forceLiquidated) {
      saveGame(get());
    }
  },

  setSpeed: (speed) => set({ speed }),
  setPaused: (paused) => set({ paused }),

  togglePause: () => set(s => ({ paused: !s.paused })),

  buyShares: (assetId, quantity) => {
    const state = get();
    if (state.marketStatus !== 'Open') return false;
    if (quantity <= 0 || !Number.isFinite(quantity)) return false;

    const asset = state.brainrots.find(b => b.id === assetId);
    if (!asset) return false;

    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const price = asset.currentPrice;
    const totalCost = price * quantity;
    const fee = totalCost * feeRate;
    const totalWithFee = totalCost + fee;

    if (totalWithFee > state.cash) return false;

    // Execute trade
    const existingHolding = state.holdings.find(h => h.assetId === assetId);
    const newQuantity = (existingHolding?.quantity ?? 0) + quantity;
    const newAvgPrice = existingHolding
      ? (existingHolding.averagePurchasePrice * existingHolding.quantity + price * quantity) / newQuantity
      : price;

    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    newHoldings.push({
      assetId,
      quantity: newQuantity,
      averagePurchasePrice: newAvgPrice,
      shortQuantity: existingHolding?.shortQuantity ?? 0,
      averageShortPrice: existingHolding?.averageShortPrice ?? 0,
    });

    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Buy',
      quantity,
      price,
      brokerageFee: fee,
      totalValue: totalWithFee,
      profitLoss: 0,
      date: state.totalTicks,
      day: state.currentDay,
    };

    state.marketEngine.recordPlayerBuy(assetId, quantity);

    set({
      cash: state.cash - totalWithFee,
      holdings: newHoldings,
      trades: [trade, ...state.trades].slice(0, 500),
    });

    if (state.settings.soundEnabled) playTradeSound('Buy');
    saveGame(get());
    return true;
  },

  sellShares: (assetId, quantity) => {
    const state = get();
    if (state.marketStatus !== 'Open') return false;
    if (quantity <= 0 || !Number.isFinite(quantity)) return false;

    const asset = state.brainrots.find(b => b.id === assetId);
    if (!asset) return false;

    const holding = state.holdings.find(h => h.assetId === assetId);
    if (!holding || holding.quantity < quantity) return false;

    const price = asset.currentPrice;
    const totalValue = price * quantity;
    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const fee = totalValue * feeRate;
    const netValue = totalValue - fee;

    const costBasis = holding.averagePurchasePrice * quantity;
    let profitLoss = netValue - costBasis;

    // Capital gains tax: 15% of profit when selling at a gain
    let capitalGainsTax = 0;
    if (profitLoss > 0) {
      capitalGainsTax = Math.floor(profitLoss * 0.15);
      profitLoss -= capitalGainsTax;
    }

    const newQuantity = holding.quantity - quantity;
    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    if (newQuantity > 0) {
      newHoldings.push({
        ...holding,
        quantity: newQuantity,
        shortQuantity: holding.shortQuantity ?? 0,
        averageShortPrice: holding.averageShortPrice ?? 0,
      });
    }

    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Sell',
      quantity,
      price,
      brokerageFee: fee,
      totalValue: netValue,
      profitLoss,
      date: state.totalTicks,
      day: state.currentDay,
    };

    state.marketEngine.recordPlayerSell(assetId, quantity);

    const newRealizedProfit = state.realizedProfit + profitLoss;

    // XP for profitable trades (reduced)
    let xpGain = 0;
    if (profitLoss > 0) {
      xpGain = Math.min(50, Math.floor(profitLoss / 200));
      if (state.settings.soundEnabled) playCashSound();
    }

    set({
      cash: state.cash + netValue - capitalGainsTax,
      holdings: newHoldings,
      realizedProfit: newRealizedProfit - capitalGainsTax,
      taxesPaid: state.taxesPaid + capitalGainsTax,
      trades: [trade, ...state.trades].slice(0, 500),
      xp: state.xp + xpGain,
    });

    if (state.settings.soundEnabled) playTradeSound('Sell');
    saveGame(get());
    return true;
  },

  shortSellShares: (assetId, quantity) => {
    const state = get();
    if (state.marketStatus !== 'Open') return false;
    if (quantity <= 0 || !Number.isFinite(quantity)) return false;

    const asset = state.brainrots.find(b => b.id === assetId);
    if (!asset) return false;

    const price = asset.currentPrice;
    const totalValue = price * quantity;
    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const fee = totalValue * feeRate;
    const netValue = totalValue - fee;

    // Margin requirement: need 100% of sale value in cash (higher risk)
    const marginRequired = totalValue;
    if (state.cash < marginRequired) return false;

    // Track short position
    const existingHolding = state.holdings.find(h => h.assetId === assetId);
    const newShortQty = (existingHolding?.shortQuantity ?? 0) + quantity;
    const newAvgShortPrice = existingHolding?.shortQuantity && existingHolding.shortQuantity > 0
      ? (existingHolding.averageShortPrice * existingHolding.shortQuantity + price * quantity) / newShortQty
      : price;

    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    newHoldings.push({
      assetId,
      quantity: existingHolding?.quantity ?? 0,
      averagePurchasePrice: existingHolding?.averagePurchasePrice ?? 0,
      shortQuantity: newShortQty,
      averageShortPrice: newAvgShortPrice,
    });

    // Short P&L is negative when price goes up (we owe more)
    // At open, P&L is 0
    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Short',
      quantity,
      price,
      brokerageFee: fee,
      totalValue: netValue,
      profitLoss: 0,
      date: state.totalTicks,
      day: state.currentDay,
    };

    state.marketEngine.recordPlayerSell(assetId, quantity);

    set({
      cash: state.cash + netValue,
      holdings: newHoldings,
      trades: [trade, ...state.trades].slice(0, 500),
    });

    if (state.settings.soundEnabled) playTradeSound('Sell');
    saveGame(get());
    return true;
  },

  buyToCover: (assetId, quantity) => {
    const state = get();
    if (state.marketStatus !== 'Open') return false;
    if (quantity <= 0 || !Number.isFinite(quantity)) return false;

    const asset = state.brainrots.find(b => b.id === assetId);
    if (!asset) return false;

    const holding = state.holdings.find(h => h.assetId === assetId);
    if (!holding || !holding.shortQuantity || holding.shortQuantity < quantity) return false;

    const price = asset.currentPrice;
    const totalCost = price * quantity;
    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const fee = totalCost * feeRate;
    const totalWithFee = totalCost + fee;

    if (totalWithFee > state.cash) return false;

    // P&L for covering: shortAvgPrice - coverPrice (positive when price dropped)
    const proceedsAtOpen = holding.averageShortPrice * quantity;
    const costToClose = totalCost;
    const profitLoss = proceedsAtOpen - costToClose - fee; // Fee eats into profit

    const newShortQty = holding.shortQuantity - quantity;
    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    if (newShortQty > 0 || (holding.quantity ?? 0) > 0) {
      newHoldings.push({
        assetId,
        quantity: holding.quantity ?? 0,
        averagePurchasePrice: holding.averagePurchasePrice ?? 0,
        shortQuantity: newShortQty,
        averageShortPrice: holding.averageShortPrice,
      });
    }

    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Cover',
      quantity,
      price,
      brokerageFee: fee,
      totalValue: totalWithFee,
      profitLoss,
      date: state.totalTicks,
      day: state.currentDay,
    };

    state.marketEngine.recordPlayerBuy(assetId, quantity);

    const newRealizedProfit = state.realizedProfit + profitLoss;

    let xpGain = 0;
    if (profitLoss > 0) {
      xpGain = Math.min(50, Math.floor(profitLoss / 200));
      if (state.settings.soundEnabled) playCashSound();
    }

    set({
      cash: state.cash - totalWithFee,
      holdings: newHoldings,
      realizedProfit: newRealizedProfit,
      trades: [trade, ...state.trades].slice(0, 500),
      xp: state.xp + xpGain,
    });

    if (state.settings.soundEnabled) playTradeSound('Buy');
    saveGame(get());
    return true;
  },

  resetGame: () => {
    const initialState = createInitialState();
    const newEngine = new MarketEngine();
    set({
      ...initialState,
      marketEngine: newEngine,
    } as GameState);
    localStorage.removeItem('brainrot_exchange_save');
  },

  purchaseUpgrade: (upgradeId) => {
    const state = get();
    const upgrade = state.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.purchased) return false;
    if (state.cash < upgrade.cost) return false;

    const newUpgrades = state.upgrades.map(u =>
      u.id === upgradeId ? { ...u, purchased: true } : u
    );

    set({
      cash: state.cash - upgrade.cost,
      upgrades: newUpgrades,
    });

    if (state.settings.soundEnabled) playUpgradeSound();
    saveGame(get());
    return true;
  },

  prestige: () => {
    const state = get();
    if (state.netWorth < 10000000000) return; // Need ₹10 billion (harder)

    // Calculate Golden Brain Cells (more gradual)
    const cellsEarned = Math.max(1, Math.floor(Math.log10(state.netWorth / 50000000) * 5) + 1);

    set({
      cash: 2500 + (state.prestigeUpgrades.find(u => u.id === 'more_starting_cash')?.currentLevel ?? 0) * 2500,
      holdings: [],
      netWorth: 10000,
      totalInvested: 0,
      unrealizedProfit: 0,
      realizedProfit: 0,
      totalReturn: 0,
      trades: [],
      bestAsset: '',
      worstAsset: '',
      largestHolding: '',
      currentDay: 1,
      currentWeek: 1,
      totalTicks: 0,
      xp: 0,
      level: 1,
      rankIndex: 0,
      rank: 'Unemployed Scroller' as const,
      brainrots: BRAINROTS.map(b => ({
        ...b,
        historicalPrices: [b.startingPrice],
        currentPrice: b.startingPrice,
        allTimeHigh: b.startingPrice,
        allTimeLow: b.startingPrice,
        dayOpenPrice: b.startingPrice,
        dailyChange: 0,
        momentum: 0,
        volume: b.volume,
        supply: 1000000,
        demand: 50000,
        hype: 10,
        popularity: 50,
        publicTrust: 50,
        currentVolatility: b.baseVolatility,
      })),
      news: [],
      rotterPosts: [],
      marketEngine: new MarketEngine(),
      goldenBrainCells: state.goldenBrainCells + cellsEarned,
      prestigeLevel: state.prestigeLevel + 1,
      prestigeMultiplier: 1 + state.prestigeLevel * 0.5,
    });

    if (get().settings.soundEnabled) playPrestigeSound();
    saveGame(get());
  },

  purchasePrestigeUpgrade: (upgradeId) => {
    const state = get();
    const upgrade = state.prestigeUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    if (upgrade.currentLevel >= upgrade.maxLevel) return false;
    const cost = upgrade.cost * (upgrade.currentLevel + 1);
    if (state.goldenBrainCells < cost) return false;

    const newUpgrades = state.prestigeUpgrades.map(u =>
      u.id === upgradeId ? { ...u, currentLevel: u.currentLevel + 1 } : u
    );

    set({
      goldenBrainCells: state.goldenBrainCells - cost,
      prestigeUpgrades: newUpgrades,
    });

    saveGame(get());
    return true;
  },

  exportSave: () => {
    const state = get();
    return JSON.stringify(buildSaveData(state));
  },

  importSave: (json) => {
    try {
      const data = JSON.parse(json);
      if (!data.version) return false;
      get().resetGame();
      // Apply save data
      set({
        cash: data.cash ?? 10000,
        holdings: data.holdings
          ? data.holdings.map((h: any) => ({
              ...h,
              shortQuantity: h.shortQuantity ?? 0,
              averageShortPrice: h.averageShortPrice ?? 0,
            }))
          : [],
        realizedProfit: data.realizedProfit ?? 0,
        trades: data.trades ?? [],
        currentDay: data.currentDay ?? 1,
        totalTicks: data.totalTicks ?? 0,
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        rankIndex: data.rankIndex ?? 0,
        rank: RANK_ORDER[data.rankIndex] || 'Unemployed Scroller',
      brainrots: data.brainrots
        ? data.brainrots.map((b: any) => ({
            ...b,
            candles: b.candles ?? [],
            phase: b.phase ?? 'accumulation',
            phaseTicksRemaining: b.phaseTicksRemaining ?? 60,
            trendStrength: b.trendStrength ?? 0,
            dayOpenPrice: b.dayOpenPrice ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleOpen: b.candleOpen ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleHigh: b.candleHigh ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleLow: b.candleLow ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleTicks: b.candleTicks ?? 0,
          }))
        : BRAINROTS,
      news: data.news ?? [],
      rotterPosts: data.rotterPosts ?? [],
      whales: data.whales ?? WHALES,
        recentWhaleTrades: data.recentWhaleTrades ?? [],
        missions: data.missions
          ? data.missions.map((m: any) => {
              const template = MISSIONS.find(t => t.id === m.id);
              return template ? { ...template, ...m } : { ...m, condition: () => false };
            })
          : MISSIONS,
        achievements: data.achievements
          ? data.achievements.map((a: any) => {
              const template = ACHIEVEMENTS.find(t => t.id === a.id);
              return template ? { ...template, ...a } : { ...a, condition: () => false };
            })
          : ACHIEVEMENTS,
        upgrades: data.upgrades ?? createInitialUpgrades(),
        prestigeUpgrades: data.prestigeUpgrades ?? createInitialPrestigeUpgrades(),
        goldenBrainCells: data.goldenBrainCells ?? 0,
        prestigeLevel: data.prestigeLevel ?? 0,
        prestigeMultiplier: data.prestigeMultiplier ?? 1,
        taxesPaid: data.taxesPaid ?? 0,
        bankruptcyCount: data.bankruptcyCount ?? 0,
        settings: data.settings ? { reducedMotion: false, reducedGlitch: false, soundEnabled: false, musicEnabled: false, darkMode: true, ...data.settings } : { reducedMotion: false, reducedGlitch: false, soundEnabled: false, musicEnabled: false, darkMode: true },
      });
      return true;
    } catch {
      return false;
    }
  },

  updateSettings: (settings) => {
    set(s => ({ settings: { ...s.settings, ...settings } }));
    saveGame(get());
  },
}));

function buildSaveData(state: GameStore) {
  return {
    version: 1,
    timestamp: Date.now(),
    cash: state.cash,
    holdings: state.holdings,
    realizedProfit: state.realizedProfit,
    trades: state.trades.slice(0, 100),
    currentDay: state.currentDay,
    totalTicks: state.totalTicks,
    xp: state.xp,
    level: state.level,
    rankIndex: state.rankIndex,
    brainrots: state.brainrots,
    news: state.news.slice(0, 20),
    rotterPosts: state.rotterPosts.slice(-50),
    whales: state.whales,
    recentWhaleTrades: state.recentWhaleTrades.slice(0, 30),
    missions: state.missions,
    achievements: state.achievements,
    upgrades: state.upgrades,
    prestigeUpgrades: state.prestigeUpgrades,
    goldenBrainCells: state.goldenBrainCells,
    prestigeLevel: state.prestigeLevel,
    prestigeMultiplier: state.prestigeMultiplier,
    taxesPaid: state.taxesPaid,
    bankruptcyCount: state.bankruptcyCount,
    settings: state.settings,
    speed: state.speed,
    marketCondition: state.marketCondition,
    globalSentiment: state.globalSentiment,
    marketStatus: state.marketStatus,
  };
}

function saveGame(state: GameStore): void {
  try {
    const data = buildSaveData(state);
    localStorage.setItem('brainrot_exchange_save', JSON.stringify(data));
  } catch {
    // Silently fail (e.g. storage quota exceeded)
  }
}

function loadGame(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem('brainrot_exchange_save');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.version) return null;

    return {
      cash: data.cash ?? 10000,
      holdings: data.holdings
        ? data.holdings.map((h: any) => ({
            ...h,
            shortQuantity: h.shortQuantity ?? 0,
            averageShortPrice: h.averageShortPrice ?? 0,
          }))
        : [],
      realizedProfit: data.realizedProfit ?? 0,
      trades: data.trades ?? [],
      currentDay: data.currentDay ?? 1,
      totalTicks: data.totalTicks ?? 0,
      xp: data.xp ?? 0,
      level: data.level ?? 1,
      rankIndex: data.rankIndex ?? 0,
      rank: RANK_ORDER[data.rankIndex] || 'Unemployed Scroller',
      brainrots: data.brainrots
        ? data.brainrots.map((b: any) => ({
            ...b,
            candles: b.candles ?? [],
            phase: b.phase ?? 'accumulation',
            phaseTicksRemaining: b.phaseTicksRemaining ?? 60,
            trendStrength: b.trendStrength ?? 0,
            dayOpenPrice: b.dayOpenPrice ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleOpen: b.candleOpen ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleHigh: b.candleHigh ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleLow: b.candleLow ?? b.currentPrice ?? b.startingPrice ?? 0,
            candleTicks: b.candleTicks ?? 0,
          }))
        : BRAINROTS,
      news: data.news ?? [],
      rotterPosts: data.rotterPosts ?? [],
      whales: data.whales ?? WHALES,
      recentWhaleTrades: data.recentWhaleTrades ?? [],
      missions: data.missions
        ? data.missions.map((m: any) => {
            const template = MISSIONS.find(t => t.id === m.id);
            return template ? { ...template, ...m } : { ...m, condition: () => false };
          })
        : MISSIONS.map(m => ({ ...m })),
      achievements: data.achievements
        ? data.achievements.map((a: any) => {
            const template = ACHIEVEMENTS.find(t => t.id === a.id);
            return template ? { ...template, ...a } : { ...a, condition: () => false };
          })
        : ACHIEVEMENTS.map(a => ({ ...a })),
      upgrades: data.upgrades ?? createInitialUpgrades(),
      prestigeUpgrades: data.prestigeUpgrades ?? createInitialPrestigeUpgrades(),
      goldenBrainCells: data.goldenBrainCells ?? 0,
      prestigeLevel: data.prestigeLevel ?? 0,
      prestigeMultiplier: data.prestigeMultiplier ?? 1,
      taxesPaid: data.taxesPaid ?? 0,
      bankruptcyCount: data.bankruptcyCount ?? 0,
      settings: data.settings ? { reducedMotion: false, reducedGlitch: false, soundEnabled: false, musicEnabled: false, darkMode: true, ...data.settings } : { reducedMotion: false, reducedGlitch: false, soundEnabled: false, musicEnabled: false, darkMode: true },
      marketCondition: data.marketCondition ?? 'Normal',
      globalSentiment: data.globalSentiment ?? 50,
      marketStatus: data.marketStatus ?? 'Open',
    };
  } catch {
    return null;
  }
}
