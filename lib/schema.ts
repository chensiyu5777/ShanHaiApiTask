import { pgTable, serial, text, timestamp, boolean, integer, jsonb, varchar } from 'drizzle-orm/pg-core';

export const systemMeta = pgTable('system_meta', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: varchar('action', { length: 100 }).notNull(),
  entity: varchar('entity', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 100 }),
  userId: varchar('user_id', { length: 100 }),
  details: jsonb('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const schemaChanges = pgTable('schema_changes', {
  id: serial('id').primaryKey(),
  changeType: varchar('change_type', { length: 50 }).notNull(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  changeDetails: jsonb('change_details').notNull(),
  executedSql: text('executed_sql').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  executedBy: varchar('executed_by', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('success'),
});

export const apiCommands = pgTable('api_commands', {
  id: serial('id').primaryKey(),
  commandId: varchar('command_id', { length: 100 }).notNull().unique(),
  entity: varchar('entity', { length: 100 }).notNull(),
  operation: varchar('operation', { length: 100 }).notNull(),
  requestData: jsonb('request_data'),
  responseData: jsonb('response_data'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  duration: integer('duration'),
  errorMessage: text('error_message'),
});

export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  configKey: varchar('config_key', { length: 100 }).notNull().unique(),
  configValue: jsonb('config_value').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customTables = pgTable('custom_tables', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull().unique(),
  tableSchema: jsonb('table_schema').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SystemMeta = typeof systemMeta.$inferSelect;
export type NewSystemMeta = typeof systemMeta.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type SchemaChange = typeof schemaChanges.$inferSelect;
export type NewSchemaChange = typeof schemaChanges.$inferInsert;

export type ApiCommand = typeof apiCommands.$inferSelect;
export type NewApiCommand = typeof apiCommands.$inferInsert;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type CustomTable = typeof customTables.$inferSelect;
export type NewCustomTable = typeof customTables.$inferInsert;