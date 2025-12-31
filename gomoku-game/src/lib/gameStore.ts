// 游戏房间内存存储管理
export interface GameState {
  board: (null | 'black' | 'white')[][];
  currentTurn: 'black' | 'white';
  status: 'waiting' | 'playing' | 'ended';
  winner: 'black' | 'white' | null;
  lastMove: { row: number; col: number } | null;
  moveCount?: number;
}

export interface GameRoom {
  id: string;
  sessionId: number;
  players: {
    black: number | null;
    white: number | null;
  };
  gameState: GameState;
  firstHand: 'black' | 'white';
  createdAt: number;
  lastUpdate: number;
  playersInRoom: Set<number>; // 追踪当前在房间内的玩家
}

export interface PlayerRole {
  [roomId: string]: {
    [userId: number]: 'black' | 'white';
  };
}

export interface NewGameVotes {
  [roomId: string]: {
    black: boolean;
    white: boolean;
  };
}

export interface MatchInfo {
  userId: number;
  timestamp: number;
  matchId: string;
}

export interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  role: 'black' | 'white';
  content: string;
  timestamp: number;
}

class GameStore {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRoles: PlayerRole = {};
  private newGameVotes: NewGameVotes = {};
  private matchQueue: MatchInfo[] = [];
  private userToRoom: Map<number, string> = new Map(); // 用户ID到房间ID的映射
  private onlineUsers: Map<number, number> = new Map(); // 用户ID到最后活动时间的映射
  private chatMessages: Map<string, ChatMessage[]> = new Map(); // 房间ID到聊天消息列表的映射
  private messageIdCounter: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // 房间清理相关配置
  private readonly ROOM_EMPTY_TIMEOUT = 30 * 1000; // 房间空置30秒后销毁
  private readonly ROOM_IDLE_TIMEOUT = 60 * 60 * 1000; // 房间空闲1小时后销毁
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 每分钟清理一次
  private readonly USER_ONLINE_TIMEOUT = 5 * 60 * 1000; // 用户5分钟无活动视为离线
  
  constructor() {
    this.startCleanupTimer();
  }

