import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json();
    
    // Simple secret protection (in production, use more secure method)
    if (secret !== process.env.INIT_SECRET && secret !== 'init-db-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const success = await initDatabase();
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database initialized successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to initialize database' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}