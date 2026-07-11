import { useGameStore } from '../stores/gameStore';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const cash = useGameStore(s => s.cash);
  const netWorth = useGameStore(s => s.netWorth);
  const currentDay = useGameStore(s => s.currentDay);
  const marketStatus = useGameStore(s => s.marketStatus);
  const marketCondition = useGameStore(s => s.marketCondition);
  const globalSentiment = useGameStore(s => s.globalSentiment);
  const rank = useGameStore(s => s.rank);
  const level = useGameStore(s => s.level);
  const speed = useGameStore(s => s.speed);
  const paused = useGameStore(s => s.paused);
  const setSpeed = useGameStore(s => s.setSpeed);
  const togglePause = useGameStore(s => s.togglePause);
  const realizedProfit = useGameStore(s => s.realizedProfit);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const formatCash = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
    return `₹${n.toFixed(2)}`;
  };

  const statusColor = marketStatus === 'Open' ? 'text-brainrot-accent' : 'text-brainrot-red';
  const conditionColors: Record<string, string> = {
    'Normal': 'text-brainrot-text',
    'Bull Market': 'text-brainrot-accent',
    'Bear Market': 'text-brainrot-red',
    'Flash Crash': 'text-brainrot-red animate-pulse',
    'Meme Rally': 'text-brainrot-yellow',
    'Short Squeeze': 'text-brainrot-purple',
    'Market Bubble': 'text-brainrot-pink',
    'Correction': 'text-brainrot-orange',
    'Recession': 'text-brainrot-muted',
    'Slow Recovery': 'text-brainrot-blue',
    'Trading Halt': 'text-brainrot-red',
    'Category Boom': 'text-brainrot-accent',
    'Category Collapse': 'text-brainrot-red',
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-brainrot-darker border-b border-brainrot-border px-2 sm:px-4 py-1.5">
      <div className="flex items-center justify-between gap-1 sm:gap-4 text-xs sm:text-sm">
        <button onClick={onMenuClick} className="sm:hidden text-brainrot-text hover:text-brainrot-accent p-1">
          ☰
        </button>

        <div className="hidden sm:flex items-center gap-1 font-bold text-brainrot-accent">
          <span className="text-base">🧠</span>
          <span className="text-sm">BRAINROT</span>
          <span className="text-xs text-brainrot-muted">EXCHANGE</span>
          {prestigeLevel > 0 && (
            <span className="text-brainrot-purple text-xs ml-1">✦{prestigeLevel}</span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-brainrot-text">
            <span className="text-brainrot-muted hidden sm:inline">Cash </span>
            <span className="font-mono">{formatCash(cash)}</span>
          </div>
          <div className="text-brainrot-text">
            <span className="text-brainrot-muted hidden sm:inline">NW </span>
            <span className={`font-mono ${netWorth > 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
              {formatCash(netWorth)}
            </span>
          </div>
          <div className="text-brainrot-text hidden md:inline">
            <span className="text-brainrot-muted">P&L </span>
            <span className={`font-mono ${realizedProfit >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
              {formatCash(realizedProfit)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          <div className="hidden md:block">
            <span className="text-brainrot-muted">Day </span>
            <span className="text-brainrot-text">{currentDay}</span>
          </div>
          <div>
            <span className={`font-mono ${statusColor}`}>
              {marketStatus}
            </span>
          </div>
          <div className="hidden lg:block">
            <span className={conditionColors[marketCondition] || 'text-brainrot-text'}>
              {marketCondition}
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="text-brainrot-muted">Sentiment </span>
            <span className={`font-mono ${globalSentiment >= 50 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
              {globalSentiment.toFixed(0)}%
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="text-brainrot-muted">{rank} </span>
            <span className="text-brainrot-yellow">Lv.{level}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={togglePause}
            className={`px-1.5 py-0.5 rounded text-xs font-mono border ${paused ? 'border-brainrot-yellow text-brainrot-yellow' : 'border-brainrot-border text-brainrot-text'} hover:border-brainrot-accent`}
          >
            {paused ? '▶' : '⏸'}
          </button>
          {[1, 2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-xs font-mono border ${speed === s ? 'border-brainrot-accent text-brainrot-accent' : 'border-brainrot-border text-brainrot-muted'} hover:border-brainrot-accent`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
