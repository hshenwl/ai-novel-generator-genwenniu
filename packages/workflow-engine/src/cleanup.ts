// ============================================================
// 工作流内存管理 - LRU 过期清理
// ============================================================

export class InstanceCleanup {
  private maxAge: number;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private instances: Map<string, any>;
  private getTimestamp: (inst: any) => Date;

  constructor(
    instances: Map<string, any>,
    getTimestamp: (inst: any) => Date,
    maxAgeMs: number = 3600000 // 1 hour default
  ) {
    this.instances = instances;
    this.getTimestamp = getTimestamp;
    this.maxAge = maxAgeMs;
  }

  start(intervalMs: number = 300000): void { // check every 5 min
    this.stop();
    this.checkInterval = setInterval(() => this.cleanup(), intervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, inst] of this.instances) {
      const ts = this.getTimestamp(inst).getTime();
      if (now - ts > this.maxAge) {
        this.instances.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[InstanceCleanup] Removed ${removed} expired instances, ${this.instances.size} remaining`);
    }
    return removed;
  }
}
