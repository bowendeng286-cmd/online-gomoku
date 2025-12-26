import { NextRequest, NextResponse } from 'next/server';

// This is a fallback HTTP API for environments where WebSocket is not available
let gameStateStore: any = {};
let playerRoles: any = {}; // Store player roles for each room
let playerHeartbeat: any = {}; // Store last heartbeat time for each player
let heartbeatCleanupInterval: NodeJS.Timeout | null = null;

// Initialize heartbeat cleanup
function initHeartbeatCleanup() {
  if (heartbeatCleanupInterval) return;
  
  heartbeatCleanupInterval = setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 30000; // 30 seconds timeout

    Object.keys(playerHeartbeat).forEach(playerId => {
      if (now - playerHeartbeat[playerId] > TIMEOUT) {
        // Player is considered offline, remove them from rooms
        removePlayerFromAllRooms(playerId);
        delete playerHeartbeat[playerId];
      }
    });
  }, 10000); // Check every 10 seconds
}

// Initialize on first import
initHeartbeatCleanup();

function removePlayerFromAllRooms(playerId: string) {
  Object.keys(gameStateStore).forEach(roomId => {
    const room = gameStateStore[roomId];
    if (room.players.black === playerId) {
      room.players.black = null;
      room.lastUpdate = Date.now();
    }
    if (room.players.white === playerId) {
      room.players.white = null;
      room.lastUpdate = Date.now();
    }
    
    // If room is empty, mark as waiting
    if (!room.players.black && !room.players.white) {
      room.gameState.status = 'waiting';
      room.gameState.winner = null;
      room.lastUpdate = Date.now();
    } else if (!room.players.black || !room.players.white) {
      room.gameState.status = 'waiting';
      room.gameState.winner = null;
      room.lastUpdate = Date.now();
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, playerRole, move } = body;

    switch (action) {
      case 'create_room':
        const newRoomId = Math.random().toString(36).substr(2, 9);
        const creatorId = Math.random().toString(36).substr(2, 9);
        gameStateStore[newRoomId] = {
          id: newRoomId,
          players: { black: creatorId, white: null },
          gameState: {
            board: Array(15).fill(null).map(() => Array(15).fill(null)),
            currentTurn: 'black',
            status: 'waiting',
            winner: null,
            lastMove: null
          },
          lastUpdate: Date.now()
        };
        playerRoles[newRoomId] = { [creatorId]: 'black' };
        return NextResponse.json({
          type: 'room_info',
          payload: {
            roomId: newRoomId,
            playerRole: 'black',
            opponentJoined: false,
            gameState: gameStateStore[newRoomId].gameState,
            playerId: creatorId
          }
        });

      case 'join_room':
        const room = gameStateStore[roomId];
        if (!room) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        if (room.players.white === null) {
          const joinerId = Math.random().toString(36).substr(2, 9);
          room.players.white = joinerId;
          room.gameState.status = 'playing';
          room.lastUpdate = Date.now();
          playerRoles[roomId] = { ...playerRoles[roomId], [joinerId]: 'white' };
          
          return NextResponse.json({
            type: 'room_info',
            payload: {
              roomId,
              playerRole: 'white',
              opponentJoined: true,
              gameState: room.gameState,
              playerId: joinerId
            }
          });
        } else {
          return NextResponse.json({ error: 'Room is full' }, { status: 400 });
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
        }

        return NextResponse.json({
          type: 'game_state',
          payload: gameRoom.gameState
        });

      case 'restart_game':
        const restartRoom = gameStateStore[roomId];
        if (!restartRoom) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        restartRoom.gameState = {
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
          currentTurn: 'black',
          status: 'playing',
          winner: null,
          lastMove: null
        };
        restartRoom.lastUpdate = Date.now();

        return NextResponse.json({
          type: 'game_state',
          payload: restartRoom.gameState
        });

      case 'heartbeat':
        const playerId = body.playerId;
        if (playerId) {
          playerHeartbeat[playerId] = Date.now();
        }
        return NextResponse.json({ type: 'heartbeat_success', timestamp: Date.now() });

      case 'get_room_state':
        const currentRoom = gameStateStore[roomId];
        if (!currentRoom) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        return NextResponse.json({
          type: 'game_state',
          payload: currentRoom.gameState
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
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

  return NextResponse.json({
    type: 'game_state',
    payload: room.gameState
  });
}