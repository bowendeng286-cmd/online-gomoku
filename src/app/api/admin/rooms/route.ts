import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getGameStore } from '@/lib/gameStore';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Helper function to verify JWT token
function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

// Helper function to check if user is admin
async function isAdmin(userId: number): Promise<boolean> {
  try {
    // 这里可以添加管理员权限检查逻辑
    // 目前简化为检查特定用户ID或角色
    return userId === 1; // 假设用户ID为1的是管理员
  } catch {
    return false;
  }
}

// GET - 获取房间统计信息和管理接口
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check admin permissions
    const adminCheck = await isAdmin(decoded.userId);
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const gameStore = getGameStore();

    switch (action) {
      case 'stats':
        // 获取房间统计信息
        const stats = gameStore.getRoomStats();
        return NextResponse.json({
          type: 'room_stats',
          payload: stats,
          timestamp: Date.now()
        });

      case 'list':
        // 获取所有房间列表
        const rooms = [];
        for (const roomId of gameStore.getAllRoomIds()) {
          const room = gameStore.getRoom(roomId);
          if (room) {
            rooms.push({
              id: room.id,
              sessionId: room.sessionId,
              status: room.gameState.status,
              players: {
                black: room.players.black,
                white: room.players.white,
              },
              playersInRoom: Array.from(room.playersInRoom),
              firstHand: room.firstHand,
              createdAt: room.createdAt,
              lastUpdate: room.lastUpdate,
              moveCount: room.gameState.moveCount || 0,
              winner: room.gameState.winner,
            });
          }
        }
        return NextResponse.json({
          type: 'room_list',
          payload: rooms,
          total: rooms.length,
          timestamp: Date.now()
        });

      case 'details':
        // 获取特定房间详情
        const roomId = searchParams.get('roomId');
        if (!roomId) {
          return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
        }

        const room = gameStore.getRoom(roomId);
        if (!room) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        return NextResponse.json({
          type: 'room_details',
          payload: {
            id: room.id,
            sessionId: room.sessionId,
            gameState: room.gameState,
            players: {
              black: room.players.black,
              white: room.players.white,
            },
            playersInRoom: Array.from(room.playersInRoom),
            firstHand: room.firstHand,
            createdAt: room.createdAt,
            lastUpdate: room.lastUpdate,
            newGameVotes: gameStore.getNewGameVotes(roomId),
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin rooms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 执行房间管理操作
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check admin permissions
    const adminCheck = await isAdmin(decoded.userId);
    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, roomId } = body;
    const gameStore = getGameStore();

    switch (action) {
      case 'cleanup':
        // 手动触发房间清理
        const cleanupStartTime = Date.now();
        gameStore.cleanupRooms();
        const cleanupEndTime = Date.now();
        
        return NextResponse.json({
          type: 'cleanup_completed',
          payload: {
            duration: cleanupEndTime - cleanupStartTime,
            timestamp: cleanupEndTime,
            message: '房间清理完成'
          }
        });

      case 'destroy_room':
        // 销毁指定房间
        if (!roomId) {
          return NextResponse.json({ error: 'Room ID required' }, { status: 400 });
        }

        const roomExists = gameStore.getRoom(roomId);
        if (!roomExists) {
          return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const destroySuccess = gameStore.destroyRoom(roomId, 'admin_command');
        if (destroySuccess) {
          return NextResponse.json({
            type: 'room_destroyed',
            payload: {
              roomId,
              destroyedAt: Date.now(),
              reason: 'admin_command'
            }
          });
        } else {
          return NextResponse.json({ error: 'Failed to destroy room' }, { status: 500 });
        }

      case 'force_cleanup_all':
        // 强制清理所有房间（危险操作，仅用于紧急情况）
        const beforeStats = gameStore.getRoomStats();
        gameStore.destroy();
        const afterStats = gameStore.getRoomStats();
        
        return NextResponse.json({
          type: 'force_cleanup_completed',
          payload: {
            before: beforeStats,
            after: afterStats,
            timestamp: Date.now(),
            warning: '所有房间已被强制清理'
          }
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin rooms API POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}