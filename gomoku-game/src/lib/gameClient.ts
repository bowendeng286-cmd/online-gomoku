'use client';

import { GameMessage, GameState } from './gameLogic';
import { GAME_CONFIG } from './config';

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
  private useFallbackHttp = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || GAME_CONFIG.getWebSocketUrl();
  }

  connect() {
    if (this.useFallbackHttp) {
      // Use HTTP fallback immediately
      this.callbacks.onConnect?.();
      return;
    }

    try {
      this.ws = new WebSocket(this.serverUrl);
      this.setupWebSocket();
    } catch (error) {
      console.error('Failed to connect to game server:', error);
      console.log('Falling back to HTTP polling...');
      this.useFallbackHttp = true;
      this.callbacks.onConnect?.();
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
      
      if (!this.useFallbackHttp) {
        console.log('WebSocket disconnected, falling back to HTTP...');
        this.useFallbackHttp = true;
        this.callbacks.onConnect?.(); // Reconnect using HTTP
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.log('WebSocket error, falling back to HTTP...');
      this.useFallbackHttp = true;
      this.callbacks.onError?.('连接错误，已切换到HTTP模式');
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

  async createRoom() {
    if (this.useFallbackHttp) {
      try {
        const response = await this.makeHttpRequest('create_room', { playerRole: 'black' });
        if (response.type === 'room_info') {
          this.callbacks.onRoomInfo?.(response.payload);
          this.startPolling(response.payload.roomId);
        }
      } catch (error) {
        this.callbacks.onError?.('创建房间失败');
      }
    } else {
      this.sendMessage({
        type: 'create_room',
        payload: {},
        timestamp: new Date()
      });
    }
  }

  async joinRoom(roomId: string) {
    if (this.useFallbackHttp) {
      try {
        const response = await this.makeHttpRequest('join_room', { roomId, playerRole: 'white' });
        if (response.type === 'room_info') {
          this.callbacks.onRoomInfo?.(response.payload);
          this.startPolling(roomId);
        }
      } catch (error) {
        this.callbacks.onError?.('加入房间失败');
      }
    } else {
      this.sendMessage({
        type: 'join_room',
        payload: { roomId },
        timestamp: new Date()
      });
    }
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
    if (this.useFallbackHttp) {
      return true; // HTTP polling is always "connected"
    }
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // HTTP fallback methods
  private async makeHttpRequest(action: string, data: any = {}) {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HTTP request failed:', error);
      this.callbacks.onError?.(`HTTP request failed: ${error}`);
      throw error;
    }
  }

  private async pollGameState(roomId: string) {
    if (!roomId || !this.pollingInterval) return;

    try {
      const response = await fetch(`/api/game?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.type === 'game_state') {
          this.callbacks.onGameState?.(data.payload);
        }
      }
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }

  private startPolling(roomId: string) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.pollGameState(roomId);
    }, 1000); // Poll every second
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}