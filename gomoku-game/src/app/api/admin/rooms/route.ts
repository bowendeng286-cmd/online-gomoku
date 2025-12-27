import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getGameStore } from '@/lib/gameStore';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

// 管理员API - 查看房间统计信息
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限（这里简化处理，实际应该有管理员角色）
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const gameStore = getGameStore();
    const stats = gameStore.getRoomStats();
    const roomIds = gameStore.getAllRoomIds();
    
    const roomDetails = roomIds.map(roomId => {
      const room = gameStore.getRoom(roomId);
      if (!room) return null;
      
      return {
        id: roomId,
        sessionId: room.sessionId,
        players: room.players,
        status: room.gameState.status,
        currentTurn: room.gameState.currentTurn,
        moveCount: room.gameState.moveCount || 0,
        playersInRoom: Array.from(room.playersInRoom),
        createdAt: room.createdAt,
        lastUpdate: room.lastUpdate,
        age: Date.now() - room.createdAt,
        idle: Date.now() - room.lastUpdate
      };
    }).filter(Boolean);

    return NextResponse.json({
      stats,
      rooms: roomDetails,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Admin rooms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 强制清理房间（管理员功能）
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    const gameStore = getGameStore();
    
    if (roomId) {
      // 销毁特定房间
      const success = gameStore.destroyRoom(roomId, 'admin');
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: `Room ${roomId} destroyed successfully` 
        });
      } else {
        return NextResponse.json({ 
          error: 'Room not found' 
        }, { status: 404 });
      }
    } else {
      // 清理所有过期房间
      const beforeStats = gameStore.getRoomStats();
      gameStore.cleanupRooms(); // 这会触发清理逻辑
      const afterStats = gameStore.getRoomStats();
      
      return NextResponse.json({
        success: true,
        message: 'Cleanup completed',
        before: beforeStats,
        after: afterStats,
        cleanedUp: beforeStats.totalRooms - afterStats.totalRooms
      });
    }

  } catch (error) {
    console.error('Admin cleanup API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}