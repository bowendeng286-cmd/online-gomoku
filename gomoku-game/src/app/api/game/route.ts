import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getGameStore } from '@/lib/gameStore';
import { userManager } from '@/storage/database/userManager';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to verify JWT token
function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

async function getUserInfo(userId: number) {
  const user = await userManager.getUserById(userId);
  if (!user) return null;
  
  return {
    id: user.id,
    username: user.username,
    elo_rating: user.eloRating
  };
}

function checkWinner(board: (null | 'black' | 'white')[][], row: number, col: number, player: 'black' | 'white'): 'black' | 'white' | null {
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

async function createMatchedRoom(user1Id: number, user2Id: number) {
  const gameStore = getGameStore();
  const roomId = Math.random().toString(36).substr(2, 9).toUpperCase();
  const firstHand = Math.random() < 0.5 ? 'black' : 'white'; // Random first player
  
  // 创建虚拟session ID用于内存管理（不再使用数据库）
  const sessionId = Date.now() + Math.floor(Math.random() * 1000);
  
  // Create room in game store
  const room = gameStore.createRoom(roomId, sessionId, firstHand === 'black' ? user1Id : user2Id, firstHand);
  
  // Add second player
  gameStore.joinRoom(roomId, firstHand === 'black' ? user2Id : user1Id);
  
  return { 
    roomId, 
    sessionId, 
    user1Role: gameStore.getPlayerRole(roomId, user1Id), 
    user2Role: gameStore.getPlayerRole(roomId, user2Id), 
    firstHand 
  };
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

    const gameStore = getGameStore();

    // Handle polling requests
    if (roomId) {
      const room = gameStore.getRoom(roomId);
      
      if (!room) {
        return NextResponse.json({ error: '房间不存在或已被销毁' }, { status: 404 });
      }
      
      // Verify user is in this room
      const userRole = gameStore.getPlayerRole(roomId, decoded.userId);
      if (!userRole) {
        return NextResponse.json({ error: '您不在此房间中' }, { status: 403 });
      }

      const opponentId = userRole === 'black' ? room.players.white : room.players.black;
      const opponentJoined = opponentId !== null && room.playersInRoom.has(opponentId);
      
      // Get user and opponent info
      const userInfo = await getUserInfo(decoded.userId);
      const opponentInfo = opponentId ? await getUserInfo(opponentId) : null;

      // Update room activity
      gameStore.updateRoomActivity(roomId);

      // Update current user's online status
      gameStore.updateUserOnline(decoded.userId);

      // Update user activity for guest users
      const user = await userManager.getUserById(decoded.userId);
      if (user && user.userType === 'guest') {
        await userManager.updateLastActivity(decoded.userId);
      }
      
      // Return current room state
      return NextResponse.json({
        type: 'game_state_with_opponent',
        payload: {
          gameState: room.gameState,
          playerRole: userRole,
          opponentJoined: opponentJoined,
          firstHand: room.firstHand || 'black',
          playerInfo: userInfo,
          opponentInfo: opponentInfo,
          newGameVotes: gameStore.getNewGameVotes(roomId)
        }
      });
    }

    // Handle check_match_status for quick match
    if (action === 'check_match_status') {
      // Update user activity for guest users
      const user = await userManager.getUserById(decoded.userId);
      if (user && user.userType === 'guest') {
        await userManager.updateLastActivity(decoded.userId);
      }

      const userRoomId = gameStore.getUserRoom(decoded.userId);
      
      if (userRoomId) {
        const room = gameStore.getRoom(userRoomId);
        if (room && room.gameState.status === 'playing') {
          const userRole = gameStore.getPlayerRole(userRoomId, decoded.userId);
          const opponentId = userRole === 'black' ? room.players.white : room.players.black;
          const opponentInfo = opponentId ? await getUserInfo(opponentId) : null;
          const userInfo = await getUserInfo(decoded.userId);

          return NextResponse.json({
            type: 'match_found',
            payload: {
              roomId: userRoomId,
              sessionId: room.sessionId,
              playerRole: userRole,
              opponentJoined: true,
              gameState: room.gameState,
              firstHand: room.firstHand,
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

    // Handle get_online_stats request
    if (action === 'get_online_stats') {
      // Update current user's online status
      gameStore.updateUserOnline(decoded.userId);

      // Update user activity for guest users
      const user = await userManager.getUserById(decoded.userId);
      if (user && user.userType === 'guest') {
        await userManager.updateLastActivity(decoded.userId);
      }

      // Get online user statistics
      const onlineStats = gameStore.getOnlineUserStats();
      const roomStats = gameStore.getRoomStats();

      return NextResponse.json({
        type: 'online_stats',
        payload: {
          ...onlineStats,
          ...roomStats,
          timestamp: Date.now()
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
    const { action, roomId, move, customRoomId, firstPlayer } = body;

    // Get user information
    const userInfo = await getUserInfo(decoded.userId);
    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const gameStore = getGameStore();

    switch (action) {
      case 'create_room':
        // Support both auto-generated and custom room IDs
        let newRoomId: string;
        if (customRoomId && customRoomId.trim()) {
          newRoomId = customRoomId.trim().toUpperCase();
          // Check if custom room ID already exists
          if (gameStore.getRoom(newRoomId)) {
            return NextResponse.json({ error: '房间号已存在' }, { status: 400 });
          }
        } else {
          newRoomId = Math.random().toString(36).substr(2, 9).toUpperCase();
        }
        
        // Determine who goes first (default: black, but can be customized)
        const firstHand = firstPlayer || 'black';
        
        // 创建虚拟session ID用于内存管理（不再使用数据库）
        const sessionId = Date.now() + Math.floor(Math.random() * 1000);
        
        // Create room in game store
        const room = gameStore.createRoom(newRoomId, sessionId, decoded.userId, firstHand);

        // Update user activity for guest users
        const userForActivity = await userManager.getUserById(decoded.userId);
        if (userForActivity && userForActivity.userType === 'guest') {
          await userManager.updateLastActivity(decoded.userId);
        }

        return NextResponse.json({
          type: 'room_info',
          payload: {
            roomId: newRoomId,
            sessionId: sessionId,
            playerRole: gameStore.getPlayerRole(newRoomId, decoded.userId),
            opponentJoined: false,
            gameState: room.gameState,
            firstHand: firstHand,
            playerInfo: userInfo
          }
        });

      case 'join_room':
        const joinRoomData = gameStore.getRoom(roomId);
        if (!joinRoomData) {
          return NextResponse.json({ error: '房间不存在或已被销毁' }, { status: 404 });
        }

        const userRole = gameStore.getPlayerRole(roomId, decoded.userId);
        if (userRole) {
          // User is already in the room, just update activity
          gameStore.updateRoomActivity(roomId);
        } else {
          // Try to join room
          const joinSuccess = gameStore.joinRoom(roomId, decoded.userId);
          if (!joinSuccess) {
            return NextResponse.json({ error: '房间已满' }, { status: 400 });
          }

          // 不再更新数据库，所有状态都在内存中管理
        }
        
        // Refresh room data after potential join
        const updatedRoom = gameStore.getRoom(roomId);
        if (!updatedRoom) {
          return NextResponse.json({ error: '房间不存在或已被销毁' }, { status: 404 });
        }
        
        // Get opponent info
        const opponentId = decoded.userId === updatedRoom.players.black ? updatedRoom.players.white : updatedRoom.players.black;
        const opponentInfo = opponentId ? await getUserInfo(opponentId) : null;

        // Update user activity for guest users
        const userForActivity2 = await userManager.getUserById(decoded.userId);
        if (userForActivity2 && userForActivity2.userType === 'guest') {
          await userManager.updateLastActivity(decoded.userId);
        }

        return NextResponse.json({
          type: 'room_info',
          payload: {
            roomId,
            sessionId: updatedRoom.sessionId,
            playerRole: gameStore.getPlayerRole(roomId, decoded.userId),
            opponentJoined: opponentId !== null && updatedRoom.playersInRoom.has(opponentId),
            gameState: updatedRoom.gameState,
            firstHand: updatedRoom.firstHand || 'black',
            playerInfo: userInfo,
            opponentInfo: opponentInfo
          }
        });

      case 'move':
        const gameRoom = gameStore.getRoom(roomId);
        if (!gameRoom) {
          return NextResponse.json({ error: '房间不存在或已被销毁' }, { status: 404 });
        }

        // Verify user is in this room
        const moveUserRole = gameStore.getPlayerRole(roomId, decoded.userId);
        if (!moveUserRole) {
          return NextResponse.json({ error: '您不在此房间中' }, { status: 403 });
        }
        
        // Check if it's user's turn
        if (gameRoom.gameState.currentTurn !== moveUserRole) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
        }

        if (gameRoom.gameState.board[move.row][move.col] !== null) {
          return NextResponse.json({ error: 'Invalid move - position occupied' }, { status: 400 });
        }

        // 不再将移动记录到数据库，只保存在内存中

        // Make move in memory
        gameRoom.gameState.board[move.row][move.col] = moveUserRole;
        gameRoom.gameState.lastMove = { row: move.row, col: move.col };
        gameRoom.gameState.currentTurn = moveUserRole === 'black' ? 'white' : 'black';
        gameRoom.gameState.status = 'playing';
        gameRoom.gameState.moveCount = (gameRoom.gameState.moveCount || 0) + 1;
        gameStore.updateRoomActivity(roomId);

        // Update user activity for guest users
        const userForActivity3 = await userManager.getUserById(decoded.userId);
        if (userForActivity3 && userForActivity3.userType === 'guest') {
          await userManager.updateLastActivity(decoded.userId);
        }

        // Check winner
        const winner = checkWinner(gameRoom.gameState.board, move.row, move.col, moveUserRole);
        if (winner) {
          gameRoom.gameState.winner = winner;
          gameRoom.gameState.status = 'ended';

          // 不再更新数据库，游戏结束状态保存在内存中

          // Update player stats
          try {
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
          } catch (statsError) {
            console.error('Error updating stats:', statsError);
          }
        }

        return NextResponse.json({
          type: 'game_state',
          payload: gameRoom.gameState
        });

      case 'vote_new_game':
        const voteRoom = gameStore.getRoom(roomId);
        if (!voteRoom) {
          return NextResponse.json({ error: '房间不存在或已被销毁' }, { status: 404 });
        }

        // Verify user is in this room
        const voterRole = gameStore.getPlayerRole(roomId, decoded.userId);
        if (!voterRole) {
          return NextResponse.json({ error: '您不在此房间中' }, { status: 403 });
        }

        // Check if game has ended
        if (voteRoom.gameState.status !== 'ended') {
          return NextResponse.json({ error: '只有在游戏结束后才能开始新游戏' }, { status: 400 });
        }

        // Update user activity for guest users
        const userForActivity4 = await userManager.getUserById(decoded.userId);
        if (userForActivity4 && userForActivity4.userType === 'guest') {
          await userManager.updateLastActivity(decoded.userId);
        }

        // Record vote
        gameStore.setNewGameVote(roomId, voterRole, true);

        const currentVotes = gameStore.getNewGameVotes(roomId);
        
        // Check if both players have voted
        if (currentVotes.black && currentVotes.white) {
          // Both players agreed, start new game with swapped colors
          const oldFirstHand = voteRoom.firstHand || 'black';
          const newFirstHand = oldFirstHand === 'black' ? 'white' : 'black';
          
          // 创建新的虚拟session ID
          voteRoom.sessionId = Date.now() + Math.floor(Math.random() * 1000);
          voteRoom.gameState = {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: newFirstHand,
            status: 'playing',
            winner: null,
            lastMove: null,
            moveCount: 0
          };
          voteRoom.firstHand = newFirstHand;
          gameStore.updateRoomActivity(roomId);
          
          // Reset votes
          gameStore.resetNewGameVotes(roomId);

          return NextResponse.json({
            type: 'new_game_started',
            payload: {
              gameState: voteRoom.gameState,
              firstHand: newFirstHand,
              message: '双方同意，开始新游戏！黑白方已互换。'
            }
          });
        } else {
          // Waiting for other player
          const otherPlayer = voterRole === 'black' ? 'white' : 'black';
          const hasVoted = currentVotes[otherPlayer];

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

      case 'quick_match':
        // Update user activity for guest users
        const quickMatchUser = await userManager.getUserById(decoded.userId);
        if (quickMatchUser && quickMatchUser.userType === 'guest') {
          await userManager.updateLastActivity(decoded.userId);
        }

        // Remove user from any existing room first
        const existingRoomId = gameStore.getUserRoom(decoded.userId);
        if (existingRoomId) {
          gameStore.leaveRoom(decoded.userId);
        }

        // Remove from match queue if user is already there
        gameStore.removeFromMatchQueue(decoded.userId);
        
        // Add user to match queue
        const matchId = gameStore.addToMatchQueue(decoded.userId);
        
        // Try to find a match
        const matchedUserId = gameStore.findMatchForPlayer(decoded.userId);
        
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
              gameState: gameStore.getRoom(matchResult.roomId)?.gameState,
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

      case 'leave_room':
        const leaveRoomId = gameStore.getUserRoom(decoded.userId);
        if (leaveRoomId) {
          const room = gameStore.getRoom(leaveRoomId);
          
          // 不再更新数据库，房间状态完全由内存管理
          
          // Leave room (this may trigger room destruction)
          const destroyedRoomId = gameStore.leaveRoom(decoded.userId);
          
          // Remove from match queue if user is there
          gameStore.removeFromMatchQueue(decoded.userId);
          
          return NextResponse.json({ 
            success: true, 
            roomId: destroyedRoomId,
            destroyed: destroyedRoomId !== null 
          });
        }
        
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}