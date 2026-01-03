import pg from 'pg';

const DATABASE_URL = "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

async function checkSchema() {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: false,  // 不使用 SSL
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ 连接成功！');
    console.log('');

    // 1. 检查所有表
    console.log('========================================');
    console.log('当前数据库中的所有表');
    console.log('========================================');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tables.rows.length === 0) {
      console.log('❌ 没有找到任何表');
    } else {
      tables.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }
    console.log('');

    // 2. 检查是否有 users 表
    const userTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      )
    `);

    if (userTableExists.rows[0].exists) {
      console.log('✅ users 表存在');

      const userCount = await client.query('SELECT COUNT(*) FROM users');
      console.log(`   用户数量: ${userCount.rows[0].count}`);
    } else {
      console.log('❌ users 表不存在');
    }
    console.log('');

    await client.release();
    await pool.end();
  } catch (error: any) {
    console.error('❌ 错误:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkSchema();
