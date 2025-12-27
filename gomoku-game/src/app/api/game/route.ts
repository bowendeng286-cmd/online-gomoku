import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/userStore';

// This is a fallback HTTP API for environments where WebSocket is not available
let gameStateStore: any = {};
let playerRoles: any = {}; // Store player roles for each room
let newGameVotes: any = {}; // Store new game votes for each room

// User session management - map userId to actual user info
let roomUsers: any = {}; // roomId -> { black: userId, white: userId }

// Matchmaking system
let matchQueue: Array<{
  userId: string;
  timestamp: number;
  matchId: string;
}> = [];
let matchmakingStore: any = {}; // Store matchmaking information

// Authentication helper
function authenticateUser(token: string): { userId: string; user: any } | null {
  const user = userStore.getUserByToken(token);
  if (!user) {
    return null;
  }
  return { userId: user.id, user };
}

// Matchmaking helper functions
function findMatchForPlayer(userId: string): string | null {
  // Remove expired matches (older than 30 seconds)
  const now = Date.now();
  matchQueue = matchQueue.filter(match => (now - match.timestamp) < 30000);

  // Find a match that doesn't involve the same player
  for (const match of matchQueue) {
    if (match.userId !== userId) {
      // Found a potential match!
      const matchId = match.matchId;
      
      // Remove both players from queue
      matchQueue = matchQueue.filter(m => m.matchId !== matchId && m.matchId !== userId);
      
      return match.userId; // Return the matched user's ID
    }
  }
  
  return null; // No match found
}

function addToMatchQueue(userId: string): string {
  const matchId = Math.random().toString(36).substr(2, 9);
  matchQueue.push({
    userId: userId,
    timestamp: Date.now(),
    matchId: matchId
  });
  
  return matchId;
}

