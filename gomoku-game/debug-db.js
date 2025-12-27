const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDatabase() {
  try {
    const result = await pool.query('SELECT * FROM game_sessions WHERE black_player_id = 11 ORDER BY created_at DESC LIMIT 10');
    console.log('Game sessions:', result.rows);
    
    const userResult = await pool.query('SELECT * FROM users WHERE id = 11');
    console.log('User stats:', userResult.rows[0]);
    
  } catch (error) {
    console.error('DB error:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();