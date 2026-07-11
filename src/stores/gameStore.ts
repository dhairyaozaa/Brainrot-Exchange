import { create } from 'zustand';
import type {
  GameState, PlayerTrade, WhaleTradeLog,
  TradingRoomUpgrade, PrestigeUpgrade, GameSettings,
  MarketCondition, MarketStatus,
} from '../types';
import { RANK_ORDER, RANK_XP_THRESHOLDS } from '../types';
import { BRAINROTS } from '../data/brainrots';
import { ROTTER_ACCOUNTS } from '../data/rotterAccounts';
import { WHALES } from '../data/whales';
import { MISSIONS } from '../data/missions';
import { ACHIEVEMENTS } from '../data/achievements';
import { MarketEngine } from '../simulation/MarketEngine';
import { playTradeSound, playCashSound, playNewsSound, playCrashSound, playRallySound, playUpgradeSound, playPrestigeSound } from '../utils/audio';

const BROKERAGE_FEE_RATE = 0.01; // 1% fee

interface GameStore extends GameState {
  marketEngine: MarketEngine;

  // Actions
  initGame: () => void;
  marketTick: () => void;
  setSpeed: (speed: number) => void;
  setPaused: (paused: boolean) => void;
  buyShares: (assetId: string, quantity: number) => boolean;
  sellShares: (assetId: string, quantity: number) => boolean;
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
    cash: 10000,
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
      historicalPrices: [b.startingPrice],
      currentPrice: b.startingPrice,
      allTimeHigh: b.startingPrice,
      allTimeLow: b.startingPrice,
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

