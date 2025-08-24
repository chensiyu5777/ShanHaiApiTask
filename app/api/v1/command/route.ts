import { NextRequest, NextResponse } from 'next/server';
import { CommandRequestSchema } from '@/types';
import { CommandRegistry, initializeCommandHandlers } from '@/lib/command-handlers/registry';
import { db } from '@/lib/db';
import { apiCommands } from '@/lib/schema';
import { z } from 'zod';

initializeCommandHandlers();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const body = await request.json();
    const parseResult = CommandRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errorResponse = {
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.issues,
        timestamp: new Date().toISOString(),
        requestId,
      };

      await logCommand(requestId, body.entity || 'unknown', body.operation || 'unknown', 
                     body, errorResponse, 'failed', Date.now() - startTime, 
                     'Invalid request format');

      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const { entity, operation, data, adminKey } = parseResult.data;
    
    const handler = CommandRegistry.getHandler(entity);
    if (!handler) {
      const errorResponse = {
        success: false,
        error: `Unknown entity: ${entity}`,
        timestamp: new Date().toISOString(),
        requestId,
      };

      await logCommand(requestId, entity, operation, data, errorResponse, 'failed', 
                      Date.now() - startTime, `Unknown entity: ${entity}`);

      return NextResponse.json(errorResponse, { status: 404 });
    }

    const requiresAdminKey = shouldRequireAdminKey(entity, operation);
    if (requiresAdminKey && adminKey !== process.env.ADMIN_SECRET_KEY) {
      const errorResponse = {
        success: false,
        error: 'Unauthorized: Invalid or missing admin key',
        timestamp: new Date().toISOString(),
        requestId,
      };

      await logCommand(requestId, entity, operation, data, errorResponse, 'unauthorized', 
                      Date.now() - startTime, 'Invalid or missing admin key');

      return NextResponse.json(errorResponse, { status: 401 });
    }

    const result = await handler.handle(operation, data);
    const duration = Date.now() - startTime;

    await logCommand(requestId, entity, operation, data, result, 
                    result.success ? 'success' : 'failed', duration,
                    result.success ? undefined : result.error);

    const responseBody = {
      ...result,
      requestId,
    };

    return NextResponse.json(responseBody, { 
      status: result.success ? 200 : 400 
    });
    
  } catch (error) {
    console.error('Command execution error:', error);
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    const errorResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      requestId,
    };

    try {
      await logCommand(requestId, 'unknown', 'unknown', undefined, errorResponse, 
                      'error', duration, errorMessage);
    } catch (logError) {
      console.error('Failed to log command:', logError);
    }

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET() {
  try {
    const entities = CommandRegistry.getAllEntities();
    
    const entityDetails = entities.map(entity => ({
      entity,
      supportedOperations: getSupportedOperations(entity),
      requiresAdminKey: getAdminKeyRequirements(entity),
    }));

    return NextResponse.json({
      success: true,
      data: {
        message: 'API Command System',
        version: '1.0.0',
        supportedEntities: entityDetails,
        endpoints: {
          command: 'POST /api/v1/command',
          documentation: 'GET /api/v1/command',
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('API info error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get API info',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

function shouldRequireAdminKey(entity: string, operation: string): boolean {
  const adminOnlyOperations = ['delete', 'cleanup'];
  const adminOnlyEntities = ['system_config'];
  
  return adminOnlyOperations.includes(operation) || adminOnlyEntities.includes(entity);
}

function getSupportedOperations(entity: string): string[] {
  switch (entity) {
    case 'users':
      return ['list', 'get', 'create', 'update', 'delete', 'count'];
    case 'system_config':
      return ['list', 'get', 'create', 'update', 'delete', 'get_by_key'];
    case 'audit_logs':
      return ['list', 'get', 'count', 'cleanup'];
    default:
      return [];
  }
}

function getAdminKeyRequirements(entity: string): { [operation: string]: boolean } {
  switch (entity) {
    case 'users':
      return {
        list: false,
        get: false,
        create: false,
        update: false,
        delete: true,
        count: false,
      };
    case 'system_config':
      return {
        list: true,
        get: true,
        create: true,
        update: true,
        delete: true,
        get_by_key: true,
      };
    case 'audit_logs':
      return {
        list: false,
        get: false,
        count: false,
        cleanup: true,
      };
    default:
      return {};
  }
}

async function logCommand(
  commandId: string,
  entity: string,
  operation: string,
  requestData: any,
  responseData: any,
  status: string,
  duration: number,
  errorMessage?: string
) {
  try {
    await db.insert(apiCommands).values({
      commandId,
      entity,
      operation,
      requestData,
      responseData,
      status,
      duration,
      errorMessage,
      executedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log command:', error);
  }
}