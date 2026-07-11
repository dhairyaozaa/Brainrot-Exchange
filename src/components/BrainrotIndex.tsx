import { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Chart } from './Chart';

export function BrainrotIndex() {
  const brainrots = useGameStore(s => s.brainrots);
  const marketCondition = useGameStore(s => s.marketCondition);
  const globalSentiment = useGameStore(s => s.globalSentiment);

  const categories = useMemo(() => {
    const catMap = new Map<string, { assets: typeof brainrots; totalChange: number }>();
    for (const asset of brainrots) {
      if (!asset.unlocked) continue;
      const existing = catMap.get(asset.category) || { assets: [], totalChange: 0 };
      existing.assets.push(asset);
      existing.totalChange += asset.dailyChange;
      catMap.set(asset.category, existing);
    }
    return Array.from(catMap.entries()).map(([name, data]) => ({
      name,
      avgChange: data.totalChange / data.assets.length,
      count: data.assets.length,
      avgPrice: data.assets.reduce((s, a) => s + a.currentPrice, 0) / data.assets.length,
    }));
  }, [brainrots]);

  // Build index history from average of all brainrot prices
  const indexHistory = useMemo(() => {
    if (brainrots.length === 0) return [];
    const sample = brainrots[0].historicalPrices.slice(0, 300);
    return sample.map((_, i) => {
      const avg = brainrots.reduce((s, b) => {
        const p = b.historicalPrices[i];
        return s + (p ?? b.startingPrice);
      }, 0) / brainrots.filter(b => b.historicalPrices[i] != null).length;
      return { time: i, price: avg || 0 };
    });
  }, [brainrots]);

  const gainers = useMemo(() =>
    [...brainrots].filter(b => b.unlocked).sort((a, b) => b.dailyChange - a.dailyChange).slice(0, 5),
    [brainrots]
  );

  const losers = useMemo(() =>
    [...brainrots].filter(b => b.unlocked).sort((a, b) => a.dailyChange - b.dailyChange).slice(0, 5),
    [brainrots]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-brainrot-text">Brainrot Index</h2>

      {/* Index chart */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-brainrot-text">BRAINROT INDEX</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-brainrot-muted">Market:</span>
            <span className="text-brainrot-text">{marketCondition}</span>
            <span className="text-brainrot-muted">Sentiment:</span>
            <span className={`${globalSentiment >= 50 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
              {globalSentiment.toFixed(0)}%
            </span>
          </div>
        </div>
        <Chart data={indexHistory} height={200} color="#8833ff" />
      </div>

      {/* Category performance */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
        <h3 className="text-sm font-bold text-brainrot-text mb-2">Category Performance</h3>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.name} className="flex items-center justify-between text-sm">
              <span className="text-brainrot-text">{cat.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-brainrot-muted text-xs">{cat.count} assets</span>
                <span className={`font-mono w-20 text-right ${cat.avgChange >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
                  {cat.avgChange >= 0 ? '▲' : '▼'} {(cat.avgChange * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top gainers and losers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <h3 className="text-sm font-bold text-brainrot-accent mb-2">Top Gainers</h3>
          <div className="space-y-1">
            {gainers.map(asset => (
              <div key={asset.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span>{asset.icon}</span>
                  <span className="text-brainrot-text font-bold">{asset.ticker}</span>
                </div>
                <span className="text-brainrot-accent font-mono">
                  ▲ {(asset.dailyChange * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <h3 className="text-sm font-bold text-brainrot-red mb-2">Top Losers</h3>
          <div className="space-y-1">
            {losers.map(asset => (
              <div key={asset.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span>{asset.icon}</span>
                  <span className="text-brainrot-text font-bold">{asset.ticker}</span>
                </div>
                <span className="text-brainrot-red font-mono">
                  ▼ {(asset.dailyChange * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
