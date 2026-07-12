import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { useGameStore } from '../stores/gameStore';
import { MiniChart } from './Chart';
import { formatCash } from '../utils/format';

const PIE_COLORS = [
  '#00ff88', '#ff3355', '#33aaff', '#ffcc00', '#8833ff',
  '#ff6633', '#33ffcc', '#ff33aa', '#44cc44', '#ff8800',
  '#aa44ff', '#66aacc',
];

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-brainrot-darker border border-brainrot-border rounded px-2 py-1.5 text-xs font-mono shadow-lg">
      <div className="text-brainrot-text font-bold">{data.name}</div>
      <div className="text-brainrot-accent">{formatCash(data.value)}</div>
      <div className="text-brainrot-muted">{data.percent.toFixed(1)}%</div>
    </div>
  );
}

export function PortfolioView({ onViewAsset }: { onViewAsset?: (assetId: string) => void }) {
  const cash = useGameStore(s => s.cash);
  const holdings = useGameStore(s => s.holdings);
  const brainrots = useGameStore(s => s.brainrots);
  const trades = useGameStore(s => s.trades);
  const netWorth = useGameStore(s => s.netWorth);
  const totalInvested = useGameStore(s => s.totalInvested);
  const unrealizedProfit = useGameStore(s => s.unrealizedProfit);
  const realizedProfit = useGameStore(s => s.realizedProfit);
  const totalReturn = useGameStore(s => s.totalReturn);
  const bestAsset = useGameStore(s => s.bestAsset);
  const worstAsset = useGameStore(s => s.worstAsset);

  const activeHoldings = useMemo(() =>
    holdings
      .filter(h => h.quantity > 0)
      .map(h => {
        const asset = brainrots.find(b => b.id === h.assetId);
        if (!asset) return null;
        const currentValue = asset.currentPrice * h.quantity;
        const costBasis = h.averagePurchasePrice * h.quantity;
        const profit = currentValue - costBasis;
        const returnPct = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
        return { ...h, asset, currentValue, costBasis, profit, returnPct, type: 'long' as const };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    [holdings, brainrots]
  );

  const shortPositions = useMemo(() =>
    holdings
      .filter(h => h.shortQuantity > 0)
      .map(h => {
        const asset = brainrots.find(b => b.id === h.assetId);
        if (!asset) return null;
        const liability = asset.currentPrice * h.shortQuantity;
        const proceedsAtOpen = h.averageShortPrice * h.shortQuantity;
        const unrealizedPnl = proceedsAtOpen - liability;
        const returnPct = h.averageShortPrice > 0 ? ((h.averageShortPrice - asset.currentPrice) / h.averageShortPrice) * 100 : 0;
        return { ...h, asset, currentValue: liability, costBasis: proceedsAtOpen, profit: unrealizedPnl, returnPct, type: 'short' as const };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    [holdings, brainrots]
  );

  const recentTrades = useMemo(() => trades.slice(0, 50), [trades]);

  // Portfolio allocation pie data
  const pieData = useMemo(() => {
    const data = activeHoldings.map(h => ({
      name: h.asset.ticker,
      value: h.currentValue,
      percent: netWorth > 0 ? (h.currentValue / netWorth) * 100 : 0,
    }));
    if (cash > 0 && netWorth > 0) {
      data.push({
        name: 'CASH',
        value: cash,
        percent: (cash / netWorth) * 100,
      });
    }
    return data;
  }, [activeHoldings, cash, netWorth]);

  // Portfolio value over time (from trades)
  const portfolioHistory = useMemo(() => {
    const history: { day: number; value: number }[] = [{ day: 1, value: 10000 }];
    let runningCash = 10000;
    const runningHoldings: Record<string, { qty: number; avgPrice: number }> = {};

    for (const trade of [...trades].reverse()) {
      const day = trade.day;
      if (trade.type === 'Buy') {
        runningCash -= trade.totalValue;
        const existing = runningHoldings[trade.assetId] || { qty: 0, avgPrice: 0 };
        const newQty = existing.qty + trade.quantity;
        const newAvg = (existing.avgPrice * existing.qty + trade.price * trade.quantity) / newQty;
        runningHoldings[trade.assetId] = { qty: newQty, avgPrice: newAvg };
      } else if (trade.type === 'Short') {
        // Short: cash is credited, no long holding change
        runningCash += trade.totalValue;
      } else if (trade.type === 'Cover') {
        // Cover: cash is debited, no long holding change
        runningCash -= trade.totalValue;
      } else {
        // Regular Sell: cash credited, reduce long holding
        runningCash += trade.totalValue;
        const existing = runningHoldings[trade.assetId];
        if (existing) {
          existing.qty -= trade.quantity;
          if (existing.qty <= 0) delete runningHoldings[trade.assetId];
        }
      }

      let holdingValue = 0;
      for (const [id, h] of Object.entries(runningHoldings)) {
        const a = brainrots.find(b => b.id === id);
        if (a) holdingValue += a.currentPrice * h.qty;
      }

      history.push({ day, value: runningCash + holdingValue });
    }

    // Limit to 100 points
    if (history.length > 100) {
      const step = Math.floor(history.length / 100);
      return history.filter((_, i) => i % step === 0 || i === history.length - 1);
    }
    return history;
  }, [trades, brainrots]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-brainrot-text">Portfolio</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Available Cash</div>
          <div className="text-lg font-mono font-bold text-brainrot-text">{formatCash(cash)}</div>
        </div>
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Net Worth</div>
          <div className={`text-lg font-mono font-bold ${netWorth >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
            {formatCash(netWorth)}
          </div>
        </div>
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Total Invested</div>
          <div className="text-lg font-mono font-bold text-brainrot-text">{formatCash(totalInvested)}</div>
        </div>
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Realized P&L</div>
          <div className={`text-lg font-mono font-bold ${realizedProfit >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
            {formatCash(realizedProfit)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Unrealized P&L</div>
          <div className={`text-sm font-mono font-bold ${unrealizedProfit >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
            {formatCash(unrealizedProfit)}
          </div>
        </div>
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Total Return</div>
          <div className={`text-sm font-mono font-bold ${totalReturn >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
            {formatCash(totalReturn)}
          </div>
        </div>
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Best Asset</div>
          <div className="text-sm font-mono font-bold text-brainrot-accent truncate">{bestAsset || 'N/A'}</div>
        </div>
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <div className="text-xs text-brainrot-muted">Worst Asset</div>
          <div className="text-sm font-mono font-bold text-brainrot-red truncate">{worstAsset || 'N/A'}</div>
        </div>
      </div>

      {/* Portfolio value chart + Allocation pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Portfolio value chart */}
        <div className="lg:col-span-2 bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <h3 className="text-sm font-bold text-brainrot-text mb-2">Portfolio Value Over Time</h3>
          {portfolioHistory.length < 2 ? (
            <div className="h-[200px] flex items-center justify-center text-brainrot-muted text-xs">
              Start trading to see your portfolio history
            </div>
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioHistory} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8833ff" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8833ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#666688" tick={{ fontSize: 10 }} />
                  <YAxis
                    stroke="#666688"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => v >= 100000 ? `${(v/100000).toFixed(0)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toString()}
                  />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-brainrot-darker border border-brainrot-border rounded px-2 py-1.5 text-xs font-mono shadow-lg">
                        <div className="text-brainrot-muted">Day {payload[0].payload.day}</div>
                        <div className="text-brainrot-accent font-bold">{formatCash(payload[0].value as number)}</div>
                      </div>
                    );
                  }} />
                  <Area type="monotone" dataKey="value" stroke="#8833ff" strokeWidth={2} fill="url(#portGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Allocation pie chart */}
        <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
          <h3 className="text-sm font-bold text-brainrot-text mb-2">Asset Allocation</h3>
          {pieData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-brainrot-muted text-xs">
              No holdings yet
            </div>
          ) : (
            <>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pieData.slice(0, 6).map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-brainrot-muted">{entry.name}</span>
                    <span className="text-brainrot-text">{entry.percent.toFixed(1)}%</span>
                  </div>
                ))}
                {pieData.length > 6 && <span className="text-xs text-brainrot-muted">+{pieData.length - 6} more</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Long Holdings */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
        <h3 className="text-sm font-bold text-brainrot-accent mb-2">📈 Long Positions ({activeHoldings.length})</h3>
        {activeHoldings.length === 0 ? (
          <div className="text-center py-4 text-brainrot-muted text-sm">No long holdings yet. Buy shares!</div>
        ) : (
          <div className="space-y-2">
            {activeHoldings.map(h => {
              return (
                <div key={h.assetId} className="flex items-center justify-between bg-brainrot-dark rounded p-2 text-sm">
                  <div className="flex items-center gap-2 cursor-pointer min-w-0 flex-1" onClick={() => onViewAsset?.(h.assetId)}>
                    <span className="text-lg flex-shrink-0">{h.asset.icon}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-brainrot-text hover:text-brainrot-accent transition-colors truncate">{h.asset.ticker}</div>
                      <div className="text-[10px] sm:text-xs text-brainrot-muted truncate">{h.quantity} @ ₹{h.averagePurchasePrice.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-mono font-bold">{formatCash(h.currentValue)}</div>
                      <div className={`text-[10px] sm:text-xs font-mono ${h.profit >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
                        {h.profit >= 0 ? '+' : ''}{h.returnPct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <MiniChart data={h.asset.historicalPrices.slice(-50)} color={h.profit >= 0 ? '#00ff88' : '#ff3355'} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Short Positions */}
      <div className="bg-brainrot-card border border-brainrot-orange/50 rounded-lg p-3">
        <h3 className="text-sm font-bold text-brainrot-orange mb-2">📉 Short Positions ({shortPositions.length})</h3>
        {shortPositions.length === 0 ? (
          <div className="text-center py-4 text-brainrot-muted text-sm">No short positions. Short stocks you think will drop!</div>
        ) : (
          <div className="space-y-2">
            {shortPositions.map(h => {
              const isProfitable = h.profit > 0;
              return (
                <div key={h.assetId} className="flex items-center justify-between bg-brainrot-dark rounded p-2 text-sm">
                  <div className="flex items-center gap-2 cursor-pointer min-w-0 flex-1" onClick={() => onViewAsset?.(h.assetId)}>
                    <span className="text-lg flex-shrink-0">{h.asset.icon}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-brainrot-text hover:text-brainrot-accent transition-colors truncate">{h.asset.ticker}</div>
                      <div className="text-[10px] sm:text-xs text-brainrot-muted truncate">{h.shortQuantity} @ ₹{h.averageShortPrice.toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-mono font-bold">{formatCash(h.costBasis)}</div>
                      <div className={`text-[10px] sm:text-xs font-mono ${isProfitable ? 'text-brainrot-accent' : 'text-brainrot-red'}`}>
                        {isProfitable ? '+' : ''}{h.returnPct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <MiniChart data={h.asset.historicalPrices.slice(-50)} color={isProfitable ? '#00ff88' : '#ff3355'} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-brainrot-card border border-brainrot-border rounded-lg p-3">
        <h3 className="text-sm font-bold text-brainrot-text mb-2">Recent Transactions ({recentTrades.length})</h3>
        {recentTrades.length === 0 ? (
          <div className="text-center py-4 text-brainrot-muted text-sm">No transactions yet.</div>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {recentTrades.map(trade => (
              <div key={trade.id} className="flex items-center justify-between text-xs py-1 border-b border-brainrot-border/30">
                <div className="flex items-center gap-2">
                  <span className={trade.type === 'Buy' ? 'text-brainrot-accent' : 'text-brainrot-red'}>
                    {trade.type}
                  </span>
                  <span className="text-brainrot-text font-bold">{trade.ticker}</span>
                  <span className="text-brainrot-muted">×{trade.quantity}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-brainrot-muted font-mono">₹{trade.price.toFixed(2)}</span>
                  {trade.type === 'Sell' && (
                    <span className={trade.profitLoss >= 0 ? 'text-brainrot-accent' : 'text-brainrot-red'}>
                      {trade.profitLoss >= 0 ? '+' : ''}{formatCash(trade.profitLoss)}
                    </span>
                  )}
                  <span className="text-brainrot-muted">Day {trade.day}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
