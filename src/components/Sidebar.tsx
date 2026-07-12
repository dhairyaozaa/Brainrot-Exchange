import { useGameStore } from '../stores/gameStore';
import { CATEGORY_COLORS } from '../utils/categoryColors';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  color?: string; // accent color for this nav group
}

const NAV_ITEMS: NavItem[] = [
  { id: 'market', label: 'Market', icon: '📊', color: CATEGORY_COLORS['Beverage Beasts'].hex },
  { id: 'portfolio', label: 'Portfolio', icon: '💼', color: CATEGORY_COLORS['Corporate Creatures'].hex },
  { id: 'news', label: 'News', icon: '📰', color: CATEGORY_COLORS['Government Birds'].hex },
  { id: 'rotter', label: 'ROTTER', icon: '🐦', color: CATEGORY_COLORS['Electronic Animals'].hex },
  { id: 'index', label: 'Brainrot Index', icon: '📈', color: CATEGORY_COLORS['Quantum Creatures'].hex },
  { id: 'room', label: 'Trading Room', icon: '🏠', color: CATEGORY_COLORS['Household Horrors'].hex },
  { id: 'missions', label: 'Missions', icon: '🎯', color: CATEGORY_COLORS['Radioactive Rodents'].hex },
  { id: 'achievements', label: 'Achievements', icon: '🏆', color: CATEGORY_COLORS['Financial Primates'].hex },
  { id: 'stats', label: 'Statistics', icon: '📋', color: CATEGORY_COLORS['Internet Predators'].hex },
  { id: 'prestige', label: 'Prestige', icon: '🔄', color: CATEGORY_COLORS['Space Organisms'].hex },
  { id: 'settings', label: 'Settings', icon: '⚙️', color: '#8a7565' },
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
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-all relative ${
              activeView === item.id
                ? 'bg-brainrot-card border border-brainrot-accent/50'
                : 'text-brainrot-muted hover:text-brainrot-text hover:bg-brainrot-card'
            }`}
            style={activeView === item.id ? { color: item.color, borderColor: item.color + '80' } : undefined}
            title={item.label}
          >
            {item.icon}
            {activeView === item.id && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                style={{ backgroundColor: item.color }}
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-10 bottom-0 z-40 bg-brainrot-darker border-r border-brainrot-border w-48 flex flex-col py-2 overflow-y-auto">
      {NAV_ITEMS.map(item => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all border-l-2 ${
              isActive
                ? 'bg-brainrot-card'
                : 'text-brainrot-muted hover:text-brainrot-text hover:bg-brainrot-card border-transparent'
            }`}
            style={isActive ? {
              color: item.color,
              borderColor: item.color,
              backgroundColor: item.color + '10',
            } : undefined}
          >
            <span className="text-base">{item.icon}</span>
            <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
            {getBadge(item) && (
              item.id === 'prestige' ? (
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: item.color + '33', color: item.color }}
                >
                  {getBadge(item)}
                </span>
              ) : (
                <span
                  className="ml-auto w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: item.color }}
                  title={getBadge(item)}
                />
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
