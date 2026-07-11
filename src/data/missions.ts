import type { Mission, GameState } from '../types';

export const MISSIONS: Mission[] = [
  {
    id: 'first_profit',
    title: 'First Profit',
    description: 'Make your first profitable trade',
    objective: 'Complete a trade that results in a profit',
    reward: 1000,
    rewardXP: 100,
    completed: false,
    condition: (state: GameState) => state.realizedProfit > 0,
  },
  {
    id: 'turn_10k_to_50k',
    title: 'From Rags to Slightly Better Rags',
    description: 'Turn ₹10,000 into ₹50,000',
    objective: 'Reach ₹50,000 net worth',
    reward: 5000,
    rewardXP: 500,
    completed: false,
    condition: (state: GameState) => state.netWorth >= 50000,
  },
  {
    id: 'ten_profitable_trades',
    title: 'Diamond Hands Apprentice',
    description: 'Complete ten profitable trades',
    objective: 'Make profit on 10 trades',
    reward: 5000,
    rewardXP: 300,
    completed: false,
    condition: (state: GameState) => {
      const profitable = state.trades.filter(t => t.type === 'Sell' && t.profitLoss > 0);
      return profitable.length >= 10;
    },
  },
  {
    id: 'survive_crash',
    title: 'Survived the Dip',
    description: 'Survive a market crash without going bankrupt',
    objective: 'Endure a Flash Crash or Bear Market condition while maintaining positive net worth',
    reward: 10000,
    rewardXP: 1000,
    completed: false,
    condition: (state: GameState) => {
      return (state.marketCondition === 'Flash Crash' || state.marketCondition === 'Bear Market') && state.netWorth > 0;
    },
  },
  {
    id: 'own_ten_brainrots',
    title: 'Collector of Rot',
    description: 'Own shares in ten different brainrot assets',
    objective: 'Hold positions in 10 different assets',
    reward: 8000,
    rewardXP: 500,
    completed: false,
    condition: (state: GameState) => state.holdings.filter(h => h.quantity > 0).length >= 10,
  },
  {
    id: 'earn_100k_from_one_trade',
    title: 'Big Game Hunter',
    description: 'Earn ₹100,000 from a single trade',
    objective: 'Make ₹100,000 profit on one trade',
    reward: 25000,
    rewardXP: 2000,
    completed: false,
    condition: (state: GameState) => {
      return state.trades.some(t => t.type === 'Sell' && t.profitLoss >= 100000);
    },
  },
  {
    id: 'millionaire',
    title: 'Brainrot Millionaire',
    description: 'Reach ₹1,000,000 net worth',
    objective: 'Achieve a net worth of ₹1,000,000',
    reward: 50000,
    rewardXP: 5000,
    completed: false,
    condition: (state: GameState) => state.netWorth >= 1000000,
  },
  {
    id: 'own_legendary',
    title: 'Legendary Owner',
    description: 'Own at least one share of a Legendary rarity asset',
    objective: 'Purchase a Legendary asset',
    reward: 15000,
    rewardXP: 1000,
    completed: false,
    condition: (state: GameState) => {
      return state.holdings.some(h => {
        const asset = state.brainrots.find(b => b.id === h.assetId);
        return asset && asset.rarity === 'Legendary' && h.quantity > 0;
      });
    },
  },
  {
    id: 'all_categories',
    title: 'Category Explorer',
    description: 'Purchase an asset from every category',
    objective: 'Own at least one asset from each of the 10 categories',
    reward: 30000,
    rewardXP: 2000,
    completed: false,
    condition: (state: GameState) => {
      const categories = new Set<string>();
      state.holdings.forEach(h => {
        if (h.quantity > 0) {
          const asset = state.brainrots.find(b => b.id === h.assetId);
          if (asset) categories.add(asset.category);
        }
      });
      return categories.size >= 10;
    },
  },
  {
    id: 'hundred_trades',
    title: 'Veteran Trader',
    description: 'Complete 100 trades',
    objective: 'Execute 100 buy or sell trades',
    reward: 20000,
    rewardXP: 1500,
    completed: false,
    condition: (state: GameState) => state.trades.length >= 100,
  },
  {
    id: 'diamond_hands',
    title: 'Diamond Hands',
    description: 'Hold an investment through a loss of 50% and eventually recover to profit',
    objective: 'Hold an asset that drops 50% and later returns to profit',
    reward: 20000,
    rewardXP: 2000,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'five_million',
    title: 'Five Million Reasons',
    description: 'Reach ₹5,000,000 net worth',
    objective: 'Achieve net worth of ₹5,000,000',
    reward: 100000,
    rewardXP: 10000,
    completed: false,
    condition: (state: GameState) => state.netWorth >= 5000000,
  },
  {
    id: 'own_mythical',
    title: 'Mythical Collector',
    description: 'Own at least one Mythical rarity asset',
    objective: 'Purchase a Mythical asset',
    reward: 50000,
    rewardXP: 3000,
    completed: false,
    condition: (state: GameState) => {
      return state.holdings.some(h => {
        const asset = state.brainrots.find(b => b.id === h.assetId);
        return asset && asset.rarity === 'Mythical' && h.quantity > 0;
      });
    },
  },
  {
    id: 'news_trader',
    title: 'News Junkie',
    description: 'Successfully trade based on breaking news',
    objective: 'Profit from an asset that was affected by active news',
    reward: 10000,
    rewardXP: 800,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'whale_watcher',
    title: 'Whale Watcher',
    description: 'Spot a whale trade and profit from following it',
    objective: 'Make a profit trading the same asset a whale recently bought',
    reward: 20000,
    rewardXP: 1500,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'fifty_million',
    title: 'Halfway There',
    description: 'Reach ₹50,000,000 net worth',
    objective: 'Achieve net worth of ₹50,000,000',
    reward: 500000,
    rewardXP: 50000,
    completed: false,
    condition: (state: GameState) => state.netWorth >= 50000000,
  },
  {
    id: 'hundred_million',
    title: 'Century Club',
    description: 'Reach ₹100,000,000 net worth',
    objective: 'Achieve net worth of ₹100,000,000',
    reward: 1000000,
    rewardXP: 100000,
    completed: false,
    condition: (state: GameState) => state.netWorth >= 100000000,
  },
  {
    id: 'own_forbidden',
    title: 'Playing with Fire',
    description: 'Own a "Financially Forbidden" asset',
    objective: 'Purchase a Financially Forbidden asset',
    reward: 100000,
    rewardXP: 5000,
    completed: false,
    condition: (state: GameState) => {
      return state.holdings.some(h => {
        const asset = state.brainrots.find(b => b.id === h.assetId);
        return asset && asset.rarity === 'Financially Forbidden' && h.quantity > 0;
      });
    },
  },
  {
    id: 'billionaire',
    title: 'Billionaire Status',
    description: 'Reach ₹1,000,000,000 net worth',
    objective: 'Achieve net worth of ₹1,000,000,000',
    reward: 10000000,
    rewardXP: 1000000,
    completed: false,
    condition: (state: GameState) => state.netWorth >= 1000000000,
  },
  {
    id: 'upgrade_collector',
    title: 'Fully Equipped',
    description: 'Purchase all trading room upgrades',
    objective: 'Buy every upgrade',
    reward: 50000,
    rewardXP: 5000,
    completed: false,
    condition: (state: GameState) => state.upgrades.every(u => u.purchased),
  },
  {
    id: 'twenty_assets',
    title: 'Asset Hoarder',
    description: 'Own shares in 20 different brainrots',
    objective: 'Hold positions in 20 different assets',
    reward: 30000,
    rewardXP: 2000,
    completed: false,
    condition: (state: GameState) => state.holdings.filter(h => h.quantity > 0).length >= 20,
  },
  {
    id: 'profit_milestone_1m',
    title: 'Profit Millionaire',
    description: 'Earn ₹1,000,000 in total realized profits',
    objective: 'Accumulate ₹1,000,000 in realized profit',
    reward: 100000,
    rewardXP: 10000,
    completed: false,
    condition: (state: GameState) => state.realizedProfit >= 1000000,
  },
  {
    id: 'survive_10_crashes',
    title: 'Crash Test Dummy',
    description: 'Survive 10 market crashes',
    objective: 'Endure 10 different market crashes',
    reward: 100000,
    rewardXP: 8000,
    completed: false,
    condition: () => false, // Tracked separately via counter
  },
  {
    id: 'day_trader',
    title: 'Day Trader Deluxe',
    description: 'Complete 20 trades in a single day',
    objective: 'Execute 20 trades within one in-game day',
    reward: 15000,
    rewardXP: 1000,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'thirty_holdings',
    title: 'Diversification Station',
    description: 'Hold 30 different assets simultaneously',
    objective: 'Hold positions in 30 different assets',
    reward: 100000,
    rewardXP: 8000,
    completed: false,
    condition: (state: GameState) => state.holdings.filter(h => h.quantity > 0).length >= 30,
  },
  {
    id: 'follow_rumor',
    title: 'Rumor Believer',
    description: 'Profit from trading based on a ROTTER rumor',
    objective: 'Make profit following a ROTTER post',
    reward: 5000,
    rewardXP: 500,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'recovery_king',
    title: 'Recovery King',
    description: 'Recover from a net worth loss of 50% or more',
    objective: 'Lose then regain 50% of peak net worth',
    reward: 50000,
    rewardXP: 5000,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'upgrade_level_5',
    title: 'Serious Setup',
    description: 'Purchase 5 trading room upgrades',
    objective: 'Buy 5 different upgrades',
    reward: 15000,
    rewardXP: 1000,
    completed: false,
    condition: (state: GameState) => state.upgrades.filter(u => u.purchased).length >= 5,
  },
  {
    id: 'rank_millionaire',
    title: 'Rank Up: Millionaire',
    description: 'Reach Brainrot Millionaire rank',
    objective: 'Achieve Brainrot Millionaire rank',
    reward: 50000,
    rewardXP: 5000,
    completed: false,
    condition: (state: GameState) => state.rankIndex >= 6,
  },
  {
    id: 'forty_holdings',
    title: 'The Complete Set',
    description: 'Own shares in every brainrot asset',
    objective: 'Hold at least one share of every brainrot',
    reward: 500000,
    rewardXP: 50000,
    completed: false,
    condition: (state: GameState) => {
      return state.brainrots.every(b => {
        const holding = state.holdings.find(h => h.assetId === b.id);
        return holding && holding.quantity > 0;
      });
    },
  },
  {
    id: 'loss_recovery',
    title: 'Phoenix from the Ashes',
    description: 'Lose 90% of your net worth and recover to new highs',
    objective: 'Survive a 90% drawdown and reach a new peak',
    reward: 200000,
    rewardXP: 20000,
    completed: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'prestige_1',
    title: 'First Prestige',
    description: 'Prestige for the first time',
    objective: 'Complete your first prestige',
    reward: 100000,
    rewardXP: 100000,
    completed: false,
    condition: (state: GameState) => state.prestigeLevel >= 1,
  },
  {
    id: 'golden_accumulator',
    title: 'Golden Brain Collector',
    description: 'Accumulate 100 Golden Brain Cells',
    objective: 'Save up 100 Golden Brain Cells',
    reward: 200000,
    rewardXP: 50000,
    completed: false,
    condition: (state: GameState) => state.goldenBrainCells >= 100,
  },
];
