import type { BrainrotAsset, PlayerHolding, Mission, Achievement, GameState } from '../types';
import { RANK_XP_THRESHOLDS } from '../types';

// ── Constants (shared with gameStore) ──
export const BROKERAGE_FEE_RATE = 0.025;
export const MARGIN_CALL_THRESHOLD = 0.70;
export const MARGIN_CALL_PENALTY = 0.05;
export const WEALTH_FEE_RATE = 0.001;

// ── Portfolio Value Calculations ──

export interface PortfolioValues {
  totalInvestmentValue: number;
  totalInvested: number;
  shortPandL: number;
  bestAsset: string;
  worstAsset: string;
  largestHolding: string;
  netWorth: number;
}

/**
 * Calculate portfolio values including long positions, short positions,
 * best/worst assets, and largest holding.
 */
export function calculatePortfolioValues(
  cash: number,
  holdings: PlayerHolding[],
  brainrots: BrainrotAsset[],
): PortfolioValues {
  let totalInvestmentValue = 0;
  let totalInvested = 0;
  let shortPandL = 0;
  let bestAsset = '';
  let worstAsset = '';
  let bestReturn = -Infinity;
  let worstReturn = Infinity;
  let largestHolding = '';
  let largestValue = 0;

  for (const h of holdings) {
    const asset = brainrots.find(b => b.id === h.assetId);
    if (!asset) continue;

    if (h.quantity > 0) {
      const value = asset.currentPrice * h.quantity;
      const invested = h.averagePurchasePrice * h.quantity;
      totalInvestmentValue += value;
      totalInvested += invested;
      const ret = invested > 0 ? (value - invested) / invested : 0;
      if (ret > bestReturn) { bestReturn = ret; bestAsset = asset.name; }
      if (ret < worstReturn) { worstReturn = ret; worstAsset = asset.name; }
      if (value > largestValue) { largestValue = value; largestHolding = asset.name; }
    }
    if (h.shortQuantity > 0) {
      const shortValue = (h.averageShortPrice - asset.currentPrice) * h.shortQuantity;
      shortPandL += shortValue;
      if (shortValue > bestReturn) { bestReturn = shortValue; bestAsset = asset.name + ' (Short)'; }
      if (shortValue < worstReturn) { worstReturn = shortValue; worstAsset = asset.name + ' (Short)'; }
      if (Math.abs(shortValue) > largestValue) { largestValue = Math.abs(shortValue); largestHolding = asset.name + ' (Short)'; }
    }
  }

  return {
    totalInvestmentValue,
    totalInvested,
    shortPandL,
    bestAsset,
    worstAsset,
    largestHolding,
    netWorth: cash + totalInvestmentValue + shortPandL,
  };
}

// ── Fee Calculations ──

export interface FeeResult {
  holdingCosts: number;
  shortBorrowFees: number;
  totalFees: number;
}

/**
 * Calculate daily holding costs and short borrow fees.
 * Holding costs: ₹5 per unique asset held per day (when day changes).
 * Short borrow fees: 0.05% of short position value per tick (capped at 50% of cash).
 */
export function calculateFees(
  holdings: PlayerHolding[],
  brainrots: BrainrotAsset[],
  cash: number,
  currentDay: number,
  previousDay: number,
): FeeResult {
  let holdingCosts = 0;
  if (currentDay !== previousDay) {
    const activeAssets = new Set<string>();
    for (const h of holdings) {
      if (h.quantity > 0 || h.shortQuantity > 0) {
        activeAssets.add(h.assetId);
      }
    }
    holdingCosts = activeAssets.size * 5;
  }

  let shortBorrowFees = 0;
  for (const h of holdings) {
    if (h.shortQuantity > 0) {
      const asset = brainrots.find(b => b.id === h.assetId);
      if (asset) {
        shortBorrowFees += Math.floor(asset.currentPrice * h.shortQuantity * 0.0005);
      }
    }
  }
  shortBorrowFees = Math.min(shortBorrowFees, cash * 0.5);

  return { holdingCosts, shortBorrowFees, totalFees: holdingCosts + shortBorrowFees };
}

