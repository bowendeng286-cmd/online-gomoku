import { getDb, schema } from './src/storage/database/db';
import { sql } from 'drizzle-orm';

async function diagnoseDatabase() {
  console.log('🔍 开始诊断数据库连接...\n');

  try {
    // 获取数据库连接
    const db = await getDb();
    console.log('✅ 数据库连接成功\n');

    // 检查表是否存在
    const tables = ['users', 'game_sessions', 'game_moves', 'user_sessions'];

    for (const tableName of tables) {
      try {
        const result = await db.execute(
          sql`SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ${tableName}
          )`
        );

        const exists = result.rows[0]?.exists;
        console.log(`  ${exists ? '✅' : '❌'} 表 ${tableName}: ${exists ? '存在' : '不存在'}`);
      } catch (e) {
        console.log(`  ❌ 表 ${tableName}: 检查失败 - ${(e as Error).message}`);
      }
    }

    console.log('\n🔍 检查用户表数据...');
    try {
      const users = await db.select().from(schema.users);
      console.log(`  ✅ users 表中有 ${users.length} 条记录`);
    } catch (e) {
      console.log(`  ❌ 读取 users 表失败: ${(e as Error).message}`);
    }

    console.log('\n✅ 诊断完成');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    console.error('\n可能的原因:');
    console.error('1. DATABASE_URL 环境变量未配置');
    console.error('2. DATABASE_URL 格式不正确');
    console.error('3. 数据库未初始化（表不存在）');
    console.error('4. 数据库连接权限不足');
    process.exit(1);
  }
}

diagnoseDatabase();
