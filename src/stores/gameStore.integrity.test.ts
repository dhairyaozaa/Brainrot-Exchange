import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { useGameStore } from './gameStore';
import type { BrainrotAsset } from '../types';

// Mock localStorage for test environment
class MockStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null { return this.store[key] ?? null; }
  setItem(key: string, value: string): void { this.store[key] = value; }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}

beforeAll(() => {
  const mock = new MockStorage();
  vi.stubGlobal('localStorage', mock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

/** Helper: get the first unlocked tradeable asset */
function getTradeableAsset(): BrainrotAsset {
  const asset = useGameStore.getState().brainrots.find(b => b.unlocked);
  if (!asset) throw new Error('No tradeable asset found');
  return asset;
}

/** Helper: force market status to Open */
function forceMarketOpen() {
  useGameStore.setState({ marketStatus: 'Open' });
}

/** Helper: force market status to Closed */
function forceMarketClosed() {
  useGameStore.setState({ marketStatus: 'Closed' });
}

/** Helper: buy a known quantity of an asset, returns true/false */
function buy(assetId: string, qty: number): boolean {
  return useGameStore.getState().buyShares(assetId, qty);
}

/** Helper: sell a known quantity of an asset, returns true/false */
function sell(assetId: string, qty: number): boolean {
  return useGameStore.getState().sellShares(assetId, qty);
}

/** Helper: short sell a known quantity of an asset, returns true/false */
function short(assetId: string, qty: number): boolean {
  return useGameStore.getState().shortSellShares(assetId, qty);
}

/** Helper: buy to cover a short position, returns true/false */
function cover(assetId: string, qty: number): boolean {
  return useGameStore.getState().buyToCover(assetId, qty);
}

describe('Cash Integrity', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useGameStore.getState().resetGame();
  });

  it('starts with exactly 2500 cash', () => {
    const cash = useGameStore.getState().cash;
    expect(cash).toBe(2500);
  });

  it('does not credit cash on market tick when no missions complete and no holdings', () => {
    // After reset, state has no holdings and all missions incomplete
    const initialCash = useGameStore.getState().cash;

    // Run one market tick
    useGameStore.getState().marketTick();

    // Cash should not have increased since:
    // - No holdings → no fees → no fees to subtract
    // - No holdings → no holding costs or borrow fees
    // - No missions should complete on the very first tick
    const newCash = useGameStore.getState().cash;
    expect(newCash).toBeLessThanOrEqual(initialCash);
  });

  it('does not go to negative cash from fees alone', () => {
    // Run multiple ticks
    for (let i = 0; i < 20; i++) {
      useGameStore.getState().marketTick();
      const cash = useGameStore.getState().cash;
      expect(cash).toBeGreaterThanOrEqual(0);
    }
  });

  it('cash + holdings value + short P&L approximately equals net worth', () => {
    const state = useGameStore.getState();
    expect(state.netWorth).toBe(state.cash);
  });
});

describe('Mission Cash Rewards', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('missions only complete once and give cash one time', () => {
    const state = useGameStore.getState();

    // Force the first mission condition to be true by manipulating state
    // first_profit: realizedProfit > 0
    useGameStore.setState({ realizedProfit: 100 });
    const initialCash = useGameStore.getState().cash;

    // Run tick — first_profit should complete and give ₹500 reward
    useGameStore.getState().marketTick();

    const afterFirstTick = useGameStore.getState();
    // Check that first_profit mission is now completed
    const firstProfitMission = afterFirstTick.missions.find(m => m.id === 'first_profit');
    expect(firstProfitMission?.completed).toBe(true);

    // Cash should have increased by reward minus any fees
    const cashAfterFirstTick = afterFirstTick.cash;
    // The reward is 500, cash should have increased (fees could be 0 since no holdings)
    expect(cashAfterFirstTick).toBeGreaterThanOrEqual(initialCash);
    expect(cashAfterFirstTick).toBeLessThanOrEqual(initialCash + 500);

    // Run another tick — mission should NOT give cash again
    const cashBeforeSecondTick = useGameStore.getState().cash;
    useGameStore.getState().marketTick();
    const cashAfterSecondTick = useGameStore.getState().cash;
    // Cash should not increase (no new rewards) - fees or no fees, cash shouldn't go up
    expect(cashAfterSecondTick).toBeLessThanOrEqual(cashBeforeSecondTick);
  });
});

