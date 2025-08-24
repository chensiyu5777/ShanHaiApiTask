import { db, client, dbType } from './db';
import { systemMeta } from './schema';
import { systemMeta as mysqlSystemMeta } from './schema-mysql';
import { eq } from 'drizzle-orm';

export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const metaTable = dbType === 'mysql' ? mysqlSystemMeta : systemMeta;
    const result = await db.select().from(metaTable).where(eq(metaTable.key, 'db_initialized')).limit(1);
    return result.length > 0 && result[0].value === 'true';
  } catch (error) {
    return false;
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    if (dbType === 'mysql') {
      const [rows] = await client.execute('SELECT 1 as test');
      return Array.isArray(rows) && rows.length > 0;
    } else {
      await client`SELECT 1`;
      return true;
    }
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function executeStandardInit(): Promise<void> {
  if (dbType === 'mysql') {
    await executeMySQLInit();
  } else {
    await executePostgreSQLInit();
  }
}

async function executePostgreSQLInit(): Promise<void> {
  const initSql = `
    -- Create system_meta table
    CREATE TABLE IF NOT EXISTS "system_meta" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar(255) NOT NULL UNIQUE,
      "value" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    -- Create audit_logs table
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" serial PRIMARY KEY NOT NULL,
      "action" varchar(100) NOT NULL,
      "entity" varchar(100) NOT NULL,
      "entity_id" varchar(100),
      "user_id" varchar(100),
      "details" jsonb,
      "timestamp" timestamp DEFAULT now() NOT NULL,
      "ip_address" varchar(45)
    );

    -- Create schema_changes table
    CREATE TABLE IF NOT EXISTS "schema_changes" (
      "id" serial PRIMARY KEY NOT NULL,
      "change_type" varchar(50) NOT NULL,
      "table_name" varchar(100) NOT NULL,
      "change_details" jsonb NOT NULL,
      "executed_sql" text NOT NULL,
      "executed_at" timestamp DEFAULT now() NOT NULL,
      "executed_by" varchar(100),
      "status" varchar(20) DEFAULT 'success' NOT NULL
    );

    -- Create api_commands table
    CREATE TABLE IF NOT EXISTS "api_commands" (
      "id" serial PRIMARY KEY NOT NULL,
      "command_id" varchar(100) NOT NULL UNIQUE,
      "entity" varchar(100) NOT NULL,
      "operation" varchar(100) NOT NULL,
      "request_data" jsonb,
      "response_data" jsonb,
      "status" varchar(20) DEFAULT 'pending' NOT NULL,
      "executed_at" timestamp DEFAULT now() NOT NULL,
      "duration" integer,
      "error_message" text
    );

    -- Create system_config table
    CREATE TABLE IF NOT EXISTS "system_config" (
      "id" serial PRIMARY KEY NOT NULL,
      "config_key" varchar(100) NOT NULL UNIQUE,
      "config_value" jsonb NOT NULL,
      "description" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    -- Create users table
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "username" varchar(100) NOT NULL UNIQUE,
      "email" varchar(255) NOT NULL UNIQUE,
      "role" varchar(50) DEFAULT 'user' NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "last_login_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    -- Create custom_tables table
    CREATE TABLE IF NOT EXISTS "custom_tables" (
      "id" serial PRIMARY KEY NOT NULL,
      "table_name" varchar(100) NOT NULL UNIQUE,
      "table_schema" jsonb NOT NULL,
      "description" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    -- Insert initial system meta data
    INSERT INTO "system_meta" ("key", "value") VALUES ('db_initialized', 'true') ON CONFLICT ("key") DO NOTHING;
    INSERT INTO "system_meta" ("key", "value") VALUES ('db_version', '1.0.0') ON CONFLICT ("key") DO NOTHING;
    INSERT INTO "system_meta" ("key", "value") VALUES ('initialized_at', NOW()::text) ON CONFLICT ("key") DO NOTHING;

    -- Insert initial system config
    INSERT INTO "system_config" ("config_key", "config_value", "description") VALUES 
    ('max_connections', '100', 'Maximum database connections') ON CONFLICT ("config_key") DO NOTHING;
    INSERT INTO "system_config" ("config_key", "config_value", "description") VALUES 
    ('enable_audit_log', 'true', 'Enable audit logging') ON CONFLICT ("config_key") DO NOTHING;
    INSERT INTO "system_config" ("config_key", "config_value", "description") VALUES 
    ('api_rate_limit', '{"requests": 1000, "window": 3600}', 'API rate limiting configuration') ON CONFLICT ("config_key") DO NOTHING;
  `;

  await client.unsafe(initSql);
}

async function executeMySQLInit(): Promise<void> {
  const queries = [
    `CREATE TABLE IF NOT EXISTS system_meta (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(255) NOT NULL UNIQUE,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(100) NOT NULL,
      entity_id VARCHAR(100),
      user_id VARCHAR(100),
      details JSON,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45)
    )`,
    
    `CREATE TABLE IF NOT EXISTS schema_changes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      change_type VARCHAR(50) NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      change_details JSON NOT NULL,
      executed_sql TEXT NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      executed_by VARCHAR(100),
      status VARCHAR(20) DEFAULT 'success'
    )`,
    
    `CREATE TABLE IF NOT EXISTS api_commands (
      id INT AUTO_INCREMENT PRIMARY KEY,
      command_id VARCHAR(100) NOT NULL UNIQUE,
      entity VARCHAR(100) NOT NULL,
      operation VARCHAR(100) NOT NULL,
      request_data JSON,
      response_data JSON,
      status VARCHAR(20) DEFAULT 'pending',
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      duration INT,
      error_message TEXT
    )`,
    
    `CREATE TABLE IF NOT EXISTS system_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      config_key VARCHAR(100) NOT NULL UNIQUE,
      config_value JSON NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT TRUE,
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS custom_tables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_name VARCHAR(100) NOT NULL UNIQUE,
      table_schema JSON NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    
    `INSERT IGNORE INTO system_meta (\`key\`, value) VALUES ('db_initialized', 'true')`,
    `INSERT IGNORE INTO system_meta (\`key\`, value) VALUES ('db_version', '1.0.0')`,
    `INSERT IGNORE INTO system_meta (\`key\`, value) VALUES ('initialized_at', NOW())`,
    
    `INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
     ('max_connections', '100', 'Maximum database connections')`,
    `INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
     ('enable_audit_log', 'true', 'Enable audit logging')`,
    `INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
     ('api_rate_limit', '{"requests": 1000, "window": 3600}', 'API rate limiting configuration')`
  ];

  for (const query of queries) {
    await client.execute(query);
  }
}

export async function executeCustomInit(customSql: string): Promise<void> {
  if (dbType === 'mysql') {
    // Split MySQL queries and execute them individually
    const queries = customSql.split(';').filter(query => query.trim().length > 0);
    for (const query of queries) {
      await client.execute(query);
    }
    
    // Insert MySQL metadata
    await client.execute(`INSERT IGNORE INTO system_meta (\`key\`, value) VALUES ('db_initialized', 'true')`);
    await client.execute(`INSERT IGNORE INTO system_meta (\`key\`, value) VALUES ('custom_init', 'true')`);
    await client.execute(`INSERT IGNORE INTO system_meta (\`key\`, value) VALUES ('initialized_at', NOW())`);
  } else {
    await client.unsafe(customSql);
    
    await client`
      INSERT INTO "system_meta" ("key", "value") VALUES ('db_initialized', 'true') ON CONFLICT ("key") DO NOTHING;
      INSERT INTO "system_meta" ("key", "value") VALUES ('custom_init', 'true') ON CONFLICT ("key") DO NOTHING;
      INSERT INTO "system_meta" ("key", "value") VALUES ('initialized_at', ${new Date().toISOString()}) ON CONFLICT ("key") DO NOTHING;
    `;
  }
}

export async function getInitializationStatus() {
  try {
    const isConnected = await checkDatabaseConnection();
    const isInitialized = await isDatabaseInitialized();
    
    let version = null;
    let initializedAt = null;
    
    if (isInitialized) {
      const metaTable = dbType === 'mysql' ? mysqlSystemMeta : systemMeta;
      const versionResult = await db.select().from(metaTable).where(eq(metaTable.key, 'db_version')).limit(1);
      const initTimeResult = await db.select().from(metaTable).where(eq(metaTable.key, 'initialized_at')).limit(1);
      
      version = versionResult.length > 0 ? versionResult[0].value : null;
      initializedAt = initTimeResult.length > 0 ? initTimeResult[0].value : null;
    }
    
    return {
      isConnected,
      isInitialized,
      version,
      initializedAt,
      databaseType: dbType,
    };
  } catch (error) {
    return {
      isConnected: false,
      isInitialized: false,
      version: null,
      initializedAt: null,
      databaseType: dbType,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}