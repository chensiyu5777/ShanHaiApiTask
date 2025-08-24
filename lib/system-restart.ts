import { spawn } from 'child_process';
import path from 'path';

export interface RestartOptions {
  delay?: number; // 重启延迟（毫秒）
  port?: number; // 新端口
  env?: Record<string, string>; // 环境变量
}

export class SystemRestart {
  private static instance: SystemRestart;

  private constructor() {}

  static getInstance(): SystemRestart {
    if (!SystemRestart.instance) {
      SystemRestart.instance = new SystemRestart();
    }
    return SystemRestart.instance;
  }

  async scheduleRestart(options: RestartOptions = {}): Promise<void> {
    const { delay = 3000, port = 15777, env = {} } = options;

    console.log(`系统将在 ${delay}ms 后重启...`);

    setTimeout(() => {
      this.performRestart(port, env);
    }, delay);
  }

  private performRestart(port: number, additionalEnv: Record<string, string>) {
    try {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const command = isDevelopment ? 'npm' : 'npm';
      const args = isDevelopment ? ['run', 'dev'] : ['start'];

      // 合并环境变量
      const env = {
        ...process.env,
        ...additionalEnv,
        PORT: port.toString(),
      };

      console.log('正在重启服务器...');

      // 启动新进程
      const newProcess = spawn(command, args, {
        cwd: process.cwd(),
        env,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // 记录新进程输出
      newProcess.stdout?.on('data', (data) => {
        console.log(`[重启] ${data}`);
      });

      newProcess.stderr?.on('data', (data) => {
        console.error(`[重启错误] ${data}`);
      });

      newProcess.on('spawn', () => {
        console.log('新服务器进程已启动');
        // 断开新进程，让它独立运行
        newProcess.unref();
        
        // 等待一段时间让新进程启动，然后关闭当前进程
        setTimeout(() => {
          console.log('关闭当前进程...');
          process.exit(0);
        }, 2000);
      });

      newProcess.on('error', (error) => {
        console.error('重启失败:', error);
      });

    } catch (error) {
      console.error('执行重启时发生错误:', error);
    }
  }

  // 优雅关闭当前服务
  async gracefulShutdown(): Promise<void> {
    console.log('开始优雅关闭...');

    // 给pending的请求一些时间完成
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('优雅关闭完成');
        resolve();
      }, 1000);
    });
  }

  // 检查新配置是否有效
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // 尝试连接数据库
      const { checkDatabaseConnection } = await import('./database-init');
      const isConnected = await checkDatabaseConnection();
      
      if (!isConnected) {
        return {
          valid: false,
          error: '数据库连接失败，请检查配置'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : '配置验证失败'
      };
    }
  }
}

export const systemRestart = SystemRestart.getInstance();