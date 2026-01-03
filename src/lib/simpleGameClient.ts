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
  onRoomDestroyed?: (roomId: string, reason?: string) => void;
  onRoomLeft?: (roomId: string, wasDestroyed: boolean) => void;
  onChatMessages?: (messages: any[]) => void;
};

export class SimpleGameClient {
  private callbacks: SimpleGameClientCallbacks = {};
  private currentRoomId: string | null = null;
  private currentPlayerId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private matchPollingInterval: NodeJS.Timeout | null = null;
  private lastMessageId: number | null = null;

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

      // 构建查询参数，包含lastMessageId用于只获取新消息
      let queryParams = `roomId=${this.currentRoomId}`;
      if (this.lastMessageId !== null) {
        queryParams += `&lastMessageId=${this.lastMessageId}`;
      }

      const response = await fetch(`/api/game?${queryParams}`, {
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
          // Update game state first
          this.callbacks.onGameState?.(data.payload.gameState);

          // Update opponent status if callback is available
          if (this.callbacks.onOpponentStatus) {
            this.callbacks.onOpponentStatus?.(data.payload.opponentJoined);
          }

          // Update room info only if it's provided (including playerRole)
          if (this.callbacks.onRoomInfo) {
            this.callbacks.onRoomInfo?.({
              roomId: this.currentRoomId,
              playerRole: data.payload.playerRole,
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

          // Handle chat messages
          if (data.payload.chatMessages && Array.isArray(data.payload.chatMessages)) {
            if (data.payload.chatMessages.length > 0) {
              const lastMessage = data.payload.chatMessages[data.payload.chatMessages.length - 1];
              this.lastMessageId = lastMessage.id;
            }
            if (this.callbacks.onChatMessages) {
              this.callbacks.onChatMessages?.(data.payload.chatMessages);
            }
          }
        }
      } else if (response.status === 403 || response.status === 404) {
        // Room no longer accessible, possibly deleted
        console.log(`Room ${this.currentRoomId} is no longer accessible (status: ${response.status})`);
        this.stopPolling();
        
        // 获取错误详情并通知回调
        if (this.callbacks.onError) {
          try {
            const errorData = await response.json();
            this.callbacks.onError?.(errorData.error || '房间已被销毁或不存在');
          } catch {
            this.callbacks.onError?.('房间已被销毁或不存在');
          }
        }
        
        this.callbacks.onDisconnect?.();
      }
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }

  private startPolling(roomId: string) {
    this.currentRoomId = roomId;
    this.lastMessageId = null; // 重置消息ID，以便获取所有历史消息
    
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
    this.lastMessageId = null; // 重置消息ID
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
    let destroyedRoomId: string | null = null;
    let wasDestroyed = false;
    
    if (this.currentRoomId) {
      try {
        const response = await this.makeHttpRequest('leave_room', { roomId: this.currentRoomId });
        if (response.success && response.roomId) {
          destroyedRoomId = response.roomId;
          wasDestroyed = response.destroyed || false;
        }
      } catch (error) {
        console.error('Failed to leave room:', error);
      }
    }
    
    this.stopPolling();
    this.callbacks.onDisconnect?.();
    
    // 通知房间离开事件
    if (destroyedRoomId && this.callbacks.onRoomLeft) {
      this.callbacks.onRoomLeft(destroyedRoomId, wasDestroyed);
    }
    
    // 如果房间被销毁，通知销毁事件
    if (wasDestroyed && destroyedRoomId && this.callbacks.onRoomDestroyed) {
      this.callbacks.onRoomDestroyed(destroyedRoomId, 'player_left');
    }
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
        // 立即更新本地状态以提供即时反馈
        this.callbacks.onGameState?.(response.payload);
      }
    } catch (error) {
      // Error already handled in makeHttpRequest
      console.error('Move failed:', error);
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

  async sendChatMessage(message: string): Promise<{ success: boolean; message?: any }> {
    if (!this.currentRoomId) {
      this.callbacks.onError?.('未在房间中');
      return { success: false };
    }

    try {
      const response = await this.makeHttpRequest('send_chat', {
        roomId: this.currentRoomId,
        message
      });

      if (response.type === 'chat_message_sent') {
        const sentMessage = response.payload.message;
        // 立即更新lastMessageId，避免下次轮询返回自己的消息导致重复
        if (sentMessage && sentMessage.id !== undefined) {
          this.lastMessageId = sentMessage.id;
        }
        return { success: true, message: sentMessage };
      }

      return { success: false };
    } catch (error) {
      // Error already handled in makeHttpRequest
      return { success: false };
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