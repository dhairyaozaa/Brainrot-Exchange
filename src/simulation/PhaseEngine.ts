import type { BrainrotAsset, TradingPhase, MarketCondition } from '../types';

/** Ticks per candle (10 ticks × 5s = 50s real time per candle) */
const CANDLE_TICKS = 10;

export interface PhaseSnapshot {
  /** Directional trend bias as a price-change fraction for this tick (-0.03 to +0.03) */
  trendBias: number;
  /** Volatility multiplier for this phase (0.5-3.0) */
  volatilityMultiplier: number;
  /** Volume multiplier for this phase (1-8) - spikes during breakout/panic */
  volumeMultiplier: number;
  /** Whether a new candle just completed this tick */
  candleCompleted: boolean;
}

// ── Phase definitions ──────────────────────────────────────────────────────

interface PhaseDef {
  minTicks: number;
  maxTicks: number;
  /** Typical trend-bias range per tick */
  minTrend: number;
  maxTrend: number;
  volMultiplier: number;
  /** Possible next phases with weights */
  transitions: { phase: TradingPhase; weight: number }[];
}

const PHASE_DEFS: Record<TradingPhase, PhaseDef> = {
  accumulation: {
    minTicks: 40, maxTicks: 100,
    minTrend: -0.0005, maxTrend: 0.0005,
    volMultiplier: 0.5,
    transitions: [
      { phase: 'breakout', weight: 55 },
      { phase: 'uptrend', weight: 30 },
      { phase: 'accumulation', weight: 15 }, // stay
    ],
  },
  breakout: {
    minTicks: 10, maxTicks: 30,
    minTrend: 0.008, maxTrend: 0.025,
    volMultiplier: 2.0,
    transitions: [
      { phase: 'uptrend', weight: 100 },
    ],
  },
  uptrend: {
    minTicks: 30, maxTicks: 80,
    minTrend: 0.002, maxTrend: 0.008,
    volMultiplier: 1.0,
    transitions: [
      { phase: 'distribution', weight: 60 },
      { phase: 'accumulation', weight: 20 },
      { phase: 'uptrend', weight: 20 }, // stay
    ],
  },
  distribution: {
    minTicks: 20, maxTicks: 60,
    minTrend: -0.001, maxTrend: 0.001,
    volMultiplier: 1.5,
    transitions: [
      { phase: 'panic', weight: 50 },
      { phase: 'downtrend', weight: 30 },
      { phase: 'distribution', weight: 20 }, // stay
    ],
  },
  panic: {
    minTicks: 5, maxTicks: 20,
    minTrend: -0.025, maxTrend: -0.008,
    volMultiplier: 2.5,
    transitions: [
      { phase: 'downtrend', weight: 100 },
    ],
  },
  downtrend: {
    minTicks: 30, maxTicks: 80,
    minTrend: -0.008, maxTrend: -0.002,
    volMultiplier: 1.0,
    transitions: [
      { phase: 'accumulation', weight: 60 },
      { phase: 'distribution', weight: 20 },
      { phase: 'downtrend', weight: 20 }, // stay
    ],
  },
};

/** Pick a next phase from weighted transitions */
function pickNextPhase(current: TradingPhase): TradingPhase {
  const def = PHASE_DEFS[current];
  const totalWeight = def.transitions.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of def.transitions) {
    roll -= t.weight;
    if (roll <= 0) return t.phase;
  }
  return def.transitions[def.transitions.length - 1].phase;
}

// ── Exported helpers ───────────────────────────────────────────────────────

/**
 * Initialize phase data on a freshly-created asset.
 */
export function initPhaseData(asset: BrainrotAsset): void {
  asset.phase = 'accumulation';
  asset.phaseTicksRemaining = rollDuration('accumulation');
  asset.trendStrength = 0;
  asset.dayOpenPrice = asset.currentPrice;
  asset.candleOpen = asset.currentPrice;
  asset.candleHigh = asset.currentPrice;
  asset.candleLow = asset.currentPrice;
  asset.candleTicks = 0;
  asset.candles = [];
}

function rollDuration(phase: TradingPhase): number {
  const d = PHASE_DEFS[phase];
  return d.minTicks + Math.floor(Math.random() * (d.maxTicks - d.minTicks));
}

