// Database configuration - try PostgreSQL first, fallback to simple file database
import { Pool } from 'pg';

let pool: Pool | null = null;
let useSimpleDb = false;

// Initialize database connection
try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    console.log('PostgreSQL database configured');
  } else {
    throw new Error('DATABASE_URL not found');
  }
} catch (error) {
  console.log('PostgreSQL not available, using simple file database');
  useSimpleDb = true;
}

export async function query(text: string, params?: any[]) {
  if (useSimpleDb) {
    // Use simple file database
    const { query: simpleQuery } = await import('./simpleDb');
    return simpleQuery(text, params);
  }

  // Use PostgreSQL
  try {
    const start = Date.now();
    const res = await pool!.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('PostgreSQL query failed, falling back to simple database:', error);
    
    // Fallback to simple database on error
    useSimpleDb = true;
    const { query: simpleQuery } = await import('./simpleDb');
    return simpleQuery(text, params);
  }
}

export async function initDatabase() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        elo_rating INTEGER DEFAULT 1200,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_lost INTEGER DEFAULT 0,
        games_drawn INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create game_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(20) NOT NULL,
        black_player_id INTEGER REFERENCES users(id),
        white_player_id INTEGER REFERENCES users(id),
        winner VARCHAR(10), -- 'black', 'white', 'draw', null for ongoing
        end_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create game_moves table
    await query(`
      CREATE TABLE IF NOT EXISTS game_moves (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES users(id),
        move_number INTEGER NOT NULL,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_sessions table for authentication
    await query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

export default pool;