  // 启动清理定时器
  private startCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupRooms();
    }, this.CLEANUP_INTERVAL);
  }

  // 清理过期房间
  cleanupRooms() {
    const now = Date.now();
    const roomsToDestroy: string[] = [];
    const usersToClean: number[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      // 检查房间是否应该被销毁
      if (this.shouldDestroyRoom(room, now)) {
        roomsToDestroy.push(roomId);
      }
    }

    // 销毁标记的房间
    for (const roomId of roomsToDestroy) {
      this.destroyRoom(roomId, 'timeout');
    }

    // 清理过期的匹配队列项
    this.matchQueue = this.matchQueue.filter(match => 
      (now - match.timestamp) < 30000 // 30秒内的匹配请求
    );

    // 清理过期在线用户
    for (const [userId, lastActivity] of this.onlineUsers.entries()) {
      if (now - lastActivity > this.USER_ONLINE_TIMEOUT) {
        usersToClean.push(userId);
      }
    }

    for (const userId of usersToClean) {
      this.onlineUsers.delete(userId);
    }

    if (roomsToDestroy.length > 0 || usersToClean.length > 0) {
      console.log(`Cleaned up ${roomsToDestroy.length} expired rooms and ${usersToClean.length} inactive users`);
    }
  }

  // 判断房间是否应该被销毁
  private shouldDestroyRoom(room: GameRoom, now: number): boolean {
    // 如果房间内没有玩家，超过30秒销毁
    if (room.playersInRoom.size === 0) {
      return (now - room.lastUpdate) > this.ROOM_EMPTY_TIMEOUT;
    }

    // 如果游戏已结束且双方都不在房间内，立即销毁
    if (room.gameState.status === 'ended' && room.playersInRoom.size === 0) {
      return true;
    }

    // 如果房间创建时间超过1小时且游戏未开始，销毁
    if (room.gameState.status === 'waiting') {
      return (now - room.createdAt) > this.ROOM_IDLE_TIMEOUT;
    }

    return false;
  }

  // 创建房间
  createRoom(roomId: string, sessionId: number, creatorId: number, firstHand: 'black' | 'white' = 'black'): GameRoom {
    const room: GameRoom = {
      id: roomId,
      sessionId,
      players: {
        black: firstHand === 'black' ? creatorId : null,
        white: firstHand === 'white' ? creatorId : null,
      },
      gameState: {
        board: Array(15).fill(null).map(() => Array(15).fill(null)),
        currentTurn: firstHand,
        status: 'waiting',
        winner: null,
        lastMove: null,
        moveCount: 0,
      },
      firstHand,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      playersInRoom: new Set([creatorId]),
    };

    this.rooms.set(roomId, room);
    this.userToRoom.set(creatorId, roomId);
    this.playerRoles[roomId] = { [creatorId]: firstHand === 'black' ? 'black' : 'white' };
    this.newGameVotes[roomId] = { black: false, white: false };
    
    // 添加创建者到在线用户列表
    this.updateUserOnline(creatorId);

    return room;
  }

  // 加入房间
  joinRoom(roomId: string, userId: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // 添加到房间内玩家列表
    room.playersInRoom.add(userId);
    this.userToRoom.set(userId, roomId);

    // 分配玩家角色
    if (room.players.black === null && !this.playerRoles[roomId][userId]) {
      room.players.black = userId;
      this.playerRoles[roomId][userId] = 'black';
      room.gameState.status = 'playing';
    } else if (room.players.white === null && !this.playerRoles[roomId][userId]) {
      room.players.white = userId;
      this.playerRoles[roomId][userId] = 'white';
      room.gameState.status = 'playing';
    }

    // 更新用户在线状态
    this.updateUserOnline(userId);

    room.lastUpdate = Date.now();
    return true;
  }

  // 离开房间
  leaveRoom(userId: number): string | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 从房间内移除玩家
    room.playersInRoom.delete(userId);
    this.userToRoom.delete(userId);

    // 如果玩家是房间中的某个角色，清除该角色
    if (room.players.black === userId) {
      room.players.black = null;
    }
    if (room.players.white === userId) {
      room.players.white = null;
    }

    room.lastUpdate = Date.now();

    // 如果房间内没有玩家了，标记游戏状态为等待
    if (room.playersInRoom.size === 0) {
      room.gameState.status = 'waiting';
    }

    // 如果游戏已结束且双方玩家都已离开，立即销毁房间
    if (room.gameState.status === 'ended' && room.playersInRoom.size === 0) {
      this.destroyRoom(roomId, 'players_left');
      return roomId;
    }

    return roomId;
  }

  // 销毁房间
  destroyRoom(roomId: string, reason: string = 'manual'): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // 清理所有相关数据
    this.rooms.delete(roomId);
    delete this.playerRoles[roomId];
    delete this.newGameVotes[roomId];
    this.chatMessages.delete(roomId);

    // 清理用户到房间的映射
    room.playersInRoom.forEach(userId => {
      this.userToRoom.delete(userId);
    });

    console.log(`Room ${roomId} destroyed (reason: ${reason})`);
    return true;
  }

  // 获取房间
  getRoom(roomId: string): GameRoom | null {
    return this.rooms.get(roomId) || null;
  }

  // 获取用户所在的房间ID
  getUserRoom(userId: number): string | null {
    return this.userToRoom.get(userId) || null;
  }

  // 获取用户角色
  getPlayerRole(roomId: string, userId: number): 'black' | 'white' | null {
    return this.playerRoles[roomId]?.[userId] || null;
  }

  // 更新房间最后活动时间
  updateRoomActivity(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastUpdate = Date.now();
    }
  }

  // 清理匹配队列中的用户
  removeFromMatchQueue(userId: number): void {
    this.matchQueue = this.matchQueue.filter(match => match.userId !== userId);
  }

  // 添加到匹配队列
  addToMatchQueue(userId: number): string {
    const matchId = Math.random().toString(36).substr(2, 9);
    this.matchQueue.push({
      userId,
      timestamp: Date.now(),
      matchId,
    });
    
    // 更新用户在线状态
    this.updateUserOnline(userId);
    
    return matchId;
  }

  // 查找匹配
  findMatchForPlayer(userId: number): number | null {
    for (const match of this.matchQueue) {
      if (match.userId !== userId) {
        const matchId = match.matchId;
        
        // 从队列中移除这两个玩家
        this.matchQueue = this.matchQueue.filter(m => m.matchId !== matchId && m.userId !== userId);
        
        return match.userId;
      }
    }
    return null;
  }

  // 获取新游戏投票
  getNewGameVotes(roomId: string): { black: boolean; white: boolean } {
    return this.newGameVotes[roomId] || { black: false, white: false };
  }

  // 设置新游戏投票
  setNewGameVote(roomId: string, role: 'black' | 'white', vote: boolean): void {
    if (!this.newGameVotes[roomId]) {
      this.newGameVotes[roomId] = { black: false, white: false };
    }
    this.newGameVotes[roomId][role] = vote;
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastUpdate = Date.now();
    }
  }

  // 重置新游戏投票
  resetNewGameVotes(roomId: string): void {
    this.newGameVotes[roomId] = { black: false, white: false };
    
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastUpdate = Date.now();
    }
  }

  // 获取房间统计信息
  getRoomStats(): { totalRooms: number; activeRooms: number; waitingRooms: number; totalPlayers: number } {
    let activeRooms = 0;
    let waitingRooms = 0;
    let totalPlayers = 0;

    for (const room of this.rooms.values()) {
      if (room.gameState.status === 'playing') {
        activeRooms++;
      } else if (room.gameState.status === 'waiting') {
        waitingRooms++;
      }
      totalPlayers += room.playersInRoom.size;
    }

    return {
      totalRooms: this.rooms.size,
      activeRooms,
      waitingRooms,
      totalPlayers,
    };
  }

  // 获取在线用户统计信息
  getOnlineUserStats(): { totalOnlineUsers: number; usersInRooms: number; usersInMatchQueue: number; idleUsers: number } {
    const totalOnlineUsers = this.onlineUsers.size;
    const usersInRooms = new Set<number>();
    const usersInMatchQueue = new Set<number>();

    // 统计房间中的用户
    for (const room of this.rooms.values()) {
      room.playersInRoom.forEach(userId => {
        usersInRooms.add(userId);
      });
    }

    // 统计匹配队列中的用户
    for (const match of this.matchQueue) {
      usersInMatchQueue.add(match.userId);
    }

    // 空闲用户 = 总在线用户 - 房间中的用户 - 匹配队列中的用户
    const idleUsers = Math.max(0, totalOnlineUsers - usersInRooms.size - usersInMatchQueue.size);

    return {
      totalOnlineUsers,
      usersInRooms: usersInRooms.size,
      usersInMatchQueue: usersInMatchQueue.size,
      idleUsers,
    };
  }

  // 更新用户在线状态
  updateUserOnline(userId: number): void {
    this.onlineUsers.set(userId, Date.now());
  }

  // 用户离线
  updateUserOffline(userId: number): void {
    this.onlineUsers.delete(userId);
  }

  // 检查用户是否在线
  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  // 添加聊天消息
  addChatMessage(roomId: string, userId: number, username: string, content: string): ChatMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const role = this.playerRoles[roomId]?.[userId];
    if (!role) return null;

    const message: ChatMessage = {
      id: this.messageIdCounter++,
      userId,
      username,
      role,
      content: content.trim(),
      timestamp: Date.now(),
    };

    // 初始化房间消息列表（如果不存在）
    if (!this.chatMessages.has(roomId)) {
      this.chatMessages.set(roomId, []);
    }

    const messages = this.chatMessages.get(roomId)!;

    // 只保留最近50条消息
    if (messages.length >= 50) {
      messages.shift(); // 删除最旧的消息
    }

    messages.push(message);
    room.lastUpdate = Date.now();

    return message;
  }

  // 获取房间聊天消息
  getChatMessages(roomId: string, afterId?: number): ChatMessage[] {
    const messages = this.chatMessages.get(roomId);
    if (!messages) return [];

    if (afterId === undefined) {
      return messages;
    }

    // 只返回比指定ID更新的消息
    return messages.filter(msg => msg.id > afterId);
  }

  // 清理房间聊天消息（当房间销毁时调用）
  clearChatMessages(roomId: string): void {
    this.chatMessages.delete(roomId);
  }

  // 获取所有房间ID
  getAllRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  // 销毁管理器（用于测试或重启）
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.rooms.clear();
    this.playerRoles = {};
    this.newGameVotes = {};
    this.matchQueue = [];
    this.userToRoom.clear();
    this.onlineUsers.clear();
  }
}

// 单例模式
let gameStore: GameStore | null = null;

export function getGameStore(): GameStore {
  if (!gameStore) {
    gameStore = new GameStore();
  }
  return gameStore;
}

// 导出类型
export type { GameStore };