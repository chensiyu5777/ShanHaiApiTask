import { CommandRegistry } from './index';
import { UsersCommandHandler } from './users';
import { SystemConfigCommandHandler } from './system-config';
import { AuditLogsCommandHandler } from './audit-logs';

export function initializeCommandHandlers() {
  CommandRegistry.register('users', new UsersCommandHandler());
  CommandRegistry.register('system_config', new SystemConfigCommandHandler());
  CommandRegistry.register('audit_logs', new AuditLogsCommandHandler());
}

export { CommandRegistry };