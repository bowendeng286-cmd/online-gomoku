import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to verify JWT token
function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

// POST - Manually update stats for testing
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    
    if (action === 'reset_stats') {
      // Reset user stats for testing
      await query(
        'UPDATE users SET games_played = 0, games_won = 0, games_lost = 0, games_drawn = 0, elo_rating = 1200 WHERE id = $1',
        [decoded.userId]
      );
      
      return NextResponse.json({ success: true, message: 'Stats reset for testing' });
    }
    
    if (action === 'add_test_game') {
      // Add a test game
      const { result = 'win', opponentId } = body;
      
      // Create a test game session
      const sessionResult = await query(
        'INSERT INTO game_sessions (room_id, black_player_id, white_player_id, winner, end_time) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
        [`TEST-${Date.now()}`, decoded.userId, opponentId || null, result === 'draw' ? 'draw' : (result === 'win' ? 'black' : 'white')]
      );
      
      // Update user stats
      const isWin = result === 'win';
      await query(
        `UPDATE users 
         SET games_played = games_played + 1,
             games_won = CASE WHEN $1 = true THEN games_won + 1 ELSE games_won END,
             games_lost = CASE WHEN $1 = false THEN games_lost + 1 ELSE games_lost END,
             games_drawn = CASE WHEN $2 = true THEN games_drawn + 1 ELSE games_drawn END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [isWin, result === 'draw', decoded.userId]
      );
      
      return NextResponse.json({ success: true, message: 'Test game added', sessionId: sessionResult.rows[0].id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Test stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}