describe('Bankruptcy and Margin Call Integrity', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('bankruptcy count starts at 0', () => {
    expect(useGameStore.getState().bankruptcyCount).toBe(0);
  });

  it('handles holdings correctly when margin calls + bankruptcy trigger together', () => {
    const state = useGameStore.getState();

    // Get a tradeable asset
    const asset = state.brainrots.find(b => b.unlocked && b.rarity === 'Common');
    if (!asset) return; // skip if no asset available

    // Short sell the asset to create a short position
    const qty = 10;
    const success = useGameStore.getState().shortSellShares(asset.id, qty);
    expect(success).toBe(true);

    const afterShort = useGameStore.getState();
    expect(afterShort.holdings.length).toBeGreaterThan(0);
    const shortHolding = afterShort.holdings.find(h => h.assetId === asset.id);
    expect(shortHolding?.shortQuantity).toBe(qty);

    // Now crash the asset price massively to trigger margin call
    // Force the asset price way up (short loses money when price goes up)
    const crashedAsset = useGameStore.getState().brainrots.find(b => b.id === asset.id);
    if (crashedAsset) {
      // Set price to 10x the short price to guarantee margin call
      const shortPrice = shortHolding?.averageShortPrice ?? asset.currentPrice;
      const brainrots = useGameStore.getState().brainrots.map(b => {
        if (b.id === asset.id) {
          return { ...b, currentPrice: shortPrice * 10 };
        }
        return b;
      });
      useGameStore.setState({ brainrots });
      // Also update the engine's brainrots
      useGameStore.getState().marketEngine.brainrots = brainrots;
    }

    // Run marketTick - margin call should fire, then bankruptcy check should use resultHoldings
    useGameStore.getState().marketTick();

    // After the tick, cash should not be negative
    const finalState = useGameStore.getState();
    expect(finalState.cash).toBeGreaterThanOrEqual(0);

    // Holdings should either be empty (bankruptcy) or have no short position (margin call closed it)
    if (finalState.holdings.length > 0) {
      const finalHolding = finalState.holdings.find(h => h.assetId === asset.id);
      if (finalHolding) {
        expect(finalHolding.shortQuantity).toBe(0);
      }
    }
  });

  it('does not trigger bankruptcy when net worth is positive with no holdings', () => {
    const initialBankruptcyCount = useGameStore.getState().bankruptcyCount;

    // Run several ticks with no holdings
    for (let i = 0; i < 10; i++) {
      useGameStore.getState().marketTick();
    }

    expect(useGameStore.getState().bankruptcyCount).toBe(initialBankruptcyCount);
  });
});

