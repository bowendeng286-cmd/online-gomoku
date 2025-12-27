import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gomoku.db');

// Create database connection
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Promisify the run and get methods for async/await usage
const runAsync = promisify(db.run.bind(db));
const getAsync = promisify(db.get.bind(db));
const allAsync = promisify(db.all.bind(db));

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  
  try {
    // Replace PostgreSQL specific syntax with SQLite syntax
    let modifiedText = text;
    
    // Replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT
    modifiedText = modifiedText.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    
    // Replace VARCHAR with TEXT
    modifiedText = modifiedText.replace(/VARCHAR\(\d+\)/g, 'TEXT');
    
    // Replace TIMESTAMP WITH TIME ZONE with DATETIME
    modifiedText = modifiedText.replace(/TIMESTAMP WITH TIME ZONE/g, 'DATETIME');
    modifiedText = modifiedText.replace(/CURRENT_TIMESTAMP/g, 'CURRENT_TIMESTAMP');
    
    // Replace PostgreSQL parameter placeholders ($1, $2) with SQLite placeholders (?, ?)
    if (params) {
      let paramIndex = 1;
      modifiedText = modifiedText.replace(/\$\d+/g, () => '?');
    }
    
    // Check if it's a SELECT query
    if (modifiedText.trim().toLowerCase().startsWith('select')) {
      const result = await allAsync(modifiedText, params);
      const duration = Date.now() - start;
      console.log('executed query', { text: modifiedText, duration, rows: result.length });
      return { rows: result };
    } else if (modifiedText.trim().toLowerCase().startsWith('insert') && modifiedText.toLowerCase().includes('returning')) {
      // Handle INSERT with RETURNING clause
      const returningMatch = modifiedText.match(/returning\s+(.+)$/i);
      const returningColumns = returningMatch ? returningMatch[1] : '';
      
      const insertPart = modifiedText.split(/returning\s+/i)[0];
      
      // Use a promise wrapper to properly handle the callback
      const result = await new Promise((resolve, reject) => {
        db.run(insertPart, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      });
      
      // Get the inserted row
      if (returningColumns && (result as any).lastID) {
        const insertedRow = await getAsync(`SELECT ${returningColumns} FROM users WHERE id = ?`, [(result as any).lastID]);
        const duration = Date.now() - start;
        console.log('executed query', { text: modifiedText, duration, rows: 1 });
        return { rows: [insertedRow] };
      }
      return { rows: [] };
    } else {
      // Handle other queries (UPDATE, DELETE, INSERT without RETURNING)
      // Use a promise wrapper to properly handle the callback
      const result = await new Promise((resolve, reject) => {
        db.run(modifiedText, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      });
      
      const duration = Date.now() - start;
      console.log('executed query', { text: modifiedText, duration, rows: (result as any).changes });
      return { rows: [] };
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query text:', text);
    console.error('Params:', params);
    throw error;
  }
}

export async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        elo_rating INTEGER DEFAULT 1200,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_lost INTEGER DEFAULT 0,
        games_drawn INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create game_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        black_player_id INTEGER,
        white_player_id INTEGER,
        winner TEXT,
        end_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (black_player_id) REFERENCES users(id),
        FOREIGN KEY (white_player_id) REFERENCES users(id)
      )
    `);

    // Create game_moves table
    await query(`
      CREATE TABLE IF NOT EXISTS game_moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        player_id INTEGER,
        move_number INTEGER NOT NULL,
        row INTEGER NOT NULL,
        col INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES users(id)
      )
    `);

    // Create user_sessions table for authentication
    await query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

export default db;