import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/userStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'register':
        return handleRegister(body);
      case 'login':
        return handleLogin(body);
      case 'logout':
        return handleLogout(body);
      case 'check':
        return handleCheckAuth(body);
      case 'get_profile':
        return handleGetProfile(body);
      case 'get_leaderboard':
        return handleGetLeaderboard(body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleRegister(body: any) {
  const { username, password, confirmPassword } = body;

  if (!username || !password) {
    return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: '两次输入的密码不一致' }, { status: 400 });
  }

  const result = userStore.createUser(username, password);

  if (result.success && result.user) {
    // 自动登录
    const loginResult = userStore.authenticate(username, password);
    if (loginResult.success) {
      return NextResponse.json({
        success: true,
        message: '注册成功',
        user: {
          id: result.user.id,
          username: result.user.username,
          rating: result.user.rating,
          gamesPlayed: result.user.gamesPlayed,
          wins: result.user.wins,
          losses: result.user.losses,
          draws: result.user.draws
        },
        token: loginResult.token
      });
    }
  }

  return NextResponse.json({
    success: false,
    error: result.error
  }, { status: 400 });
}

async function handleLogin(body: any) {
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }

  const result = userStore.authenticate(username, password);

  if (result.success && result.user && result.token) {
    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: result.user.id,
        username: result.user.username,
        rating: result.user.rating,
        gamesPlayed: result.user.gamesPlayed,
        wins: result.user.wins,
        losses: result.user.losses,
        draws: result.user.draws
      },
      token: result.token
    });
  }

  return NextResponse.json({
    success: false,
    error: result.error
  }, { status: 401 });
}

async function handleLogout(body: any) {
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  userStore.logout(token);
  return NextResponse.json({
    success: true,
    message: '登出成功'
  });
}

async function handleCheckAuth(body: any) {
  const { token } = body;

  if (!token) {
    return NextResponse.json({
      success: false,
      error: 'Token required'
    }, { status: 401 });
  }

  const user = userStore.getUserByToken(token);
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Invalid token'
    }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws
    }
  });
}

async function handleGetProfile(body: any) {
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const user = userStore.getUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const gameRecords = userStore.getGameRecords(user.id);

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    },
    recentGames: gameRecords.slice(-10).reverse() // 最近10场比赛
  });
}

async function handleGetLeaderboard(body: any) {
  const { limit = 10 } = body;
  const leaderboard = userStore.getLeaderboard(limit);

  return NextResponse.json({
    success: true,
    leaderboard: leaderboard.map(user => ({
      rank: 0, // 将在前端设置
      id: user.id,
      username: user.username,
      rating: user.rating,
      gamesPlayed: user.gamesPlayed,
      winRate: user.gamesPlayed > 0 ? ((user.wins / user.gamesPlayed) * 100).toFixed(1) : '0.0'
    }))
  });
}