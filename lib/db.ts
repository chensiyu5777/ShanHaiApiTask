import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import postgres from 'postgres';
import mysql from 'mysql2/promise';
import * as pgSchema from './schema';
import * as mysqlSchema from './schema-mysql';

const connectionString = process.env.DATABASE_URL!;

// 检测数据库类型
function detectDatabaseType(connectionString: string): 'postgresql' | 'mysql' {
  if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
    return 'postgresql';
  } else if (connectionString.startsWith('mysql://')) {
    return 'mysql';
  } else {
    // 默认使用PostgreSQL
    return 'postgresql';
  }
}

// 解析MySQL连接字符串
function parseMySQLConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
}

const dbType = detectDatabaseType(connectionString);

let db: any;
let client: any;

if (dbType === 'mysql') {
  const config = parseMySQLConnectionString(connectionString);
  client = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  db = drizzleMysql(client, { schema: mysqlSchema, mode: 'default' });
} else {
  // PostgreSQL
  client = postgres(connectionString);
  db = drizzle(client, { schema: pgSchema });
}

export { db, client, dbType };