describe('MarketTick Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('does nothing when paused', () => {
    useGameStore.setState({ paused: true });
    const cashBefore = useGameStore.getState().cash;
    useGameStore.getState().marketTick();
    // Paused should skip all processing, cash unchanged
    expect(useGameStore.getState().cash).toBe(cashBefore);
  });

  it('does not change paused state to false after tick', () => {
    useGameStore.setState({ paused: true });
    useGameStore.getState().marketTick();
    expect(useGameStore.getState().paused).toBe(true);
  });

  it('advances totalTicks by 180 + 60 each full day cycle', () => {
    // Run a full day cycle (180 open + 60 closed = 240 ticks)
    const ticksBefore = useGameStore.getState().totalTicks;
    const dayBefore = useGameStore.getState().currentDay;

    for (let i = 0; i < 240; i++) {
      useGameStore.getState().marketTick();
    }

    expect(useGameStore.getState().totalTicks).toBe(ticksBefore + 240);
    expect(useGameStore.getState().currentDay).toBe(dayBefore + 1);
  });

  it('alternates market status between Open and Closed', () => {
    // Tick through open period (180 ticks)
    for (let i = 0; i < 180; i++) {
      useGameStore.getState().marketTick();
    }
    expect(useGameStore.getState().marketStatus).toBe('Closed');

    // Tick through closed period (60 ticks)
    for (let i = 0; i < 60; i++) {
      useGameStore.getState().marketTick();
    }
    expect(useGameStore.getState().marketStatus).toBe('Open');
  });

  it('keeps cash non-negative over many ticks with holdings', () => {
    const asset = useGameStore.getState().brainrots.find(b => b.unlocked);
    if (!asset) return;

    // Create a position so there's something to liquidate if needed
    useGameStore.getState().shortSellShares(asset.id, 1);

    // Run many ticks - market fees, price changes, margin calls all affect cash
    for (let i = 0; i < 500; i++) {
      useGameStore.getState().marketTick();
    }

    // Cash should never go negative (safety clamp + bankruptcy handling)
    expect(useGameStore.getState().cash).toBeGreaterThanOrEqual(0);
  });

  it('updates marketCondition over time', () => {
    const initialCondition = useGameStore.getState().marketCondition;
    let changed = false;

    // Run many ticks to see if condition changes
    // Condition timer is 100-300 ticks, so 1000 ticks should be enough
    for (let i = 0; i < 1000; i++) {
      useGameStore.getState().marketTick();
      if (useGameStore.getState().marketCondition !== initialCondition) {
        changed = true;
        break;
      }
    }

    // Market condition should eventually change within 1000 ticks
    expect(changed).toBe(true);
  });

  it('accumulates XP over multiple ticks', () => {
    const xpBefore = useGameStore.getState().xp;

    for (let i = 0; i < 100; i++) {
      useGameStore.getState().marketTick();
    }

    expect(useGameStore.getState().xp).toBeGreaterThan(xpBefore);
  });

  it('does not increase speed setting', () => {
    useGameStore.setState({ speed: 5 });
    useGameStore.getState().marketTick();
    expect(useGameStore.getState().speed).toBe(5);
  });

  it('handles settings.soundEnabled gracefully', () => {
    // Should not throw when sound is enabled
    useGameStore.setState({ settings: { ...useGameStore.getState().settings, soundEnabled: true } });
    expect(() => useGameStore.getState().marketTick()).not.toThrow();
  });

  it('handles settings.soundEnabled false gracefully', () => {
    // Should not throw when sound is disabled
    useGameStore.setState({ settings: { ...useGameStore.getState().settings, soundEnabled: false } });
    expect(() => useGameStore.getState().marketTick()).not.toThrow();
  });
});

describe('Buy Shares Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    forceMarketOpen();
  });

  it('rejects buy when market is closed', () => {
    forceMarketClosed();
    const asset = getTradeableAsset();
    const result = buy(asset.id, 1);
    expect(result).toBe(false);
  });

  it('rejects buy with zero quantity', () => {
    const asset = getTradeableAsset();
    expect(buy(asset.id, 0)).toBe(false);
  });

  it('rejects buy with negative quantity', () => {
    const asset = getTradeableAsset();
    expect(buy(asset.id, -5)).toBe(false);
  });

  it('rejects buy of non-existent asset', () => {
    expect(buy('non_existent_id', 1)).toBe(false);
  });

  it('rejects buy when cash is insufficient', () => {
    const asset = getTradeableAsset();
    // Try to buy a huge quantity that exceeds available cash
    const cash = useGameStore.getState().cash;
    const maxQuantities = Math.floor(cash / asset.currentPrice) + 1;
    expect(buy(asset.id, maxQuantities)).toBe(false);
  });

  it('successfully buys shares and reduces cash', () => {
    const asset = getTradeableAsset();
    const cashBefore = useGameStore.getState().cash;
    const qty = 3;

    expect(buy(asset.id, qty)).toBe(true);

    const state = useGameStore.getState();
    expect(state.cash).toBeLessThan(cashBefore);

    const holding = state.holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeDefined();
    expect(holding!.quantity).toBe(qty);
    expect(holding!.averagePurchasePrice).toBeGreaterThan(0);

    // Trade should be recorded
    const trade = state.trades.find(t => t.assetId === asset.id && t.type === 'Buy');
    expect(trade).toBeDefined();
    expect(trade!.quantity).toBe(qty);
  });

  it('buys with existing holding calculates average correctly', () => {
    const asset = getTradeableAsset();
    // Use small qty to stay under position concentration limit (25% of net worth)
    const qty = 2;

    // First buy: 2 shares
    expect(buy(asset.id, qty)).toBe(true);
    const stateAfterFirst = useGameStore.getState();
    const holding1 = stateAfterFirst.holdings.find(h => h.assetId === asset.id)!;

    // Second buy: 2 more shares
    expect(buy(asset.id, qty)).toBe(true);
    const stateAfterSecond = useGameStore.getState();
    const holding2 = stateAfterSecond.holdings.find(h => h.assetId === asset.id)!;
    expect(holding2.quantity).toBe(qty * 2);
    // Average price should be somewhere between old and new price
    expect(holding2.averagePurchasePrice).toBeGreaterThan(0);

    // Only one holding entry for this asset
    const allForAsset = stateAfterSecond.holdings.filter(h => h.assetId === asset.id);
    expect(allForAsset.length).toBe(1);
  });

  it('adds trade to the trades history', () => {
    const asset = getTradeableAsset();
    const tradesBefore = useGameStore.getState().trades.length;

    expect(buy(asset.id, 3)).toBe(true);

    const tradesAfter = useGameStore.getState().trades.length;
    expect(tradesAfter).toBe(tradesBefore + 1);

    const latestTrade = useGameStore.getState().trades[0];
    expect(latestTrade.type).toBe('Buy');
    expect(latestTrade.assetId).toBe(asset.id);
    expect(latestTrade.quantity).toBe(3);
  });
});

