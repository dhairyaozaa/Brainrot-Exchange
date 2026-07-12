import { describe, it, expect } from 'vitest';
import { TimeEngine } from './TimeEngine';

describe('TimeEngine', () => {
  it('starts at day 1, week 1, market open', () => {
    const engine = new TimeEngine();
    expect(engine.getCurrentDay()).toBe(1);
    expect(engine.getCurrentWeek()).toBe(1);
    expect(engine.getMarketStatus()).toBe('Open');
    expect(engine.getTotalTicks()).toBe(0);
    expect(engine.getTicksPerDay()).toBe(180);
  });

  it('advances totalTicks on each tick', () => {
    const engine = new TimeEngine();
    engine.tick();
    expect(engine.getTotalTicks()).toBe(1);
    engine.tick();
    expect(engine.getTotalTicks()).toBe(2);
  });

  it('closes market after ticksPerDay ticks', () => {
    const engine = new TimeEngine();
    // Tick through the open period (180 ticks)
    for (let i = 0; i < 180; i++) {
      engine.tick();
    }
    expect(engine.getMarketStatus()).toBe('Closed');
    expect(engine.getCurrentDay()).toBe(1); // Day hasn't changed yet
  });

  it('opens market after close period and increments day', () => {
    const engine = new TimeEngine();
    // 180 ticks open
    for (let i = 0; i < 180; i++) engine.tick();
    expect(engine.getMarketStatus()).toBe('Closed');

    // 60 ticks closed
    for (let i = 0; i < 60; i++) engine.tick();
    expect(engine.getMarketStatus()).toBe('Open');
    expect(engine.getCurrentDay()).toBe(2);
  });

  it('increments week every 7 days', () => {
    const engine = new TimeEngine();
    // A full cycle is 180 open + 60 closed = 240 ticks
    // 7 cycles = 7 days
    for (let day = 0; day < 7; day++) {
      for (let i = 0; i < 180; i++) engine.tick(); // open
      for (let i = 0; i < 60; i++) engine.tick(); // closed
    }
    // Day 8 should be the start of week 2
    expect(engine.getCurrentWeek()).toBe(2);
  });

  it('tracks ticksUntilClose and ticksUntilOpen', () => {
    const engine = new TimeEngine();
    expect(engine.getTicksUntilClose()).toBe(180);

    engine.tick();
    expect(engine.getTicksUntilClose()).toBe(179);

    // Tick through open
    for (let i = 1; i < 180; i++) engine.tick();
    expect(engine.getMarketStatus()).toBe('Closed');
    expect(engine.getTicksUntilOpen()).toBe(60);
  });

  it('correctly saves and restores state', () => {
    const engine = new TimeEngine();
    // Tick past the open period (180 ticks) and into the close period
    for (let i = 0; i < 190; i++) engine.tick();

    const state = engine.getState();
    expect(state.totalTicks).toBe(190);
    expect(state.marketStatus).toBe('Closed');
    expect(state.ticksUntilOpen).toBe(50); // 60 - (190 - 180) = 50

    const engine2 = new TimeEngine();
    engine2.setState(state);
    expect(engine2.getTotalTicks()).toBe(190);
    expect(engine2.getMarketStatus()).toBe('Closed');
    expect(engine2.getCurrentDay()).toBe(1);

    // Continue ticking from restored state (50 more ticks to open the market)
    for (let i = 0; i < 50; i++) engine2.tick();
    expect(engine2.getMarketStatus()).toBe('Open');
    expect(engine2.getCurrentDay()).toBe(2);
  });
});