function createMatchedRoom(user1Id: string, user2Id: string) {
  const roomId = Math.random().toString(36).substr(2, 9).toUpperCase();
  const firstHand = Math.random() < 0.5 ? 'black' : 'white'; // Random first player
  
  gameStateStore[roomId] = {
    id: roomId,
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
  
  // Store user mappings for the room
  roomUsers[roomId] = {
    black: firstHand === 'black' ? user1Id : user2Id,
    white: firstHand === 'black' ? user2Id : user1Id
  };
  
  playerRoles[roomId] = {
    [user1Id]: firstHand === 'black' ? 'black' : 'white',
    [user2Id]: firstHand === 'black' ? 'white' : 'black'
  };
  
  newGameVotes[roomId] = { black: false, white: false };
  
  return { roomId, user1Role: playerRoles[roomId][user1Id], user2Role: playerRoles[roomId][user2Id], firstHand };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, playerRole, move, customRoomId, firstPlayer, playerId, token } = body;

    // Authenticate user for all actions except GET requests
    let auth = null;
    if (token) {
      auth = authenticateUser(token);
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
        
        // Require authentication for creating rooms
        if (!auth) {
          return NextResponse.json({ error: '需要登录才能创建房间' }, { status: 401 });
        }
        
        const creatorId = auth.userId;
        
        // Determine who goes first (default: black, but can be customized)
        const firstHand = firstPlayer || 'black';
        
        gameStateStore[newRoomId] = {
          id: newRoomId,
          players: { black: creatorId, white: null },
          gameState: {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: firstHand, // Use the determined first hand
            status: 'waiting',
            winner: null,
            lastMove: null
          },
          firstHand: firstHand, // Store the first hand preference
          lastUpdate: Date.now()
        };
        
        roomUsers[newRoomId] = { black: creatorId, white: null };
        playerRoles[newRoomId] = { [creatorId]: 'black' };
        newGameVotes[newRoomId] = { black: false, white: false }; // Initialize new game votes
        return NextResponse.json({
          type: 'room_info',
          payload: {
            roomId: newRoomId,
            playerRole: 'black',
            opponentJoined: false,
            gameState: gameStateStore[newRoomId].gameState,
            firstHand: firstHand
          }
        });

      case 'join_room':
        // Require authentication for joining rooms
        if (!auth) {
          return NextResponse.json({ error: '需要登录才能加入房间' }, { status: 401 });
        }
        
        const room = gameStateStore[roomId];
        if (!room) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        if (room.players.white === null) {
          const joinerId = auth.userId;
          room.players.white = joinerId;
          room.gameState.status = 'playing';
          room.lastUpdate = Date.now();
          
          roomUsers[roomId].white = joinerId;
          playerRoles[roomId] = { ...playerRoles[roomId], [joinerId]: 'white' };
          newGameVotes[roomId] = { black: false, white: false }; // Initialize new game votes
          
          return NextResponse.json({
            type: 'room_info',
            payload: {
              roomId,
              playerRole: 'white',
              opponentJoined: true,
              gameState: room.gameState,
              firstHand: room.firstHand || 'black'
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

        // For HTTP mode, we need to determine the player role differently
        // Since we can't track individual clients, we'll use currentTurn as playerRole
        const currentPlayer = gameRoom.gameState.currentTurn;

        if (gameRoom.gameState.board[move.row][move.col] !== null) {
          return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
        }

        // Make the move
        gameRoom.gameState.board[move.row][move.col] = currentPlayer;
        gameRoom.gameState.lastMove = { row: move.row, col: move.col };
        gameRoom.gameState.currentTurn = currentPlayer === 'black' ? 'white' : 'black';
        gameRoom.gameState.status = 'playing';
        gameRoom.lastUpdate = Date.now();

        // Check winner
        const winner = checkWinner(gameRoom.gameState.board, move.row, move.col, currentPlayer);
        if (winner) {
          gameRoom.gameState.winner = winner;
          gameRoom.gameState.status = 'ended';

          // Update player ratings and statistics
          const roomUserInfo = roomUsers[roomId];
          if (roomUserInfo && roomUserInfo.black && roomUserInfo.white) {
            const blackUserId = roomUserInfo.black;
            const whiteUserId = roomUserInfo.white;

            // Update ratings based on game result
            if (winner === 'black') {
              userStore.updateGameRecord(blackUserId, whiteUserId, 'win');
              userStore.updateGameRecord(whiteUserId, blackUserId, 'loss');
            } else if (winner === 'white') {
              userStore.updateGameRecord(whiteUserId, blackUserId, 'win');
              userStore.updateGameRecord(blackUserId, whiteUserId, 'loss');
            }
          }
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

        // Check if game has ended
        if (voteRoom.gameState.status !== 'ended') {
          return NextResponse.json({ error: '只有在游戏结束后才能开始新游戏' }, { status: 400 });
        }

        // In HTTP mode, we can't accurately determine who is voting
        // So we'll allow both players to vote and check if all votes are collected
        // This is a limitation of HTTP mode, but it works for the voting system
        const hasAllVotes = newGameVotes[roomId].black && newGameVotes[roomId].white;
        
        if (hasAllVotes) {
          // Both players already agreed, start new game
          const oldFirstHand = voteRoom.firstHand || 'black';
          const newFirstHand = oldFirstHand === 'black' ? 'white' : 'black';
          
          voteRoom.gameState = {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: newFirstHand,
            status: 'playing',
            winner: null,
            lastMove: null
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
        }

        // For HTTP mode, we'll randomly assign a vote to simulate both players voting
        // In a real application, this would be handled by proper session management
        const rolesToVote = [];
        if (!newGameVotes[roomId].black) rolesToVote.push('black');
        if (!newGameVotes[roomId].white) rolesToVote.push('white');
        
        if (rolesToVote.length === 0) {
          return NextResponse.json({ error: '双方都已投票' }, { status: 400 });
        }
        
        const voterRole = rolesToVote[0]; // Vote for the first available role

        // Record the vote
        newGameVotes[roomId][voterRole] = true;
        voteRoom.lastUpdate = Date.now();

        // Check if both players have voted
        if (newGameVotes[roomId].black && newGameVotes[roomId].white) {
          // Both players agreed, start new game with swapped colors
          const oldFirstHand = voteRoom.firstHand || 'black';
          const newFirstHand = oldFirstHand === 'black' ? 'white' : 'black';
          
          voteRoom.gameState = {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: newFirstHand,
            status: 'playing',
            winner: null,
            lastMove: null
          };
          voteRoom.firstHand = newFirstHand; // Update stored first hand
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
          const otherPlayer = voterRole === 'black' ? 'white' : 'black';
          const hasVoted = newGameVotes[roomId][otherPlayer];

          return NextResponse.json({
            type: 'vote_recorded',
            payload: {
              voterRole,
              waitingFor: otherPlayer,
              hasVoted,
              message: `已记录您的投票，等待${otherPlayer === 'black' ? '黑方' : '白方'}同意...`
            }
          });
        }

      case 'restart_game':
        const restartRoom = gameStateStore[roomId];
        if (!restartRoom) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        // Check if game has ended
        if (restartRoom.gameState.status !== 'ended') {
          return NextResponse.json({ error: '只有在游戏结束后才能开始新游戏' }, { status: 400 });
        }

        // Use the stored first hand preference (swap colors)
        const storedFirstHand = restartRoom.firstHand || 'black';
        const newFirstHand = storedFirstHand === 'black' ? 'white' : 'black';

        restartRoom.gameState = {
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
          currentTurn: newFirstHand, // Use the swapped first hand
          status: 'playing',
          winner: null,
          lastMove: null
        };
        restartRoom.firstHand = newFirstHand; // Update stored first hand
        restartRoom.lastUpdate = Date.now();

        return NextResponse.json({
          type: 'game_state',
          payload: restartRoom.gameState
        });

      case 'get_room_state':
        const currentRoom = gameStateStore[roomId];
        if (!currentRoom) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        return NextResponse.json({
          type: 'game_state',
          payload: currentRoom.gameState
        });

      case 'leave_room':
        const leaveRoom = gameStateStore[roomId];
        if (!leaveRoom) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        // Remove player from room (simplified for HTTP mode)
        // In HTTP mode, we can't track which specific player is leaving
        // So we'll mark the room as abandoned and clean it up after a delay
        leaveRoom.abandoned = true;
        leaveRoom.abandonTime = Date.now();

        // Schedule room cleanup after 30 seconds
        setTimeout(() => {
          if (gameStateStore[roomId] && gameStateStore[roomId].abandoned) {
            delete gameStateStore[roomId];
            delete playerRoles[roomId];
            delete newGameVotes[roomId];
          }
        }, 30000);

        return NextResponse.json({
          type: 'room_left',
          payload: { success: true }
        });

      case 'quick_match':
        // Require authentication for quick match
        if (!auth) {
          return NextResponse.json({ error: '需要登录才能进行快速匹配' }, { status: 401 });
        }
        
        const currentPlayerId = auth.userId;
        
        // Try to find a match
        const matchedPlayerId = findMatchForPlayer(currentPlayerId);
        
        if (matchedPlayerId) {
          // Found a match! Create a room for both players
          const matchResult = createMatchedRoom(currentPlayerId, matchedPlayerId);
          
          // Return match found response
          return NextResponse.json({
            type: 'match_found',
            payload: {
              roomId: matchResult.roomId,
              playerRole: matchResult.user1Role,
              opponentJoined: true,
              gameState: gameStateStore[matchResult.roomId].gameState,
              firstHand: matchResult.firstHand,
              message: '找到对手！正在进入游戏房间...'
            }
          });
        } else {
          // No match found, add to queue
          const queuePosition = addToMatchQueue(currentPlayerId);
          
          // Store player's match info
          matchmakingStore[currentPlayerId] = {
            queuePosition,
            timestamp: Date.now()
          };
          
          return NextResponse.json({
            type: 'match_waiting',
            payload: {
              playerId: currentPlayerId,
              queuePosition,
              message: '正在寻找对手，请稍候...',
              estimatedWaitTime: '约30秒内找到对手'
            }
          });
        }

      case 'check_match_status':
        // Check if a player has been matched
        if (!playerId || !matchmakingStore[playerId]) {
          return NextResponse.json({
            type: 'match_status',
            payload: {
              status: 'not_in_queue',
              message: '您当前不在匹配队列中'
            }
          });
        }
        
        // Check if player is still in queue or has been matched
        const isInQueue = matchQueue.some(match => match.userId === playerId);
        
        if (!isInQueue) {
          // Player was matched! Find the room that was created for this player
          let foundRoomId: string | null = null;
          let playerRole: 'black' | 'white' | null = null;
          
          // Search through all game rooms to find the one containing this player
          for (const [roomId, room] of Object.entries(gameStateStore)) {
            const roomData = room as any;
            if (roomData.players.black === playerId) {
              foundRoomId = roomId;
              playerRole = 'black';
              break;
            } else if (roomData.players.white === playerId) {
              foundRoomId = roomId;
              playerRole = 'white';
              break;
            }
          }
          
          // Remove from matchmaking store
          delete matchmakingStore[playerId];
          
          if (foundRoomId && playerRole) {
            const roomData = gameStateStore[foundRoomId] as any;
            return NextResponse.json({
              type: 'match_found',
              payload: {
                roomId: foundRoomId,
                playerRole: playerRole,
                opponentJoined: true,
                gameState: roomData.gameState,
                firstHand: roomData.firstHand,
                message: '找到对手！正在进入游戏房间...'
              }
            });
          } else {
            // This should not happen in normal circumstances
            return NextResponse.json({
              type: 'match_status',
              payload: {
                status: 'error',
                message: '匹配成功但找不到游戏房间'
              }
            });
          }
        } else {
          // Still waiting
          return NextResponse.json({
            type: 'match_status',
            payload: {
              status: 'waiting',
              queuePosition: matchmakingStore[playerId].queuePosition,
              message: '仍在寻找对手中...',
              waitTime: Date.now() - matchmakingStore[playerId].timestamp
            }
          });
        }

      case 'cleanup_rooms':
        // Clean up abandoned rooms older than 5 minutes
        const now = Date.now();
        const roomsToCleanup: string[] = [];
        
        for (const [roomId, room] of Object.entries(gameStateStore)) {
          const roomData = room as any; // Type assertion
          if (roomData.abandoned && (now - roomData.abandonTime) > 300000) {
            roomsToCleanup.push(roomId);
          }
          // Also clean up rooms that haven't been updated for 30 minutes
          else if ((now - roomData.lastUpdate) > 1800000) {
            roomsToCleanup.push(roomId);
          }
        }

        roomsToCleanup.forEach(roomId => {
          delete gameStateStore[roomId];
          delete playerRoles[roomId];
          delete newGameVotes[roomId];
        });

        // Also clean up expired matchmaking entries
        Object.keys(matchmakingStore).forEach(playerId => {
          if ((now - matchmakingStore[playerId].timestamp) > 60000) { // 1 minute timeout
            delete matchmakingStore[playerId];
          }
        });

        return NextResponse.json({
          type: 'cleanup_complete',
          payload: { cleanedRooms: roomsToCleanup.length }
        });

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function checkWinner(board: any[][], row: number, col: number, player: string): string | null {
  const directions = [
    [[0, 1], [0, -1]],   // horizontal
    [[1, 0], [-1, 0]],   // vertical
    [[1, 1], [-1, -1]],  // diagonal
    [[1, -1], [-1, 1]]   // anti-diagonal
  ];

  for (const direction of directions) {
    let count = 1;
    
    for (const [dr, dc] of direction) {
      let r = row + dr;
      let c = col + dc;
      
      while (
        r >= 0 && r < 15 &&
        c >= 0 && c < 15 &&
        board[r][c] === player
      ) {
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
  }

  const room = gameStateStore[roomId];
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Get user information for players
  const roomUserInfo = roomUsers[roomId] || {};
  const blackUser = roomUserInfo.black ? userStore.getUserById(roomUserInfo.black) : null;
  const whiteUser = roomUserInfo.white ? userStore.getUserById(roomUserInfo.white) : null;

  const opponentJoined = room.players.white !== null;
  const votes = newGameVotes[roomId] || { black: false, white: false };

  return NextResponse.json({
    type: 'game_state_with_opponent',
    payload: {
      gameState: room.gameState,
      opponentJoined: opponentJoined,
      newGameVotes: votes,
      players: {
        black: blackUser ? {
          id: blackUser.id,
          username: blackUser.username,
          rating: blackUser.rating
        } : null,
        white: whiteUser ? {
          id: whiteUser.id,
          username: whiteUser.username,
          rating: whiteUser.rating
        } : null
      }
    }
  });
}