describe('Sell Shares Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    forceMarketOpen();
  });

  it('rejects sell when market is closed', () => {
    const asset = getTradeableAsset();
    // First buy some shares
    expect(buy(asset.id, 5)).toBe(true);
    forceMarketClosed();
    expect(sell(asset.id, 1)).toBe(false);
  });

  it('rejects sell with zero quantity', () => {
    const asset = getTradeableAsset();
    expect(buy(asset.id, 5)).toBe(true);
    expect(sell(asset.id, 0)).toBe(false);
  });

  it('rejects sell with negative quantity', () => {
    const asset = getTradeableAsset();
    expect(buy(asset.id, 5)).toBe(true);
    expect(sell(asset.id, -3)).toBe(false);
  });

  it('rejects sell of non-existent asset', () => {
    expect(sell('non_existent_id', 1)).toBe(false);
  });

  it('rejects sell without holding the asset', () => {
    const asset = getTradeableAsset();
    expect(sell(asset.id, 1)).toBe(false);
  });

  it('rejects sell of more than held quantity', () => {
    const asset = getTradeableAsset();
    expect(buy(asset.id, 3)).toBe(true);
    expect(sell(asset.id, 10)).toBe(false);
  });

  it('sells all shares and removes the holding', () => {
    const asset = getTradeableAsset();
    const qty = 3;
    expect(buy(asset.id, qty)).toBe(true);
    const cashBefore = useGameStore.getState().cash;

    expect(sell(asset.id, qty)).toBe(true);

    const state = useGameStore.getState();
    expect(state.cash).toBeGreaterThan(cashBefore);

    const holding = state.holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeUndefined(); // Holding removed entirely
  });

  it('sells partial shares and reduces quantity', () => {
    const asset = getTradeableAsset();
    const qty = 5;
    expect(buy(asset.id, qty)).toBe(true);

    expect(sell(asset.id, 2)).toBe(true);

    const holding = useGameStore.getState().holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeDefined();
    expect(holding!.quantity).toBe(qty - 2);
  });

  it('records profit on sell at higher price', () => {
    const asset = getTradeableAsset();
    const qty = 3;
    expect(buy(asset.id, qty)).toBe(true);

    // Force the asset price higher
    const higherPrice = asset.currentPrice * 2;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: higherPrice } : b
      ),
    });

    const realizedBefore = useGameStore.getState().realizedProfit;
    expect(sell(asset.id, qty)).toBe(true);

    const realizedAfter = useGameStore.getState().realizedProfit;
    expect(realizedAfter).toBeGreaterThan(realizedBefore);
  });

  it('records loss on sell at lower price', () => {
    const asset = getTradeableAsset();
    const qty = 3;
    expect(buy(asset.id, qty)).toBe(true);

    // Force the asset price lower
    const lowerPrice = asset.currentPrice * 0.1;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: lowerPrice } : b
      ),
    });

    const realizedBefore = useGameStore.getState().realizedProfit;
    expect(sell(asset.id, qty)).toBe(true);

    const realizedAfter = useGameStore.getState().realizedProfit;
    expect(realizedAfter).toBeLessThan(realizedBefore);
  });
});

