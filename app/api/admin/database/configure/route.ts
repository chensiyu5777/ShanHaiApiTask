import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { systemRestart } from '@/lib/system-restart';

const ConfigureRequestSchema = z.object({
  databaseType: z.enum(['postgresql', 'mysql', 'sqlite3']),
  connectionString: z.string(),
  config: z.object({
    host: z.string(),
    port: z.string(),
    username: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  adminKey: z.string(),
  skipConnectionTest: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ConfigureRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.issues,
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }
    
    const { adminKey, connectionString, databaseType, config, skipConnectionTest } = parseResult.data;
    
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: Invalid admin key',
        timestamp: new Date().toISOString(),
      }, { status: 401 });
    }

    // 测试数据库连接（可选）
    let connectionTest = { success: true, details: { message: '跳过连接测试' } };
    if (!skipConnectionTest) {
      connectionTest = await testDatabaseConnection(databaseType, config);
      if (!connectionTest.success) {
        return NextResponse.json({
          success: false,
          error: `数据库连接测试失败: ${connectionTest.error}`,
          timestamp: new Date().toISOString(),
        }, { status: 400 });
      }
    }

    // 更新环境变量文件
    await updateEnvironmentFile(connectionString);

    // 记录配置变更
    const configRecord = {
      timestamp: new Date().toISOString(),
      databaseType,
      config: {
        ...config,
        password: '***' // 不记录密码
      },
      success: true
    };

    await logConfigurationChange(configRecord);

    // 安排系统重启以应用新配置
    systemRestart.scheduleRestart({
      delay: 2000, // 2秒后重启
      env: {
        DATABASE_URL: connectionString
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: '数据库配置已保存，系统将在2秒后重启以应用新配置',
        databaseType,
        connectionTest: connectionTest.details,
        willRestart: true,
        restartDelay: 2000,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Database configure API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to configure database',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

async function testDatabaseConnection(databaseType: string, config: any): Promise<{success: boolean, error?: string, details?: any}> {
  try {
    if (databaseType === 'postgresql') {
      const { Client } = await import('pg');
      const client = new Client({
        host: config.host,
        port: parseInt(config.port),
        user: config.username,
        password: config.password,
        database: 'postgres', // 先连接默认数据库
      });
      
      await client.connect();
      const result = await client.query('SELECT version()');
      await client.end();
      
      return {
        success: true,
        details: {
          version: result.rows[0].version,
          host: config.host,
          port: config.port
        }
      };
    } else if (databaseType === 'mysql') {
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: config.host,
        port: parseInt(config.port),
        user: config.username,
        password: config.password,
      });
      
      const [rows] = await connection.execute('SELECT VERSION() as version');
      await connection.end();
      
      return {
        success: true,
        details: {
          version: (rows as any)[0].version,
          host: config.host,
          port: config.port
        }
      };
    }
    
    return { success: false, error: '不支持的数据库类型' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '连接测试失败' 
    };
  }
}

async function updateEnvironmentFile(connectionString: string): Promise<void> {
  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // 更新或添加DATABASE_URL
    const lines = envContent.split('\n');
    let found = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('DATABASE_URL=')) {
        lines[i] = `DATABASE_URL="${connectionString}"`;
        found = true;
        break;
      }
    }
    
    if (!found) {
      lines.push(`DATABASE_URL="${connectionString}"`);
    }
    
    // 写回文件
    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
    
    // 更新当前进程的环境变量
    process.env.DATABASE_URL = connectionString;
    
  } catch (error) {
    throw new Error(`无法更新环境变量文件: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

async function logConfigurationChange(record: any): Promise<void> {
  try {
    const logPath = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    
    const logFile = path.join(logPath, 'database-config.log');
    const logEntry = JSON.stringify(record) + '\n';
    
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Failed to log configuration change:', error);
  }
}