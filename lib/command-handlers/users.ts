import { db } from '@/lib/db';
import { users, auditLogs } from '@/lib/schema';
import { BaseCommandHandler } from './index';
import { eq, count, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

const CreateUserSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email().max(255),
  role: z.string().max(50).default('user'),
});

const UpdateUserSchema = z.object({
  id: z.number(),
  username: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

const ListUsersSchema = z.object({
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['id', 'username', 'email', 'createdAt']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export class UsersCommandHandler extends BaseCommandHandler {
  constructor() {
    super('users');
  }

  async handle(operation: string, data?: any) {
    try {
      switch (operation) {
        case 'list':
          return await this.listUsers(data);
        case 'get':
          return await this.getUser(data);
        case 'create':
          return await this.createUser(data);
        case 'update':
          return await this.updateUser(data);
        case 'delete':
          return await this.deleteUser(data);
        case 'count':
          return await this.countUsers();
        default:
          return this.createErrorResponse(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error in users handler'
      );
    }
  }

  private async listUsers(data?: any) {
    const parseResult = ListUsersSchema.safeParse(data || {});
    if (!parseResult.success) {
      return this.createErrorResponse('Invalid parameters for list operation');
    }

    const { limit, offset, sortBy, sortOrder } = parseResult.data;
    
    const orderBy = sortOrder === 'desc' ? desc(users[sortBy]) : asc(users[sortBy]);
    
    const userList = await db
      .select()
      .from(users)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: count() }).from(users);

    await this.logAudit('list', 'users', undefined, { limit, offset });

    return this.createSuccessResponse({
      users: userList,
      total: totalCount[0].count,
      limit,
      offset,
    });
  }

  private async getUser(data?: any) {
    if (!data?.id) {
      return this.createErrorResponse('User ID is required');
    }

    const user = await db.select().from(users).where(eq(users.id, data.id)).limit(1);
    
    if (user.length === 0) {
      return this.createErrorResponse('User not found');
    }

    await this.logAudit('get', 'users', data.id);

    return this.createSuccessResponse(user[0]);
  }

  private async createUser(data?: any) {
    const parseResult = CreateUserSchema.safeParse(data);
    if (!parseResult.success) {
      return this.createErrorResponse('Invalid user data');
    }

    const userData = parseResult.data;

    try {
      const newUser = await db.insert(users).values(userData).returning();
      
      await this.logAudit('create', 'users', newUser[0].id, userData);

      return this.createSuccessResponse(newUser[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('unique')) {
        return this.createErrorResponse('Username or email already exists');
      }
      throw error;
    }
  }

  private async updateUser(data?: any) {
    const parseResult = UpdateUserSchema.safeParse(data);
    if (!parseResult.success) {
      return this.createErrorResponse('Invalid user data for update');
    }

    const { id, ...updateData } = parseResult.data;

    const updatedUser = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (updatedUser.length === 0) {
      return this.createErrorResponse('User not found');
    }

    await this.logAudit('update', 'users', id, updateData);

    return this.createSuccessResponse(updatedUser[0]);
  }

  private async deleteUser(data?: any) {
    if (!data?.id) {
      return this.createErrorResponse('User ID is required for deletion');
    }

    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, data.id))
      .returning();

    if (deletedUser.length === 0) {
      return this.createErrorResponse('User not found');
    }

    await this.logAudit('delete', 'users', data.id);

    return this.createSuccessResponse({ message: 'User deleted successfully' });
  }

  private async countUsers() {
    const result = await db.select({ count: count() }).from(users);
    
    await this.logAudit('count', 'users');

    return this.createSuccessResponse({ count: result[0].count });
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