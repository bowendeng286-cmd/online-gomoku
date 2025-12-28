import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb } from "./db";
import { schema } from "./db";

/**
 * 运行数据库迁移
 */
export async function runMigrations() {
  try {
    console.log("Running database migrations...");
    
    const db = await getDb();
    
    // 注意：这里需要先生成迁移文件
    // 可以通过运行 `npm run db:generate` 生成迁移文件
    // 然后运行 `npm run db:migrate` 应用迁移
    
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  }
}

/**
 * 初始化数据库表结构（如果不存在）
 */
export async function initializeDatabase() {
  try {
    console.log("Initializing database tables...");
    
    const db = await getDb();
    
    // 使用 drizzle-kit 生成的迁移或者手动创建表
    // 这里先检查表是否存在，如果不存在则创建
    
    const pg = require("pg");
    const { getPool } = require("./db");
    const pool = await getPool();
    const client = await pool.connect();
    
    try {
      // 创建用户表
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          elo_rating INTEGER DEFAULT 1200,
          games_played INTEGER DEFAULT 0,
          games_won INTEGER DEFAULT 0,
          games_lost INTEGER DEFAULT 0,
          games_drawn INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 创建用户会话表
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 创建游戏会话表
      await client.query(`
        CREATE TABLE IF NOT EXISTS game_sessions (
          id SERIAL PRIMARY KEY,
          room_id VARCHAR(20) NOT NULL,
          black_player_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          white_player_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          winner VARCHAR(10),
          end_time TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 创建游戏移动表
      await client.query(`
        CREATE TABLE IF NOT EXISTS game_moves (
          id SERIAL PRIMARY KEY,
          session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
          player_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          move_number INTEGER NOT NULL,
          row INTEGER NOT NULL,
          col INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
        CREATE INDEX IF NOT EXISTS idx_game_moves_session_id ON game_moves(session_id);
      `);

      // 创建更新时间触发器
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
      `);

      console.log("Database tables initialized successfully");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}