import { useGameStore } from '../stores/gameStore';

const reliabilityColors: Record<string, string> = {
  'Verified': 'bg-green-900/50 text-green-400 border-green-900',
  'Likely': 'bg-blue-900/50 text-blue-400 border-blue-900',
  'Unconfirmed': 'bg-yellow-900/50 text-yellow-400 border-yellow-900',
  'Suspicious': 'bg-orange-900/50 text-orange-400 border-orange-900',
  'Probably Invented': 'bg-red-900/50 text-red-400 border-red-900',
  'Posted by a Pigeon': 'bg-purple-900/50 text-purple-400 border-purple-900',
};

export function NewsView() {
  const news = useGameStore(s => s.news);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-brainrot-text">Breaking News</h2>
      <p className="text-xs text-brainrot-muted">
        News affects asset prices. Reliability ratings help determine how much to trust each story.
      </p>

      {news.length === 0 ? (
        <div className="text-center py-8 text-brainrot-muted text-sm">
          No news yet. News will appear as the market runs.
        </div>
      ) : (
        <div className="space-y-2">
          {news.map(item => (
            <div
              key={item.id}
              className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-brainrot-text">{item.headline}</h3>
                <span className={`text-xs px-1.5 py-0.5 rounded border whitespace-nowrap ${reliabilityColors[item.reliability] || ''}`}>
                  {item.reliability}
                </span>
              </div>
              <p className="text-xs text-brainrot-muted">{item.description}</p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {item.relatedAssets.length > 0 && (
                  <span className="text-brainrot-accent">Affects: {item.relatedAssets.map(id => {
                    const asset = useGameStore.getState().brainrots.find(b => b.id === id);
                    return asset?.ticker || id;
                  }).join(', ')}</span>
                )}
                {item.relatedCategories.length > 0 && (
                  <span className="text-brainrot-blue">Category: {item.relatedCategories.join(', ')}</span>
                )}
                <span className="text-brainrot-muted">
                  Effect: {item.effectStrength >= 0 ? '+' : ''}{(item.effectStrength * 100).toFixed(0)}%
                </span>
                <span className="text-brainrot-muted">
                  Duration: {item.effectDuration.toFixed(0)} ticks
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
