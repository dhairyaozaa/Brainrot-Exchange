import { useGameStore } from '../stores/gameStore';

export function MissionsView() {
  const missions = useGameStore(s => s.missions);

  const completed = missions.filter(m => m.completed);
  const active = missions.filter(m => !m.completed);

  const formatCash = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${n.toLocaleString('en-IN')}`;
    return `₹${n.toFixed(2)}`;
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-brainrot-text">Missions</h2>
      <p className="text-xs text-brainrot-muted">
        Complete missions to earn cash and XP. {completed.length}/{missions.length} completed.
      </p>

      {active.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-brainrot-yellow flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brainrot-yellow animate-pulse" />
            Active ({active.length})
          </h3>
          {active.map((mission, i) => (
            <div 
              key={mission.id} 
              className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 transition-all duration-200 hover:border-brainrot-yellow/50 hover:bg-brainrot-card/80 animate-fadeIn"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-brainrot-text group-hover:text-brainrot-yellow">{mission.title}</h3>
                  <p className="text-xs text-brainrot-muted mt-1">{mission.description}</p>
                  <p className="text-xs text-brainrot-yellow mt-1 flex items-center gap-1">
                    <span>🎯</span>
                    <span>{mission.objective}</span>
                  </p>
                </div>
                <div className="text-right text-xs flex-shrink-0 bg-brainrot-dark rounded-lg p-2 border border-brainrot-border/50">
                  <div className="text-brainrot-accent font-mono">💰 {formatCash(mission.reward)}</div>
                  <div className="text-brainrot-yellow font-mono">✨ +{mission.rewardXP} XP</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-brainrot-accent">
            Completed ({completed.length})
          </h3>
          {completed.map(mission => (
            <div key={mission.id} className="bg-brainrot-card border border-brainrot-accent/30 rounded-lg p-3 opacity-60 hover:opacity-80 transition-opacity duration-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-brainrot-text">{mission.title}</h3>
                  <p className="text-xs text-brainrot-muted">{mission.description}</p>
                  <p className="text-xs text-brainrot-accent mt-1">✓ Completed</p>
                </div>
                <div className="text-brainrot-accent text-lg flex-shrink-0">✓</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {missions.length === 0 && (
        <div className="text-center py-8 text-brainrot-muted text-sm">
          No missions available.
        </div>
      )}
    </div>
  );
}