function trendForPhase(phase: TradingPhase, progress: number): number {
  const d = PHASE_DEFS[phase];
  // Add a progress curve: early phase is weaker, mid-phase is strongest, late phase fades
  const curve = Math.sin(progress * Math.PI); // 0→1→0
  const base = d.minTrend + (d.maxTrend - d.minTrend) * curve;
  // Add small randomness to make it non-uniform
  const jitter = (Math.random() - 0.5) * (d.maxTrend - d.minTrend) * 0.3;
  return base + jitter;
}

/**
 * Advances phase state for one asset on one tick.
 * Returns the phase snapshot for this tick.
 */
export function tickPhase(
  asset: BrainrotAsset,
  tick: number,
  marketCondition: MarketCondition,
): PhaseSnapshot {
  // ── Phase progression ──
  asset.phaseTicksRemaining--;

  if (asset.phaseTicksRemaining <= 0) {
    const next = pickNextPhase(asset.phase);
    asset.phase = next;
    asset.phaseTicksRemaining = rollDuration(next);
    // Slight re-adjust trend on phase change based on new phase
  }

  // Compute trend strength based on phase
  const phaseProgress = 1 - (asset.phaseTicksRemaining / (PHASE_DEFS[asset.phase].maxTicks));
  const rawTrend = trendForPhase(asset.phase, Math.min(1, phaseProgress));

  // Adjust trend for market conditions
  let marketMultiplier = 1;
  switch (marketCondition) {
    case 'Bull Market': marketMultiplier = 1.3; break;
    case 'Bear Market': marketMultiplier = 0.6; break;
    case 'Meme Rally': marketMultiplier = rawTrend > 0 ? 1.8 : 0.8; break;
    case 'Flash Crash': marketMultiplier = rawTrend < 0 ? 2.0 : 0.5; break;
    case 'Short Squeeze': marketMultiplier = rawTrend > 0 ? 2.5 : 0.5; break;
    case 'Market Bubble': marketMultiplier = rawTrend > 0 ? 1.5 : 1; break;
    case 'Recession': marketMultiplier = rawTrend < 0 ? 1.4 : 0.7; break;
    default: marketMultiplier = 1;
  }

  const trendBias = rawTrend * marketMultiplier;
  const volMultiplier = PHASE_DEFS[asset.phase].volMultiplier;

  // Volume multiplier: spikes during breakout and panic
  let volumeMultiplier = 1;
  switch (asset.phase) {
    case 'breakout': volumeMultiplier = 4 + Math.random() * 4; break;  // 4x-8x
    case 'panic': volumeMultiplier = 5 + Math.random() * 3; break;     // 5x-8x
    case 'uptrend': volumeMultiplier = 1.5 + Math.random() * 1; break; // 1.5x-2.5x
    case 'downtrend': volumeMultiplier = 1.5 + Math.random() * 0.5; break; // 1.5x-2x
    case 'distribution': volumeMultiplier = 2 + Math.random() * 1; break;  // 2x-3x
    default: volumeMultiplier = 0.8 + Math.random() * 0.4; break;     // 0.8x-1.2x
  }

  // ── Candle tracking ──
  asset.candleTicks++;
  asset.candleHigh = Math.max(asset.candleHigh, asset.currentPrice);
  asset.candleLow = Math.min(asset.candleLow, asset.currentPrice);

  let candleCompleted = false;

  if (asset.candleTicks >= CANDLE_TICKS) {
    // Finalize candle
    // Compute realistic candle: during uptrend, close is near high;
    // during downtrend, close is near low
    const candle: typeof asset.candles[0] = {
      time: tick - asset.candleTicks + 1,
      open: asset.candleOpen,
      high: asset.candleHigh,
      low: asset.candleLow,
      close: asset.currentPrice,
    };

    asset.candles.push(candle);
    if (asset.candles.length > 200) {
      asset.candles = asset.candles.slice(-200);
    }

    // Reset for next candle
    asset.candleOpen = asset.currentPrice;
    asset.candleHigh = asset.currentPrice;
    asset.candleLow = asset.currentPrice;
    asset.candleTicks = 0;
    candleCompleted = true;
  }

  return { trendBias, volatilityMultiplier: volMultiplier, volumeMultiplier, candleCompleted };
}


