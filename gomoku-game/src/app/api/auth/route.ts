import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { userManager } from '@/storage/database/userManager';
import type { User } from '@/storage/database/shared/schema';

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

  await userManager.createUserSession(userId, token, expiresAt.toISOString());

  return token;
}

// Helper function to clean expired sessions
async function cleanExpiredSessions(): Promise<void> {
  await userManager.cleanExpiredSessions();
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
    const session = await userManager.getUserSession(token);
    if (!session) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }

    // Get user data
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        eloRating: user.eloRating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
        gamesDrawn: user.gamesDrawn,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
      const existingUserByEmail = await userManager.getUserByEmail(email);
      const existingUserByUsername = await userManager.getUserByUsername(username);

      if (existingUserByEmail || existingUserByUsername) {
        return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
      }

      // Create user
      const newUser = await userManager.createUser({
        username,
        email,
        password
      });

      const token = await createSession(newUser.id);

      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          eloRating: newUser.eloRating,
          gamesPlayed: newUser.gamesPlayed,
          gamesWon: newUser.gamesWon,
          gamesLost: newUser.gamesLost,
          gamesDrawn: newUser.gamesDrawn,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
        token,
      });
    } else if (action === 'login') {
      // Login user
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // Verify password and get user
      const user = await userManager.verifyPassword(email, password);
      if (!user) {
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
          eloRating: user.eloRating,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon,
          gamesLost: user.gamesLost,
          gamesDrawn: user.gamesDrawn,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
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

    await userManager.deleteUserSession(token);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}