describe('Short Sell Shares Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    forceMarketOpen();
  });

  it('rejects short when market is closed', () => {
    forceMarketClosed();
    const asset = getTradeableAsset();
    expect(short(asset.id, 1)).toBe(false);
  });

  it('rejects short with zero quantity', () => {
    const asset = getTradeableAsset();
    expect(short(asset.id, 0)).toBe(false);
  });

  it('rejects short with negative quantity', () => {
    const asset = getTradeableAsset();
    expect(short(asset.id, -3)).toBe(false);
  });

  it('rejects short of non-existent asset', () => {
    expect(short('non_existent_id', 1)).toBe(false);
  });

  it('rejects short when insufficient margin (need 150% of sale value in cash)', () => {
    const asset = getTradeableAsset();
    // Cash is only 2500, so for expensive assets, margin requirement will fail
    // Calculate qty where marginRequired > cash
    const marginRequired = asset.currentPrice * 1.5; // for 1 share
    if (marginRequired > 2500) {
      // Asset is too expensive to short even 1 share
      expect(short(asset.id, 1)).toBe(false);
    } else {
      // Asset is cheap, short a large qty to exceed margin
      const hugeQty = Math.floor(2500 / (asset.currentPrice * 1.5)) + 1;
      expect(short(asset.id, hugeQty)).toBe(false);
    }
  });

  it('successfully shorts and credits cash', () => {
    const asset = getTradeableAsset();
    const cashBefore = useGameStore.getState().cash;
    const qty = 2;

    // Only short if we have enough margin
    const marginRequired = asset.currentPrice * qty * 1.5;
    if (cashBefore < marginRequired) return; // skip if too expensive

    expect(short(asset.id, qty)).toBe(true);

    const state = useGameStore.getState();
    // Cash increases from short sale (minus fees)
    expect(state.cash).toBeGreaterThan(cashBefore);

    const holding = state.holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeDefined();
    expect(holding!.shortQuantity).toBe(qty);
    expect(holding!.averageShortPrice).toBeGreaterThan(0);

    // Trade recorded
    const trade = state.trades.find(t => t.assetId === asset.id && t.type === 'Short');
    expect(trade).toBeDefined();
  });

  it('shorts alongside existing long position', () => {
    const asset = getTradeableAsset();

    // First buy long
    expect(buy(asset.id, 5)).toBe(true);

    // Then short
    const cashBefore = useGameStore.getState().cash;
    const marginRequired = asset.currentPrice * 2 * 1.5;
    if (cashBefore < marginRequired) return; // skip if too expensive

    expect(short(asset.id, 2)).toBe(true);

    const holding = useGameStore.getState().holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeDefined();
    expect(holding!.quantity).toBe(5);
    expect(holding!.shortQuantity).toBe(2);
  });
});

