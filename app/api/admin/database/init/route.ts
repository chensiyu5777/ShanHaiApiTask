import { NextRequest, NextResponse } from 'next/server';
import { DatabaseInitRequestSchema } from '@/types';
import { 
  isDatabaseInitialized, 
  executeStandardInit, 
  executeCustomInit,
  getInitializationStatus 
} from '@/lib/database-init';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = DatabaseInitRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.issues,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    const { mode, customSql, adminKey } = parseResult.data;
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Invalid admin key',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }
    
    const isInitialized = await isDatabaseInitialized();
    if (isInitialized) {
      return NextResponse.json({
        success: false,
        error: 'Database is already initialized',
        timestamp: new Date().toISOString(),
      }, { status: 409 });
    }
    
    if (mode === 'standard') {
      await executeStandardInit();
    } else if (mode === 'custom') {
      if (!customSql) {
        return NextResponse.json({
          success: false,
          error: 'Custom SQL is required for custom initialization mode',
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
      await executeCustomInit(customSql);
    }
    
    const status = await getInitializationStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Database initialized successfully using ${mode} mode`,
        status,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Database initialization error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database initialization failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const status = await getInitializationStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Database status check error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check database status',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}