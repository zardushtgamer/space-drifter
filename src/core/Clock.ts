export interface IClock {
  /** Monotonic time in milliseconds. */
  now(): number;
}

export class PerformanceClock implements IClock {
  now(): number {
    return performance.now();
  }
}
