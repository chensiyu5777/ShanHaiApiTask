import { z } from 'zod';

export const CommandRequestSchema = z.object({
  entity: z.string().min(1),
  operation: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  adminKey: z.string().optional(),
});

export type CommandRequest = z.infer<typeof CommandRequestSchema>;

export const DatabaseInitRequestSchema = z.object({
  mode: z.enum(['standard', 'custom']),
  customSql: z.string().optional(),
  adminKey: z.string(),
});

export type DatabaseInitRequest = z.infer<typeof DatabaseInitRequestSchema>;

export const SchemaChangeRequestSchema = z.object({
  changeType: z.enum(['create_table', 'alter_table', 'drop_table', 'create_index']),
  tableName: z.string().min(1),
  changeDetails: z.record(z.unknown()),
  adminKey: z.string(),
});

export type SchemaChangeRequest = z.infer<typeof SchemaChangeRequestSchema>;

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}