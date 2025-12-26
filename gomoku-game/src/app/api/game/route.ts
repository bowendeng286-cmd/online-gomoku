import { NextRequest, NextResponse } from 'next/server';

// This is a fallback HTTP API for environments where WebSocket is not available
let gameStateStore: any = {};
let playerRoles: any = {}; // Store player roles for each room

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  
  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
  }

  const room = gameStateStore[roomId];
  if (!room) {
    return NextResponse.json({ error: '房间不存在' }, { status: 404 });
  }

  // Return room status including opponent information
  const opponentJoined = room.players.white !== null;
  
  return NextResponse.json({
    type: 'room_status',
    payload: {
      roomId,
      opponentJoined,
      gameState: room.gameState,
      firstHand: room.firstHand || 'black',
      playerCount: (room.players.black ? 1 : 0) + (room.players.white ? 1 : 0)
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, roomId, playerRole, move, customRoomId, firstPlayer } = body;

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
        
        const creatorId = Math.random().toString(36).substr(2, 9);
        
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
        playerRoles[newRoomId] = { [creatorId]: 'black' };
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
        const room = gameStateStore[roomId];
        if (!room) {
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
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

        // Validate move bounds
        if (move.row < 0 || move.row >= 15 || move.col < 0 || move.col >= 15) {
          return NextResponse.json({ error: 'Move out of bounds' }, { status: 400 });
        }

        // For HTTP mode, we need to determine the player role differently
        // Since we can't track individual clients, we'll use currentTurn as playerRole
        const currentPlayer = gameRoom.gameState.currentTurn;

        if (gameRoom.gameState.board[move.row][move.col] !== null) {
          return NextResponse.json({ error: 'Invalid move: position already occupied' }, { status: 400 });
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
          return NextResponse.json({ error: '房间不存在' }, { status: 404 });
        }

        // Use the stored first hand preference
        const storedFirstHand = restartRoom.firstHand || 'black';

        restartRoom.gameState = {
          board: Array(15).fill(null).map(() => Array(15).fill(null)),
          currentTurn: storedFirstHand, // Use the first hand preference
          status: 'playing',
          winner: null,
          lastMove: null
        };
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
          }
        }, 30000);

        return NextResponse.json({
          type: 'room_left',
          payload: { success: true }
        });

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