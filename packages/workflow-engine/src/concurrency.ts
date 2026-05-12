// ============================================================
// 工作流并发控制 - 限制同时运行的工作流数量
// ============================================================

export class ConcurrencyLimiter {
  private maxConcurrent: number;
  private running: number = 0;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
    });
  }

  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.running++;
      next.resolve();
    }
  }

  getRunning(): number {
    return this.running;
  }

  getQueued(): number {
    return this.queue.length;
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }
}
