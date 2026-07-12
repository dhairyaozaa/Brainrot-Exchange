import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { PHASE_DISPLAY } from '../utils/phaseDisplay';


export function MarketView({ onViewAsset }: { onViewAsset?: (assetId: string) => void }) {
  const brainrots = useGameStore(s => s.brainrots);
  const holdings = useGameStore(s => s.holdings);
  const cash = useGameStore(s => s.cash);
  const marketStatus = useGameStore(s => s.marketStatus);
  const buyShares = useGameStore(s => s.buyShares);
  const sellShares = useGameStore(s => s.sellShares);
  const shortSellShares = useGameStore(s => s.shortSellShares);
  const buyToCover = useGameStore(s => s.buyToCover);
  const globalSentiment = useGameStore(s => s.globalSentiment);
  const marketCondition = useGameStore(s => s.marketCondition);
  const recentWhaleTrades = useGameStore(s => s.recentWhaleTrades);
  const upgrades = useGameStore(s => s.upgrades);
  const hasWhaleTracker = upgrades.find(u => u.id === 'whale_tracker')?.purchased;
  const whales = useGameStore(s => s.whales);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'hype' | 'phase'>('change');

  const filtered = brainrots
    .filter(b => b.unlocked)
    .filter(b => {
      if (search) {
        const s = search.toLowerCase();
        return b.name.toLowerCase().includes(s) || b.ticker.toLowerCase().includes(s);
      }
      return true;
    })
    .filter(b => categoryFilter === 'All' || b.category === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'price': return b.currentPrice - a.currentPrice;
        case 'change': {
          const aChange = a.dayOpenPrice > 0 ? (a.currentPrice - a.dayOpenPrice) / a.dayOpenPrice : 0;
          const bChange = b.dayOpenPrice > 0 ? (b.currentPrice - b.dayOpenPrice) / b.dayOpenPrice : 0;
          return Math.abs(bChange) - Math.abs(aChange);
        }
        case 'hype': return b.hype - a.hype;
        case 'phase': {
          const order = ['breakout', 'uptrend', 'accumulation', 'distribution', 'downtrend', 'panic'];
          return order.indexOf(a.phase) - order.indexOf(b.phase);
        }
        default: return 0;
      }
    });

  const categories = ['All', ...new Set(brainrots.filter(b => b.unlocked).map(b => b.category))];

  const formatPrice = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${n.toFixed(2)}`;
  };

  const getHolding = (assetId: string) => holdings.find(h => h.assetId === assetId);

  const handleQuickBuy = (assetId: string) => {
    const asset = brainrots.find(b => b.id === assetId);
    if (!asset) return;
    const qty = Math.max(1, Math.floor(cash / asset.currentPrice * 0.1));
    if (qty > 0) buyShares(assetId, qty);
  };

  const handleQuickSell = (assetId: string) => {
    const holding = getHolding(assetId);
    if (holding && holding.quantity > 0) {
      sellShares(assetId, Math.ceil(holding.quantity * 0.25));
    }
  };

  const handleQuickShort = (assetId: string) => {
    const asset = brainrots.find(b => b.id === assetId);
    if (!asset) return;
    // 25% of cash for 100% margin, with fee adjustment
    const qty = Math.max(1, Math.floor((cash * 0.25) / (asset.currentPrice * 1.025)));
    if (qty > 0) shortSellShares(assetId, qty);
  };

  const handleQuickCover = (assetId: string) => {
    const holding = getHolding(assetId);
    if (holding && holding.shortQuantity > 0) {
      buyToCover(assetId, Math.ceil(holding.shortQuantity * 0.25));
    }
  };  

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-brainrot-text">Market</h2>
          <span className={`text-xs px-2 py-0.5 rounded ${
            marketStatus === 'Open' ? 'bg-green-900/50 text-brainrot-accent' : 'bg-red-900/50 text-brainrot-red'
          }`}>
            {marketStatus}
          </span>
          <span className="text-xs text-brainrot-muted">
            Sentiment: {globalSentiment.toFixed(0)}%
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-xs text-brainrot-text w-32 focus:outline-none focus:border-brainrot-accent"
          />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-xs text-brainrot-text focus:outline-none focus:border-brainrot-accent"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-xs text-brainrot-text focus:outline-none focus:border-brainrot-accent"
          >
            <option value="change">Movement</option>
            <option value="price">Price</option>
            <option value="name">Name</option>
            <option value="hype">Hype</option>
            <option value="phase">Phase</option>
          </select>
        </div>
      </div>

      {/* Market condition banner */}
      {marketCondition !== 'Normal' && (
        <div className={`px-3 py-1.5 rounded text-xs font-mono ${
          marketCondition === 'Bull Market' || marketCondition === 'Meme Rally' || marketCondition === 'Short Squeeze'
            ? 'bg-green-900/30 text-brainrot-accent border border-green-900'
            : marketCondition === 'Flash Crash' || marketCondition === 'Bear Market' || marketCondition === 'Recession'
              ? 'bg-red-900/30 text-brainrot-red border border-red-900'
              : 'bg-yellow-900/30 text-brainrot-yellow border border-yellow-900'
        }`}>
          ⚠ Market Condition: {marketCondition}
        </div>
      )}

      {/* Mobile: card view */}
      <div className="sm:hidden space-y-2">
        {filtered.map(asset => {
          const holding = getHolding(asset.id);
          const dayChangePct = asset.dayOpenPrice > 0
            ? (asset.currentPrice - asset.dayOpenPrice) / asset.dayOpenPrice
            : 0;
          const isUp = dayChangePct >= 0;
          return (
            <div
              key={asset.id}
              className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 space-y-2 cursor-pointer hover:border-brainrot-accent/50 transition-colors"
              onClick={() => onViewAsset?.(asset.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{asset.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-brainrot-text">{asset.ticker}</div>
                    <div className="text-xs text-brainrot-muted">{asset.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">{formatPrice(asset.currentPrice)}</div>
                  <div className={`text-xs font-mono ${isUp ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
                    {isUp ? '▲' : '▼'} {(dayChangePct * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-brainrot-muted">Vol: {asset.volume.toLocaleString()}</span>
                <span className="text-brainrot-muted">Hype: {asset.hype.toFixed(0)}%</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PHASE_DISPLAY[asset.phase].bg} ${PHASE_DISPLAY[asset.phase].color} ${PHASE_DISPLAY[asset.phase].border} border`}>
                  {PHASE_DISPLAY[asset.phase].icon} {PHASE_DISPLAY[asset.phase].label}
                </span>
              </div>
              {holding && holding.quantity > 0 && (
                <div className="text-xs text-brainrot-blue">
                  Long: {holding.quantity} @ ₹{holding.averagePurchasePrice.toFixed(2)}
                </div>
              )}
              {holding && holding.shortQuantity > 0 && (
                <div className="text-xs text-brainrot-orange">
                  Short: {holding.shortQuantity} @ ₹{holding.averageShortPrice.toFixed(2)}
                </div>
              )}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickBuy(asset.id); }}
                  disabled={marketStatus !== 'Open'}
                  className="flex-1 bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded px-2 py-1 text-xs font-mono hover:bg-brainrot-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Buy
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickSell(asset.id); }}
                  disabled={marketStatus !== 'Open' || !holding || holding.quantity <= 0}
                  className="flex-1 bg-brainrot-red/20 text-brainrot-red border border-brainrot-red/30 rounded px-2 py-1 text-xs font-mono hover:bg-brainrot-red/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Sell
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickShort(asset.id); }}
                  disabled={marketStatus !== 'Open' || cash < asset.currentPrice * 1.025}
                  className="flex-1 bg-brainrot-orange/20 text-brainrot-orange border border-brainrot-orange/30 rounded px-2 py-1 text-xs font-mono hover:bg-brainrot-orange/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Short
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickCover(asset.id); }}
                  disabled={marketStatus !== 'Open' || !holding || !holding.shortQuantity || holding.shortQuantity <= 0}
                  className="flex-1 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded px-2 py-1 text-xs font-mono hover:bg-purple-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Cover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs sm:text-sm font-mono">
          <thead>
            <tr className="text-brainrot-muted border-b border-brainrot-border">
              <th className="text-left py-2 px-2">Asset</th>
              <th className="text-left py-2 px-2">Ticker</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Day</th>
              <th className="text-right py-2 px-2">Vol</th>
              <th className="text-center py-2 px-2">Phase</th>
              <th className="text-right py-2 px-2">Hype</th>
              <th className="text-center py-2 px-2">Risk</th>
              <th className="text-right py-2 px-2">Holdings</th>
              <th className="text-center py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(asset => {
              const holding = getHolding(asset.id);
              const dayChangePct = asset.dayOpenPrice > 0
                ? (asset.currentPrice - asset.dayOpenPrice) / asset.dayOpenPrice
                : 0;
              const isUp = dayChangePct >= 0;
              return (
                <tr
                  key={asset.id}
                  className="border-b border-brainrot-border/50 hover:bg-brainrot-card/50 cursor-pointer transition-colors"
                  onClick={() => onViewAsset?.(asset.id)}
                >
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{asset.icon}</span>
                      <span className="text-brainrot-text truncate max-w-[120px] group-hover:text-brainrot-accent transition-colors">{asset.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 font-bold text-brainrot-text">{asset.ticker}</td>
                  <td className="py-2 px-2 text-right">{formatPrice(asset.currentPrice)}</td>
                  <td className={`py-2 px-2 text-right ${isUp ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
                    {isUp ? '▲' : '▼'} {(dayChangePct * 100).toFixed(2)}%
                  </td>
                  <td className="py-2 px-2 text-right text-brainrot-muted">
                    {asset.volume >= 1000000 ? `${(asset.volume / 1000000).toFixed(1)}M` :
                     asset.volume >= 1000 ? `${(asset.volume / 1000).toFixed(1)}K` :
                     asset.volume.toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${PHASE_DISPLAY[asset.phase].bg} ${PHASE_DISPLAY[asset.phase].color} ${PHASE_DISPLAY[asset.phase].border} border`} title={PHASE_DISPLAY[asset.phase].label}>
                      {PHASE_DISPLAY[asset.phase].icon}
                      <span className="hidden lg:inline ml-0.5">{PHASE_DISPLAY[asset.phase].label}</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-16 bg-brainrot-dark rounded-full h-1.5">
                        <div
                          className="h-full rounded-full bg-brainrot-accent"
                          style={{ width: `${asset.hype}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      asset.riskRating === 'Low' ? 'bg-green-900/50 text-brainrot-accent' :
                      asset.riskRating === 'Medium' ? 'bg-yellow-900/50 text-brainrot-yellow' :
                      asset.riskRating === 'High' ? 'bg-orange-900/50 text-brainrot-orange' :
                      asset.riskRating === 'Extreme' ? 'bg-red-900/50 text-brainrot-red' :
                      'bg-purple-900/50 text-brainrot-pink'
                    }`}>
                      {asset.riskRating === 'Financial Suicide' ? '💀' : asset.riskRating}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {holding && holding.quantity > 0 && (
                      <div className="text-brainrot-blue text-[10px]">▲ {holding.quantity} @ ₹{holding.averagePurchasePrice.toFixed(0)}</div>
                    )}
                    {holding && holding.shortQuantity > 0 && (
                      <div className="text-brainrot-orange text-[10px]">▼ {holding.shortQuantity} @ ₹{holding.averageShortPrice.toFixed(0)}</div>
                    )}
                    {(!holding || (holding.quantity <= 0 && holding.shortQuantity <= 0)) && (
                      <span className="text-brainrot-muted">-</span>
                    )}
                  </td>
                  <td className="py-2 px-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 justify-center flex-wrap">
                      <button
                        onClick={() => handleQuickBuy(asset.id)}
                        disabled={marketStatus !== 'Open'}
                        className="px-1.5 py-1 bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded text-xs hover:bg-brainrot-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => handleQuickSell(asset.id)}
                        disabled={marketStatus !== 'Open' || !holding || holding.quantity <= 0}
                        className="px-1.5 py-1 bg-brainrot-red/20 text-brainrot-red border border-brainrot-red/30 rounded text-xs hover:bg-brainrot-red/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Sell
                      </button>
                      <button
                        onClick={() => handleQuickShort(asset.id)}
                        disabled={marketStatus !== 'Open' || cash < asset.currentPrice * 1.025}
                        className="px-1.5 py-1 bg-brainrot-orange/20 text-brainrot-orange border border-brainrot-orange/30 rounded text-xs hover:bg-brainrot-orange/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Short
                      </button>
                      <button
                        onClick={() => handleQuickCover(asset.id)}
                        disabled={marketStatus !== 'Open' || !holding || !holding.shortQuantity || holding.shortQuantity <= 0}
                        className="px-1.5 py-1 bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded text-xs hover:bg-purple-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        Cover
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-brainrot-muted">
          No assets found. Try adjusting your search or filters.
        </div>
      )}

      {/* Whale Activity Panel */}
      {hasWhaleTracker && recentWhaleTrades.length > 0 && (
        <div className="bg-brainrot-card border border-brainrot-yellow/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-brainrot-yellow">🐋</span>
            <h3 className="text-sm font-bold text-brainrot-yellow">Whale Activity</h3>
            <span className="text-xs text-brainrot-muted ml-auto">
              {whales.filter(w => w.wealth > 0).length} active whales
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentWhaleTrades.slice(0, 10).map((trade, i) => {
              const isBuy = trade.type === 'Buy';
              return (
                <div
                  key={`${trade.whaleId}_${i}`}
                  className={`flex items-center gap-1.5 bg-brainrot-dark rounded px-2 py-1 text-xs transition-all hover:scale-105 ${isBuy ? 'hover:bg-green-900/30' : 'hover:bg-red-900/30'}`}
                >
                  <span className="text-brainrot-yellow">{trade.whaleName.slice(0, 12)}</span>
                  <span className={isBuy ? 'text-brainrot-accent' : 'text-brainrot-red'}>
                    {isBuy ? '▲' : '▼'}
                  </span>
                  <span className="text-brainrot-text font-bold">${trade.ticker}</span>
                  <span className="text-brainrot-muted">×{trade.quantity >= 1000 ? `${(trade.quantity / 1000).toFixed(1)}K` : trade.quantity}</span>
                </div>
              );
            })}
          </div>
          {recentWhaleTrades.length > 10 && (
            <div className="text-xs text-brainrot-muted mt-1">+{recentWhaleTrades.length - 10} more trades</div>
          )}
        </div>
      )}
    </div>
  );
}
