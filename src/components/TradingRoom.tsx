import { useGameStore } from '../stores/gameStore';

export function TradingRoom() {
  const upgrades = useGameStore(s => s.upgrades);
  const cash = useGameStore(s => s.cash);
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade);
  const netWorth = useGameStore(s => s.netWorth);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const formatCash = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
    return `₹${n.toFixed(2)}`;
  };

  const purchasedCount = upgrades.filter(u => u.purchased).length;
  const totalCount = upgrades.length;

  const getRoomVisual = () => {
    const room: string[] = [];
    if (upgrades.find(u => u.id === 'cracked_phone')?.purchased) room.push('📱');
    if (upgrades.find(u => u.id === 'used_laptop')?.purchased) room.push('💻');
    if (upgrades.find(u => u.id === 'second_monitor')?.purchased) room.push('🖥️');
    if (upgrades.find(u => u.id === 'rgb_desk')?.purchased) room.push('🌈');
    if (upgrades.find(u => u.id === 'news_terminal')?.purchased) room.push('📰');
    if (upgrades.find(u => u.id === 'sentiment_scanner')?.purchased) room.push('📊');
    if (upgrades.find(u => u.id === 'whale_tracker')?.purchased) room.push('🐋');
    if (upgrades.find(u => u.id === 'ai_predictor')?.purchased) room.push('🤖');
    if (upgrades.find(u => u.id === 'quantum_computer')?.purchased) room.push('⚛️');
    if (upgrades.find(u => u.id === 'golden_monitor')?.purchased) room.push('✨');
    if (upgrades.find(u => u.id === 'neon_wall')?.purchased) room.push('🪩');
    if (upgrades.find(u => u.id === 'time_dilator')?.purchased) room.push('⏳');
    
    if (room.length === 0) return '📱 A cracked phone on a broken desk.';
    if (room.length <= 3) return `${room.join(' ')} A humble bedroom setup.`;
    if (room.length <= 6) return `${room.join(' ')} A respectable trading desk.`;
    if (room.length <= 9) return `${room.join(' ')} A professional trading command center.`;
    return `${room.join(' ')} A RIDICULOUS NEON-DRENCHED TRADING PALACE!`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-brainrot-text">Trading Room</h2>

      {/* Room visual */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-4 text-center">
        <div className={`text-2xl mb-2 ${prestigeLevel > 0 ? 'animate-pulse' : ''}`}>
          {getRoomVisual().split(' ')[0] === '📱' ? '📱' : '🏠'}
        </div>
        <p className="text-sm text-brainrot-muted">{getRoomVisual()}</p>
        <div className="text-xs text-brainrot-muted mt-1">
          Upgrades: {purchasedCount}/{totalCount} | Net Worth: {formatCash(netWorth)}
        </div>
        {prestigeLevel > 0 && (
          <div className="text-xs text-brainrot-purple mt-1">
            ✦ Prestige Level {prestigeLevel} — The glitches are getting worse...
          </div>
        )}
      </div>

      {/* Upgrades */}
      <div className="grid gap-2">
        {upgrades.map((upgrade, index) => (
          <div
            key={upgrade.id}
            style={{ animationDelay: `${index * 30}ms` }}
            className={`bg-brainrot-card border rounded-lg p-3 flex items-center justify-between gap-3 transition-all duration-300 ${
              upgrade.purchased 
                ? 'border-brainrot-accent/30 opacity-60 scale-[0.98]' 
                : 'border-brainrot-border hover:border-brainrot-accent/50 hover:bg-brainrot-card/80 hover:scale-[1.01]'
            } ${!upgrade.purchased && cash >= upgrade.cost ? 'ring-1 ring-brainrot-accent/20' : ''}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl flex-shrink-0">{upgrade.icon}</span>
              <div className="min-w-0">
                <h3 className={`text-sm font-bold ${upgrade.purchased ? 'text-brainrot-muted' : 'text-brainrot-text'}`}>
                  {upgrade.name}
                  {upgrade.purchased && ' ✓'}
                </h3>
                <p className="text-xs text-brainrot-muted truncate">{upgrade.description}</p>
                <p className="text-xs text-brainrot-accent">{upgrade.effect}</p>
              </div>
            </div>
            {!upgrade.purchased && (
              <button
                onClick={() => purchaseUpgrade(upgrade.id)}
                disabled={cash < upgrade.cost}
                className="flex-shrink-0 px-3 py-1.5 bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded text-xs font-mono hover:bg-brainrot-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {formatCash(upgrade.cost)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