describe('Buy to Cover Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    forceMarketOpen();
  });

  it('rejects cover when market is closed', () => {
    const asset = getTradeableAsset();
    forceMarketClosed();
    expect(cover(asset.id, 1)).toBe(false);
  });

  it('rejects cover with zero quantity', () => {
    const asset = getTradeableAsset();
    expect(cover(asset.id, 0)).toBe(false);
  });

  it('rejects cover with negative quantity', () => {
    const asset = getTradeableAsset();
    expect(cover(asset.id, -1)).toBe(false);
  });

  it('rejects cover of non-existent asset', () => {
    expect(cover('non_existent_id', 1)).toBe(false);
  });

  it('rejects cover without an existing short position', () => {
    const asset = getTradeableAsset();
    expect(cover(asset.id, 1)).toBe(false);
  });

  it('rejects cover of more than short quantity', () => {
    const asset = getTradeableAsset();
    const cash = useGameStore.getState().cash;
    const marginRequired = asset.currentPrice * 1 * 1.5;
    if (cash < marginRequired) return;

    expect(short(asset.id, 3)).toBe(true);
    expect(cover(asset.id, 10)).toBe(false);
  });

  it('rejects cover when insufficient cash (price went way up)', () => {
    const asset = getTradeableAsset();
    const cash = useGameStore.getState().cash;
    // Try to short a quantity that's affordable
    const qty = Math.max(1, Math.floor(cash / (asset.currentPrice * 1.5)));
    if (qty < 1) return;

    expect(short(asset.id, qty)).toBe(true);

    // Now crank the price way up so covering becomes unaffordable
    const insanePrice = asset.currentPrice * 100;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: insanePrice } : b
      ),
    });

    expect(cover(asset.id, qty)).toBe(false);
  });

  it('successfully covers partial short position', () => {
    const asset = getTradeableAsset();
    const cash = useGameStore.getState().cash;
    const qty = 3;
    const marginRequired = asset.currentPrice * qty * 1.5;
    if (cash < marginRequired) return;

    expect(short(asset.id, qty)).toBe(true);

    // Drop the price so covering is profitable
    const lowerPrice = asset.currentPrice * 0.5;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: lowerPrice } : b
      ),
    });

    expect(cover(asset.id, 1)).toBe(true);

    const holding = useGameStore.getState().holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeDefined();
    expect(holding!.shortQuantity).toBe(qty - 1);
  });

  it('covers all shorts and removes the position', () => {
    const asset = getTradeableAsset();
    const cash = useGameStore.getState().cash;
    const qty = 2;
    const marginRequired = asset.currentPrice * qty * 1.5;
    if (cash < marginRequired) return;

    expect(short(asset.id, qty)).toBe(true);

    // Drop the price so covering is affordable
    const lowerPrice = asset.currentPrice * 0.1;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: lowerPrice } : b
      ),
    });

    expect(cover(asset.id, qty)).toBe(true);

    // Should have no holding at all since long qty is also 0
    const holding = useGameStore.getState().holdings.find(h => h.assetId === asset.id);
    expect(holding).toBeUndefined();
  });

  it('records profit when covering at a lower price (price dropped)', () => {
    const asset = getTradeableAsset();
    const cash = useGameStore.getState().cash;
    const qty = 3;
    const marginRequired = asset.currentPrice * qty * 1.5;
    if (cash < marginRequired) return;

    expect(short(asset.id, qty)).toBe(true);
    const realizedBefore = useGameStore.getState().realizedProfit;

    // Price dropped significantly
    const lowerPrice = asset.currentPrice * 0.3;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: lowerPrice } : b
      ),
    });

    expect(cover(asset.id, qty)).toBe(true);

    const realizedAfter = useGameStore.getState().realizedProfit;
    expect(realizedAfter).toBeGreaterThan(realizedBefore);
  });

  it('records loss when covering at a higher price (price went up)', () => {
    const asset = getTradeableAsset();
    const cash = useGameStore.getState().cash;
    const qty = 3;
    const marginRequired = asset.currentPrice * qty * 1.5;
    if (cash < marginRequired) return;

    expect(short(asset.id, qty)).toBe(true);
    const realizedBefore = useGameStore.getState().realizedProfit;

    // Price went up
    const higherPrice = asset.currentPrice * 3;
    useGameStore.setState({
      brainrots: useGameStore.getState().brainrots.map(b =>
        b.id === asset.id ? { ...b, currentPrice: higherPrice } : b
      ),
    });

    const cashAvailable = useGameStore.getState().cash;
    const costToCover = higherPrice * qty * (1 + 0.025);
    if (cashAvailable < costToCover) return; // Not enough cash to cover at higher price

    expect(cover(asset.id, qty)).toBe(true);

    const realizedAfter = useGameStore.getState().realizedProfit;
    expect(realizedAfter).toBeLessThan(realizedBefore);
  });
});
