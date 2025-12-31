import { NextRequest, NextResponse } from 'next/server';
import { userManager } from '@/storage/database/userManager';

// POST - Clean expired guest users
// This endpoint should be called periodically by a scheduler
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal call (you may want to add authentication)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET || 'internal-cleanup-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cleanup] Starting cleanup of expired guest users...');

    // Clean expired guest users (default 3 minutes)
    const deletedCount = await userManager.cleanExpiredGuestUsers(3);

    console.log(`[Cleanup] Deleted ${deletedCount} expired guest users`);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} expired guest users`
    });
  } catch (error) {
    console.error('[Cleanup] Cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// GET - Get cleanup status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET || 'internal-cleanup-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cleanup] Getting cleanup status...');

    // Clean and return result
    const deletedCount = await userManager.cleanExpiredGuestUsers(3);

    console.log(`[Cleanup] Deleted ${deletedCount} expired guest users`);

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Cleanup] Cleanup status error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
