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
import {
  calculatePortfolioValues,
  calculateFees,
  calculateXPAndRank,
  checkMissions,
  checkAchievements,
  executeMarginCalls,
  checkBankruptcy,
  calculateFinalMetrics,
  BROKERAGE_FEE_RATE,
  WEALTH_FEE_RATE,
} from './marketTickHelpers';

// ── Difficulty Constants ──
const SHORT_TERM_TAX_RATE = 0.30;   // < 10 ticks held
const MID_TERM_TAX_RATE = 0.20;     // 10-30 ticks held
const LONG_TERM_TAX_RATE = 0.10;    // > 30 ticks held
const SHORT_TERM_THRESHOLD = 10;    // ticks for short-term classification
const MID_TERM_THRESHOLD = 30;      // ticks for mid-term classification
const SLIPPAGE_BASE = 0.002;        // 0.2% base slippage per 1% of volume
const MAX_POSITION_RATIO = 0.25;    // Max 25% of net worth in one asset
const RUG_PULL_BASE_CHANCE = 0.0002; // Base chance per tick of rug pull
const INSIDER_SCANDAL_CHANCE = 0.0003; // Chance of insider scandal event

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

    // Update whale awareness of player positions for counter-trading
    engine.updatePlayerPositions(state.holdings, state.brainrots, state.netWorth);

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
    const holdings = state.holdings;

    // ── Portfolio Value Calculation ──
    const portfolio = calculatePortfolioValues(state.cash, holdings, brainrots);
    const { totalInvestmentValue, totalInvested, shortPandL, bestAsset, worstAsset, largestHolding, netWorth } = portfolio;

    // ── Fee Calculation ──
    const { holdingCosts, shortBorrowFees, totalFees } = calculateFees(holdings, brainrots, state.cash, timeState.currentDay, state.currentDay);

    // ── XP & Rank Calculation ──
    const xpBoost = state.upgrades.find(u => u.id === 'rgb_desk')?.purchased ? 1.1 : 1;
    const prestigeXpBoost = 1 + (state.prestigeUpgrades.find(u => u.id === 'xp_boost')?.currentLevel ?? 0) * 0.2;
    const { newXp, newLevel, newRankIndex } = calculateXPAndRank(
      state.xp, state.level, state.rankIndex,
      !!result.newNews, result.whaleTrades.length, result.newRotterPosts.length,
      xpBoost, prestigeXpBoost,
    );

    // ── Mission Checking ──
    const { missionRewards, updatedMissions } = checkMissions(state.missions, get);

    // ── Achievement Checking ──
    const updatedAchievements = checkAchievements(state.achievements, get);

    // ── Asset Unlock Check ──
    const updatedBrainrotsUnlock = computeUnlockedBrainrots(brainrots, netWorth);
    const finalBrainrots = updatedBrainrotsUnlock ?? brainrots;
    if (updatedBrainrotsUnlock) {
      engine.brainrots = updatedBrainrotsUnlock;
    }

    // ── News Update ──
    const updatedNews = [...state.news];
    if (result.newNews) {
      updatedNews.unshift(result.newNews);
      if (updatedNews.length > 50) updatedNews.length = 50;
    }

    // ── Rotter Posts Update ──
    const updatedRotterPosts = [...state.rotterPosts, ...result.newRotterPosts];
    if (updatedRotterPosts.length > 200) {
      updatedRotterPosts.splice(0, updatedRotterPosts.length - 200);
    }

    // ── Whale Trade Tracking ──
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

    // ── Cash After Fees ──
    let resultCash = Math.max(0, state.cash + missionRewards - totalFees);
    let resultBankruptcyCount = state.bankruptcyCount;
    let resultRealizedProfit = state.realizedProfit;
    let resultHoldings = [...holdings];

    // ── Black Swan Events ──
    const marketIsOpen = timeState.marketStatus === 'Open';
    if (marketIsOpen && Math.random() < RUG_PULL_BASE_CHANCE) {
      const rugPullCandidates = brainrots.filter(b => b.unlocked && b.rarity !== 'Legendary' && b.rarity !== 'Mythical');
      if (rugPullCandidates.length > 0) {
        const rugTarget = rugPullCandidates[Math.floor(Math.random() * rugPullCandidates.length)];
        const rugDrop = 0.6 + Math.random() * 0.3;
        rugTarget.currentPrice *= (1 - rugDrop);
      }
    }
    if (marketIsOpen && Math.random() < INSIDER_SCANDAL_CHANCE) {
      const scandalCategories = ['Beverage Beasts', 'Electronic Animals', 'Corporate Creatures', 'Government Birds', 'Radioactive Rodents', 'Internet Predators', 'Financial Primates', 'Household Horrors', 'Quantum Creatures', 'Space Organisms'];
      const scandalCategory = scandalCategories[Math.floor(Math.random() * scandalCategories.length)];
      const scandalDrop = 0.2 + Math.random() * 0.2;
      brainrots.filter(b => b.category === scandalCategory).forEach(b => {
        b.currentPrice *= (1 - scandalDrop);
      });
    }

    // ── Post-Swan Portfolio Recalculation ──
    let postSwanInvestmentValue = 0;
    let postSwanShortPandL = 0;
    for (const h of holdings) {
      const asset = brainrots.find(b => b.id === h.assetId);
      if (asset) {
        if (h.quantity > 0) postSwanInvestmentValue += asset.currentPrice * h.quantity;
        if (h.shortQuantity > 0) postSwanShortPandL += (h.averageShortPrice - asset.currentPrice) * h.shortQuantity;
      }
    }

    // ── Margin Calls ──
    const marginResult = executeMarginCalls(resultHoldings, brainrots, resultCash, resultRealizedProfit);
    resultCash = marginResult.resultCash;
    resultHoldings = marginResult.resultHoldings;
    resultRealizedProfit = marginResult.resultRealizedProfit;

    // ── Wealth Fee ──
    let wealthFee = 0;
    const netWorthPreFee = resultCash + postSwanInvestmentValue + postSwanShortPandL;
    if (timeState.currentDay !== state.currentDay) {
      wealthFee = Math.floor(Math.max(0, netWorthPreFee) * WEALTH_FEE_RATE);
      resultCash -= wealthFee;
    }

    // ── Bankruptcy Check ──
    const bankruptcyResult = checkBankruptcy(
      resultHoldings, brainrots, resultCash, resultRealizedProfit, resultBankruptcyCount,
      postSwanInvestmentValue, postSwanShortPandL,
    );
    resultCash = bankruptcyResult.resultCash;
    resultHoldings = bankruptcyResult.resultHoldings;
    resultRealizedProfit = bankruptcyResult.resultRealizedProfit;
    resultBankruptcyCount = bankruptcyResult.resultBankruptcyCount;
    const forceLiquidated = bankruptcyResult.forceLiquidated;

    // ── Final Metrics ──
    const { finalNetWorth, finalUnrealized } = calculateFinalMetrics(resultHoldings, brainrots, resultCash, totalInvested);

    // ── State Update ──
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
      netWorth: finalNetWorth,
      totalInvested,
      unrealizedProfit: finalUnrealized,
      totalReturn: resultRealizedProfit + finalUnrealized,
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

    // ── Position concentration limit ──
    const existingHolding = state.holdings.find(h => h.assetId === assetId);
    const currentValue = (existingHolding?.quantity ?? 0) * asset.currentPrice;
    const newValue = currentValue + (asset.currentPrice * quantity);
    const currentInvestedValue = state.holdings.reduce((sum, h) => {
      const a = state.brainrots.find(b => b.id === h.assetId);
      return sum + (a ? h.quantity * a.currentPrice : 0);
    }, 0);
    const maxAllowed = Math.max(state.netWorth, state.cash) * MAX_POSITION_RATIO;
    if (newValue > maxAllowed && currentInvestedValue > 0) {
      // Allow if this is a small position (< 5% of net worth)
      if (currentValue > state.netWorth * 0.05) return false;
    }

    // ── Slippage calculation ──
    const orderValue = asset.currentPrice * quantity;
    const volumeImpact = asset.volume > 0 ? (orderValue / (asset.volume * asset.currentPrice)) : 0;
    const slippageMultiplier = Math.min(2, 1 + (volumeImpact * SLIPPAGE_BASE * 100));
    const effectivePrice = asset.currentPrice * slippageMultiplier;

    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const totalCost = effectivePrice * quantity;
    const fee = totalCost * feeRate;
    const totalWithFee = totalCost + fee;

    if (totalWithFee > state.cash) return false;

    // Execute trade
    const newQuantity = (existingHolding?.quantity ?? 0) + quantity;
    const newAvgPrice = existingHolding
      ? (existingHolding.averagePurchasePrice * existingHolding.quantity + effectivePrice * quantity) / newQuantity
      : effectivePrice;

    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    newHoldings.push({
      assetId,
      quantity: newQuantity,
      averagePurchasePrice: newAvgPrice,
      shortQuantity: existingHolding?.shortQuantity ?? 0,
      averageShortPrice: existingHolding?.averageShortPrice ?? 0,
      longEntryTick: existingHolding?.longEntryTick ?? state.totalTicks,
      shortEntryTick: existingHolding?.shortEntryTick ?? 0,
    });

    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Buy',
      quantity,
      price: effectivePrice,
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

    // ── Slippage on large sells ──
    const orderValue = asset.currentPrice * quantity;
    const volumeImpact = asset.volume > 0 ? (orderValue / (asset.volume * asset.currentPrice)) : 0;
    const slippageMultiplier = 1 - (volumeImpact * SLIPPAGE_BASE * 100);
    const effectivePrice = Math.max(asset.currentPrice * 0.5, asset.currentPrice * slippageMultiplier);

    const totalValue = effectivePrice * quantity;
    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const fee = totalValue * feeRate;
    const netValue = totalValue - fee;

    const costBasis = holding.averagePurchasePrice * quantity;
    let profitLoss = netValue - costBasis;

    // ── Graduated capital gains tax based on holding period ──
    const holdingTicks = state.totalTicks - holding.longEntryTick;
    let taxRate = LONG_TERM_TAX_RATE;
    if (holdingTicks < SHORT_TERM_THRESHOLD) {
      taxRate = SHORT_TERM_TAX_RATE; // 30% short-term
    } else if (holdingTicks < MID_TERM_THRESHOLD) {
      taxRate = MID_TERM_TAX_RATE;   // 20% mid-term
    }

    let capitalGainsTax = 0;
    if (profitLoss > 0) {
      capitalGainsTax = Math.floor(profitLoss * taxRate);
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
      price: effectivePrice,
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

    // ── Slippage on large short orders ──
    const orderValue = asset.currentPrice * quantity;
    const volumeImpact = asset.volume > 0 ? (orderValue / (asset.volume * asset.currentPrice)) : 0;
    const slippageMultiplier = 1 + (volumeImpact * SLIPPAGE_BASE * 100);
    const effectivePrice = asset.currentPrice * slippageMultiplier;

    const totalValue = effectivePrice * quantity;
    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const fee = totalValue * feeRate;
    const netValue = totalValue - fee;

    // Margin requirement: need 150% of sale value in cash (higher risk)
    const marginRequired = totalValue * 1.5;
    if (state.cash < marginRequired) return false;

    // Track short position
    const existingHolding = state.holdings.find(h => h.assetId === assetId);
    const newShortQty = (existingHolding?.shortQuantity ?? 0) + quantity;
    const newAvgShortPrice = existingHolding?.shortQuantity && existingHolding.shortQuantity > 0
      ? (existingHolding.averageShortPrice * existingHolding.shortQuantity + effectivePrice * quantity) / newShortQty
      : effectivePrice;

    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    newHoldings.push({
      assetId,
      quantity: existingHolding?.quantity ?? 0,
      averagePurchasePrice: existingHolding?.averagePurchasePrice ?? 0,
      shortQuantity: newShortQty,
      averageShortPrice: newAvgShortPrice,
      longEntryTick: existingHolding?.longEntryTick ?? 0,
      shortEntryTick: existingHolding?.shortEntryTick ?? state.totalTicks,
    });

    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Short',
      quantity,
      price: effectivePrice,
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

    // ── Slippage on large cover orders ──
    const orderValue = asset.currentPrice * quantity;
    const volumeImpact = asset.volume > 0 ? (orderValue / (asset.volume * asset.currentPrice)) : 0;
    const slippageMultiplier = 1 + (volumeImpact * SLIPPAGE_BASE * 100);
    const effectivePrice = asset.currentPrice * slippageMultiplier;

    const totalCost = effectivePrice * quantity;
    const feeRate = BROKERAGE_FEE_RATE - (state.prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
    const fee = totalCost * feeRate;
    const totalWithFee = totalCost + fee;

    if (totalWithFee > state.cash) return false;

    // P&L for covering: shortAvgPrice - coverPrice (positive when price dropped)
    const proceedsAtOpen = holding.averageShortPrice * quantity;
    const costToClose = totalCost;
    let profitLoss = proceedsAtOpen - costToClose - fee;

    // ── Graduated tax on short profits ──
    const shortHoldingTicks = state.totalTicks - holding.shortEntryTick;
    let shortTaxRate = LONG_TERM_TAX_RATE;
    if (shortHoldingTicks < SHORT_TERM_THRESHOLD) {
      shortTaxRate = SHORT_TERM_TAX_RATE;
    } else if (shortHoldingTicks < MID_TERM_THRESHOLD) {
      shortTaxRate = MID_TERM_TAX_RATE;
    }

    let shortCapitalGainsTax = 0;
    if (profitLoss > 0) {
      shortCapitalGainsTax = Math.floor(profitLoss * shortTaxRate);
      profitLoss -= shortCapitalGainsTax;
    }

    const newShortQty = holding.shortQuantity - quantity;
    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    if (newShortQty > 0 || (holding.quantity ?? 0) > 0) {
      newHoldings.push({
        assetId,
        quantity: holding.quantity ?? 0,
        averagePurchasePrice: holding.averagePurchasePrice ?? 0,
        shortQuantity: newShortQty,
        averageShortPrice: holding.averageShortPrice,
        longEntryTick: holding.longEntryTick ?? 0,
        shortEntryTick: holding.shortEntryTick ?? 0,
      });
    }

    const trade: PlayerTrade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      ticker: asset.ticker,
      type: 'Cover',
      quantity,
      price: effectivePrice,
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
      cash: state.cash - totalWithFee - shortCapitalGainsTax,
      holdings: newHoldings,
      realizedProfit: newRealizedProfit - shortCapitalGainsTax,
      taxesPaid: state.taxesPaid + shortCapitalGainsTax,
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
              longEntryTick: h.longEntryTick ?? 0,
              shortEntryTick: h.shortEntryTick ?? 0,
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
            longEntryTick: h.longEntryTick ?? 0,
            shortEntryTick: h.shortEntryTick ?? 0,
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
