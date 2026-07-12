import type { TradingPhase } from '../types';

export interface PhaseDisplayConfig {
  label: string;
  icon: string;
  color: string;     // text color
  bg: string;        // background color
  border: string;    // border color
}

/** Human-readable labels, icons, and colors for each market phase */
export const PHASE_DISPLAY: Record<TradingPhase, PhaseDisplayConfig> = {
  accumulation: {
    label: 'Accumulation',
    icon: '📊',
    color: 'text-blue-400',
    bg: 'bg-blue-900/25',
    border: 'border-blue-700/40',
  },
  uptrend: {
    label: 'Uptrend',
    icon: '📈',
    color: 'text-brainrot-accent',
    bg: 'bg-green-900/25',
    border: 'border-brainrot-accent/30',
  },
  distribution: {
    label: 'Distribution',
    icon: '📤',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/25',
    border: 'border-yellow-700/40',
  },
  downtrend: {
    label: 'Downtrend',
    icon: '📉',
    color: 'text-brainrot-red',
    bg: 'bg-red-900/25',
    border: 'border-brainrot-red/30',
  },
  breakout: {
    label: 'Breakout',
    icon: '🚀',
    color: 'text-purple-400',
    bg: 'bg-purple-900/25',
    border: 'border-purple-700/40',
  },
  panic: {
    label: 'Panic',
    icon: '💥',
    color: 'text-orange-400',
    bg: 'bg-orange-900/25',
    border: 'border-orange-700/40',
  },
};
