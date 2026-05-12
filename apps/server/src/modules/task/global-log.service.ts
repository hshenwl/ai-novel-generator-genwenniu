import { Injectable } from '@nestjs/common';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  action: string;
  message: string;
  details?: any;
  userId?: string;
}

/**
 * 全局日志服务 — 内存环形缓冲区，最近500条
 */
@Injectable()
export class GlobalLogService {
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  log(module: string, action: string, message: string, details?: any) {
    this.add('info', module, action, message, details);
  }

  warn(module: string, action: string, message: string, details?: any) {
    this.add('warn', module, action, message, details);
  }

  error(module: string, action: string, message: string, details?: any) {
    this.add('error', module, action, message, details);
  }

  debug(module: string, action: string, message: string, details?: any) {
    this.add('debug', module, action, message, details);
  }

  private add(level: LogEntry['level'], module: string, action: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      level,
      module,
      action,
      message,
      details,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    // 同时输出到控制台
    const prefix = `[${level.toUpperCase()}][${module}]`;
    if (level === 'error') {
      console.error(`${prefix} ${message}`, details || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  getLogs(options?: { level?: string; module?: string; take?: number; since?: Date }): LogEntry[] {
    let result = [...this.logs];
    if (options?.level) result = result.filter(l => l.level === options.level);
    if (options?.module) result = result.filter(l => l.module === options.module);
    if (options?.since) result = result.filter(l => l.timestamp >= options.since!);
    result.reverse(); // 最新在前
    if (options?.take) result = result.slice(0, options.take);
    return result;
  }

  getStats() {
    const total = this.logs.length;
    const errors = this.logs.filter(l => l.level === 'error').length;
    const warnings = this.logs.filter(l => l.level === 'warn').length;
    const byModule: Record<string, number> = {};
    for (const l of this.logs) {
      byModule[l.module] = (byModule[l.module] || 0) + 1;
    }
    return { total, errors, warnings, byModule };
  }

  clear() {
    this.logs = [];
  }
}
