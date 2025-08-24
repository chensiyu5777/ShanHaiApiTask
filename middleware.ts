import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/monitoring';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const connectionId = `${request.ip || 'unknown'}_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
  
  metricsCollector.addConnection(connectionId);
  metricsCollector.incrementRequestCount();

  const response = NextResponse.next();

  response.headers.set('x-request-id', connectionId);

  const duration = Date.now() - startTime;
  metricsCollector.recordResponseTime(duration);

  if (response.status >= 400) {
    metricsCollector.incrementErrorCount();
  }

  setTimeout(() => {
    metricsCollector.removeConnection(connectionId);
  }, 100);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};