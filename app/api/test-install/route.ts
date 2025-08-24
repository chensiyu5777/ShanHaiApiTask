import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('Test install endpoint called');
  
  const body = await request.json();
  console.log('Request body:', body);
  
  return NextResponse.json({
    success: true,
    installId: `test_install_${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installId = searchParams.get('id');
  
  console.log('Test status check for:', installId);
  
  return NextResponse.json({
    success: true,
    data: {
      step: 2,
      totalSteps: 4,
      currentStep: '测试进行中...',
      progress: 50,
      status: 'installing'
    },
    timestamp: new Date().toISOString(),
  });
}