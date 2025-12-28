import { NextRequest, NextResponse } from 'next/server';
import { initializeAndTestDatabase } from '@/storage/database/test-connection';

export async function POST(request: NextRequest) {
  try {
    await initializeAndTestDatabase();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully' 
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ 
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { testConnection } = await import('@/storage/database/test-connection');
    const isConnected = await testConnection();
    
    return NextResponse.json({ 
      connected: isConnected,
      message: isConnected ? 'Database connection is working' : 'Database connection failed'
    });
  } catch (error) {
    console.error('Database connection test error:', error);
    return NextResponse.json({ 
      connected: false,
      error: 'Database connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}