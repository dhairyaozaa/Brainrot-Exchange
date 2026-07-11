import { useState, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Chart } from './Chart';

export function AssetDetail({ assetId, onBack }: { assetId: string; onBack: () => void }) {
  const brainrots = useGameStore(s => s.brainrots);
  const holdings = useGameStore(s => s.holdings);
  const cash = useGameStore(s => s.cash);
  const marketStatus = useGameStore(s => s.marketStatus);
  const buyShares = useGameStore(s => s.buyShares);
  const sellShares = useGameStore(s => s.sellShares);

  const asset = brainrots.find(b => b.id === assetId);
  const holding = holdings.find(h => h.assetId === assetId);

  const [buyQty, setBuyQty] = useState(1);
  const [sellQty, setSellQty] = useState(1);
  const [timeRange, setTimeRange] = useState<'1h' | '1d' | '1w' | '1m' | 'all'>('1d');
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  const formatPrice = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${n.toFixed(2)}`;
  };

  const chartData = useMemo(() => {
    if (!asset) return [];
    const prices = asset.historicalPrices;
    let slice: number[];
    // With 5s ticks and data stored every 2 ticks, these slice values give:
    // 1h=240pts (480 ticks = 40min real), 1d=120pts (240 ticks = 20min),
    // 1w=300pts (600 ticks = 50min), 1m=600pts (1200 ticks = 100min)
    switch (timeRange) {
      case '1h': slice = prices.slice(-240); break;
      case '1d': slice = prices.slice(-120); break;
      case '1w': slice = prices.slice(-300); break;
      case '1m': slice = prices.slice(-600); break;
      default: slice = prices;
    }
    return slice.map((p, i) => ({ time: i, price: p }));
  }, [asset, timeRange]);

  if (!asset) return <div className="p-4 text-brainrot-red">Asset not found</div>;

  const isUp = asset.dailyChange >= 0;
  const maxBuy = Math.floor(cash / asset.currentPrice);
  const maxSell = holding?.quantity || 0;

  const handleBuy = () => {
    if (buyQty > 0 && buyShares(assetId, buyQty)) {
      setShowBuyModal(false);
      setBuyQty(1);
    }
  };

  const handleSell = () => {
    if (sellQty > 0 && sellQty <= maxSell && sellShares(assetId, sellQty)) {
      setShowSellModal(false);
      setSellQty(1);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-brainrot-muted hover:text-brainrot-text transition-colors text-sm">
        ← Back to Market
      </button>

      {/* Asset header */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{asset.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-brainrot-text">{asset.name}</h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-brainrot-accent font-bold">{asset.ticker}</span>
                <span className="text-brainrot-muted">·</span>
                <span className="text-brainrot-muted">{asset.category}</span>
                <span className="text-brainrot-muted">·</span>
                <span className="text-brainrot-muted">{asset.rarity}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold font-mono">{formatPrice(asset.currentPrice)}</div>
            <div className={`text-sm font-mono ${isUp ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
              {isUp ? '▲' : '▼'} {(asset.dailyChange * 100).toFixed(2)}%
            </div>
          </div>
        </div>
        <p className="text-sm text-brainrot-muted mt-2">{asset.description}</p>

        {/* Traits */}
        <div className="flex flex-wrap gap-2 mt-3">
          {asset.traits.map((trait, i) => (
            <span key={i} className="text-xs bg-brainrot-dark border border-brainrot-border rounded px-2 py-0.5 text-brainrot-muted">
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Price chart */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-brainrot-text">Price Chart</h3>
          <div className="flex items-center gap-2">
            {/* Chart mode toggle */}
            <div className="flex gap-0.5 border border-brainrot-border rounded overflow-hidden">
              <button
                onClick={() => setChartMode('line')}
                className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                  chartMode === 'line'
                    ? 'bg-brainrot-accent/20 text-brainrot-accent'
                    : 'text-brainrot-muted hover:text-brainrot-text'
                }`}
              >
                📈 Line
              </button>
              <button
                onClick={() => setChartMode('candle')}
                className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                  chartMode === 'candle'
                    ? 'bg-brainrot-accent/20 text-brainrot-accent'
                    : 'text-brainrot-muted hover:text-brainrot-text'
                }`}
              >
                🕯 Candle
              </button>
            </div>
            {/* Time range buttons */}
            <div className="flex gap-1">
              {(['1h', '1d', '1w', '1m', 'all'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded text-xs font-mono ${
                    timeRange === r
                      ? 'bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/50'
                      : 'text-brainrot-muted border border-transparent hover:text-brainrot-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Chart data={chartData} height={250} color={isUp ? '#00ff88' : '#ff3355'} mode={chartMode} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Opening Price" value={formatPrice(asset.startingPrice)} />
        <StatBox label="All-Time High" value={formatPrice(asset.allTimeHigh)} color="text-brainrot-accent" />
        <StatBox label="All-Time Low" value={formatPrice(asset.allTimeLow)} color="text-brainrot-red" />
        <StatBox label="Volume" value={asset.volume.toLocaleString()} />
        <StatBox label="Hype" value={`${asset.hype.toFixed(0)}%`} />
        <StatBox label="Popularity" value={`${asset.popularity.toFixed(0)}%`} />
        <StatBox label="Public Trust" value={`${asset.publicTrust.toFixed(0)}%`} />
        <StatBox label="Volatility" value={`${(asset.currentVolatility * 100).toFixed(1)}%`} />
      </div>

      {/* Holdings */}
      {holding && holding.quantity > 0 && (
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-brainrot-text mb-2">Your Holdings</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-brainrot-muted">Quantity: </span>
              <span className="text-brainrot-text">{holding.quantity}</span>
            </div>
            <div>
              <span className="text-brainrot-muted">Avg Price: </span>
              <span className="text-brainrot-text">{formatPrice(holding.averagePurchasePrice)}</span>
            </div>
            <div>
              <span className="text-brainrot-muted">Current Value: </span>
              <span className="text-brainrot-text">{formatPrice(asset.currentPrice * holding.quantity)}</span>
            </div>
            <div>
              <span className="text-brainrot-muted">P&L: </span>
              <span className={(asset.currentPrice - holding.averagePurchasePrice) * holding.quantity >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}>
                {formatPrice((asset.currentPrice - holding.averagePurchasePrice) * holding.quantity)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trading buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowBuyModal(true)}
          disabled={marketStatus !== 'Open'}
          className="flex-1 bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded-lg py-3 font-mono font-bold hover:bg-brainrot-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          BUY {asset.ticker}
        </button>
        <button
          onClick={() => setShowSellModal(true)}
          disabled={marketStatus !== 'Open' || !holding || holding.quantity <= 0}
          className="flex-1 bg-brainrot-red/20 text-brainrot-red border border-brainrot-red/30 rounded-lg py-3 font-mono font-bold hover:bg-brainrot-red/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          SELL {asset.ticker}
        </button>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <Modal onClose={() => setShowBuyModal(false)}>
          <h3 className="text-lg font-bold text-brainrot-text mb-3">Buy {asset.ticker}</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-brainrot-muted">Price per share: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice)}</span>
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Available cash: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(cash)}</span>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setBuyQty(1)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-accent">1</button>
              <button onClick={() => setBuyQty(10)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-accent">10</button>
              <button onClick={() => setBuyQty(100)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-accent">100</button>
              <button onClick={() => setBuyQty(maxBuy)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-accent">MAX</button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-brainrot-muted text-sm">Qty:</span>
              <input
                type="number"
                min={1}
                max={maxBuy}
                value={buyQty}
                onChange={e => setBuyQty(Math.min(maxBuy, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-sm text-brainrot-text focus:outline-none focus:border-brainrot-accent font-mono"
              />
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Total cost: </span>
              <span className="text-brainrot-accent font-mono">{formatPrice(asset.currentPrice * buyQty)}</span>
            </div>
            <button
              onClick={handleBuy}
              disabled={buyQty <= 0 || buyQty > maxBuy}
              className="w-full bg-brainrot-accent/30 text-brainrot-accent border border-brainrot-accent rounded py-2 font-mono font-bold hover:bg-brainrot-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              CONFIRM BUY
            </button>
          </div>
        </Modal>
      )}

      {/* Sell Modal */}
      {showSellModal && (
        <Modal onClose={() => setShowSellModal(false)}>
          <h3 className="text-lg font-bold text-brainrot-text mb-3">Sell {asset.ticker}</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-brainrot-muted">Price per share: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice)}</span>
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Your holdings: </span>
              <span className="text-brainrot-text font-mono">{maxSell}</span>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setSellQty(1)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-red">1</button>
              <button onClick={() => setSellQty(10)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-red">10</button>
              <button onClick={() => setSellQty(Math.min(100, maxSell))} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-red">100</button>
              <button onClick={() => setSellQty(maxSell)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-red">ALL</button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-brainrot-muted text-sm">Qty:</span>
              <input
                type="number"
                min={1}
                max={maxSell}
                value={sellQty}
                onChange={e => setSellQty(Math.min(maxSell, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-sm text-brainrot-text focus:outline-none focus:border-brainrot-red font-mono"
              />
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Total value: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice * sellQty)}</span>
            </div>
            {holding && (
              <div className="text-xs text-brainrot-muted">
                Est. P&L: <span className={(asset.currentPrice - holding.averagePurchasePrice) * sellQty >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}>
                  {formatPrice((asset.currentPrice - holding.averagePurchasePrice) * sellQty)}
                </span>
              </div>
            )}
            <button
              onClick={handleSell}
              disabled={sellQty <= 0 || sellQty > maxSell}
              className="w-full bg-brainrot-red/30 text-brainrot-red border border-brainrot-red rounded py-2 font-mono font-bold hover:bg-brainrot-red/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              CONFIRM SELL
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-brainrot-dark border border-brainrot-border rounded-lg p-2">
      <div className="text-xs text-brainrot-muted">{label}</div>
      <div className={`text-sm font-mono font-bold ${color || 'text-brainrot-text'}`}>{value}</div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-brainrot-card border border-brainrot-border rounded-xl p-4 sm:p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
