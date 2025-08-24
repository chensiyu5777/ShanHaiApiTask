import { CommandRequest, ApiResponse } from '@/types';

export interface CommandHandler {
  handle(operation: string, data?: any): Promise<ApiResponse>;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export abstract class BaseCommandHandler implements CommandHandler {
  protected entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  abstract handle(operation: string, data?: any): Promise<ApiResponse>;

  protected createResponse(success: boolean, data?: any, error?: string): ApiResponse {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  protected createSuccessResponse(data?: any): ApiResponse {
    return this.createResponse(true, data);
  }

  protected createErrorResponse(error: string): ApiResponse {
    return this.createResponse(false, undefined, error);
  }
}

export class CommandRegistry {
  private static handlers: Map<string, CommandHandler> = new Map();

  static register(entity: string, handler: CommandHandler) {
    this.handlers.set(entity, handler);
  }

  static getHandler(entity: string): CommandHandler | undefined {
    return this.handlers.get(entity);
  }

  static getAllEntities(): string[] {
    return Array.from(this.handlers.keys());
  }
}