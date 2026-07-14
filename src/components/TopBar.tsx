import { useGameStore } from '../stores/gameStore';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const cash = useGameStore(s => s.cash);
  const netWorth = useGameStore(s => s.netWorth);
  const currentDay = useGameStore(s => s.currentDay);
  const marketStatus = useGameStore(s => s.marketStatus);
  const marketCondition = useGameStore(s => s.marketCondition);
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
    <div className="fixed top-0 left-0 right-0 z-50 bg-brainrot-darker border-b border-brainrot-border px-1.5 sm:px-4 py-1">
      <div className="flex items-center justify-between gap-0.5 sm:gap-3 text-[10px] sm:text-sm">
        {/* Hamburger + Brand */}
        <div className="flex items-center gap-1">
          <button onClick={onMenuClick} className="sm:hidden text-brainrot-text hover:text-brainrot-accent p-1 text-base">
            ☰
          </button>
          <div className="hidden sm:flex items-center gap-1 font-bold text-brainrot-accent">
            <span className="text-base">🧠</span>
            <span className="text-sm">BRAINROT</span>
            <span className="text-[10px] text-brainrot-muted">EXCHANGE</span>
            {prestigeLevel > 0 && (
              <span className="text-brainrot-purple text-[10px] ml-0.5">✦{prestigeLevel}</span>
            )}
          </div>
        </div>

        {/* Cash & NW - always visible, compact on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="text-brainrot-text">
            <span className="text-brainrot-muted">C </span>
            <span className="font-mono text-[10px] sm:text-xs">{formatCash(cash)}</span>
          </div>
          <div className="text-brainrot-text">
            <span className="text-brainrot-muted">N </span>
            <span className={`font-mono text-[10px] sm:text-xs ${netWorth > 0 ? 'text-green-400' : netWorth < 0 ? 'text-red-400' : 'text-brainrot-text'}`}>
              {formatCash(netWorth)}
            </span>
          </div>
          <div className="hidden md:inline text-brainrot-text">
            <span className="text-brainrot-muted">P&L </span>
            <span className={`font-mono text-[10px] sm:text-xs ${realizedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCash(realizedProfit)}
            </span>
          </div>
        </div>

        {/* Day, Status, Speed controls - responsive */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:block text-[10px]">
            <span className="text-brainrot-muted">D</span>
            <span className="text-brainrot-text ml-0.5">{currentDay}</span>
          </div>
          <div>
            <span className={`font-mono text-[10px] sm:text-xs ${statusColor}`}>
              {marketStatus === 'Open' ? 'O' : 'C'}
            </span>
          </div>
          <div className="hidden lg:block text-[10px]">
            <span className={conditionColors[marketCondition] || 'text-brainrot-text'}>
              {marketCondition}
            </span>
          </div>
          {/* Speed controls - always visible, compact */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={togglePause}
              className={`px-1 py-0.5 rounded text-[10px] sm:text-xs font-mono border leading-none ${paused ? 'border-brainrot-yellow text-brainrot-yellow' : 'border-brainrot-border text-brainrot-text'} hover:border-brainrot-accent transition-colors`}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused ? '▶' : '⏸'}
            </button>
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1 py-0.5 rounded text-[10px] sm:text-xs font-mono border leading-none ${speed === s ? 'border-brainrot-accent text-brainrot-accent' : 'border-brainrot-border text-brainrot-muted'} hover:border-brainrot-accent transition-colors`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
