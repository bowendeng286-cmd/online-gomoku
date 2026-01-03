import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./shared/schema";
import { ensureLoadEnv } from "../ensureLoadEnv";

const MAX_RETRY_TIME = 20000; // 连接最大重试时间（毫秒）

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * 获取数据库连接 URL
 */
function getDbUrl(): string {
  const url = process.env.DATABASE_URL || process.env.PGDATABASE_URL || "";
  if (!url) {
    console.error("DATABASE_URL or PGDATABASE_URL is not set");
  }
  return url;
}

/**
 * 创建带重试的连接池
 */
async function createPoolWithRetry(): Promise<pg.Pool> {
  const url = getDbUrl();
  if (!url) {
    throw new Error("PGDATABASE_URL is not set");
  }

  const newPool = new pg.Pool({
    connectionString: url,
    max: 100,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < MAX_RETRY_TIME) {
    try {
      const client = await newPool.connect();
      await client.query("SELECT 1");
      client.release();
      return newPool;
    } catch (e) {
      lastError = e as Error;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.warn(`Database connection failed, retrying... (elapsed: ${elapsed}s)`);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000, MAX_RETRY_TIME - (Date.now() - startTime)))
      );
    }
  }

  console.error(`Database connection failed after ${MAX_RETRY_TIME / 1000}s: ${lastError?.message}`);
  throw lastError;
}

/**
 * 获取连接池（单例）
 */
export async function getPool(): Promise<pg.Pool> {
  ensureLoadEnv();
  if (!pool) {
    pool = await createPoolWithRetry();
  }
  return pool;
}

/**
 * 获取 Drizzle ORM 实例（单例）
 */
export async function getDb() {
  if (!db) {
    const p = await getPool();
    db = drizzle(p, { schema });
  }
  return db;
}

/**
 * 获取数据库客户端
 */
export async function getClient(): Promise<pg.PoolClient> {
  const p = await getPool();
  return p.connect();
}

export { schema };
