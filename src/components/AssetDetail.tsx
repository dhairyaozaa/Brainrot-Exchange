import { useState, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';
import { Chart } from './Chart';
import { PHASE_DISPLAY } from '../utils/phaseDisplay';
import { getCategoryColor, getCategoryStyle } from '../utils/categoryColors';
import { getCategoryGlowStyle } from './CategoryPrice';

export function AssetDetail({ assetId, onBack }: { assetId: string; onBack: () => void }) {
  const brainrots = useGameStore(s => s.brainrots);
  const holdings = useGameStore(s => s.holdings);
  const cash = useGameStore(s => s.cash);
  const marketStatus = useGameStore(s => s.marketStatus);
  const buyShares = useGameStore(s => s.buyShares);
  const sellShares = useGameStore(s => s.sellShares);
  const shortSellShares = useGameStore(s => s.shortSellShares);
  const buyToCover = useGameStore(s => s.buyToCover);

  const asset = brainrots.find(b => b.id === assetId);
  const holding = holdings.find(h => h.assetId === assetId);

  const [buyQty, setBuyQty] = useState(1);
  const [sellQty, setSellQty] = useState(1);
  const [shortQty, setShortQty] = useState(1);
  const [coverQty, setCoverQty] = useState(1);
  const [timeRange, setTimeRange] = useState<'2m' | '5m' | '1h' | '1d' | 'all'>('1h');
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showShortModal, setShowShortModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);

  const formatPrice = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${n.toFixed(2)}`;
  };

  const totalTicks = useGameStore(s => s.totalTicks);

  const chartData = useMemo(() => {
    if (!asset) return [];
    const prices = asset.historicalPrices;
    let slice: number[];
    // Data stored every 2 ticks (10s real time per point at 1x speed)
    // 2m = 12pts, 5m = 30pts, 1h = 360pts, 1d = 1440pts, all = everything
    switch (timeRange) {
      case '2m': slice = prices.slice(-12); break;
      case '5m': slice = prices.slice(-30); break;
      case '1h': slice = prices.slice(-360); break;
      case '1d': slice = prices.slice(-1440); break;
      default: slice = prices;
    }
    return slice.map((p, i) => ({ time: i, price: p }));
  }, [asset, timeRange, asset?.historicalPrices.length, totalTicks]);

  if (!asset) return <div className="p-4 text-brainrot-red">Asset not found</div>;

  const prestigeUpgrades = useGameStore(s => s.prestigeUpgrades);

  // Day-level change: % from market open to now
  const dayChangePct = asset.dayOpenPrice > 0
    ? (asset.currentPrice - asset.dayOpenPrice) / asset.dayOpenPrice
    : 0;
  const isUp = dayChangePct >= 0;
  const feeRate = 0.01 - (prestigeUpgrades.find(u => u.id === 'lower_fees')?.currentLevel ?? 0) * 0.001;
  const effectivePrice = asset.currentPrice * (1 + feeRate);
  const maxBuy = Math.floor(cash / effectivePrice);
  const maxSell = holding?.quantity || 0;
  const maxShort = Math.floor(cash / (asset.currentPrice * (1 + feeRate))); // 100% margin: can short up to cash value
  const maxCover = holding?.shortQuantity || 0;

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

  const handleShort = () => {
    if (shortQty > 0 && shortSellShares(assetId, shortQty)) {
      setShowShortModal(false);
      setShortQty(1);
    }
  };

  const handleCover = () => {
    if (coverQty > 0 && coverQty <= maxCover && buyToCover(assetId, coverQty)) {
      setShowCoverModal(false);
      setCoverQty(1);
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
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-bold" style={getCategoryStyle(asset.category)}>{asset.ticker}</span>
                <span className="text-brainrot-muted">·</span>
                <span className={getCategoryColor(asset.category).twClass}>{asset.category}</span>
                <span className="text-brainrot-muted">·</span>
                <span className="text-brainrot-muted">{asset.rarity}</span>
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${PHASE_DISPLAY[asset.phase].bg} ${PHASE_DISPLAY[asset.phase].color} ${PHASE_DISPLAY[asset.phase].border} border`}>
                  {PHASE_DISPLAY[asset.phase].icon} {PHASE_DISPLAY[asset.phase].label}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-2xl font-bold font-mono" style={{...getCategoryStyle(asset.category), ...getCategoryGlowStyle(asset.category)}}>{formatPrice(asset.currentPrice)}</div>
            <div className={`text-sm sm:text-sm font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '▲' : '▼'} {(dayChangePct * 100).toFixed(2)}%
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
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold text-brainrot-text">Price Chart</h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Chart mode toggle */}
            <div className="flex gap-0.5 border border-brainrot-border rounded overflow-hidden">
              <button
                onClick={() => setChartMode('line')}
                className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono transition-colors ${
                  chartMode === 'line'
                    ? 'bg-brainrot-accent/20 text-brainrot-accent'
                    : 'text-brainrot-muted hover:text-brainrot-text'
                }`}
              >
                📈<span className="hidden sm:inline ml-0.5">Line</span>
              </button>
              <button
                onClick={() => setChartMode('candle')}
                className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-mono transition-colors ${
                  chartMode === 'candle'
                    ? 'bg-brainrot-accent/20 text-brainrot-accent'
                    : 'text-brainrot-muted hover:text-brainrot-text'
                }`}
              >
                🕯<span className="hidden sm:inline ml-0.5">Candle</span>
              </button>
            </div>
            {/* Time range buttons */}
            <div className="flex gap-0.5">
              {(['2m', '5m', '1h', '1d', 'all'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-mono ${
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
        <Chart data={chartData} height={250} color={getCategoryColor(asset.category).hex} mode={chartMode} />
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

      {/* Long Holdings */}
      {holding && holding.quantity > 0 && (
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-brainrot-accent mb-2">📈 Long Position</h3>
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
              <span className={(asset.currentPrice - holding.averagePurchasePrice) * holding.quantity >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPrice((asset.currentPrice - holding.averagePurchasePrice) * holding.quantity)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Short Position */}
      {holding && holding.shortQuantity > 0 && (
        <div className="bg-brainrot-card border border-brainrot-orange/50 rounded-lg p-4">
          <h3 className="text-sm font-bold text-brainrot-orange mb-2">📉 Short Position</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-brainrot-muted">Short Quantity: </span>
              <span className="text-brainrot-text">{holding.shortQuantity}</span>
            </div>
            <div>
              <span className="text-brainrot-muted">Avg Short Price: </span>
              <span className="text-brainrot-text">{formatPrice(holding.averageShortPrice)}</span>
            </div>
            <div>
              <span className="text-brainrot-muted">Liability: </span>
              <span className="text-brainrot-text">{formatPrice(asset.currentPrice * holding.shortQuantity)}</span>
            </div>
            <div>
              <span className="text-brainrot-muted">Unrealized P&L: </span>
              <span className={(holding.averageShortPrice - asset.currentPrice) * holding.shortQuantity >= 0 ? 'text-green-400' : 'text-red-400'}>
                {formatPrice((holding.averageShortPrice - asset.currentPrice) * holding.shortQuantity)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Trading buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setShowBuyModal(true)}
          disabled={marketStatus !== 'Open'}
          className="bg-brainrot-accent/20 text-brainrot-accent border border-brainrot-accent/30 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-brainrot-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          BUY
        </button>
        <button
          onClick={() => setShowSellModal(true)}
          disabled={marketStatus !== 'Open' || !holding || holding.quantity <= 0}
          className="bg-brainrot-red/20 text-brainrot-red border border-brainrot-red/30 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-brainrot-red/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          SELL
        </button>
        <button
          onClick={() => setShowShortModal(true)}
          disabled={marketStatus !== 'Open' || cash < asset.currentPrice * 1.025}
          className="bg-brainrot-orange/20 text-brainrot-orange border border-brainrot-orange/30 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-brainrot-orange/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          SHORT
        </button>
        <button
          onClick={() => setShowCoverModal(true)}
          disabled={marketStatus !== 'Open' || !holding || !holding.shortQuantity || holding.shortQuantity <= 0}
          className="bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-lg py-2.5 font-mono font-bold text-sm hover:bg-purple-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          COVER
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
            {/* Fee breakdown */}
            <div className="border-t border-brainrot-border/50 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Subtotal ({buyQty} × {formatPrice(asset.currentPrice)})</span>
                <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice * buyQty)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">
                  Brokerage fee ({(feeRate * 100).toFixed(1)}%{feeRate < 0.01 ? ' ✦' : ''})
                </span>
                <span className="text-brainrot-red font-mono">-{formatPrice(asset.currentPrice * buyQty * feeRate)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t border-brainrot-border/30 pt-1">
                <span className="text-brainrot-text">Total with fee</span>
                <span className="text-brainrot-accent font-mono">{formatPrice(asset.currentPrice * buyQty * (1 + feeRate))}</span>
              </div>
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
            {/* Fee breakdown */}
            <div className="border-t border-brainrot-border/50 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Gross proceeds ({sellQty} × {formatPrice(asset.currentPrice)})</span>
                <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice * sellQty)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Brokerage fee ({(feeRate * 100).toFixed(1)}%)</span>
                <span className="text-brainrot-red font-mono">-{formatPrice(asset.currentPrice * sellQty * feeRate)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t border-brainrot-border/30 pt-1">
                <span className="text-brainrot-text">Net proceeds</span>
                <span className="text-brainrot-accent font-mono">{formatPrice(asset.currentPrice * sellQty * (1 - feeRate))}</span>
              </div>
            </div>
            {holding && (
              <div className="text-xs text-brainrot-muted">
                Est. P&L:                <span className={(asset.currentPrice * (1 - feeRate) - holding.averagePurchasePrice) * sellQty >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatPrice((asset.currentPrice * (1 - feeRate) - holding.averagePurchasePrice) * sellQty)}
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

      {/* Short Modal */}
      {showShortModal && (
        <Modal onClose={() => setShowShortModal(false)}>
          <h3 className="text-lg font-bold text-brainrot-orange mb-3">🔻 Short {asset.ticker}</h3>
          <p className="text-xs text-brainrot-muted mb-3">Borrow and sell shares. Profit when price drops. Margin: 100% of sale value required.</p>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-brainrot-muted">Price per share: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice)}</span>
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Available cash: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(cash)}</span>
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Max short (100% margin): </span>
              <span className="text-brainrot-orange font-mono">{maxShort}</span>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setShortQty(1)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-orange">1</button>
              <button onClick={() => setShortQty(10)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-orange">10</button>
              <button onClick={() => setShortQty(100)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-orange">100</button>
              <button onClick={() => setShortQty(maxShort)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-brainrot-orange">MAX</button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-brainrot-muted text-sm">Qty:</span>
              <input
                type="number"
                min={1}
                max={maxShort}
                value={shortQty}
                onChange={e => setShortQty(Math.min(maxShort, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-sm text-brainrot-text focus:outline-none focus:border-brainrot-orange font-mono"
              />
            </div>
            {/* Fee breakdown */}
            <div className="border-t border-brainrot-border/50 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Sale proceeds ({shortQty} × {formatPrice(asset.currentPrice)})</span>
                <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice * shortQty)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Brokerage fee ({(feeRate * 100).toFixed(1)}%)</span>
                <span className="text-brainrot-red font-mono">-{formatPrice(asset.currentPrice * shortQty * feeRate)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t border-brainrot-border/30 pt-1">
                <span className="text-brainrot-text">Net cash credited</span>
                <span className="text-brainrot-accent font-mono">{formatPrice(asset.currentPrice * shortQty * (1 - feeRate))}</span>
              </div>
              <div className="flex justify-between text-xs text-brainrot-muted">
                <span>Breakeven price</span>
                <span className="font-mono">{formatPrice(asset.currentPrice * (1 + feeRate))}</span>
              </div>
            </div>
            <button
              onClick={handleShort}
              disabled={shortQty <= 0 || shortQty > maxShort}
              className="w-full bg-brainrot-orange/30 text-brainrot-orange border border-brainrot-orange rounded py-2 font-mono font-bold hover:bg-brainrot-orange/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              CONFIRM SHORT
            </button>
          </div>
        </Modal>
      )}

      {/* Cover Modal */}
      {showCoverModal && (
        <Modal onClose={() => setShowCoverModal(false)}>
          <h3 className="text-lg font-bold text-purple-400 mb-3">🔄 Cover {asset.ticker} Short</h3>
          <p className="text-xs text-brainrot-muted mb-3">Buy back borrowed shares to close your short position.</p>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-brainrot-muted">Price per share: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice)}</span>
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Short position: </span>
              <span className="text-brainrot-orange font-mono">{maxCover} @ {formatPrice(holding?.averageShortPrice ?? 0)}</span>
            </div>
            <div className="text-sm">
              <span className="text-brainrot-muted">Available cash: </span>
              <span className="text-brainrot-text font-mono">{formatPrice(cash)}</span>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setCoverQty(1)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-purple-400">1</button>
              <button onClick={() => setCoverQty(10)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-purple-400">10</button>
              <button onClick={() => setCoverQty(Math.min(100, maxCover))} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-purple-400">100</button>
              <button onClick={() => setCoverQty(maxCover)} className="px-2 py-1 bg-brainrot-dark border border-brainrot-border rounded text-xs hover:border-purple-400">ALL</button>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-brainrot-muted text-sm">Qty:</span>
              <input
                type="number"
                min={1}
                max={maxCover}
                value={coverQty}
                onChange={e => setCoverQty(Math.min(maxCover, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 bg-brainrot-dark border border-brainrot-border rounded px-2 py-1 text-sm text-brainrot-text focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>
            {/* Fee breakdown */}
            <div className="border-t border-brainrot-border/50 pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Cost to buy ({coverQty} × {formatPrice(asset.currentPrice)})</span>
                <span className="text-brainrot-text font-mono">{formatPrice(asset.currentPrice * coverQty)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-brainrot-muted">Brokerage fee ({(feeRate * 100).toFixed(1)}%)</span>
                <span className="text-brainrot-red font-mono">-{formatPrice(asset.currentPrice * coverQty * feeRate)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t border-brainrot-border/30 pt-1">
                <span className="text-brainrot-text">Total cost</span>
                <span className="text-brainrot-red font-mono">{formatPrice(asset.currentPrice * coverQty * (1 + feeRate))}</span>
              </div>
              {holding && (
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-brainrot-muted">Est. P&L</span>
                  <span className={(holding.averageShortPrice - asset.currentPrice - asset.currentPrice * feeRate) * coverQty >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatPrice((holding.averageShortPrice - asset.currentPrice - asset.currentPrice * feeRate) * coverQty)}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleCover}
              disabled={coverQty <= 0 || coverQty > maxCover}
              className="w-full bg-purple-600/30 text-purple-400 border border-purple-600 rounded py-2 font-mono font-bold hover:bg-purple-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              CONFIRM COVER
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
