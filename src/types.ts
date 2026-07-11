export interface BrainrotAsset {
  id: string;
  name: string;
  ticker: string;
  category: BrainrotCategory;
  description: string;
  rarity: RarityTier;
  startingPrice: number;
  currentPrice: number;
  baseVolatility: number;
  currentVolatility: number;
  popularity: number;
  hype: number;
  publicTrust: number;
  riskRating: 'Low' | 'Medium' | 'High' | 'Extreme' | 'Financial Suicide';
  volume: number;
  supply: number;
  demand: number;
  historicalPrices: number[];
  dailyChange: number;
  allTimeHigh: number;
  allTimeLow: number;
  momentum: number;
  traits: string[];
  unlocked: boolean;
  unlockCondition?: string;
  icon: string;
  color: string;
}

export type RarityTier =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Mythical'
  | 'Financially Forbidden';

export type BrainrotCategory =
  | 'Beverage Beasts'
  | 'Electronic Animals'
  | 'Corporate Creatures'
  | 'Government Birds'
  | 'Radioactive Rodents'
  | 'Internet Predators'
  | 'Financial Primates'
  | 'Household Horrors'
  | 'Quantum Creatures'
  | 'Space Organisms';

export type MarketCondition =
  | 'Normal'
  | 'Bull Market'
  | 'Bear Market'
  | 'Correction'
  | 'Recession'
  | 'Market Bubble'
  | 'Flash Crash'
  | 'Meme Rally'
  | 'Short Squeeze'
  | 'Category Boom'
  | 'Category Collapse'
  | 'Slow Recovery'
  | 'Trading Halt';

export type MarketStatus = 'Open' | 'Closed' | 'Pre-Market' | 'Halted';

export type NewsReliability =
  | 'Verified'
  | 'Likely'
  | 'Unconfirmed'
  | 'Suspicious'
  | 'Probably Invented'
  | 'Posted by a Pigeon';

export interface NewsStory {
  id: string;
  headline: string;
  description: string;
  relatedAssets: string[];
  relatedCategories: BrainrotCategory[];
  reliability: NewsReliability;
  effectStrength: number;
  effectDuration: number;
  isTrue: boolean;
  createdAt: number;
  expiresAt: number;
  active: boolean;
}

export interface RotterAccount {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  followers: number;
  reputation: number;
  historicalAccuracy: number;
  favouriteAssets: string[];
  isBot: boolean;
  isTrader: boolean;
  isInfluencer: boolean;
  isNews: boolean;
  isAnonymous: boolean;
  isConspiracy: boolean;
  isWhale: boolean;
}

export interface RotterPost {
  id: string;
  accountId: string;
  content: string;
  timestamp: number;
  likes: number;
  reposts: number;
  relatedAssets: string[];
  hypeEffect: number;
  trustEffect: number;
}

export interface Whale {
  id: string;
  name: string;
  description: string;
  wealth: number;
  riskTolerance: number;
  favouriteCategories: BrainrotCategory[];
  tradingStyle: 'Aggressive' | 'Cautious' | 'Random' | 'Momentum' | 'Value';
  marketInfluence: number;
  holdings: Record<string, number>;
  avatar: string;
  unlocked: boolean;
}

export interface WhaleTradeLog {
  whaleName: string;
  whaleId: string;
  assetId: string;
  ticker: string;
  type: 'Buy' | 'Sell';
  quantity: number;
  price: number;
  totalValue: number;
  timestamp: number;
}

export interface PlayerTrade {
  id: string;
  assetId: string;
  ticker: string;
  type: 'Buy' | 'Sell';
  quantity: number;
  price: number;
  brokerageFee: number;
  totalValue: number;
  profitLoss: number;
  date: number;
  day: number;
}

export interface PlayerHolding {
  assetId: string;
  quantity: number;
  averagePurchasePrice: number;
}

export interface TradingRoomUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  icon: string;
  category: 'Hardware' | 'Software' | 'Data' | 'Mystical';
  effect: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  objective: string;
  reward: number;
  rewardXP: number;
  completed: boolean;
  condition: (state: GameState) => boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  condition: (state: GameState) => boolean;
}

export type PlayerRank =
  | 'Unemployed Scroller'
  | 'Bedroom Trader'
  | 'Certified Meme Investor'
  | 'Brainrot Analyst'
  | 'Hype Merchant'
  | 'Market Goblin'
  | 'Brainrot Millionaire'
  | 'Meme Fund Manager'
  | 'Brainrot Billionaire'
  | 'Supreme Market Overlord';

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: string;
  purchased: boolean;
  maxLevel: number;
  currentLevel: number;
}

export interface GameState {
  cash: number;
  holdings: PlayerHolding[];
  netWorth: number;
  totalInvested: number;
  unrealizedProfit: number;
  realizedProfit: number;
  totalReturn: number;
  trades: PlayerTrade[];
  bestAsset: string;
  worstAsset: string;
  largestHolding: string;

  currentDay: number;
  currentWeek: number;
  marketStatus: MarketStatus;
  marketCondition: MarketCondition;
  globalSentiment: number;
  ticksUntilClose: number;
  ticksUntilOpen: number;
  totalTicks: number;

  xp: number;
  level: number;
  rank: PlayerRank;
  rankIndex: number;

  brainrots: BrainrotAsset[];
  news: NewsStory[];
  rotterAccounts: RotterAccount[];
  rotterPosts: RotterPost[];
  whales: Whale[];
  recentWhaleTrades: WhaleTradeLog[];

  missions: Mission[];
  achievements: Achievement[];
  upgrades: TradingRoomUpgrade[];
  prestigeUpgrades: PrestigeUpgrade[];

  speed: number;
  paused: boolean;

  goldenBrainCells: number;
  prestigeLevel: number;
  prestigeMultiplier: number;

  settings: GameSettings;
}

export interface GameSettings {
  reducedMotion: boolean;
  reducedGlitch: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export interface SaveData {
  version: number;
  timestamp: number;
  cash: number;
  holdings: PlayerHolding[];
  realizedProfit: number;
  trades: PlayerTrade[];
  currentDay: number;
  totalTicks: number;
  xp: number;
  level: number;
  rankIndex: number;
  brainrots: BrainrotAsset[];
  news: NewsStory[];
  rotterPosts: RotterPost[];
  whales: Whale[];
  recentWhaleTrades: WhaleTradeLog[];
  missions: Mission[];
  achievements: Achievement[];
  upgrades: TradingRoomUpgrade[];
  prestigeUpgrades: PrestigeUpgrade[];
  goldenBrainCells: number;
  prestigeLevel: number;
  prestigeMultiplier: number;
  settings: GameSettings;
  speed: number;
  marketCondition: MarketCondition;
  globalSentiment: number;
  marketStatus: MarketStatus;
}

export const RANK_ORDER: PlayerRank[] = [
  'Unemployed Scroller',
  'Bedroom Trader',
  'Certified Meme Investor',
  'Brainrot Analyst',
  'Hype Merchant',
  'Market Goblin',
  'Brainrot Millionaire',
  'Meme Fund Manager',
  'Brainrot Billionaire',
  'Supreme Market Overlord',
];

export const RANK_XP_THRESHOLDS = [
  0, 500, 2000, 5000, 15000, 50000, 150000, 500000, 2000000, 10000000,
];
