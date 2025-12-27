export interface User {
  id: number;
  username: string;
  email: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreateData {
  username: string;
  email: string;
  password: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserSession {
  id: number;
  userId: number;
  sessionToken: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface GameSession {
  id: number;
  roomId: string;
  blackPlayerId: number;
  whitePlayerId: number;
  winner: 'black' | 'white' | 'draw' | null;
  endTime: Date | null;
  createdAt: Date;
}

export interface GameMove {
  id: number;
  sessionId: number;
  playerId: number;
  moveNumber: number;
  row: number;
  col: number;
  createdAt: Date;
}

export interface PlayerStats {
  userId: number;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}