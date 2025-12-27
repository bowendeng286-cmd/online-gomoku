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
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user stats
    const userResult = await query(
      `SELECT id, username, elo_rating, games_played, games_won, games_lost, games_drawn, created_at, updated_at 
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const winRate = user.games_played > 0 ? (user.games_won / user.games_played) * 100 : 0;

    // Get recent game history
    const historyResult = await query(
      `SELECT gs.id, gs.room_id, gs.winner, gs.created_at, gs.end_time,
              u1.username as opponent_username,
              CASE 
                WHEN gs.black_player_id = $1 THEN 'white'
                WHEN gs.white_player_id = $1 THEN 'black'
              END as player_color
       FROM game_sessions gs
       LEFT JOIN users u1 ON (u1.id = CASE WHEN gs.black_player_id = $1 THEN gs.white_player_id ELSE gs.black_player_id END)
       WHERE (gs.black_player_id = $1 OR gs.white_player_id = $1) AND gs.winner IS NOT NULL
       ORDER BY gs.created_at DESC
       LIMIT 10`,
      [decoded.userId]
    );

    // Calculate win streaks
    const streakResult = await query(
      `WITH ranked_games AS (
        SELECT 
          gs.winner,
          CASE 
            WHEN gs.black_player_id = $1 THEN 
              CASE WHEN gs.winner = 'black' THEN 1 ELSE 0 END
            ELSE 
              CASE WHEN gs.winner = 'white' THEN 1 ELSE 0 END
          END as is_win,
          ROW_NUMBER() OVER (ORDER BY gs.created_at DESC) as rn
        FROM game_sessions gs
        WHERE (gs.black_player_id = $1 OR gs.white_player_id = $1) AND gs.winner IS NOT NULL
      )
      SELECT 
        MAX(CASE WHEN is_win = 1 THEN rn END) as current_streak_start,
        MAX(rn) as total_games
      FROM ranked_games`,
      [decoded.userId]
    );

    let currentStreak = 0;
    let bestStreak = 0;

    if (streakResult.rows.length > 0 && streakResult.rows[0].total_games) {
      const currentStreakStart = streakResult.rows[0].current_streak_start;
      const totalGames = streakResult.rows[0].total_games;
      
      currentStreak = currentStreakStart ? totalGames - currentStreakStart + 1 : 0;

      // Calculate best streak (this is simplified, could be improved with window functions)
      const bestStreakResult = await query(
        `WITH win_streaks AS (
          SELECT 
            CASE 
              WHEN is_win = 1 THEN 
                ROW_NUMBER() OVER (ORDER BY created_at DESC) - 
                ROW_NUMBER() OVER (PARTITION BY is_win ORDER BY created_at DESC)
            END as streak_group,
            COUNT(*) as streak_length
          FROM (
            SELECT 
              gs.created_at,
              CASE 
                WHEN gs.black_player_id = $1 THEN 
                  CASE WHEN gs.winner = 'black' THEN 1 ELSE 0 END
                ELSE 
                  CASE WHEN gs.winner = 'white' THEN 1 ELSE 0 END
              END as is_win
            FROM game_sessions gs
            WHERE (gs.black_player_id = $1 OR gs.white_player_id = $1) AND gs.winner IS NOT NULL
            ORDER BY gs.created_at DESC
          ) wins
          WHERE is_win = 1
          GROUP BY streak_group
        )
        SELECT MAX(streak_length) as best_streak FROM win_streaks`,
        [decoded.userId]
      );

      if (bestStreakResult.rows.length > 0) {
        bestStreak = bestStreakResult.rows[0].best_streak || 0;
      }
    }

    const stats = {
      userId: user.id,
      username: user.username,
      eloRating: user.elo_rating,
      gamesPlayed: user.games_played,
      gamesWon: user.games_won,
      gamesLost: user.games_lost,
      gamesDrawn: user.games_drawn,
      winRate: Math.round(winRate * 100) / 100,
      currentStreak,
      bestStreak,
      recentGames: historyResult.rows.map(game => ({
        id: game.id,
        roomId: game.room_id,
        opponent: game.opponent_username || 'Unknown',
        playerColor: game.player_color,
        result: game.winner === game.player_color ? 'win' : game.winner === 'draw' ? 'draw' : 'loss',
        date: game.created_at,
        duration: game.end_time ? new Date(game.end_time).getTime() - new Date(game.created_at).getTime() : null,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Update stats after game ends
export async function POST(request: NextRequest) {
  return updatePlayerStats(request);
}

// Export function for internal calls
export async function updatePlayerStats(request: NextRequest) {
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
      return NextResponse.json({ error: 'Missing required game data' }, { status: 400 });
    }

    // Verify the current user was part of this game
    if (decoded.userId !== blackPlayerId && decoded.userId !== whitePlayerId) {
      return NextResponse.json({ error: 'User was not part of this game' }, { status: 403 });
    }

    // Get current player ratings
    const playersResult = await query(
      'SELECT id, elo_rating, games_played, games_won, games_lost, games_drawn FROM users WHERE id IN ($1, $2)',
      [blackPlayerId, whitePlayerId]
    );

    if (playersResult.rows.length !== 2) {
      return NextResponse.json({ error: 'Players not found' }, { status: 404 });
    }

    const blackPlayer = playersResult.rows.find(p => p.id === blackPlayerId);
    const whitePlayer = playersResult.rows.find(p => p.id === whitePlayerId);

    if (!blackPlayer || !whitePlayer) {
      return NextResponse.json({ error: 'Player data not found' }, { status: 404 });
    }

    // Calculate ELO changes
    let eloChanges = { blackChange: 0, whiteChange: 0 };

    if (winner !== 'draw') {
      const winnerId = winner === 'black' ? blackPlayerId : whitePlayerId;
      const loserId = winner === 'black' ? whitePlayerId : blackPlayerId;
      const winnerRating = winner === 'black' ? blackPlayer.elo_rating : whitePlayer.elo_rating;
      const loserRating = winner === 'black' ? whitePlayer.elo_rating : blackPlayer.elo_rating;

      const { winnerChange, loserChange } = calculateEloChange(winnerRating, loserRating);
      
      if (winner === 'black') {
        eloChanges.blackChange = winnerChange;
        eloChanges.whiteChange = loserChange;
      } else {
        eloChanges.blackChange = loserChange;
        eloChanges.whiteChange = winnerChange;
      }
    }

    // Update player stats
    await query(
      `UPDATE users 
       SET elo_rating = CASE 
         WHEN id = $1 THEN elo_rating + $2
         WHEN id = $3 THEN elo_rating + $4
         ELSE elo_rating
       END,
       games_played = games_played + 1,
       games_won = CASE 
         WHEN id = $1 AND $5 = 'black' THEN games_won + 1
         WHEN id = $3 AND $5 = 'white' THEN games_won + 1
         ELSE games_won
       END,
       games_lost = CASE 
         WHEN id = $1 AND $5 = 'white' THEN games_lost + 1
         WHEN id = $3 AND $5 = 'black' THEN games_lost + 1
         ELSE games_lost
       END,
       games_drawn = CASE 
         WHEN $5 = 'draw' THEN games_drawn + 1
         ELSE games_drawn
       END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id IN ($1, $3)`,
      [blackPlayerId, eloChanges.blackChange, whitePlayerId, eloChanges.whiteChange, winner]
    );

    // Update game session
    await query(
      'UPDATE game_sessions SET winner = $1, end_time = CURRENT_TIMESTAMP WHERE room_id = $2',
      [winner, roomId]
    );

    return NextResponse.json({
      success: true,
      eloChanges,
      message: 'Game stats updated successfully'
    });
  } catch (error) {
    console.error('Stats POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}