// ============================================================
// PrismaDatabaseProvider - 基于 Prisma 实现 DatabaseProvider 接口
// 为知识库 FTS5 提供 SQLite 数据库操作
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { DatabaseProvider, DbRow } from '@ai-novel/knowledge-base';

@Injectable()
export class PrismaDatabaseProvider implements DatabaseProvider {
  constructor(private readonly prisma: PrismaService) {}

  async exec(sql: string): Promise<void> {
    // Prisma $executeRawUnsafe 不支持多语句
    // 拆分为单条语句执行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await this.prisma.$executeRawUnsafe(`${stmt};`);
      } catch (error) {
        // FTS5 虚拟表如果已存在会报错，忽略
        if ((error as any)?.message?.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }
  }

  async run(sql: string, ...params: unknown[]): Promise<void> {
    await this.prisma.$executeRawUnsafe(sql, ...params);
  }

  async get<T = DbRow>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    const results = await this.prisma.$queryRawUnsafe(sql, ...params);
    const arr = results as T[];
    return arr.length > 0 ? this.mapRow(arr[0]) : undefined;
  }

  async all<T = DbRow>(sql: string, ...params: unknown[]): Promise<T[]> {
    const results = await this.prisma.$queryRawUnsafe(sql, ...params);
    return (results as T[]).map(r => this.mapRow(r)) as T[];
  }

  async batch(sqls: string[]): Promise<void> {
    for (const sql of sqls) {
      await this.exec(sql);
    }
  }

  /**
   * 将 Prisma 返回的大写字段映射为小写驼峰
   */
  private mapRow(row: any): any {
    if (!row || typeof row !== 'object') return row;
    const mapped: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      // SQLite 列名通常全部小写或 snake_case
      const normalizedKey = key.toLowerCase();
      mapped[normalizedKey] = row[key];
    }
    return mapped;
  }
}
