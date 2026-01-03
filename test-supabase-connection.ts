import pg from 'pg';
import * as dotenv from 'dotenv';

const DATABASE_URL = "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

async function testConnection(sslConfig?: any) {
  console.log('========================================');
  console.log('测试 Supabase 数据库连接');
  console.log('========================================');
  console.log('数据库:', DATABASE_URL.split('@')[1]);
  console.log('SSL 配置:', sslConfig || '默认');
  console.log('');

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
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
    console.error('❌ 连接失败:', error.message);
    console.error('错误代码:', error.code);
    console.error('');
    await pool.end();
    return false;
  }
}

async function runTests() {
  const results = [];

  // 测试 1: 默认 SSL 配置（从连接字符串的 sslmode=require）
  console.log('\n【测试 1】默认 SSL 配置 (sslmode=require)');
  results.push(await testConnection());

  // 测试 2: rejectUnauthorized: false
  console.log('\n【测试 2】rejectUnauthorized: false');
  results.push(await testConnection({ rejectUnauthorized: false }));

  // 测试 3: 完整 SSL 配置（禁用证书验证）
  console.log('\n【测试 3】完整 SSL 配置');
  results.push(await testConnection({
    rejectUnauthorized: false,
    requestCert: false,
  }));

  // 测试 4: 使用 tls 模块（如果需要）
  console.log('\n【测试 4】使用 TLS 配置');
  results.push(await testConnection({
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  }));

  console.log('\n========================================');
  console.log('测试结果汇总');
  console.log('========================================');
  results.forEach((result, index) => {
    console.log(`测试 ${index + 1}: ${result ? '✅ 成功' : '❌ 失败'}`);
  });

  const hasSuccess = results.some(r => r);
  console.log('\n' + (hasSuccess ? '✅ 找到可用的配置' : '❌ 所有配置都失败'));

  if (hasSuccess) {
    const successIndex = results.findIndex(r => r) + 1;
    console.log(`推荐使用: 测试 ${successIndex} 的配置`);
  }

  return hasSuccess;
}

runTests();
