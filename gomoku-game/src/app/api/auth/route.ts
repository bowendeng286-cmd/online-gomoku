import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to generate JWT token
function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// Helper function to verify JWT token
function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

// Helper function to create user session
async function createSession(userId: number): Promise<string> {
  const token = generateToken(userId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await query(
    'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt.toISOString()]
  );

  return token;
}

// Helper function to clean expired sessions
async function cleanExpiredSessions(): Promise<void> {
  await query('DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP');
}

// GET - Validate session
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Clean expired sessions first
    await cleanExpiredSessions();

    // Check if session exists and is valid
    const sessionResult = await query(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }

    // Get user data
    const userResult = await query(
      'SELECT id, username, email, elo_rating, games_played, games_won, games_lost, games_drawn, created_at, updated_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        eloRating: user.elo_rating,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        gamesLost: user.games_lost,
        gamesDrawn: user.games_drawn,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }
    });
  } catch (error) {
    console.error('Auth GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Login or Register
export async function POST(request: NextRequest) {
  try {
    const { action, username, email, password } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    if (action === 'register') {
      // Register new user
      if (!username || !email || !password) {
        return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
      }

      // Validate input
      if (username.length < 3 || username.length > 50) {
        return NextResponse.json({ error: 'Username must be between 3 and 50 characters' }, { status: 400 });
      }

      if (!email.includes('@') || email.length > 100) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // Check if user already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const result = await query(
        `INSERT INTO users (username, email, password_hash) 
         VALUES (?, ?, ?)`,
        [username, email, passwordHash]
      );

      // Get the newly created user
      const newUserResult = await query(
        'SELECT id, username, email, elo_rating, games_played, games_won, games_lost, games_drawn, created_at, updated_at FROM users WHERE username = ?',
        [username]
      );

      if (newUserResult.rows.length === 0) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      const newUser = newUserResult.rows[0];
      const token = await createSession(newUser.id);

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          eloRating: newUser.elo_rating,
          gamesPlayed: newUser.games_played,
          gamesWon: newUser.games_won,
          gamesLost: newUser.games_lost,
          gamesDrawn: newUser.games_drawn,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at,
        },
        token,
      });
    } else if (action === 'login') {
      // Login user
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // Find user
      const result = await query(
        'SELECT id, username, email, password_hash, elo_rating, games_played, games_won, games_lost, games_drawn, created_at, updated_at FROM users WHERE email = ?',
        [email]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Create session
      const token = await createSession(user.id);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          eloRating: user.elo_rating,
          gamesPlayed: user.games_played,
          gamesWon: user.games_won,
          gamesLost: user.games_lost,
          gamesDrawn: user.games_drawn,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        token,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Remove session from database
    await query('DELETE FROM user_sessions WHERE session_token = ?', [token]);

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Auth DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}