    settings: {
      reducedMotion: false,
      reducedGlitch: false,
      soundEnabled: false,
      musicEnabled: false,
    },
  };
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
      // Sync the MarketEngine's internal state with loaded data
      const state = get();
      const engine = state.marketEngine;
      engine.brainrots = state.brainrots;
      engine.globalSentiment = state.globalSentiment;
      engine.marketCondition = state.marketCondition;
      engine.rotterPosts = state.rotterPosts;
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

    // Calculate portfolio values
    const holdings = state.holdings;
    let totalInvestmentValue = 0;
    let totalInvested = 0;
    let bestAsset = '';
    let worstAsset = '';
    let bestReturn = -Infinity;
    let worstReturn = Infinity;
    let largestHolding = '';
    let largestValue = 0;

    for (const h of holdings) {
      const asset = brainrots.find(b => b.id === h.assetId);
      if (asset && h.quantity > 0) {
        const value = asset.currentPrice * h.quantity;
        const invested = h.averagePurchasePrice * h.quantity;
        totalInvestmentValue += value;
        totalInvested += invested;
        const ret = (value - invested) / invested;
        if (ret > bestReturn) { bestReturn = ret; bestAsset = asset.name; }
        if (ret < worstReturn) { worstReturn = ret; worstAsset = asset.name; }
        if (value > largestValue) { largestValue = value; largestHolding = asset.name; }
      }
    }

    const netWorth = state.cash + totalInvestmentValue;
    const unrealizedProfit = totalInvestmentValue - totalInvested;
    const totalReturn = state.realizedProfit + unrealizedProfit;

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
    const xpForNextLevel = state.level * 100;
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

    // Check missions
    const updatedMissions = state.missions.map(m => {
      if (m.completed) return m;
      const completed = m.condition(get());
      if (completed) {
        state.cash += m.reward;
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

    set({
      brainrots,
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
      netWorth,
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
    const fee = totalValue * BROKERAGE_FEE_RATE;
    const netValue = totalValue - fee;

    const costBasis = holding.averagePurchasePrice * quantity;
    const profitLoss = netValue - costBasis;

    const newQuantity = holding.quantity - quantity;
    const newHoldings = state.holdings.filter(h => h.assetId !== assetId);
    if (newQuantity > 0) {
      newHoldings.push({ ...holding, quantity: newQuantity });
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

    // XP for profitable trades
    let xpGain = 0;
    if (profitLoss > 0) {
      xpGain = Math.min(100, Math.floor(profitLoss / 100));
      if (state.settings.soundEnabled) playCashSound();
    }

    set({
      cash: state.cash + netValue,
      holdings: newHoldings,
      realizedProfit: newRealizedProfit,
      trades: [trade, ...state.trades].slice(0, 500),
      xp: state.xp + xpGain,
    });

    if (state.settings.soundEnabled) playTradeSound('Sell');
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
    if (state.netWorth < 1000000000) return; // Need ₹1 billion

    // Calculate Golden Brain Cells
    const cellsEarned = Math.floor(Math.log10(state.netWorth / 10000000) * 10) + 1;

    set({
      cash: 10000 + (state.prestigeUpgrades.find(u => u.id === 'more_starting_cash')?.currentLevel ?? 0) * 5000,
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
        holdings: data.holdings ?? [],
        realizedProfit: data.realizedProfit ?? 0,
        trades: data.trades ?? [],
        currentDay: data.currentDay ?? 1,
        totalTicks: data.totalTicks ?? 0,
        xp: data.xp ?? 0,
        level: data.level ?? 1,
        rankIndex: data.rankIndex ?? 0,
        rank: RANK_ORDER[data.rankIndex] || 'Unemployed Scroller',
        brainrots: data.brainrots ?? BRAINROTS,
        news: data.news ?? [],
        rotterPosts: data.rotterPosts ?? [],
        whales: data.whales ?? WHALES,
        recentWhaleTrades: data.recentWhaleTrades ?? [],
        missions: data.missions ?? MISSIONS,
        achievements: data.achievements ?? ACHIEVEMENTS,
        upgrades: data.upgrades ?? createInitialUpgrades(),
        prestigeUpgrades: data.prestigeUpgrades ?? createInitialPrestigeUpgrades(),
        goldenBrainCells: data.goldenBrainCells ?? 0,
        prestigeLevel: data.prestigeLevel ?? 0,
        prestigeMultiplier: data.prestigeMultiplier ?? 1,
        settings: data.settings ?? { reducedMotion: false, reducedGlitch: false, soundEnabled: false, musicEnabled: false },
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
      holdings: data.holdings ?? [],
      realizedProfit: data.realizedProfit ?? 0,
      trades: data.trades ?? [],
      currentDay: data.currentDay ?? 1,
      totalTicks: data.totalTicks ?? 0,
      xp: data.xp ?? 0,
      level: data.level ?? 1,
      rankIndex: data.rankIndex ?? 0,
      rank: RANK_ORDER[data.rankIndex] || 'Unemployed Scroller',
      brainrots: data.brainrots ?? BRAINROTS,
      news: data.news ?? [],
      rotterPosts: data.rotterPosts ?? [],
      whales: data.whales ?? WHALES,
      recentWhaleTrades: data.recentWhaleTrades ?? [],
      missions: data.missions ?? MISSIONS.map(m => ({ ...m })),
      achievements: data.achievements ?? ACHIEVEMENTS.map(a => ({ ...a })),
      upgrades: data.upgrades ?? createInitialUpgrades(),
      prestigeUpgrades: data.prestigeUpgrades ?? createInitialPrestigeUpgrades(),
      goldenBrainCells: data.goldenBrainCells ?? 0,
      prestigeLevel: data.prestigeLevel ?? 0,
      prestigeMultiplier: data.prestigeMultiplier ?? 1,
      settings: data.settings ?? { reducedMotion: false, reducedGlitch: false, soundEnabled: false, musicEnabled: false },
      marketCondition: data.marketCondition ?? 'Normal',
      globalSentiment: data.globalSentiment ?? 50,
      marketStatus: data.marketStatus ?? 'Open',
    };
  } catch {
    return null;
  }
}
