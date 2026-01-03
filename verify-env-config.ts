/**
 * 环境变量配置验证脚本
 *
 * 用途：验证 Vercel 环境中的数据库配置是否正确
 *
 * 使用方法：
 * 1. 在 Vercel Dashboard > Settings > Environment Variables 中配置变量
 * 2. 在本地运行：node verify-env-config.ts
 * 3. 或在 Vercel Function Logs 中查看日志输出
 */

console.log('=== 环境变量配置验证 ===\n');

// 检查 Vercel 环境
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
console.log(`🔍 运行环境: ${isVercel ? 'Vercel (生产/预览)' : '本地/沙箱'}`);
console.log('');

// 检查环境变量
const checkEnvVar = (name: string) => {
  const value = process.env[name];
  const exists = !!value;
  const masked = value ? `${value.substring(0, 15)}...` : '未设置';
  return { exists, masked };
};

// 1. 检查 DATABASE_URL
const databaseUrl = checkEnvVar('DATABASE_URL');
console.log('📊 DATABASE_URL:');
console.log(`   状态: ${databaseUrl.exists ? '✅ 已配置' : '❌ 未配置'}`);
if (databaseUrl.exists) {
  console.log(`   值: ${databaseUrl.masked}`);
}
console.log('');

// 2. 检查 PGDATABASE_URL (备选)
const pgDatabaseUrl = checkEnvVar('PGDATABASE_URL');
console.log('📊 PGDATABASE_URL (备选):');
console.log(`   状态: ${pgDatabaseUrl.exists ? '✅ 已配置' : '⚠️  未配置'}`);
if (pgDatabaseUrl.exists) {
  console.log(`   值: ${pgDatabaseUrl.masked}`);
}
console.log('');

// 3. 检查 JWT_SECRET
const jwtSecret = checkEnvVar('JWT_SECRET');
console.log('🔐 JWT_SECRET:');
console.log(`   状态: ${jwtSecret.exists ? '✅ 已配置' : '❌ 未配置'}`);
if (jwtSecret.exists) {
  const secret = process.env.JWT_SECRET!;
  const isStrong = secret.length >= 32;
  console.log(`   长度: ${secret.length} 字符 ${isStrong ? '✅' : '⚠️  (建议至少32字符)'}`);
  console.log(`   值: ${secret.substring(0, 8)}...`);
}
console.log('');

// 验证结果
console.log('=== 验证结果 ===');

let issues: string[] = [];

// 检查数据库连接
if (!databaseUrl.exists && !pgDatabaseUrl.exists) {
  issues.push('❌ 未配置数据库连接 (DATABASE_URL 或 PGDATABASE_URL)');
} else {
  console.log('✅ 数据库连接已配置');
}

// 检查 JWT_SECRET
if (!jwtSecret.exists) {
  issues.push('❌ 未配置 JWT_SECRET');
} else if (process.env.JWT_SECRET!.length < 32) {
  issues.push('⚠️  JWT_SECRET 太短，建议至少 32 字符');
} else {
  console.log('✅ JWT_SECRET 已配置且强度足够');
}

// 输出问题
if (issues.length > 0) {
  console.log('');
  console.log('⚠️  发现以下问题:');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');
  console.log('📝 请参考 DATABASE_SETUP_GUIDE.md 进行配置');
} else {
  console.log('');
  console.log('✅ 所有配置检查通过！');
}

// 输出下一步操作建议
console.log('');
console.log('=== 下一步操作 ===');
if (issues.length > 0) {
  console.log('1. 在 Vercel Dashboard > Settings > Environment Variables 中添加缺失的变量');
  console.log('2. 在 Vercel Storage 中创建 Postgres 数据库');
  console.log('3. 复制 POSTGRES_URL 并设置为 DATABASE_URL');
  console.log('4. 运行 init-database.sql 初始化数据库表');
  console.log('5. 重新部署项目');
} else {
  console.log('✅ 配置完成，可以开始使用应用');
  console.log('🌐 访问: https://online-gomoku.vercel.app/');
}

console.log('');
