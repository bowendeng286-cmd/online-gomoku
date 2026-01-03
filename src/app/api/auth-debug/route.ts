import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { userManager } from '@/storage/database/userManager';
import { getDb } from '@/storage/database/db';
import { sql } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: NextRequest) {
  const logs: any[] = [];

  const log = (message: string, data?: any) => {
    const entry = { time: new Date().toISOString(), message, data };
    logs.push(entry);
    console.log(`[AUTH-DEBUG] ${message}`, data || '');
  };

  try {
    log('请求开始');

    // 1. 检查环境变量
    log('检查环境变量', {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      dbUrlLength: process.env.DATABASE_URL?.length || 0,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      isVercel: process.env.VERCEL === '1',
      jwtSecretFallback: JWT_SECRET === 'fallback-secret'
    });

    if (!process.env.DATABASE_URL) {
      log('错误: DATABASE_URL 未设置');
      return NextResponse.json({
        error: 'Database URL not configured',
        logs
      }, { status: 500 });
    }

    if (JWT_SECRET === 'fallback-secret' && process.env.JWT_SECRET) {
      log('警告: JWT_SECRET 使用了回退值');
    }

    // 2. 测试数据库连接
    log('测试数据库连接');
    try {
      const db = await getDb();
      const result = await db.execute(sql`SELECT 1 as test`);
      log('数据库连接成功', result);
    } catch (dbError: any) {
      log('数据库连接失败', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      return NextResponse.json({
        error: 'Database connection failed',
        dbError: dbError.message,
        logs
      }, { status: 500 });
    }

    // 3. 解析请求
    const body = await request.json();
    const { action, username, password } = body;
    log('解析请求', { action, username: username?.substring(0, 10) + '...', hasPassword: !!password });

    // 4. 测试 JWT 签名
    log('测试 JWT 签名');
    try {
      const testToken = jwt.sign({ test: true }, JWT_SECRET, { expiresIn: '1h' });
      const decoded = jwt.verify(testToken, JWT_SECRET);
      log('JWT 测试成功', { tokenLength: testToken.length, decoded });
    } catch (jwtError: any) {
      log('JWT 测试失败', { message: jwtError.message });
      return NextResponse.json({
        error: 'JWT configuration error',
        jwtError: jwtError.message,
        logs
      }, { status: 500 });
    }

    // 5. 执行实际的认证逻辑
    if (action === 'login') {
      log('执行登录');
      const user = await userManager.verifyPassword(username, password);
      if (user) {
        log('登录成功', { userId: user.id, username: user.username });
      } else {
        log('登录失败: 用户名或密码错误');
      }
      return NextResponse.json({
        success: !!user,
        user: user ? {
          id: user.id,
          username: user.username,
          userType: user.userType
        } : null,
        logs
      });
    } else if (action === 'guest') {
      log('创建游客用户');
      const guestUser = await userManager.createGuestUser();
      log('游客用户创建成功', { userId: guestUser.id, username: guestUser.username });
      return NextResponse.json({
        success: true,
        user: {
          id: guestUser.id,
          username: guestUser.username,
          userType: guestUser.userType
        },
        logs
      });
    } else if (action === 'register') {
      log('注册新用户', { username });
      return NextResponse.json({
        message: '请使用生产环境 /api/auth 接口注册',
        logs
      });
    } else {
      log('未知操作', { action });
      return NextResponse.json({
        error: 'Unknown action',
        supported: ['login', 'guest', 'register'],
        logs
      }, { status: 400 });
    }

  } catch (error: any) {
    log('未捕获的异常', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    console.error('[AUTH-DEBUG] Full error:', error);

    return NextResponse.json({
      error: 'Internal server error',
      errorMessage: error.message,
      errorName: error.name,
      logs
    }, { status: 500 });
  }
}
