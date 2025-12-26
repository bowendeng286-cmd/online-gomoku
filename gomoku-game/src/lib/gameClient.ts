'use client';

import { GameMessage, GameState } from './gameLogic';

export type GameClientCallbacks = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onRoomInfo?: (data: any) => void;
  onGameState?: (gameState: GameState) => void;
  onMatchFound?: (data: any) => void;
  onQuickMatchStatus?: (status: string) => void;
};

export class GameClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private callbacks: GameClientCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.serverUrl);
      this.setupWebSocket();
    } catch (error) {
      console.error('Failed to connect to game server:', error);
      this.callbacks.onError?.('连接服务器失败');
    }
  }

  private setupWebSocket() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Connected to game server');
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: GameMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from game server');
      this.callbacks.onDisconnect?.();
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.callbacks.onError?.('连接错误');
    };
  }

  private handleMessage(message: GameMessage) {
    switch (message.type) {
      case 'room_info':
        this.callbacks.onRoomInfo?.(message.payload);
        break;
      case 'game_state':
        this.callbacks.onGameState?.(message.payload);
        break;
      case 'match_found':
        this.callbacks.onMatchFound?.(message.payload);
        break;
      case 'quick_match':
        this.callbacks.onQuickMatchStatus?.(message.payload.status);
        break;
      case 'error':
        this.callbacks.onError?.(message.payload.error);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.callbacks.onError?.('无法连接到服务器');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  createRoom() {
    this.sendMessage({
      type: 'create_room',
      payload: {},
      timestamp: new Date()
    });
  }

  joinRoom(roomId: string) {
    this.sendMessage({
      type: 'join_room',
      payload: { roomId },
      timestamp: new Date()
    });
  }

  leaveRoom() {
    this.sendMessage({
      type: 'leave_room',
      payload: {},
      timestamp: new Date()
    });
  }

  makeMove(row: number, col: number) {
    this.sendMessage({
      type: 'move',
      payload: { row, col },
      timestamp: new Date()
    });
  }

  restartGame() {
    this.sendMessage({
      type: 'restart_game',
      payload: {},
      timestamp: new Date()
    });
  }

  quickMatch() {
    this.sendMessage({
      type: 'quick_match',
      payload: {},
      timestamp: new Date()
    });
  }

  private sendMessage(message: GameMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
      this.callbacks.onError?.('未连接到服务器');
    }
  }

  setCallbacks(callbacks: GameClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}