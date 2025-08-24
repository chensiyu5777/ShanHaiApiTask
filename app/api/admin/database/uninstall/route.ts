import { NextRequest, NextResponse } from 'next/server';
import { databaseInstaller } from '@/lib/database-installer';
import { z } from 'zod';

const UninstallRequestSchema = z.object({
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite3']),
  adminKey: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = UninstallRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.issues,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    const { adminKey, databaseType } = parseResult.data;
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Invalid admin key',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    // 生成卸载ID
    const uninstallId = `uninstall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 异步开始卸载过程
    databaseInstaller.uninstallDatabase(uninstallId, databaseType).catch(error => {
      console.error('Database uninstall failed:', error);
    });

    return new NextResponse(uninstallId, { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
    
  } catch (error) {
    console.error('Database uninstall API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database uninstall failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uninstallId = searchParams.get('id');
  
  if (!uninstallId) {
    return NextResponse.json({
      success: false,
      error: 'Missing uninstall ID',
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }

  const progress = databaseInstaller.getProgress(uninstallId);
  
  if (!progress) {
    return NextResponse.json({
      success: false,
      error: 'Uninstall ID not found',
      timestamp: new Date().toISOString(),
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: progress,
    timestamp: new Date().toISOString(),
  });
}