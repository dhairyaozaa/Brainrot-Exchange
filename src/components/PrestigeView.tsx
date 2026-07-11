import { useGameStore } from '../stores/gameStore';

export function PrestigeView() {
  const netWorth = useGameStore(s => s.netWorth);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const goldenBrainCells = useGameStore(s => s.goldenBrainCells);
  const prestigeUpgrades = useGameStore(s => s.prestigeUpgrades);
  const prestige = useGameStore(s => s.prestige);
  const purchasePrestigeUpgrade = useGameStore(s => s.purchasePrestigeUpgrade);

  const formatCash = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
    return `₹${n.toFixed(2)}`;
  };

  const canPrestige = netWorth >= 1000000000;
  const estimatedCells = canPrestige
    ? Math.floor(Math.log10(netWorth / 10000000) * 10) + 1
    : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-brainrot-text">Prestige</h2>

      {/* Prestige info */}
      <div className="bg-brainrot-card border border-brainrot-purple/50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🔄</span>
          <div>
            <h3 className="text-lg font-bold text-brainrot-purple">Golden Brain Cells: {goldenBrainCells}</h3>
            <p className="text-sm text-brainrot-muted">Prestige Level: {prestigeLevel}</p>
          </div>
        </div>

        {!canPrestige ? (
          <div className="text-sm text-brainrot-muted">
            Reach a net worth of <span className="text-brainrot-yellow">₹1,000,000,000</span> to prestige.
            <br />
            Current: {formatCash(netWorth)}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-brainrot-yellow">
              You can prestige! You'll earn approximately <strong>{estimatedCells}</strong> Golden Brain Cells.
            </p>
            <div className="text-xs text-brainrot-muted space-y-1">
              <p>⚠️ Prestiging will reset:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Cash and portfolio</li>
                <li>Normal equipment</li>
                <li>Player rank and level</li>
                <li>Market progress</li>
              </ul>
              <p>✓ You will keep:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Achievements</li>
                <li>Statistics</li>
                <li>Golden Brain Cells</li>
                <li>Permanent upgrades</li>
                <li>Prestige level</li>
              </ul>
            </div>
            <button
              onClick={prestige}
              className="w-full bg-brainrot-purple/30 text-brainrot-purple border border-brainrot-purple/50 rounded-lg py-3 font-mono font-bold hover:bg-brainrot-purple/50 transition-colors"
            >
              PRESTIGE NOW
            </button>
          </div>
        )}
      </div>

      {/* Prestige upgrades */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-brainrot-text">Permanent Upgrades</h3>
        {prestigeUpgrades.map(upgrade => {
          const cost = upgrade.cost * (upgrade.currentLevel + 1);
          const canAfford = goldenBrainCells >= cost;
          const maxed = upgrade.currentLevel >= upgrade.maxLevel;

          return (
            <div
              key={upgrade.id}
              className={`bg-brainrot-card border rounded-lg p-3 flex items-center justify-between gap-3 ${
                maxed ? 'border-brainrot-accent/30 opacity-60' : 'border-brainrot-border'
              }`}
            >
              <div>
                <h3 className="text-sm font-bold text-brainrot-text">{upgrade.name}</h3>
                <p className="text-xs text-brainrot-muted">{upgrade.description}</p>
                <p className="text-xs text-brainrot-accent">Level {upgrade.currentLevel}/{upgrade.maxLevel}</p>
                {maxed && <p className="text-xs text-brainrot-accent">MAXED ✓</p>}
              </div>
              {!maxed && (
                <button
                  onClick={() => purchasePrestigeUpgrade(upgrade.id)}
                  disabled={!canAfford}
                  className="flex-shrink-0 px-3 py-1.5 bg-brainrot-purple/20 text-brainrot-purple border border-brainrot-purple/30 rounded text-xs font-mono hover:bg-brainrot-purple/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  🧠 {cost}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
