import { useGameStore } from '../stores/gameStore';

export function AchievementsView() {
  const achievements = useGameStore(s => s.achievements);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-brainrot-text">Achievements</h2>
      <p className="text-xs text-brainrot-muted">
        Unlock achievements by reaching milestones. {unlocked.length}/{achievements.length} unlocked.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {unlocked.map((achievement, i) => (
          <div
            key={achievement.id}
            style={{ animationDelay: `${i * 50}ms` }}
            className="bg-brainrot-card border border-brainrot-accent/30 rounded-lg p-3 flex items-center gap-3 transition-all duration-300 hover:border-brainrot-accent/60 hover:scale-[1.02] hover:shadow-lg hover:shadow-brainrot-accent/5 group animate-fadeIn"
          >
            <span className="text-2xl">{achievement.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-brainrot-accent">{achievement.title}</h3>
              <p className="text-xs text-brainrot-muted">{achievement.description}</p>
            </div>
          </div>
        ))}

        {locked.map(achievement => (
          <div
            key={achievement.id}
            className="bg-brainrot-dark border border-brainrot-border rounded-lg p-3 flex items-center gap-3 opacity-50"
          >
            <span className="text-2xl opacity-30">{achievement.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-brainrot-muted">{achievement.title}</h3>
              <p className="text-xs text-brainrot-muted/50">{achievement.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
