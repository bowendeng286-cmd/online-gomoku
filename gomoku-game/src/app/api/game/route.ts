import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to verify JWT token
function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

// This is a fallback HTTP API for environments where WebSocket is not available
let gameStateStore: any = {};
let playerRoles: any = {}; // Store player roles for each room
let newGameVotes: any = {}; // Store new game votes for each room

// Matchmaking system
let matchQueue: Array<{
  userId: number;
  timestamp: number;
  matchId: string;
}> = [];
let matchmakingStore: any = {}; // Store matchmaking information

// Matchmaking helper functions
function findMatchForPlayer(userId: number): number | null {
  // Remove expired matches (older than 30 seconds)
  const now = Date.now();
  matchQueue = matchQueue.filter(match => (now - match.timestamp) < 30000);

  // Find a match that doesn't involve the same user
  for (const match of matchQueue) {
    if (match.userId !== userId) {
      // Found a potential match!
      const matchId = match.matchId;
      
      // Remove both players from queue
      matchQueue = matchQueue.filter(m => m.matchId !== matchId && m.userId !== userId);
      
      return match.userId; // Return the matched user's ID
    }
  }
  
  return null; // No match found
}

function addToMatchQueue(userId: number): string {
  const matchId = Math.random().toString(36).substr(2, 9);
  matchQueue.push({
    userId: userId,
    timestamp: Date.now(),
    matchId: matchId
  });
  
  return matchId;
}

async function createMatchedRoom(user1Id: number, user2Id: number) {
  const roomId = Math.random().toString(36).substr(2, 9).toUpperCase();
  const firstHand = Math.random() < 0.5 ? 'black' : 'white'; // Random first player
  
  // Create game session in database
  const sessionResult = await query(
    'INSERT INTO game_sessions (room_id, black_player_id, white_player_id) VALUES ($1, $2, $3) RETURNING id',
    [roomId, firstHand === 'black' ? user1Id : user2Id, firstHand === 'black' ? user2Id : user1Id]
  );

  const sessionId = sessionResult.rows[0].id;
  
  gameStateStore[roomId] = {
    id: roomId,
    sessionId: sessionId,
    players: { 
      black: firstHand === 'black' ? user1Id : user2Id,
      white: firstHand === 'black' ? user2Id : user1Id
    },
    gameState: {
      board: Array(15).fill(null).map(() => Array(15).fill(null)),
      currentTurn: firstHand,
      status: 'playing',
      winner: null,
      lastMove: null
    },
    firstHand: firstHand,
    lastUpdate: Date.now()
  };
  
  playerRoles[roomId] = {
    [user1Id]: firstHand === 'black' ? 'black' : 'white',
    [user2Id]: firstHand === 'black' ? 'white' : 'black'
  };
  
  newGameVotes[roomId] = { black: false, white: false };
  
  return { roomId, sessionId, user1Role: playerRoles[roomId][user1Id], user2Role: playerRoles[roomId][user2Id], firstHand };
}

async function getUserInfo(userId: number) {
  const result = await query(
    'SELECT id, username, email, elo_rating FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
}

function checkWinner(board: any[][], row: number, col: number, player: 'black' | 'white'): 'black' | 'white' | null {
  const directions = [
    [[0, 1], [0, -1]], // horizontal
    [[1, 0], [-1, 0]], // vertical
    [[1, 1], [-1, -1]], // diagonal \
    [[1, -1], [-1, 1]]  // diagonal /
  ];

  for (const direction of directions) {
    let count = 1;
    
    for (const [dr, dc] of direction) {
      let r = row + dr;
      let c = col + dc;
      
      while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }
    }
    
    if (count >= 5) {
      return player;
    }
  }
  
  return null;
}

