// ============================================================
// 知识库系统 - 数据库提供者抽象接口
// 解耦 SQLite 原生依赖，兼容 Prisma、better-sqlite3 等
// ============================================================

/**
 * 数据库查询结果行
 */
export type DbRow = Record<string, unknown>;

/**
 * 数据库提供者接口 - 知识库所需的最小数据库操作集
 */
export interface DatabaseProvider {
  /** 执行不返回结果的 SQL (CREATE TABLE, INSERT, UPDATE, DELETE) */
  exec(sql: string): Promise<void>;

  /** 执行参数化 SQL，不返回结果 */
  run(sql: string, ...params: unknown[]): Promise<void>;

  /** 查询单行 */
  get<T = DbRow>(sql: string, ...params: unknown[]): Promise<T | undefined>;

  /** 查询多行 */
  all<T = DbRow>(sql: string, ...params: unknown[]): Promise<T[]>;

  /** 批量执行 SQL 语句 */
  batch(sqls: string[]): Promise<void>;
}
