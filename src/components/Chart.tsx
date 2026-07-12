import { useMemo, useRef, useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ChartData {
  time: number;
  price: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ChartProps {
  data: ChartData[];
  height?: number;
  color?: string;
  mode?: 'line' | 'candle';
}

function LineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartData;
  return (
    <div className="bg-brainrot-darker border border-brainrot-border rounded px-2 py-1.5 text-xs font-mono shadow-lg pointer-events-none">
      <div className="text-brainrot-muted">Tick #{data.time}</div>
      <div className="text-brainrot-text font-bold">₹{data.price.toFixed(2)}</div>
    </div>
  );
}

/** Responsive standalone candlestick chart with hover tooltip. */
function CandleSVG({ candles, height }: { candles: CandleData[]; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (candles.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-brainrot-muted text-xs">
        Not enough data
      </div>
    );
  }

  const prices = candles.flatMap(c => [c.high, c.low, c.open, c.close]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = range * 0.1;
  const yMin = min - pad;
  const yMax = max + pad;
  const yRange = yMax - yMin;
  const svgW = Math.max(100, width);
  const svgH = height;
  const totalCandleW = svgW / candles.length;
  const candleW = Math.max(3, totalCandleW * 0.7);
  const gap = (svgW - candleW * candles.length) / (candles.length + 1);

  const yPos = (val: number) => {
    const p = svgH - ((val - yMin) / yRange) * svgH;
    return Math.max(0, Math.min(svgH, p));
  };

  const candleCenterX = (i: number) => gap + i * (candleW + gap) + candleW / 2;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    // Find nearest candle center for precise hover
    const idx = candles.reduce((best, _, i) =>
      Math.abs(mx - candleCenterX(i)) < Math.abs(mx - candleCenterX(best)) ? i : best, 0);
    setHoveredCandle(candles[idx]);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setHoveredCandle(null);

  return (
    <div ref={containerRef} style={{ height, width: '100%', position: 'relative' }}>
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible"
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
      >
        {candles.map((c, i) => {
          const isUp = c.close >= c.open;
          const color = isUp ? '#00ff88' : '#ff3355';
          const x = gap + i * (candleW + gap);
          const bodyTop = yPos(Math.max(c.open, c.close));
          const bodyBottom = yPos(Math.min(c.open, c.close));
          const bodyH = Math.max(bodyBottom - bodyTop, 1);
          const isHovered = hoveredCandle === c;
          return (
            <g key={i}>
              <line x1={x + candleW / 2} y1={yPos(c.high)} x2={x + candleW / 2} y2={yPos(c.low)} stroke={color} strokeWidth={1} />
              <rect x={x} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={0.5} />
              {isHovered && <rect x={x} y={0} width={candleW} height={svgH} fill="white" opacity={0.05} />}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredCandle && (
        <div
          className="absolute bg-brainrot-darker border border-brainrot-border rounded px-2 py-1.5 text-xs font-mono shadow-lg pointer-events-none z-10"
          style={{
            left: Math.min(tooltipPos.x + 10, width - 140),
            top: Math.max(0, tooltipPos.y - 70),
          }}
        >
          <div className="text-brainrot-muted">Period #{hoveredCandle.time}</div>
          <div className="text-brainrot-text">O: ₹{hoveredCandle.open.toFixed(2)}</div>
          <div className="text-brainrot-text">H: ₹{hoveredCandle.high.toFixed(2)}</div>
          <div className="text-brainrot-text">L: ₹{hoveredCandle.low.toFixed(2)}</div>
          <div className={hoveredCandle.close >= hoveredCandle.open ? 'text-brainrot-accent' : 'text-brainrot-red'}>
            C: ₹{hoveredCandle.close.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

export function Chart({ data, height = 100, color = '#00ff88', mode = 'line' }: ChartProps) {
  if (data.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-brainrot-muted text-xs">
        Not enough data
      </div>
    );
  }

  // Build candlestick data with adaptive bin sizing
  // Aim for ~40-60 candles regardless of data length
  const candles = useMemo(() => {
    const targetCandles = 50;
    const binSize = Math.max(1, Math.floor(data.length / targetCandles));
    const result: CandleData[] = [];
    for (let i = 0; i < data.length; i += binSize) {
      const slice = data.slice(i, i + binSize);
      if (slice.length === 0) continue;
      const p = slice.map(d => d.price);
      result.push({
        time: slice[0].time,
        open: p[0],
        high: Math.max(...p),
        low: Math.min(...p),
        close: p[p.length - 1],
      });
    }
    return result;
  }, [data]);

  // Line/area chart mode
  if (mode === 'line') {
    const prices = data.map(d => d.price);
    const mn = Math.min(...prices);
    const mx = Math.max(...prices);
    const pad = (mx - mn) * 0.1 || 1;

    return (
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[mn - pad, mx + pad]} hide />
            <Tooltip content={<LineTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${color})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Candlestick mode — responsive SVG with hover tooltip
  return <CandleSVG candles={candles} height={height} />;
}

export function MiniChart({ data, color = '#00ff88' }: { data: number[]; color?: string }) {
  const chartData = data.map((p, i) => ({ time: i, price: p }));
  if (chartData.length < 2) return null;

  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const pad = (mx - mn) * 0.1 || 1;

  return (
    <div style={{ width: 60, height: 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="time" hide />
          <YAxis domain={[mn - pad, mx + pad]} hide />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
