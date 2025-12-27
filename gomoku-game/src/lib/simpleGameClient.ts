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
  private currentPlayerId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private matchPollingInterval: NodeJS.Timeout | null = null;

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
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        this.callbacks.onError?.('Authentication required');
        return;
      }

      const response = await fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        this.callbacks.onError?.('Authentication required');
        return;
      }

      const response = await fetch(`/api/game?roomId=${this.currentRoomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
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
          // Update opponent info
          if (data.payload.opponentInfo && this.callbacks.onRoomInfo) {
            // Call onRoomInfo to update opponent info
            this.callbacks.onRoomInfo?.({
              roomId: this.currentRoomId,
              playerRole: null, // Will be set by the component
              opponentJoined: data.payload.opponentJoined,
              gameState: data.payload.gameState,
              firstHand: data.payload.firstHand,
              opponentInfo: data.payload.opponentInfo,
              playerInfo: data.payload.playerInfo
            });
          }
          // Update new game votes if available
          if (this.callbacks.onNewGameVote && data.payload.newGameVotes) {
            this.callbacks.onNewGameVote?.({ votes: data.payload.newGameVotes });
          }
        }
      } else if (response.status === 403 || response.status === 401) {
        // Room no longer accessible, possibly deleted
        this.stopPolling();
        this.callbacks.onDisconnect?.();
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

  async quickMatch() {
    try {
      const response = await this.makeHttpRequest('quick_match');
      
      if (response.type === 'quick_match_status') {
        if (response.payload.status === 'waiting') {
          this.callbacks.onQuickMatchStatus?.('waiting');
          // Start polling for match status
          this.startMatchPolling('quickmatch');
        }
      } else if (response.type === 'match_found') {
        this.currentPlayerId = null; // Reset player ID
        this.stopMatchPolling();
        this.callbacks.onMatchFound?.(response.payload);
        this.startPolling(response.payload.roomId);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
    }
  }

  private async checkMatchStatus(playerId: string) {
    try {
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        this.callbacks.onError?.('Authentication required');
        return;
      }

      const response = await fetch(`/api/game?action=check_match_status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.type === 'quick_match_status') {
          if (data.payload.status === 'waiting') {
            this.callbacks.onQuickMatchStatus?.('waiting');
          }
        } else if (data.type === 'match_found') {
          this.stopMatchPolling();
          this.currentPlayerId = null;
          this.callbacks.onMatchFound?.(data.payload);
          this.startPolling(data.payload.roomId);
        }
      } else if (response.status === 403 || response.status === 401) {
        this.callbacks.onError?.('Authentication failed');
        this.stopMatchPolling();
      }
    } catch (error) {
      console.error('Match status check failed:', error);
    }
  }

  private startMatchPolling(playerId: string) {
    if (this.matchPollingInterval) {
      clearInterval(this.matchPollingInterval);
    }

    this.matchPollingInterval = setInterval(() => {
      this.checkMatchStatus(playerId);
    }, 2000); // Check every 2 seconds
  }

  private stopMatchPolling() {
    if (this.matchPollingInterval) {
      clearInterval(this.matchPollingInterval);
      this.matchPollingInterval = null;
    }
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
    this.stopMatchPolling();
    this.currentPlayerId = null;
  }

  isConnected(): boolean {
    return true; // HTTP client is always connected
  }
}