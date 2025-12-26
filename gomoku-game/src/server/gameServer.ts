import { WebSocketServer, WebSocket } from 'ws';
import { GameLogic, GameState, GameMessage, Room } from '../lib/gameLogic';

export class GameServer {
  private wss: WebSocketServer;
  private rooms: Map<string, Room> = new Map();
  private players: Map<WebSocket, { playerId: string; roomId: string | null }> = new Map();
  private waitingPlayers: WebSocket[] = [];

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.setupWebSocketServer();
    console.log(`Game server running on ws://localhost:${port}`);
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      const playerId = this.generatePlayerId();
      this.players.set(ws, { playerId, roomId: null });

      console.log(`Player ${playerId} connected`);

      ws.on('message', (data: string) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for player ${playerId}:`, error);
      });
    });
  }

  private handleMessage(ws: WebSocket, data: string) {
    try {
      const message: GameMessage = JSON.parse(data);
      const player = this.players.get(ws);
      
      if (!player) return;

      switch (message.type) {
        case 'create_room':
          this.handleCreateRoom(ws);
          break;
        case 'join_room':
          this.handleJoinRoom(ws, message.payload.roomId);
          break;
        case 'leave_room':
          this.handleLeaveRoom(ws);
          break;
        case 'move':
          this.handleMove(ws, message.payload);
          break;
        case 'restart_game':
          this.handleRestartGame(ws);
          break;
        case 'quick_match':
          this.handleQuickMatch(ws);
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  private handleCreateRoom(ws: WebSocket) {
    const player = this.players.get(ws);
    if (!player) return;

    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      players: {
        black: player.playerId,
        white: null
      },
      gameState: GameLogic.createInitialGameState(),
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    player.roomId = roomId;

    this.sendMessage(ws, {
      type: 'room_info',
      payload: {
        roomId,
        playerRole: 'black',
        opponentJoined: false,
        gameState: room.gameState
      },
      timestamp: new Date()
    });

    console.log(`Player ${player.playerId} created room ${roomId}`);
  }

  private handleJoinRoom(ws: WebSocket, roomId: string) {
    const player = this.players.get(ws);
    if (!player) return;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    if (room.players.black === null) {
      room.players.black = player.playerId;
      player.roomId = roomId;
      const role = 'black';
      this.sendRoomInfo(ws, room, role);
    } else if (room.players.white === null) {
      room.players.white = player.playerId;
      player.roomId = roomId;
      const role = 'white';
      room.gameState.status = 'playing';
      
      // Notify both players
      this.broadcastToRoom(roomId, {
        type: 'room_info',
        payload: {
          roomId,
          playerRole: role,
          opponentJoined: true,
          gameState: room.gameState
        },
        timestamp: new Date()
      });

      console.log(`Player ${player.playerId} joined room ${roomId} as ${role}`);
    } else {
      this.sendError(ws, 'Room is full');
    }
  }

  private handleQuickMatch(ws: WebSocket) {
    const player = this.players.get(ws);
    if (!player) return;

    // Check if there's a waiting player
    if (this.waitingPlayers.length > 0) {
      const opponentWs = this.waitingPlayers.shift()!;
      const opponent = this.players.get(opponentWs);
      
      if (opponent && !opponent.roomId) {
        // Create a new room for both players
        const roomId = this.generateRoomId();
        const room: Room = {
          id: roomId,
          players: {
            black: opponent.playerId,
            white: player.playerId
          },
          gameState: GameLogic.createInitialGameState(),
          createdAt: new Date()
        };

        this.rooms.set(roomId, room);
        player.roomId = roomId;
        opponent.roomId = roomId;
        room.gameState.status = 'playing';

        // Send match found to both players
        this.sendMessage(ws, {
          type: 'match_found',
          payload: {
            roomId,
            playerRole: 'white',
            opponentJoined: true,
            gameState: room.gameState
          },
          timestamp: new Date()
        });

        this.sendMessage(opponentWs, {
          type: 'match_found',
          payload: {
            roomId,
            playerRole: 'black',
            opponentJoined: true,
            gameState: room.gameState
          },
          timestamp: new Date()
        });

        console.log(`Matched players ${player.playerId} and ${opponent.playerId} in room ${roomId}`);
      }
    } else {
      // Add to waiting queue
      this.waitingPlayers.push(ws);
      this.sendMessage(ws, {
        type: 'quick_match',
        payload: { status: 'waiting' },
        timestamp: new Date()
      });
    }
  }

  private handleMove(ws: WebSocket, payload: { row: number; col: number }) {
    const player = this.players.get(ws);
    if (!player || !player.roomId) return;

    const room = this.rooms.get(player.roomId);
    if (!room) return;

    const playerRole = this.getPlayerRole(room, player.playerId);
    if (!playerRole || room.gameState.currentTurn !== playerRole) {
      this.sendError(ws, 'Not your turn');
      return;
    }

    if (!GameLogic.isValidMove(room.gameState.board, payload.row, payload.col)) {
      this.sendError(ws, 'Invalid move');
      return;
    }

    // Make the move
    room.gameState = GameLogic.makeMove(room.gameState, payload.row, payload.col, playerRole);

    // Broadcast new game state to all players in room
    this.broadcastToRoom(player.roomId, {
      type: 'game_state',
      payload: room.gameState,
      timestamp: new Date()
    });

    console.log(`Player ${player.playerId} made move at (${payload.row}, ${payload.col})`);
  }

  private handleRestartGame(ws: WebSocket) {
    const player = this.players.get(ws);
    if (!player || !player.roomId) return;

    const room = this.rooms.get(player.roomId);
    if (!room) return;

    room.gameState = GameLogic.restartGame(room.gameState);

    this.broadcastToRoom(player.roomId, {
      type: 'game_state',
      payload: room.gameState,
      timestamp: new Date()
    });
  }

  private handleLeaveRoom(ws: WebSocket) {
    const player = this.players.get(ws);
    if (!player || !player.roomId) return;

    const room = this.rooms.get(player.roomId);
    if (!room) return;

    // Remove player from room
    if (room.players.black === player.playerId) {
      room.players.black = null;
    } else if (room.players.white === player.playerId) {
      room.players.white = null;
    }

    // Reset game state
    room.gameState = GameLogic.createInitialGameState();

    player.roomId = null;

    // Notify remaining player
    this.broadcastToRoom(room.id, {
      type: 'room_info',
      payload: {
        roomId: room.id,
        opponentJoined: false,
        gameState: room.gameState
      },
      timestamp: new Date()
    }, ws);

    // Remove empty rooms
    if (room.players.black === null && room.players.white === null) {
      this.rooms.delete(room.id);
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const player = this.players.get(ws);
    if (!player) return;

    console.log(`Player ${player.playerId} disconnected`);

    // Remove from waiting queue if present
    const waitingIndex = this.waitingPlayers.indexOf(ws);
    if (waitingIndex !== -1) {
      this.waitingPlayers.splice(waitingIndex, 1);
    }

    // Handle leaving room
    if (player.roomId) {
      this.handleLeaveRoom(ws);
    }

    this.players.delete(ws);
  }

  private getPlayerRole(room: Room, playerId: string): 'black' | 'white' | null {
    if (room.players.black === playerId) return 'black';
    if (room.players.white === playerId) return 'white';
    return null;
  }

  private sendRoomInfo(ws: WebSocket, room: Room, playerRole: 'black' | 'white') {
    const opponentJoined = room.players.black !== null && room.players.white !== null;
    
    this.sendMessage(ws, {
      type: 'room_info',
      payload: {
        roomId: room.id,
        playerRole,
        opponentJoined,
        gameState: room.gameState
      },
      timestamp: new Date()
    });
  }

  private broadcastToRoom(roomId: string, message: GameMessage, excludeWs?: WebSocket) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const [ws, player] of this.players.entries()) {
      if (player.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
      }
    }
  }

  private sendMessage(ws: WebSocket, message: GameMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      payload: { error },
      timestamp: new Date()
    });
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}