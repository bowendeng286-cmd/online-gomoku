import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb, schema } from '@/storage/database/db';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  const result = {
    steps: [] as { step: string; status: string; error?: string }[],
    success: false,
    token: null as string | null,
    user: null as any
  };

  const addStep = (step: string, status: string, error?: string) => {
    result.steps.push({ step, status, error });
  };

  try {
    addStep('开始测试', '✅');

    // 1. 检查环境变量
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasJwtSecret = !!process.env.JWT_SECRET;
    addStep('检查环境变量', hasDbUrl && hasJwtSecret ? '✅' : '❌',
      !hasDbUrl ? 'DATABASE_URL 缺失' : !hasJwtSecret ? 'JWT_SECRET 缺失' : undefined);

    // 2. 检查数据库连接
    const db = await getDb();
    addStep('数据库连接', '✅');

    // 3. 检查用户表
    const [testUser] = await db.select().from(schema.users).limit(1);
    if (!testUser) {
      addStep('检查用户表', '❌', '没有找到测试用户');
      return NextResponse.json(result);
    }
    addStep('检查用户表', '✅', `找到用户: ${testUser.username}`);

    // 4. 测试 JWT 签名
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign({ userId: testUser.id }, JWT_SECRET, { expiresIn: '7d' });
    addStep('JWT 签名', '✅');

    // 5. 测试 JWT 验证
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    addStep('JWT 验证', '✅', `用户ID: ${decoded.userId}`);

    // 6. 测试创建会话
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      await db.insert(schema.userSessions).values({
        userId: testUser.id,
        sessionToken: token,
        expiresAt: expiresAt.toISOString()
      }).returning();
      addStep('创建会话', '✅');
    } catch (error) {
      addStep('创建会话', '❌', (error as Error).message);
      return NextResponse.json(result);
    }

    // 7. 测试查询会话
    const [session] = await db.select().from(schema.userSessions).where(
      eq(schema.userSessions.sessionToken, token)
    );
    if (session) {
      addStep('查询会话', '✅');
    } else {
      addStep('查询会话', '❌', '会话未找到');
    }

    // 8. 清理测试会话
    await db.delete(schema.userSessions).where(
      eq(schema.userSessions.sessionToken, token)
    );
    addStep('清理会话', '✅');

    result.success = true;
    result.token = token;
    result.user = {
      id: testUser.id,
      username: testUser.username,
      userType: testUser.userType
    };

    return NextResponse.json(result);
  } catch (error) {
    addStep('发生错误', '❌', (error as Error).message);
    return NextResponse.json(result);
  }
}
