export class TimeEngine {
  // With 5-second ticks, 60 ticks = 300s = 5 trading minutes per day
  private ticksPerDay = 60;
  private closeLength = 50;
  private totalTicks = 0;
  private currentDay = 1;
  private currentWeek = 1;
  private ticksUntilClose = this.ticksPerDay;
  private ticksUntilOpen = 0;
  private marketStatus: 'Open' | 'Closed' = 'Open';

  tick(): void {
    this.totalTicks++;

    if (this.marketStatus === 'Open') {
      this.ticksUntilClose--;
      if (this.ticksUntilClose <= 0) {
        this.marketStatus = 'Closed';
        this.ticksUntilOpen = this.closeLength;
      }
    } else if (this.marketStatus === 'Closed') {
      this.ticksUntilOpen--;
      if (this.ticksUntilOpen <= 0) {
        this.marketStatus = 'Open';
        this.currentDay++;
        if (this.currentDay % 7 === 1) {
          this.currentWeek++;
        }
        this.ticksUntilClose = this.ticksPerDay;
      }
    }
  }

  getTotalTicks(): number { return this.totalTicks; }
  getCurrentDay(): number { return this.currentDay; }
  getCurrentWeek(): number { return this.currentWeek; }
  getMarketStatus(): 'Open' | 'Closed' { return this.marketStatus; }
  getTicksUntilClose(): number { return this.ticksUntilClose; }
  getTicksUntilOpen(): number { return this.ticksUntilOpen; }
  getTicksPerDay(): number { return this.ticksPerDay; }

  setState(state: {
    totalTicks: number;
    currentDay: number;
    currentWeek: number;
    ticksUntilClose: number;
    ticksUntilOpen: number;
    marketStatus: 'Open' | 'Closed';
  }): void {
    this.totalTicks = state.totalTicks;
    this.currentDay = state.currentDay;
    this.currentWeek = state.currentWeek;
    this.ticksUntilClose = state.ticksUntilClose;
    this.ticksUntilOpen = state.ticksUntilOpen;
    this.marketStatus = state.marketStatus;
  }

  getState() {
    return {
      totalTicks: this.totalTicks,
      currentDay: this.currentDay,
      currentWeek: this.currentWeek,
      ticksUntilClose: this.ticksUntilClose,
      ticksUntilOpen: this.ticksUntilOpen,
      marketStatus: this.marketStatus,
    };
  }
}
