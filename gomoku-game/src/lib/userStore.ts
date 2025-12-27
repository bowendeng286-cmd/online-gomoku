// 用户数据存储和管理
export interface User {
  id: string;
  username: string;
  password: string; // 实际项目中应该加密存储
  rating: number; // 等级分
  gamesPlayed: number; // 总游戏场次
  wins: number; // 胜利场次
  losses: number; // 失败场次
  draws: number; // 平局场次
  createdAt: number; // 创建时间戳
  lastLoginAt: number; // 最后登录时间戳
}

export interface GameRecord {
  id: string;
  playerId: string;
  opponentId: string;
  result: 'win' | 'loss' | 'draw';
  ratingChange: number;
  gameType: 'ranked' | 'casual';
  playedAt: number;
}

class UserStore {
  private users: Map<string, User> = new Map();
  private gameRecords: Map<string, GameRecord[]> = new Map();
  private usernameToId: Map<string, string> = new Map();
  private sessionTokens: Map<string, string> = new Map(); // token -> userId

  constructor() {
    // 初始化一些测试用户
    this.initializeTestUsers();
  }

  private initializeTestUsers() {
    const testUsers = [
      { username: 'player1', password: '123456' },
      { username: 'player2', password: '123456' },
      { username: 'test', password: 'test123' }
    ];

    testUsers.forEach(userData => {
      this.createUser(userData.username, userData.password);
    });
  }

  // 创建新用户
  createUser(username: string, password: string): { success: boolean; error?: string; user?: User } {
    // 验证用户名格式
    if (!username || username.length < 3 || username.length > 20) {
      return { success: false, error: '用户名长度必须在3-20个字符之间' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: '密码长度至少6个字符' };
    }

    // 检查用户名是否已存在
    if (this.usernameToId.has(username)) {
      return { success: false, error: '用户名已存在' };
    }

    // 创建新用户
    const userId = Math.random().toString(36).substr(2, 9);
    const now = Date.now();
    
    const newUser: User = {
      id: userId,
      username,
      password, // 实际项目中应该加密
      rating: 1200, // 初始等级分
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: now,
      lastLoginAt: now
    };

    this.users.set(userId, newUser);
    this.usernameToId.set(username, userId);
    this.gameRecords.set(userId, []);

    return { success: true, user: newUser };
  }

  // 用户登录
  authenticate(username: string, password: string): { success: boolean; error?: string; token?: string; user?: User } {
    const userId = this.usernameToId.get(username);
    if (!userId) {
      return { success: false, error: '用户名或密码错误' };
    }

    const user = this.users.get(userId);
    if (!user || user.password !== password) {
      return { success: false, error: '用户名或密码错误' };
    }

    // 生成会话令牌
    const token = Math.random().toString(36).substr(2, 32);
    this.sessionTokens.set(token, userId);

    // 更新最后登录时间
    user.lastLoginAt = Date.now();

    return { success: true, token, user };
  }

  // 通过令牌获取用户
  getUserByToken(token: string): User | null {
    const userId = this.sessionTokens.get(token);
    if (!userId) {
      return null;
    }
    return this.users.get(userId) || null;
  }

  // 登出
  logout(token: string): void {
    this.sessionTokens.delete(token);
  }

  // 获取用户信息
  getUserById(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  // 获取用户名
  getUsernameById(userId: string): string {
    const user = this.users.get(userId);
    return user ? user.username : 'Unknown';
  }

  // 更新用户战绩
  updateGameRecord(
    playerId: string,
    opponentId: string,
    result: 'win' | 'loss' | 'draw',
    gameType: 'ranked' | 'casual' = 'ranked'
  ): { ratingChange: number; newRating: number } {
    const player = this.users.get(playerId);
    const opponent = this.users.get(opponentId);
    
    if (!player || !opponent) {
      return { ratingChange: 0, newRating: player?.rating || 1200 };
    }

    // 计算等级分变化（使用Elo评分系统简化版）
    let ratingChange = 0;
    if (gameType === 'ranked') {
      const expectedScore = 1 / (1 + Math.pow(10, (opponent.rating - player.rating) / 400));
      const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
      ratingChange = Math.round(32 * (actualScore - expectedScore));
    }

    // 更新玩家数据
    player.rating = Math.max(800, player.rating + ratingChange); // 最低800分
    player.gamesPlayed += 1;
    if (result === 'win') player.wins += 1;
    else if (result === 'loss') player.losses += 1;
    else player.draws += 1;

    // 记录游戏记录
    const gameRecord: GameRecord = {
      id: Math.random().toString(36).substr(2, 9),
      playerId,
      opponentId,
      result,
      ratingChange,
      gameType,
      playedAt: Date.now()
    };

    const records = this.gameRecords.get(playerId) || [];
    records.push(gameRecord);
    this.gameRecords.set(playerId, records);

    return { ratingChange, newRating: player.rating };
  }

  // 获取玩家游戏记录
  getGameRecords(userId: string): GameRecord[] {
    return this.gameRecords.get(userId) || [];
  }

  // 获取排行榜
  getLeaderboard(limit: number = 10): User[] {
    return Array.from(this.users.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  // 获取所有用户数量
  getUserCount(): number {
    return this.users.size;
  }
}

// 单例实例
export const userStore = new UserStore();