// ── XP & Rank Calculations ──

export interface XpResult {
  xpGain: number;
  newXp: number;
  newLevel: number;
  newRankIndex: number;
}

/**
 * Calculate XP gain from news/whales/rotter posts, level up, and rank progression.
 */
export function calculateXPAndRank(
  xp: number,
  level: number,
  rankIndex: number,
  hasNewNews: boolean,
  whaleTradeCount: number,
  rotterPostCount: number,
  xpBoostMultiplier: number,
  prestigeXpBoost: number,
): XpResult {
  let xpGain = 0;
  if (hasNewNews) xpGain += 5;
  if (whaleTradeCount > 0) xpGain += 2;
  if (rotterPostCount > 0) xpGain += 1;

  const newXp = xp + xpGain * xpBoostMultiplier * prestigeXpBoost;

  let newLevel = level;
  let newRankIndex = rankIndex;
  const xpForNextLevel = level * 150 + 50;
  if (newXp >= xpForNextLevel) {
    newLevel++;
  }

  for (let i = RANK_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (newLevel >= RANK_XP_THRESHOLDS[i]) {
      newRankIndex = i;
      break;
    }
  }

  return { xpGain, newXp, newLevel, newRankIndex };
}

// ── Mission Checking ──

export interface MissionCheckResult {
  missionRewards: number;
  updatedMissions: Mission[];
}

/**
 * Check all missions for completion. Returns total cash rewards and updated mission array.
 * Mission conditions are checked against the provided state.
 */
export function checkMissions(
  missions: Mission[],
  getState: () => GameState,
): MissionCheckResult {
  let missionRewards = 0;
  const updatedMissions = missions.map(m => {
    if (m.completed) return m;
    const completed = m.condition(getState());
    if (completed) {
      missionRewards += m.reward;
      return { ...m, completed: true };
    }
    return m;
  });

  return { missionRewards, updatedMissions };
}

// ── Achievement Checking ──

/**
 * Check all achievements for unlocking. Returns updated achievement array.
 */
export function checkAchievements(
  achievements: Achievement[],
  getState: () => GameState,
): Achievement[] {
  return achievements.map(a => {
    if (a.unlocked) return a;
    const unlocked = a.condition(getState());
    if (unlocked) {
      return { ...a, unlocked: true, unlockedAt: Date.now() };
    }
    return a;
  });
}

// ── Margin Calls ──

export interface MarginCallResult {
  resultCash: number;
  resultHoldings: PlayerHolding[];
  resultRealizedProfit: number;
  assetsToLiquidate: string[];
}

/**
 * Check short positions for margin calls. If a short loses more than 70% of margin,
 * force cover with a penalty. Returns updated cash, holdings, and realized profit.
 */
export function executeMarginCalls(
  holdings: PlayerHolding[],
  brainrots: BrainrotAsset[],
  cash: number,
  realizedProfit: number,
): MarginCallResult {
  const assetsToLiquidate: string[] = [];
  for (const h of holdings) {
    if (h.shortQuantity > 0) {
      const asset = brainrots.find(b => b.id === h.assetId);
      if (asset) {
        const shortLoss = (asset.currentPrice - h.averageShortPrice) * h.shortQuantity;
        const marginAtOpen = h.averageShortPrice * h.shortQuantity * 1.5;
        if (marginAtOpen > 0) {
          const lossRatio = shortLoss / marginAtOpen;
          if (lossRatio > MARGIN_CALL_THRESHOLD) {
            assetsToLiquidate.push(h.assetId);
          }
        }
      }
    }
  }

  let resultCash = cash;
  let resultRealizedProfit = realizedProfit;

  for (const assetId of assetsToLiquidate) {
    const h = holdings.find(rh => rh.assetId === assetId);
    if (!h) continue;
    const asset = brainrots.find(b => b.id === assetId);
    if (!asset) continue;
    const coverCost = asset.currentPrice * h.shortQuantity * (1 + MARGIN_CALL_PENALTY);
    const fee = coverCost * BROKERAGE_FEE_RATE;
    const totalCost = coverCost + fee;
    const shortPnl = (h.averageShortPrice * h.shortQuantity) - totalCost;
    resultRealizedProfit += shortPnl;
    resultCash -= totalCost;
  }

  const resultHoldings = holdings
    .map(h => assetsToLiquidate.includes(h.assetId)
      ? { ...h, shortQuantity: 0, averageShortPrice: 0 }
      : h
    )
    .filter(h => h.quantity > 0 || h.shortQuantity > 0);

  return { resultCash, resultHoldings, resultRealizedProfit, assetsToLiquidate };
}

