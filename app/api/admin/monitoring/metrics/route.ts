import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const [systemMetrics, databaseMetrics] = await Promise.all([
      metricsCollector.getSystemMetrics(),
      metricsCollector.getDatabaseMetrics(),
    ]);

    const response = {
      success: true,
      data: {
        ...systemMetrics,
        database: databaseMetrics,
        server: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Metrics collection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to collect metrics',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}