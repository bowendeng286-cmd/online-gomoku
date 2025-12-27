'use client';

import { GameState } from './gameLogic';

export type SimpleGameClientCallbacks = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onRoomInfo?: (data: any) => void;
  onGameState?: (gameState: GameState) => void;
  onMatchFound?: (data: any) => void;
  onQuickMatchStatus?: (status: string) => void;
  onOpponentStatus?: (opponentJoined: boolean) => void;
  onNewGameVote?: (data: any) => void;
  onNewGameStarted?: (data: any) => void;
};

export class SimpleGameClient {
  private callbacks: SimpleGameClientCallbacks = {};
  private currentRoomId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-connect
    this.connect();
  }

  connect() {
    // HTTP-based client is always "connected"
    this.callbacks.onConnect?.();
  }

  setCallbacks(callbacks: SimpleGameClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HTTP request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onError?.(`请求失败: ${errorMessage}`);
      throw error;
    }
  }

  private async pollGameState() {
    if (!this.currentRoomId || !this.pollingInterval) return;

    try {
      const response = await fetch(`/api/game?roomId=${this.currentRoomId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response types
        if (data.type === 'game_state') {
          this.callbacks.onGameState?.(data.payload);
        } else if (data.type === 'game_state_with_opponent') {
          // Update game state
          this.callbacks.onGameState?.(data.payload.gameState);
          // Update opponent status if callback is available
          if (this.callbacks.onOpponentStatus) {
            this.callbacks.onOpponentStatus?.(data.payload.opponentJoined);
          }
          // Update new game votes if available
          if (this.callbacks.onNewGameVote && data.payload.newGameVotes) {
            this.callbacks.onNewGameVote?.({ votes: data.payload.newGameVotes });
          }

        }
      }
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }

  private startPolling(roomId: string) {
    this.currentRoomId = roomId;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.pollGameState();
    }, 1000); // Poll every second
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.currentRoomId = null;
  }

  async createRoom(options?: { customRoomId?: string; firstPlayer?: 'black' | 'white' }) {
    try {
      const response = await this.makeHttpRequest('create_room', {
        customRoomId: options?.customRoomId,
        firstPlayer: options?.firstPlayer
      });
      if (response.type === 'room_info') {
        this.callbacks.onRoomInfo?.(response.payload);
        this.startPolling(response.payload.roomId);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
    }
  }

  async joinRoom(roomId: string) {
    try {
      const response = await this.makeHttpRequest('join_room', { roomId });
      if (response.type === 'room_info') {
        this.callbacks.onRoomInfo?.(response.payload);
        this.startPolling(roomId);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
    }
  }

  async leaveRoom() {
    if (this.currentRoomId) {
      try {
        await this.makeHttpRequest('leave_room', { roomId: this.currentRoomId });
      } catch (error) {
        console.error('Failed to leave room:', error);
      }
    }
    this.stopPolling();
    this.callbacks.onDisconnect?.();
  }

  async makeMove(row: number, col: number) {
    if (!this.currentRoomId) {
      this.callbacks.onError?.('未在房间中');
      return;
    }

    try {
      const response = await this.makeHttpRequest('move', { 
        roomId: this.currentRoomId, 
        move: { row, col } 
      });
      
      if (response.type === 'game_state') {
        this.callbacks.onGameState?.(response.payload);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
    }
  }

  quickMatch() {
    // For HTTP API, we'll show a message to use create/join room instead
    this.callbacks.onQuickMatchStatus?.('http_mode');
    this.callbacks.onError?.('当前为HTTP模式，请使用创建房间或加入房间功能进行对战');
  }

  async voteForNewGame() {
    if (!this.currentRoomId) {
      this.callbacks.onError?.('未在房间中');
      return;
    }

    try {
      const response = await this.makeHttpRequest('vote_new_game', { roomId: this.currentRoomId });
      
      if (response.type === 'vote_recorded') {
        this.callbacks.onNewGameVote?.(response.payload);
      } else if (response.type === 'new_game_started') {
        this.callbacks.onNewGameStarted?.(response.payload);
        this.callbacks.onGameState?.(response.payload.gameState);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
    }
  }

  async restartGame() {
    if (!this.currentRoomId) {
      this.callbacks.onError?.('未在房间中');
      return;
    }

    try {
      const response = await this.makeHttpRequest('restart_game', { roomId: this.currentRoomId });
      if (response.type === 'game_state') {
        this.callbacks.onGameState?.(response.payload);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
    }
  }

  disconnect() {
    this.leaveRoom();
  }

  isConnected(): boolean {
    return true; // HTTP client is always connected
  }
}