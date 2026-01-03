import { NextResponse } from 'next/server';
import { getDb, schema } from '@/storage/database/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  const result = {
    environment: {},
    database: {} as any,
    errors: [] as string[],
    status: ''
  };

  // 1. 检查环境变量
  result.environment = {
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlLength: process.env.DATABASE_URL?.length || 0,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    isVercel: process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined,
    vercelEnv: process.env.VERCEL_ENV || 'unknown'
  };

  // 2. 检查数据库连接
  try {
    const db = await getDb();
    result.database.connection = '✅ 成功';

    // 检查表
    const tables = ['users', 'game_sessions', 'game_moves', 'user_sessions'];
    result.database.tables = {};

    for (const tableName of tables) {
      const tableResult = await db.execute(
        sql`SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        )`
      );
      result.database.tables[tableName] = tableResult.rows[0]?.exists ? '✅ 存在' : '❌ 不存在';
    }

    // 检查用户表
    const users = await db.select().from(schema.users).limit(1);
    result.database.userCount = users.length;

  } catch (error) {
    result.database.connection = '❌ 失败';
    result.database.error = (error as Error).message;
    result.errors.push(`数据库连接失败: ${(error as Error).message}`);
  }

  // 3. 检查必需的环境变量
  if (!process.env.DATABASE_URL) {
    result.errors.push('❌ DATABASE_URL 未配置');
  }
  if (!process.env.JWT_SECRET) {
    result.errors.push('❌ JWT_SECRET 未配置');
  } else if (process.env.JWT_SECRET.length < 32) {
    result.errors.push('⚠️ JWT_SECRET 长度不足，建议至少 32 字符');
  }

  // 4. 总结
  if (result.errors.length === 0 && result.database.connection === '✅ 成功') {
    result.status = '✅ 所有检查通过';
  } else {
    result.status = '❌ 发现问题';
  }

  return NextResponse.json(result);
}
