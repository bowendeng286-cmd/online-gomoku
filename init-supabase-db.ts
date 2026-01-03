import pg from 'pg';

// 使用不包含 SSL 的连接字符串
const DATABASE_URL = "postgres://postgres.hnkjdcddngnfusqyqlau:OfZ1bcJLNgbIuBkh@aws-1-us-east-1.pooler.supabase.com:5432/postgres";

const createTablesSQL = `
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(10) DEFAULT 'regular' NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建游戏会话表
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(20) NOT NULL,
  black_player_id INTEGER,
  white_player_id INTEGER,
  winner VARCHAR(10),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS game_sessions_room_id_idx ON game_sessions(room_id);

-- 创建游戏步数表
CREATE TABLE IF NOT EXISTS game_moves (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  player_id INTEGER,
  move_number INTEGER NOT NULL,
  row INTEGER NOT NULL,
  col INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
`;

const insertTestUserSQL = `
INSERT INTO users (username, password_hash, user_type, elo_rating, games_played, games_won, games_lost, games_drawn)
VALUES (
  'testuser',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UG1zW6z5P.5W',
  'regular',
  1200,
  0,
  0,
  0,
  0
)
ON CONFLICT (username) DO NOTHING;
`;

async function initDatabase() {
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: false,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();

  try {
    console.log('🔍 开始初始化 Supabase 数据库...\n');

    // 创建表
    console.log('📝 创建数据库表...');
    await client.query(createTablesSQL);
    console.log('✅ 表创建成功\n');

    // 插入测试用户
    console.log('👤 创建测试用户...');
    await client.query(insertTestUserSQL);
    console.log('✅ 测试用户创建成功\n');

    // 验证表
    console.log('🔍 验证表结构...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'game_sessions', 'game_moves', 'user_sessions')
      ORDER BY table_name
    `);

    console.log('✅ 已创建的表:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // 验证测试用户
    const userCheck = await client.query("SELECT id, username FROM users WHERE username = 'testuser'");
    if (userCheck.rows.length > 0) {
      console.log('\n✅ 测试用户创建成功:');
      console.log(`   ID: ${userCheck.rows[0].id}`);
      console.log(`   用户名: ${userCheck.rows[0].username}`);
    }

    console.log('\n✅ 数据库初始化完成！');
    console.log('\n可以使用以下凭据登录:');
    console.log('   用户名: testuser');
    console.log('   密码: test123');

  } catch (error: any) {
    console.error('❌ 初始化失败:', error.message);
    console.error('错误代码:', error.code);
    throw error;
  } finally {
    await client.release();
    await pool.end();
  }
}

initDatabase();
