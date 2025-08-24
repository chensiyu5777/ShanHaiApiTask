import { db } from '@/lib/db';
import { systemConfig, auditLogs } from '@/lib/schema';
import { BaseCommandHandler } from './index';
import { eq, count } from 'drizzle-orm';
import { z } from 'zod';

const CreateConfigSchema = z.object({
  configKey: z.string().min(1).max(100),
  configValue: z.any(),
  description: z.string().optional(),
});

const UpdateConfigSchema = z.object({
  id: z.number(),
  configValue: z.any().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class SystemConfigCommandHandler extends BaseCommandHandler {
  constructor() {
    super('system_config');
  }

  async handle(operation: string, data?: any) {
    try {
      switch (operation) {
        case 'list':
          return await this.listConfigs();
        case 'get':
          return await this.getConfig(data);
        case 'create':
          return await this.createConfig(data);
        case 'update':
          return await this.updateConfig(data);
        case 'delete':
          return await this.deleteConfig(data);
        case 'get_by_key':
          return await this.getConfigByKey(data);
        default:
          return this.createErrorResponse(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error in system config handler'
      );
    }
  }

  private async listConfigs() {
    const configs = await db.select().from(systemConfig);
    
    await this.logAudit('list', 'system_config');

    return this.createSuccessResponse(configs);
  }

  private async getConfig(data?: any) {
    if (!data?.id) {
      return this.createErrorResponse('Config ID is required');
    }

    const config = await db.select().from(systemConfig).where(eq(systemConfig.id, data.id)).limit(1);
    
    if (config.length === 0) {
      return this.createErrorResponse('Config not found');
    }

    await this.logAudit('get', 'system_config', data.id);

    return this.createSuccessResponse(config[0]);
  }

  private async getConfigByKey(data?: any) {
    if (!data?.configKey) {
      return this.createErrorResponse('Config key is required');
    }

    const config = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, data.configKey))
      .limit(1);
    
    if (config.length === 0) {
      return this.createErrorResponse('Config not found');
    }

    await this.logAudit('get_by_key', 'system_config', undefined, { configKey: data.configKey });

    return this.createSuccessResponse(config[0]);
  }

  private async createConfig(data?: any) {
    const parseResult = CreateConfigSchema.safeParse(data);
    if (!parseResult.success) {
      return this.createErrorResponse('Invalid config data');
    }

    const configData = parseResult.data;

    try {
      const newConfig = await db.insert(systemConfig).values(configData).returning();
      
      await this.logAudit('create', 'system_config', newConfig[0].id, configData);

      return this.createSuccessResponse(newConfig[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        return this.createErrorResponse('Config key already exists');
      }
      throw error;
    }
  }

  private async updateConfig(data?: any) {
    const parseResult = UpdateConfigSchema.safeParse(data);
    if (!parseResult.success) {
      return this.createErrorResponse('Invalid config data for update');
    }

    const { id, ...updateData } = parseResult.data;

    const updatedConfig = await db
      .update(systemConfig)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(systemConfig.id, id))
      .returning();

    if (updatedConfig.length === 0) {
      return this.createErrorResponse('Config not found');
    }

    await this.logAudit('update', 'system_config', id, updateData);

    return this.createSuccessResponse(updatedConfig[0]);
  }

  private async deleteConfig(data?: any) {
    if (!data?.id) {
      return this.createErrorResponse('Config ID is required for deletion');
    }

    const deletedConfig = await db
      .delete(systemConfig)
      .where(eq(systemConfig.id, data.id))
      .returning();

    if (deletedConfig.length === 0) {
      return this.createErrorResponse('Config not found');
    }

    await this.logAudit('delete', 'system_config', data.id);

    return this.createSuccessResponse({ message: 'Config deleted successfully' });
  }

  private async logAudit(action: string, entity: string, entityId?: number, details?: any) {
    try {
      await db.insert(auditLogs).values({
        action,
        entity,
        entityId: entityId?.toString(),
        details,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}