import { NextRequest, NextResponse } from 'next/server';
import { databaseInstaller } from '@/lib/database-installer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const installId = searchParams.get('id');
    
    if (!installId) {
      return NextResponse.json({
        success: false,
        error: 'Install ID is required',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    const progress = databaseInstaller.getProgress(installId);
    
    if (!progress) {
      return NextResponse.json({
        success: false,
        error: 'Install ID not found',
        timestamp: new Date().toISOString(),
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Install status API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get install status',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}