// Simple file-based database for testing when PostgreSQL is not available
import fs from 'fs';
import path from 'path';

interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;
  created_at: string;
  updated_at: string;
}

interface GameSession {
  id: number;
  room_id: string;
  black_player_id: number;
  white_player_id: number;
  winner: string | null;
  end_time: string | null;
  created_at: string;
}

interface GameMove {
  id: number;
  session_id: number;
  player_id: number;
  move_number: number;
  row: number;
  col: number;
  created_at: string;
}

interface UserSession {
  id: number;
  user_id: number;
  session_token: string;
  expires_at: string;
  created_at: string;
}

class SimpleDatabase {
  private dataPath: string;
  private users: User[] = [];
  private gameSessions: GameSession[] = [];
  private gameMoves: GameMove[] = [];
  private userSessions: UserSession[] = [];
  private nextUserId = 1;
  private nextSessionId = 1;
  private nextGameSessionId = 1;
  private nextGameMoveId = 1;
  private nextUserSessionId = 1;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data');
    this.loadData();
  }

  private loadData() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }

      const usersFile = path.join(this.dataPath, 'users.json');
      const gameSessionsFile = path.join(this.dataPath, 'game_sessions.json');
      const gameMovesFile = path.join(this.dataPath, 'game_moves.json');
      const userSessionsFile = path.join(this.dataPath, 'user_sessions.json');

      if (fs.existsSync(usersFile)) {
        const usersData = fs.readFileSync(usersFile, 'utf8').trim();
        if (usersData) {
          this.users = JSON.parse(usersData);
          this.nextUserId = Math.max(...this.users.map(u => u.id), 0) + 1;
        }
      }

      if (fs.existsSync(gameSessionsFile)) {
        const sessionsData = fs.readFileSync(gameSessionsFile, 'utf8').trim();
        if (sessionsData) {
          this.gameSessions = JSON.parse(sessionsData);
          this.nextGameSessionId = Math.max(...this.gameSessions.map(g => g.id), 0) + 1;
        }
      }

      if (fs.existsSync(gameMovesFile)) {
        const movesData = fs.readFileSync(gameMovesFile, 'utf8').trim();
        if (movesData) {
          this.gameMoves = JSON.parse(movesData);
          this.nextGameMoveId = Math.max(...this.gameMoves.map(m => m.id), 0) + 1;
        }
      }

      if (fs.existsSync(userSessionsFile)) {
        const sessionData = fs.readFileSync(userSessionsFile, 'utf8').trim();
        if (sessionData) {
          this.userSessions = JSON.parse(sessionData);
          this.nextUserSessionId = Math.max(...this.userSessions.map(s => s.id), 0) + 1;
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private saveData() {
    try {
      fs.writeFileSync(path.join(this.dataPath, 'users.json'), JSON.stringify(this.users, null, 2));
      fs.writeFileSync(path.join(this.dataPath, 'game_sessions.json'), JSON.stringify(this.gameSessions, null, 2));
      fs.writeFileSync(path.join(this.dataPath, 'game_moves.json'), JSON.stringify(this.gameMoves, null, 2));
      fs.writeFileSync(path.join(this.dataPath, 'user_sessions.json'), JSON.stringify(this.userSessions, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async query(text: string, params?: any[]) {
    console.log('Simple DB Query:', { text, params });
    
    // Simple regex-based query parser for basic SQL
    if (text.includes('CREATE TABLE')) {
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('INSERT INTO users')) {
      const newUser: User = {
        id: this.nextUserId++,
        username: params?.[1] || '',
        email: params?.[2] || '',
        password_hash: params?.[3] || '',
        elo_rating: 1200,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        games_drawn: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.users.push(newUser);
      this.saveData();
      return { rows: [newUser], rowCount: 1 };
    }

    if (text.includes('SELECT') && text.includes('users WHERE email')) {
      const email = params?.[0];
      const user = this.users.find(u => u.email === email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (text.includes('SELECT') && text.includes('users WHERE id')) {
      const id = params?.[0];
      const user = this.users.find(u => u.id === id);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (text.includes('SELECT') && text.includes('users WHERE username')) {
      const username = params?.[0];
      const user = this.users.find(u => u.username === username);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    if (text.includes('UPDATE users') && text.includes('elo_rating')) {
      const id = params?.[2];
      const eloChange = params?.[0];
      const winner = params?.[1];
      const user = this.users.find(u => u.id === id);
      
      if (user) {
        user.elo_rating = (user.elo_rating || 1200) + eloChange;
        user.games_played = (user.games_played || 0) + 1;
        
        if (winner === 'black') {
          user.games_won = (user.games_won || 0) + 1;
        } else if (winner === 'white') {
          user.games_lost = (user.games_lost || 0) + 1;
        } else if (winner === 'draw') {
          user.games_drawn = (user.games_drawn || 0) + 1;
        }
        
        user.updated_at = new Date().toISOString();
        this.saveData();
        return { rows: [user], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('UPDATE users') && text.includes('games_played')) {
      const id = params?.[2];
      const eloChange = params?.[0];
      const winner = params?.[1];
      const user = this.users.find(u => u.id === id);
      
      if (user) {
        user.elo_rating = (user.elo_rating || 1200) + eloChange;
        user.games_played = (user.games_played || 0) + 1;
        
        if (winner === 'white') {
          user.games_won = (user.games_won || 0) + 1;
        } else if (winner === 'black') {
          user.games_lost = (user.games_lost || 0) + 1;
        } else if (winner === 'draw') {
          user.games_drawn = (user.games_drawn || 0) + 1;
        }
        
        user.updated_at = new Date().toISOString();
        this.saveData();
        return { rows: [user], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('SELECT') && text.includes('FROM game_sessions')) {
      const userId = params?.[0];
      const sessions = this.gameSessions.filter(g => 
        g.black_player_id === userId || g.white_player_id === userId
      );
      return { rows: sessions, rowCount: sessions.length };
    }

    if (text.includes('INSERT INTO game_sessions')) {
      const newSession: GameSession = {
        id: this.nextGameSessionId++,
        room_id: params?.[0] || '',
        black_player_id: params?.[1] || 0,
        white_player_id: params?.[2] || 0,
        winner: params?.[3] || null,
        end_time: params?.[4] || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      this.gameSessions.push(newSession);
      this.saveData();
      return { rows: [newSession], rowCount: 1 };
    }

    if (text.includes('UPDATE game_sessions') && text.includes('winner')) {
      const roomId = params?.[1];
      const winner = params?.[0];
      const session = this.gameSessions.find(g => g.room_id === roomId);
      
      if (session) {
        session.winner = winner;
        session.end_time = new Date().toISOString();
        this.saveData();
        return { rows: [session], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('INSERT INTO user_sessions')) {
      const newSession: UserSession = {
        id: this.nextUserSessionId++,
        user_id: params?.[0] || 0,
        session_token: params?.[1] || '',
        expires_at: params?.[2] || new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      this.userSessions.push(newSession);
      this.saveData();
      return { rows: [newSession], rowCount: 1 };
    }

    if (text.includes('SELECT') && text.includes('user_sessions WHERE session_token')) {
      const token = params?.[0];
      const session = this.userSessions.find(s => s.session_token === token && new Date(s.expires_at) > new Date());
      return { rows: session ? [session] : [], rowCount: session ? 1 : 0 };
    }

    // Default response for unrecognized queries
    return { rows: [], rowCount: 0 };
  }

  async initDatabase() {
    console.log('Simple database initialized successfully');
    return true;
  }
}

// Create singleton instance
const simpleDb = new SimpleDatabase();

export async function query(text: string, params?: any[]) {
  return simpleDb.query(text, params);
}

export async function initDatabase() {
  return simpleDb.initDatabase();
}

export default simpleDb;