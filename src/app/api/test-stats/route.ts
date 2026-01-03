import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { userManager } from '@/storage/database/userManager';
import { getDb } from '@/storage/database/db';
import { gameSessions } from '@/storage/database/shared/schema';

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

    const { action } = await request.json();
    
    if (action === 'reset_stats') {
      // Reset user stats for testing
      await userManager.updateUser(decoded.userId, {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        gamesDrawn: 0,
        eloRating: 1200
      });
      
      return NextResponse.json({ success: true, message: 'Stats reset for testing' });
    }
    
    if (action === 'add_test_game') {
      // Add a test game
      const { result = 'win', opponentId } = await request.json();
      
      // Create a test game session using Drizzle
      const db = await getDb();
      const sessionResult = await db.insert(gameSessions).values({
        roomId: `TEST-${Date.now()}`,
        blackPlayerId: decoded.userId,
        whitePlayerId: opponentId || null,
        winner: result === 'draw' ? 'draw' : (result === 'win' ? 'black' : 'white'),
        endTime: new Date().toISOString()
      }).returning({ id: gameSessions.id });
      
      // Get current user stats
      const user = await userManager.getUserById(decoded.userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Update user stats
      const isWin = result === 'win';
      await userManager.updateUser(decoded.userId, {
        gamesPlayed: (user.gamesPlayed || 0) + 1,
        gamesWon: isWin ? (user.gamesWon || 0) + 1 : (user.gamesWon || 0),
        gamesLost: !isWin && result !== 'draw' ? (user.gamesLost || 0) + 1 : (user.gamesLost || 0),
        gamesDrawn: result === 'draw' ? (user.gamesDrawn || 0) + 1 : (user.gamesDrawn || 0)
      });
      
      return NextResponse.json({ success: true, message: 'Test game added', sessionId: sessionResult[0].id });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Test stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}