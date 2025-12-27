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

    // Initialize all variables
    let historyRows = [];
    let currentStreak = 0;
    let bestStreak = 0;
    let recentGamesResult = null;

    // Get recent games for streak calculation first
    try {
      recentGamesResult = await query(
        `SELECT gs.winner, gs.created_at, gs.black_player_id, gs.white_player_id
         FROM game_sessions gs
         WHERE (gs.black_player_id = $1 OR gs.white_player_id = $1) AND gs.winner IS NOT NULL
         ORDER BY gs.created_at DESC
         LIMIT 50`,
        [decoded.userId]
      );

      // Calculate current streak
      for (const game of recentGamesResult.rows) {
        const playerColor = game.black_player_id === decoded.userId ? 'black' : 'white';
        const isWin = game.winner === playerColor;
        
        if (isWin) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate best streak from all games
      let tempStreak = 0;
      for (let i = recentGamesResult.rows.length - 1; i >= 0; i--) {
        const game = recentGamesResult.rows[i];
        const playerColor = game.black_player_id === decoded.userId ? 'black' : 'white';
        if (game.winner === playerColor) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    } catch (streakError) {
      console.error('Error calculating streaks:', streakError);
      currentStreak = 0;
      bestStreak = 0;
    }

    // Get recent game history
    try {
      const historyResult = await query(
        `SELECT gs.id, gs.room_id, gs.winner, gs.created_at, gs.end_time,
                gs.black_player_id, gs.white_player_id,
                CASE 
                  WHEN gs.black_player_id = $1 THEN gs.white_player_id
                  ELSE gs.black_player_id
                END as opponent_id
         FROM game_sessions gs
         WHERE (gs.black_player_id = $1 OR gs.white_player_id = $1) AND gs.winner IS NOT NULL
         ORDER BY gs.created_at DESC
         LIMIT 10`,
        [decoded.userId]
      );
      
      // Get opponent usernames and determine player color for each game
      for (const game of historyResult.rows) {
        let opponentUsername = 'Unknown';
        if (game.opponent_id) {
          const opponentResult = await query(
            'SELECT username FROM users WHERE id = $1',
            [game.opponent_id]
          );
          if (opponentResult.rows.length > 0) {
            opponentUsername = opponentResult.rows[0].username;
          }
        }
        
        // Properly determine player color
        const playerColor = game.black_player_id === decoded.userId ? 'black' : 'white';
        
        historyRows.push({
          ...game,
          opponent_username: opponentUsername,
          player_color: playerColor
        });
      }
    } catch (historyError) {
      console.error('Error fetching game history:', historyError);
      historyRows = [];
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
      recentGames: historyRows.map(game => ({
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

    // Update player stats for black player
    await query(
      `UPDATE users 
       SET elo_rating = elo_rating + $1,
           games_played = games_played + 1,
           games_won = CASE 
             WHEN $2 = 'black' THEN games_won + 1
             ELSE games_won
           END,
           games_lost = CASE 
             WHEN $2 = 'white' THEN games_lost + 1
             ELSE games_lost
           END,
           games_drawn = CASE 
             WHEN $2 = 'draw' THEN games_drawn + 1
             ELSE games_drawn
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [eloChanges.blackChange, winner, blackPlayerId]
    );

    // Update player stats for white player  
    await query(
      `UPDATE users 
       SET elo_rating = elo_rating + $1,
           games_played = games_played + 1,
           games_won = CASE 
             WHEN $2 = 'white' THEN games_won + 1
             ELSE games_won
           END,
           games_lost = CASE 
             WHEN $2 = 'black' THEN games_lost + 1
             ELSE games_lost
           END,
           games_drawn = CASE 
             WHEN $2 = 'draw' THEN games_drawn + 1
             ELSE games_drawn
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [eloChanges.whiteChange, winner, whitePlayerId]
    );

    // Update or create game session
    const sessionResult = await query(
      `UPDATE game_sessions SET winner = $1, end_time = CURRENT_TIMESTAMP WHERE room_id = $2
       RETURNING id`,
      [winner, roomId]
    );

    // If no session was updated, create one
    if (sessionResult.rows.length === 0) {
      await query(
        'INSERT INTO game_sessions (room_id, black_player_id, white_player_id, winner, end_time) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
        [roomId, blackPlayerId, whitePlayerId, winner]
      );
    }

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