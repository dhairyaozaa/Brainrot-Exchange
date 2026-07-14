import { useGameStore } from '../stores/gameStore';

export function StatisticsView() {
  const state = useGameStore();

  const formatCash = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
    return `₹${n.toFixed(2)}`;
  };

  const stats = [
    { label: 'Cash', value: formatCash(state.cash) },
    { label: 'Net Worth', value: formatCash(state.netWorth), color: state.netWorth >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Total Invested', value: formatCash(state.totalInvested) },
    { label: 'Realized Profit', value: formatCash(state.realizedProfit), color: state.realizedProfit >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Total Trades', value: state.trades.length.toString() },
    { label: 'Buy Trades', value: state.trades.filter(t => t.type === 'Buy').length.toString() },
    { label: 'Sell Trades', value: state.trades.filter(t => t.type === 'Sell').length.toString() },
    { label: 'Current Day', value: `Day ${state.currentDay}` },
    { label: 'Total Ticks', value: state.totalTicks.toLocaleString() },
    { label: 'Player Level', value: `Lv. ${state.level}` },
    { label: 'Current Rank', value: state.rank },
    { label: 'Total XP', value: state.xp.toFixed(0) },
    { label: 'Best Asset', value: state.bestAsset || 'N/A' },
    { label: 'Worst Asset', value: state.worstAsset || 'N/A' },
    { label: 'Largest Holding', value: state.largestHolding || 'N/A' },
    { label: 'Active Holdings', value: state.holdings.filter(h => h.quantity > 0).length.toString() },
    { label: 'Missions Completed', value: `${state.missions.filter(m => m.completed).length}/${state.missions.length}` },
    { label: 'Achievements Unlocked', value: `${state.achievements.filter(a => a.unlocked).length}/${state.achievements.length}` },
    { label: 'Upgrades Purchased', value: `${state.upgrades.filter(u => u.purchased).length}/${state.upgrades.length}` },
    { label: 'Market Condition', value: state.marketCondition },
    { label: 'Global Sentiment', value: `${state.globalSentiment.toFixed(1)}%` },
    { label: 'Prestige Level', value: state.prestigeLevel.toString() },
    { label: 'Golden Brain Cells', value: state.goldenBrainCells.toString() },
    { label: 'Game Speed', value: `${state.speed}× ${state.paused ? '(Paused)' : ''}` },
  ];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-brainrot-text">Statistics</h2>
      <p className="text-xs text-brainrot-muted">All your trading statistics in one place.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            className="bg-brainrot-card border border-brainrot-border rounded-lg p-2 transition-all duration-200 hover:border-brainrot-muted/50 hover:bg-brainrot-card/80 animate-fadeIn group"
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div className="text-xs text-brainrot-muted group-hover:text-brainrot-text transition-colors duration-200">{stat.label}</div>
            <div className={`text-sm font-mono font-bold ${stat.color || 'text-brainrot-text'} transition-all duration-200`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
