import { db } from '@/lib/db';
import { auditLogs } from '@/lib/schema';
import { BaseCommandHandler } from './index';
import { eq, count, desc, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const ListAuditLogsSchema = z.object({
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export class AuditLogsCommandHandler extends BaseCommandHandler {
  constructor() {
    super('audit_logs');
  }

  async handle(operation: string, data?: any) {
    try {
      switch (operation) {
        case 'list':
          return await this.listAuditLogs(data);
        case 'get':
          return await this.getAuditLog(data);
        case 'count':
          return await this.countAuditLogs(data);
        case 'cleanup':
          return await this.cleanupOldLogs(data);
        default:
          return this.createErrorResponse(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error in audit logs handler'
      );
    }
  }

  private async listAuditLogs(data?: any) {
    const parseResult = ListAuditLogsSchema.safeParse(data || {});
    if (!parseResult.success) {
      return this.createErrorResponse('Invalid parameters for list operation');
    }

    const { limit, offset, entity, action, userId, startDate, endDate } = parseResult.data;
    
    let query = db.select().from(auditLogs);
    const conditions = [];

    if (entity) {
      conditions.push(eq(auditLogs.entity, entity));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const logs = await query
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const totalQuery = db.select({ count: count() }).from(auditLogs);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const totalCount = await totalQuery;

    return this.createSuccessResponse({
      logs,
      total: totalCount[0].count,
      limit,
      offset,
    });
  }

  private async getAuditLog(data?: any) {
    if (!data?.id) {
      return this.createErrorResponse('Audit log ID is required');
    }

    const log = await db.select().from(auditLogs).where(eq(auditLogs.id, data.id)).limit(1);
    
    if (log.length === 0) {
      return this.createErrorResponse('Audit log not found');
    }

    return this.createSuccessResponse(log[0]);
  }

  private async countAuditLogs(data?: any) {
    const { entity, action, userId, startDate, endDate } = data || {};
    
    let query = db.select({ count: count() }).from(auditLogs);
    const conditions = [];

    if (entity) {
      conditions.push(eq(auditLogs.entity, entity));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query;

    return this.createSuccessResponse({ count: result[0].count });
  }

  private async cleanupOldLogs(data?: any) {
    const daysToKeep = data?.daysToKeep || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deletedLogs = await db
      .delete(auditLogs)
      .where(lte(auditLogs.timestamp, cutoffDate))
      .returning({ id: auditLogs.id });

    return this.createSuccessResponse({
      message: `Cleaned up ${deletedLogs.length} old audit logs`,
      deletedCount: deletedLogs.length,
    });
  }
}