// ── Bankruptcy Check ──

export interface BankruptcyResult {
  resultCash: number;
  resultHoldings: PlayerHolding[];
  resultRealizedProfit: number;
  resultBankruptcyCount: number;
  forceLiquidated: boolean;
}

/**
 * Check if bankruptcy should trigger. If net worth ≤ 0 and there are remaining positions,
 * or if cash went negative, force-liquidate all positions and increment bankruptcy count.
 */
export function checkBankruptcy(
  holdings: PlayerHolding[],
  brainrots: BrainrotAsset[],
  cash: number,
  realizedProfit: number,
  bankruptcyCount: number,
  portfolioValue: number,
  shortPandL: number,
): BankruptcyResult {
  let resultCash = cash;
  let resultRealizedProfit = realizedProfit;
  let resultBankruptcyCount = bankruptcyCount;
  let forceLiquidated = false;
  let resultHoldings = [...holdings];

  const netWorth = cash + portfolioValue + shortPandL;
  const hasRemainingPositions = resultHoldings.some(h => h.quantity > 0 || h.shortQuantity > 0);

  if ((netWorth <= 0 && hasRemainingPositions) || resultCash < 0) {
    forceLiquidated = true;
    let liquidationValue = 0;

    for (const h of resultHoldings) {
      const asset = brainrots.find(b => b.id === h.assetId);
      if (!asset) continue;

      if (h.quantity > 0) {
        const saleValue = asset.currentPrice * h.quantity;
        const fee = saleValue * BROKERAGE_FEE_RATE;
        const netSale = saleValue - fee;
        resultRealizedProfit += netSale - (h.averagePurchasePrice * h.quantity);
        liquidationValue += netSale;
      }
      if (h.shortQuantity > 0) {
        const buybackCost = asset.currentPrice * h.shortQuantity;
        const fee = buybackCost * BROKERAGE_FEE_RATE;
        const totalCost = buybackCost + fee;
        const shortPnl = (h.averageShortPrice * h.shortQuantity) - buybackCost - fee;
        resultRealizedProfit += shortPnl;
        liquidationValue -= totalCost;
      }
    }

    resultCash = Math.max(0, resultCash + liquidationValue);
    resultHoldings = [];
    resultBankruptcyCount++;
  }

  // Safety clamp: cash should never be negative
  if (resultCash < 0) resultCash = 0;

  return { resultCash, resultHoldings, resultRealizedProfit, resultBankruptcyCount, forceLiquidated };
}

// ── Final Net Worth Calculation ──

export interface FinalMetrics {
  finalLongValue: number;
  finalShortPandL: number;
  finalNetWorth: number;
  finalUnrealized: number;
}

/**
 * Calculate final portfolio metrics after margin calls and bankruptcy.
 */
export function calculateFinalMetrics(
  holdings: PlayerHolding[],
  brainrots: BrainrotAsset[],
  cash: number,
  totalInvested: number,
): FinalMetrics {
  let finalLongValue = 0;
  let finalShortPandL = 0;

  for (const h of holdings) {
    const asset = brainrots.find(b => b.id === h.assetId);
    if (!asset) continue;

    if (h.quantity > 0) {
      finalLongValue += asset.currentPrice * h.quantity;
    }
    if (h.shortQuantity > 0) {
      finalShortPandL += (h.averageShortPrice - asset.currentPrice) * h.shortQuantity;
    }
  }

  const finalNetWorth = Math.max(0, cash + finalLongValue + finalShortPandL);
  const finalUnrealized = finalLongValue - totalInvested + finalShortPandL;

  return { finalLongValue, finalShortPandL, finalNetWorth, finalUnrealized };
}
