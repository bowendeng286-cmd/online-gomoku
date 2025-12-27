import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { userManager } from '@/storage/database/userManager';
import { getDb } from '@/storage/database/db';
import { eq, and, or, desc } from 'drizzle-orm';
import { users, gameSessions } from '@/storage/database/shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to verify JWT token
function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

// Helper function to calculate ELO rating change
function calculateEloChange(winnerRating: number, loserRating: number): { winnerChange: number; loserChange: number } {
  const K = 32; // K-factor for ELO calculation
  const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
  
  const winnerChange = Math.round(K * (1 - expectedScoreWinner));
  const loserChange = Math.round(K * (0 - expectedScoreLoser));
  
  return { winnerChange, loserChange };
}

// GET - Get user stats
export async function GET(request: NextRequest) {
  try {
    console.log('Stats GET request received - DEBUG');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user stats
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const winRate = (user.gamesPlayed && user.gamesPlayed > 0 && user.gamesWon) ? (user.gamesWon / user.gamesPlayed) * 100 : 0;

    // Get recent games for streak calculation
    const db = await getDb();
    let currentStreak = 0;
    let bestStreak = 0;
    let historyRows = [];

    try {
      const recentGames = await db
        .select()
        .from(gameSessions)
        .where(
          and(
            or(
              eq(gameSessions.blackPlayerId, decoded.userId),
              eq(gameSessions.whitePlayerId, decoded.userId)
            ),
            // Only include completed games
            // We'll need to add a field to track completed games
          )
        )
        .orderBy(desc(gameSessions.createdAt))
        .limit(50);

      // Calculate current streak
      for (const game of recentGames) {
        if (!game.winner) continue; // Skip ongoing games
        
        const playerColor = game.blackPlayerId === decoded.userId ? 'black' : 'white';
        const isWin = game.winner === playerColor;
        
        if (isWin) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate best streak from all games
      let tempStreak = 0;
      for (let i = recentGames.length - 1; i >= 0; i--) {
        const game = recentGames[i];
        if (!game.winner) continue;
        
        const playerColor = game.blackPlayerId === decoded.userId ? 'black' : 'white';
        if (game.winner === playerColor) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      // Get recent game history with opponent info
      const historyGames = await db
        .select({
          id: gameSessions.id,
          roomId: gameSessions.roomId,
          winner: gameSessions.winner,
          createdAt: gameSessions.createdAt,
          endTime: gameSessions.endTime,
          blackPlayerId: gameSessions.blackPlayerId,
          whitePlayerId: gameSessions.whitePlayerId,
        })
        .from(gameSessions)
        .where(
          and(
            or(
              eq(gameSessions.blackPlayerId, decoded.userId),
              eq(gameSessions.whitePlayerId, decoded.userId)
            ),
            // Only include completed games
          )
        )
        .orderBy(desc(gameSessions.createdAt))
        .limit(10);

      // Get opponent usernames
      for (const game of historyGames) {
        const opponentId = game.blackPlayerId === decoded.userId ? game.whitePlayerId : game.blackPlayerId;
        let opponentUsername = 'Unknown';
        
        if (opponentId) {
          const opponent = await userManager.getUserById(opponentId);
          if (opponent) {
            opponentUsername = opponent.username;
          }
        }
        
        const playerColor = game.blackPlayerId === decoded.userId ? 'black' : 'white';
        
        historyRows.push({
          ...game,
          opponent_username: opponentUsername,
          player_color: playerColor
        });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      currentStreak = 0;
      bestStreak = 0;
      historyRows = [];
    }

    const stats = {
      userId: user.id,
      username: user.username,
      eloRating: user.eloRating,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      gamesLost: user.gamesLost,
      gamesDrawn: user.gamesDrawn,
      winRate: Math.round(winRate * 100) / 100,
      currentStreak,
      bestStreak,
      testField: 'DEBUG_TEST',
      debug: {
        totalHistoryGames: historyRows.length,
        sampleRecentGames: historyRows.slice(0, 2)
      },
      recentGames: historyRows.map(game => ({
        id: game.id,
        roomId: game.roomId,
        opponent: game.opponent_username || 'Unknown',
        playerColor: game.player_color,
        result: game.winner === game.player_color ? 'win' : game.winner === 'draw' ? 'draw' : 'loss',
        date: game.createdAt,
        duration: game.endTime && game.createdAt ? new Date(game.endTime).getTime() - new Date(game.createdAt).getTime() : null,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Update stats after game ends
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

    const { roomId, winner, blackPlayerId, whitePlayerId } = await request.json();

    if (!roomId || !winner || !blackPlayerId || !whitePlayerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get both players
    const blackPlayer = await userManager.getUserById(blackPlayerId);
    const whitePlayer = await userManager.getUserById(whitePlayerId);

    if (!blackPlayer || !whitePlayer) {
      return NextResponse.json({ error: 'One or both players not found' }, { status: 404 });
    }

    // Update stats based on game result
    if (winner === 'draw') {
      // Update for draw
      await userManager.updateUser(blackPlayerId, {
        gamesPlayed: (blackPlayer.gamesPlayed || 0) + 1,
        gamesDrawn: (blackPlayer.gamesDrawn || 0) + 1,
      });

      await userManager.updateUser(whitePlayerId, {
        gamesPlayed: (whitePlayer.gamesPlayed || 0) + 1,
        gamesDrawn: (whitePlayer.gamesDrawn || 0) + 1,
      });
    } else {
      // Calculate ELO changes
      const { winnerChange, loserChange } = calculateEloChange(
        winner === 'black' ? (blackPlayer.eloRating || 1200) : (whitePlayer.eloRating || 1200),
        winner === 'black' ? (whitePlayer.eloRating || 1200) : (blackPlayer.eloRating || 1200)
      );

      // Update winner stats
      const winnerId = winner === 'black' ? blackPlayerId : whitePlayerId;
      const winnerUser = winner === 'black' ? blackPlayer : whitePlayer;
      
      await userManager.updateUser(winnerId, {
        eloRating: (winnerUser.eloRating || 1200) + winnerChange,
        gamesPlayed: (winnerUser.gamesPlayed || 0) + 1,
        gamesWon: (winnerUser.gamesWon || 0) + 1,
      });

      // Update loser stats
      const loserId = winner === 'black' ? whitePlayerId : blackPlayerId;
      const loserUser = winner === 'black' ? whitePlayer : blackPlayer;
      
      await userManager.updateUser(loserId, {
        eloRating: (loserUser.eloRating || 1200) + loserChange,
        gamesPlayed: (loserUser.gamesPlayed || 0) + 1,
        gamesLost: (loserUser.gamesLost || 0) + 1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stats POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}