import { useGameStore } from '../stores/gameStore';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'market', label: 'Market', icon: '📊' },
  { id: 'portfolio', label: 'Portfolio', icon: '💼' },
  { id: 'news', label: 'News', icon: '📰' },
  { id: 'rotter', label: 'ROTTER', icon: '🐦' },
  { id: 'index', label: 'Brainrot Index', icon: '📈' },
  { id: 'room', label: 'Trading Room', icon: '🏠' },
  { id: 'missions', label: 'Missions', icon: '🎯' },
  { id: 'achievements', label: 'Achievements', icon: '🏆' },
  { id: 'stats', label: 'Statistics', icon: '📋' },
  { id: 'prestige', label: 'Prestige', icon: '🔄' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar({
  activeView,
  onViewChange,
  collapsed,
}: {
  activeView: string;
  onViewChange: (view: string) => void;
  collapsed: boolean;
}) {
  const missionCount = useGameStore(s => s.missions.filter(m => !m.completed).length);
  const achievementCount = useGameStore(s => s.achievements.filter(a => !a.unlocked).length);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const getBadge = (item: NavItem): string | undefined => {
    if (item.id === 'missions' && missionCount > 0) return `${missionCount}`;
    if (item.id === 'achievements' && achievementCount > 0) return `${achievementCount}`;
    if (item.id === 'prestige' && prestigeLevel > 0) return `✦${prestigeLevel}`;
    return item.badge;
  };

  if (collapsed) {
    return (
      <div className="fixed left-0 top-10 bottom-0 z-40 bg-brainrot-darker border-r border-brainrot-border w-12 flex flex-col items-center py-2 gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all ${
              activeView === item.id
                ? 'bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/50'
                : 'text-brainrot-muted hover:text-brainrot-text hover:bg-brainrot-card'
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-10 bottom-0 z-40 bg-brainrot-darker border-r border-brainrot-border w-48 flex flex-col py-2 overflow-y-auto">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all border-l-2 ${
            activeView === item.id
              ? 'bg-brainrot-accent/10 text-brainrot-accent border-brainrot-accent'
              : 'text-brainrot-muted hover:text-brainrot-text hover:bg-brainrot-card border-transparent'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
          {getBadge(item) && (
            item.id === 'prestige' ? (
              <span className="ml-auto text-xs bg-brainrot-accent/20 text-brainrot-accent px-1.5 py-0.5 rounded-full">
                {getBadge(item)}
              </span>
            ) : (
              <span className="ml-auto w-2 h-2 rounded-full bg-brainrot-accent animate-pulse" title={getBadge(item)} />
            )
          )}
        </button>
      ))}
    </div>
  );
}