// Handle GET requests for polling game state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const action = searchParams.get('action');

    // Verify user authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Handle polling requests
    if (roomId && gameStateStore[roomId]) {
      const room = gameStateStore[roomId];
      
      // Verify user is in this room
      if (decoded.userId !== room.players.black && decoded.userId !== room.players.white) {
        return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });
      }

      const userRole = decoded.userId === room.players.black ? 'black' : 'white';
      const opponentId = userRole === 'black' ? room.players.white : room.players.black;
      const opponentJoined = opponentId !== null;
      
      // Get user and opponent info
      const userInfo = await getUserInfo(decoded.userId);
      const opponentInfo = opponentId ? await getUserInfo(opponentId) : null;

      // Return current room state
      return NextResponse.json({
        type: 'game_state_with_opponent',
        payload: {
          gameState: room.gameState,
          opponentJoined: opponentJoined,
          firstHand: room.firstHand || 'black',
          playerInfo: userInfo,
          opponentInfo: opponentInfo,
          newGameVotes: newGameVotes[roomId] || { black: false, white: false }
        }
      });
    }

    // Handle check_match_status for quick match
    if (action === 'check_match_status') {
      for (const [roomId, room] of Object.entries(gameStateStore)) {
        const typedRoom = room as any;
        if ((typedRoom.players.black === decoded.userId || typedRoom.players.white === decoded.userId) && typedRoom.gameState.status === 'playing') {
          const userRole = decoded.userId === typedRoom.players.black ? 'black' : 'white';
          const opponentId = userRole === 'black' ? typedRoom.players.white : typedRoom.players.black;
          const opponentInfo = await getUserInfo(opponentId);
          const userInfo = await getUserInfo(decoded.userId);
          
          return NextResponse.json({
            type: 'match_found',
            payload: {
              roomId,
              sessionId: typedRoom.sessionId,
              playerRole: userRole,
              opponentJoined: true,
              gameState: typedRoom.gameState,
              firstHand: typedRoom.firstHand,
              playerInfo: userInfo,
              opponentInfo: opponentInfo
            }
          });
        }
      }
      
      // Still waiting
      return NextResponse.json({
        type: 'quick_match_status',
        payload: {
          status: 'waiting',
          message: '正在寻找对手，请稍候...'
        }
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Game API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action, roomId, playerRole, move, customRoomId, firstPlayer } = body;

    // Get user information
    const userInfo = await getUserInfo(decoded.userId);
    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'create_room':
        // Support both auto-generated and custom room IDs
        let newRoomId: string;
        if (customRoomId && customRoomId.trim()) {
          newRoomId = customRoomId.trim().toUpperCase();
          // Check if custom room ID already exists
          if (gameStateStore[newRoomId]) {
            return NextResponse.json({ error: '房间号已存在' }, { status: 400 });
          }
        } else {
          newRoomId = Math.random().toString(36).substr(2, 9).toUpperCase();
        }
        
        // Determine who goes first (default: black, but can be customized)
        const firstHand = firstPlayer || 'black';
        
        // Create game session in database
        const sessionResult = await query(
          'INSERT INTO game_sessions (room_id, black_player_id, white_player_id) VALUES ($1, $2, $3) RETURNING id',
          [newRoomId, decoded.userId, null]
        );

        const sessionId = sessionResult.rows[0].id;
        
        gameStateStore[newRoomId] = {
          id: newRoomId,
          sessionId: sessionId,
          players: { black: decoded.userId, white: null },
          gameState: {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: firstHand,
            status: 'waiting',
            winner: null,
            lastMove: null
          },
          firstHand: firstHand,
          lastUpdate: Date.now()
        };
        playerRoles[newRoomId] = { [decoded.userId]: 'black' };
        newGameVotes[newRoomId] = { black: false, white: false };

        return NextResponse.json({
          type: 'room_info',
          payload: {
            roomId: newRoomId,
            sessionId: sessionId,
            playerRole: 'black',
            opponentJoined: false,
            gameState: gameStateStore[newRoomId].gameState,
            firstHand: firstHand,
            playerInfo: userInfo
          }
        });

      case 'join_room':
        const room = gameStateStore[roomId];
        if (!room) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        if (room.players.white === null) {
          // Update database session with second player
          await query(
            'UPDATE game_sessions SET white_player_id = $1 WHERE room_id = $2',
            [decoded.userId, roomId]
          );

          room.players.white = decoded.userId;
          room.gameState.status = 'playing';
          room.lastUpdate = Date.now();
          playerRoles[roomId] = { ...playerRoles[roomId], [decoded.userId]: 'white' };
          newGameVotes[roomId] = { black: false, white: false };
          
          // Get opponent info
          const opponentInfo = await getUserInfo(room.players.black);
          
          return NextResponse.json({
            type: 'room_info',
            payload: {
              roomId,
              sessionId: room.sessionId,
              playerRole: 'white',
              opponentJoined: true,
              gameState: room.gameState,
              firstHand: room.firstHand || 'black',
              playerInfo: userInfo,
              opponentInfo: opponentInfo
            }
          });
        } else {
          return NextResponse.json({ error: '房间已满' }, { status: 400 });
        }

      case 'move':
        const gameRoom = gameStateStore[roomId];
        if (!gameRoom) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Verify user is in this room
        if (decoded.userId !== gameRoom.players.black && decoded.userId !== gameRoom.players.white) {
          return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });
        }

        // Determine the user's role
        const userRole = decoded.userId === gameRoom.players.black ? 'black' : 'white';
        
        // Check if it's the user's turn
        if (gameRoom.gameState.currentTurn !== userRole) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
        }

        if (gameRoom.gameState.board[move.row][move.col] !== null) {
          return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
        }

        // Record the move in database
        await query(
          'INSERT INTO game_moves (session_id, player_id, move_number, row, col) VALUES ($1, $2, $3, $4, $5)',
          [gameRoom.sessionId, decoded.userId, gameRoom.gameState.moveCount || 1, move.row, move.col]
        );

        // Make the move
        gameRoom.gameState.board[move.row][move.col] = userRole;
        gameRoom.gameState.lastMove = { row: move.row, col: move.col };
        gameRoom.gameState.currentTurn = userRole === 'black' ? 'white' : 'black';
        gameRoom.gameState.status = 'playing';
        gameRoom.gameState.moveCount = (gameRoom.gameState.moveCount || 1) + 1;
        gameRoom.lastUpdate = Date.now();

        // Check winner
        const winner = checkWinner(gameRoom.gameState.board, move.row, move.col, userRole);
        if (winner) {
          gameRoom.gameState.winner = winner;
          gameRoom.gameState.status = 'ended';

          // Update game session with winner
          await query(
            'UPDATE game_sessions SET winner = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2',
            [winner, gameRoom.sessionId]
          );

          // Update player stats
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/stats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              roomId,
              winner,
              blackPlayerId: gameRoom.players.black,
              whitePlayerId: gameRoom.players.white,
            }),
          });
        }

        return NextResponse.json({
          type: 'game_state',
          payload: gameRoom.gameState
        });

      case 'vote_new_game':
        const voteRoom = gameStateStore[roomId];
        if (!voteRoom) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        // Verify user is in this room
        if (decoded.userId !== voteRoom.players.black && decoded.userId !== voteRoom.players.white) {
          return NextResponse.json({ error: 'You are not in this room' }, { status: 403 });
        }

        // Check if game has ended
        if (voteRoom.gameState.status !== 'ended') {
          return NextResponse.json({ error: '只有在游戏结束后才能开始新游戏' }, { status: 400 });
        }

        const userVoteRole = decoded.userId === voteRoom.players.black ? 'black' : 'white';
        
        // Record the vote
        newGameVotes[roomId][userVoteRole] = true;
        voteRoom.lastUpdate = Date.now();

        // Check if both players have voted
        if (newGameVotes[roomId].black && newGameVotes[roomId].white) {
          // Both players agreed, start new game with swapped colors
          const oldFirstHand = voteRoom.firstHand || 'black';
          const newFirstHand = oldFirstHand === 'black' ? 'white' : 'black';
          
          // Create new game session
          const newSessionResult = await query(
            'INSERT INTO game_sessions (room_id, black_player_id, white_player_id) VALUES ($1, $2, $3) RETURNING id',
            [roomId, newFirstHand === 'black' ? voteRoom.players.black : voteRoom.players.white, newFirstHand === 'black' ? voteRoom.players.white : voteRoom.players.black]
          );

          voteRoom.sessionId = newSessionResult.rows[0].id;
          voteRoom.gameState = {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: newFirstHand,
            status: 'playing',
            winner: null,
            lastMove: null,
            moveCount: 1
          };
          voteRoom.firstHand = newFirstHand;
          voteRoom.lastUpdate = Date.now();
          
          // Reset votes
          newGameVotes[roomId] = { black: false, white: false };

          return NextResponse.json({
            type: 'new_game_started',
            payload: {
              gameState: voteRoom.gameState,
              firstHand: newFirstHand,
              message: '双方同意，开始新游戏！黑白方已互换。'
            }
          });
        } else {
          // Waiting for the other player
          const otherPlayer = userVoteRole === 'black' ? 'white' : 'black';
          const hasVoted = newGameVotes[roomId][otherPlayer];

          return NextResponse.json({
            type: 'vote_recorded',
            payload: {
              voterRole: userVoteRole,
              waitingFor: otherPlayer,
              hasVoted,
              message: `已记录您的投票，等待${otherPlayer === 'black' ? '黑方' : '白方'}同意...`
            }
          });
        }

      case 'quick_match':
        // Add user to match queue
        const matchId = addToMatchQueue(decoded.userId);
        
        // Try to find a match
        const matchedUserId = findMatchForPlayer(decoded.userId);
        
        if (matchedUserId) {
          // Found a match! Create room
          const matchResult = await createMatchedRoom(decoded.userId, matchedUserId);
          const user1Info = await getUserInfo(decoded.userId);
          const user2Info = await getUserInfo(matchedUserId);
          
          return NextResponse.json({
            type: 'match_found',
            payload: {
              roomId: matchResult.roomId,
              sessionId: matchResult.sessionId,
              playerRole: matchResult.user1Role,
              opponentJoined: true,
              gameState: gameStateStore[matchResult.roomId].gameState,
              firstHand: matchResult.firstHand,
              playerInfo: user1Info,
              opponentInfo: user2Info
            }
          });
        } else {
          // Still waiting
          return NextResponse.json({
            type: 'quick_match_status',
            payload: {
              status: 'waiting',
              message: '正在寻找对手，请稍候...'
            }
          });
        }

      case 'check_match_status':
        // Check if user has been matched
        for (const [roomId, room] of Object.entries(gameStateStore)) {
          const typedRoom = room as any;
          if ((typedRoom.players.black === decoded.userId || typedRoom.players.white === decoded.userId) && typedRoom.gameState.status === 'playing') {
            const userRole = decoded.userId === typedRoom.players.black ? 'black' : 'white';
            const opponentId = userRole === 'black' ? typedRoom.players.white : typedRoom.players.black;
            const opponentInfo = await getUserInfo(opponentId);
            const userInfo = await getUserInfo(decoded.userId);
            
            return NextResponse.json({
              type: 'match_found',
              payload: {
                roomId,
                sessionId: typedRoom.sessionId,
                playerRole: userRole,
                opponentJoined: true,
                gameState: typedRoom.gameState,
                firstHand: typedRoom.firstHand,
                playerInfo: userInfo,
                opponentInfo: opponentInfo
              }
            });
          }
        }
        
        // Still waiting
        return NextResponse.json({
          type: 'quick_match_status',
          payload: {
            status: 'waiting',
            message: '正在寻找对手，请稍候...'
          }
        });

      case 'leave_room':
        if (roomId && gameStateStore[roomId]) {
          // Update database session end time if game is in progress
          if (gameStateStore[roomId].gameState.status === 'playing') {
            await query(
              'UPDATE game_sessions SET end_time = CURRENT_TIMESTAMP WHERE id = $1',
              [gameStateStore[roomId].sessionId]
            );
          }
          
          delete gameStateStore[roomId];
          delete playerRoles[roomId];
          delete newGameVotes[roomId];
        }
        
        // Remove from match queue if user is there
        matchQueue = matchQueue.filter(match => match.userId !== decoded.userId);
        
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}