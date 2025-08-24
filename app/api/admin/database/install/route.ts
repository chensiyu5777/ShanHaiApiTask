import { NextRequest, NextResponse } from 'next/server';
import { databaseInstaller } from '@/lib/database-installer';
import { z } from 'zod';

const InstallRequestSchema = z.object({
  databaseType: z.enum(['postgresql', 'mysql']),
  version: z.string(),
  downloadUrl: z.string().url(),
  adminKey: z.string(),
  installPath: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = InstallRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.issues,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    const { adminKey, ...installRequest } = parseResult.data;
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Invalid admin key',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    // 生成安装ID
    const installId = `install_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 异步开始安装过程
    databaseInstaller.startInstall(installId, installRequest).catch(error => {
      console.error('Installation failed:', error);
    });

    return new NextResponse(installId, { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
    
  } catch (error) {
    console.error('Database install API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database installation failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}