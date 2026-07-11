import type { Achievement, GameState } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_trade',
    title: 'First Steps',
    description: 'Execute your first trade',
    icon: '🎯',
    unlocked: false,
    condition: (state: GameState) => state.trades.length >= 1,
  },
  {
    id: 'buy_high_cry_low',
    title: 'BUY HIGH, CRY LOW',
    description: 'Lose 80% on one investment',
    icon: '😭',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'diamond_brain',
    title: 'DIAMOND BRAIN',
    description: 'Hold an investment through a 90% crash and eventually make a profit',
    icon: '💎',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'exit_liquidity',
    title: 'EXIT LIQUIDITY',
    description: 'Purchase an asset near the peak of a bubble',
    icon: '🪙',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'the_one_percent',
    title: 'THE ONE PERCENT',
    description: 'Reach ₹10,000,000 net worth',
    icon: '💰',
    unlocked: false,
    condition: (state: GameState) => state.netWorth >= 10000000,
  },
  {
    id: 'too_much_rot',
    title: 'TOO MUCH ROT',
    description: 'Own every brainrot asset',
    icon: '🧠',
    unlocked: false,
    condition: (state: GameState) => {
      return state.brainrots.every(b => {
        const h = state.holdings.find(h => h.assetId === b.id);
        return h && h.quantity > 0;
      });
    },
  },
  {
    id: 'trust_the_pigeon',
    title: 'TRUST THE PIGEON',
    description: 'Earn a large profit after following an unreliable ROTTER account',
    icon: '🕊️',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'paper_hands',
    title: 'PAPER HANDS',
    description: 'Sell an asset within 5 seconds of buying it',
    icon: '📄',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'bag_holder',
    title: 'BAG HOLDER',
    description: 'Hold an asset that drops 95% from your purchase price',
    icon: '👜',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'whale_hunter',
    title: 'WHALE HUNTER',
    description: 'Successfully front-run a whale trade',
    icon: '🐋',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'consistency_king',
    title: 'CONSISTENCY KING',
    description: 'Make 50 profitable trades in a row',
    icon: '👑',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'overnight_millionaire',
    title: 'OVERNIGHT MILLIONAIRE',
    description: 'Gain ₹1,000,000 in a single day',
    icon: '🌙',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'bankruptcy_scouted',
    title: 'BANKRUPTCY SCOUTED',
    description: 'Lose everything but keep trading',
    icon: '💀',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'news_influencer',
    title: 'NEWS INFLUENCER',
    description: 'Profit from 10 different breaking news events',
    icon: '📰',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'diversification_god',
    title: 'DIVERSIFICATION GOD',
    description: 'Hold investments in all 10 categories simultaneously',
    icon: '🌈',
    unlocked: false,
    condition: (state: GameState) => {
      const cats = new Set<string>();
      state.holdings.forEach(h => {
        if (h.quantity > 0) {
          const a = state.brainrots.find(b => b.id === h.assetId);
          if (a) cats.add(a.category);
        }
      });
      return cats.size >= 10;
    },
  },
  {
    id: 'the_grind',
    title: 'THE GRIND',
    description: 'Complete 1000 trades',
    icon: '⚙️',
    unlocked: false,
    condition: (state: GameState) => state.trades.length >= 1000,
  },
  {
    id: 'speed_trader',
    title: 'SPEED TRADER',
    description: 'Execute 50 trades in under 5 minutes',
    icon: '⚡',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'market_survivor',
    title: 'MARKET SURVIVOR',
    description: 'Survive 10 market crashes',
    icon: '🛡️',
    unlocked: false,
    condition: () => false, // Tracked separately
  },
  {
    id: 'crypto_billionaire',
    title: 'CRYPTO BILLIONAIRE',
    description: 'Reach ₹1,000,000,000 net worth',
    icon: '🚀',
    unlocked: false,
    condition: (state: GameState) => state.netWorth >= 1000000000,
  },
  {
    id: 'collector_extraordinaire',
    title: 'COLLECTOR EXTRAORDINAIRE',
    description: 'Own at least one of every rarity tier',
    icon: '🏆',
    unlocked: false,
    condition: (state: GameState) => {
      const rarities = new Set<string>();
      state.holdings.forEach(h => {
        if (h.quantity > 0) {
          const a = state.brainrots.find(b => b.id === h.assetId);
          if (a) rarities.add(a.rarity);
        }
      });
      return rarities.size >= 7; // All 7 rarity tiers
    },
  },
  {
    id: 'prestige_noob',
    title: 'PRESTIGE NOOB',
    description: 'Prestige for the first time',
    icon: '🔄',
    unlocked: false,
    condition: (state: GameState) => state.prestigeLevel >= 1,
  },
  {
    id: 'prestige_veteran',
    title: 'PRESTIGE VETERAN',
    description: 'Prestige 5 times',
    icon: '🔄🔄',
    unlocked: false,
    condition: (state: GameState) => state.prestigeLevel >= 5,
  },
  {
    id: 'golden_hoarder',
    title: 'GOLDEN HOARDER',
    description: 'Accumulate 500 Golden Brain Cells',
    icon: '🧠',
    unlocked: false,
    condition: (state: GameState) => state.goldenBrainCells >= 500,
  },
  {
    id: 'market_god',
    title: 'MARKET GOD',
    description: 'Reach Supreme Market Overlord rank',
    icon: '😇',
    unlocked: false,
    condition: (state: GameState) => state.rankIndex >= 9,
  },
  {
    id: 'upgrade_all',
    title: 'FULLY LOADED',
    description: 'Purchase every trading room upgrade',
    icon: '💻',
    unlocked: false,
    condition: (state: GameState) => state.upgrades.every(u => u.purchased),
  },
  {
    id: 'mission_control',
    title: 'MISSION CONTROL',
    description: 'Complete 20 missions',
    icon: '📋',
    unlocked: false,
    condition: (state: GameState) => state.missions.filter(m => m.completed).length >= 20,
  },
  {
    id: 'achievement_hunter',
    title: 'ACHIEVEMENT HUNTER',
    description: 'Unlock 20 achievements',
    icon: '🎮',
    unlocked: false,
    condition: (state: GameState) => state.achievements.filter(a => a.unlocked).length >= 20,
  },
  {
    id: 'the_supreme',
    title: 'THE SUPREME',
    description: 'Reach ₹1 billion net worth AND Supreme Market Overlord rank',
    icon: '👑',
    unlocked: false,
    condition: (state: GameState) => state.netWorth >= 1000000000 && state.rankIndex >= 9,
  },
  {
    id: 'morning_trader',
    title: 'MORNING TRADER',
    description: 'Make 10 trades during pre-market',
    icon: '🌅',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'rumor_monger',
    title: 'RUMOR MONGER',
    description: 'Trade on 20 different ROTTER rumors',
    icon: '🗣️',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'hold_the_line',
    title: 'HOLD THE LINE',
    description: 'Hold a single asset through 3 market cycles',
    icon: '🛡️',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'category_king',
    title: 'CATEGORY KING',
    description: 'Dominate a category by holding 50% of its total supply',
    icon: '👑',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'flash_crash_survivor',
    title: 'FLASH CRASH SURVIVOR',
    description: 'Survive a Flash Crash event',
    icon: '⚡',
    unlocked: false,
    condition: (state: GameState) => state.marketCondition === 'Flash Crash' && state.netWorth > 0,
  },
  {
    id: 'meme_rally_winner',
    title: 'MEME RALLY WINNER',
    description: 'Profit during a Meme Rally',
    icon: '🤡',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'short_squeeze_master',
    title: 'SHORT SQUEEZE MASTER',
    description: 'Profit during a Short Squeeze',
    icon: '🧃',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'quantum_profit',
    title: 'QUANTUM PROFIT',
    description: 'Make profit on a Quantum Creature asset',
    icon: '⚛️',
    unlocked: false,
    condition: (state: GameState) => {
      return state.trades.some(t => {
        if (t.type === 'Sell' && t.profitLoss > 0) {
          const a = state.brainrots.find(b => b.ticker === t.ticker);
          return a && a.category === 'Quantum Creatures';
        }
        return false;
      });
    },
  },
  {
    id: 'space_ranger',
    title: 'SPACE RANGER',
    description: 'Own all Space Organisms',
    icon: '🚀',
    unlocked: false,
    condition: (state: GameState) => {
      const spaceAssets = state.brainrots.filter(b => b.category === 'Space Organisms');
      return spaceAssets.every(a => {
        const h = state.holdings.find(h => h.assetId === a.id);
        return h && h.quantity > 0;
      });
    },
  },
  {
    id: 'influencer_follower',
    title: 'INFLUENCER FOLLOWER',
    description: 'Make 50 trades based on influencer posts',
    icon: '📱',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'bear_market_hero',
    title: 'BEAR MARKET HERO',
    description: 'Profit during a Bear Market',
    icon: '🐻',
    unlocked: false,
    condition: () => false,
  },
  {
    id: 'endless_mode',
    title: 'ENDLESS MODE',
    description: 'Unlock and play endless mode',
    icon: '♾️',
    unlocked: false,
    condition: (state: GameState) => state.netWorth >= 1000000000,
  },
  {
    id: 'trader_1000',
    title: 'TRADER 1000',
    description: 'Reach level 1000',
    icon: '📈',
    unlocked: false,
    condition: (state: GameState) => state.level >= 1000,
  },
];
