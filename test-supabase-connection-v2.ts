import pg from 'pg';

// 测试不同的连接字符串
const testUrls = [
  // 1. 去掉 sslmode
  "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres",
  // 2. 使用 sslmode=no-verify
  "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify",
  // 3. 使用 sslmode=prefer
  "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=prefer",
  // 4. 连接池版本（端口 6543）
  "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
];

async function testConnection(connectionString: string, sslConfig: any = {}, testName: string) {
  console.log('\n========================================');
  console.log(`测试: ${testName}`);
  console.log('========================================');
  console.log('连接:', connectionString.split('@')[1]);

  const pool = new pg.Pool({
    connectionString: connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ 连接成功！');

    const result = await client.query('SELECT NOW()');
    console.log('✅ 查询成功:', result.rows[0].now);

    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('✅ 用户数量:', userCount.rows[0].count);

    await client.release();
    await pool.end();
    return true;
  } catch (error: any) {
    console.error('❌ 失败:', error.message);
    console.error('错误代码:', error.code);
    await pool.end();
    return false;
  }
}

async function runTests() {
  const results: boolean[] = [];

  // 测试 1: 不使用 SSL（去掉 sslmode=require）
  results.push(await testConnection(
    testUrls[0],
    false, // 完全禁用 SSL
    "不使用 SSL（不安全）"
  ));

  // 测试 2: sslmode=no-verify
  results.push(await testConnection(
    testUrls[1],
    {},
    "sslmode=no-verify"
  ));

  // 测试 3: sslmode=prefer
  results.push(await testConnection(
    testUrls[2],
    {},
    "sslmode=prefer"
  ));

  // 测试 4: 连接池版本（端口 6543）
  results.push(await testConnection(
    testUrls[3],
    { rejectUnauthorized: false },
    "连接池版本（端口 6543）"
  ));

  // 测试 5: 原始配置 + 无 SSL 验证
  console.log('\n========================================');
  console.log(`测试: 原始连接 + 无 SSL 验证`);
  console.log('========================================');
  try {
    const pool = new pg.Pool({
      connectionString: "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require",
      ssl: {
        rejectUnauthorized: false,
        // 尝试更宽松的配置
      },
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    console.log('✅ 连接成功！');

    const result = await client.query('SELECT NOW()');
    console.log('✅ 查询成功:', result.rows[0].now);

    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log('✅ 用户数量:', userCount.rows[0].count);

    await client.release();
    await pool.end();
    results.push(true);
  } catch (error: any) {
    console.error('❌ 失败:', error.message);
    console.error('错误代码:', error.code);
    results.push(false);
  }

  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================');
  const testNames = [
    "不使用 SSL",
    "sslmode=no-verify",
    "sslmode=prefer",
    "连接池版本",
    "原始 + 无验证"
  ];

  testNames.forEach((name, index) => {
    console.log(`${name}: ${results[index] ? '✅ 成功' : '❌ 失败'}`);
  });

  const successIndex = results.findIndex(r => r);
  if (successIndex !== -1) {
    console.log('\n✅ 成功的配置:', testNames[successIndex]);
  } else {
    console.log('\n❌ 所有配置都失败，建议：');
    console.log('1. 检查 Supabase 项目的网络连接设置');
    console.log('2. 检查 Vercel 是否需要添加 Supabase IP 到白名单');
    console.log('3. 考虑使用其他数据库服务（如 Vercel Postgres）');
  }
}

runTests();
