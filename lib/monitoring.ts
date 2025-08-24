import os from 'os';
import { db } from './db';
import { apiCommands } from './schema';
import { count, gte, eq } from 'drizzle-orm';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private startTime: number;
  private requestCounter: number = 0;
  private errorCounter: number = 0;
  private responseTimes: number[] = [];
  private activeConnections: Set<string> = new Set();

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  incrementRequestCount() {
    this.requestCounter++;
  }

  incrementErrorCount() {
    this.errorCounter++;
  }

  recordResponseTime(responseTime: number) {
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  addConnection(connectionId: string) {
    this.activeConnections.add(connectionId);
  }

  removeConnection(connectionId: string) {
    this.activeConnections.delete(connectionId);
  }

  getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return Math.max(0, Math.min(100, ((totalTick - totalIdle) / totalTick) * 100));
  }

  getMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return (usedMemory / totalMemory) * 100;
  }

  getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }

  getErrorRate(): number {
    if (this.requestCounter === 0) return 0;
    return (this.errorCounter / this.requestCounter) * 100;
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const cpuUsage = this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const activeConnections = this.activeConnections.size;
    const requestCount = this.requestCounter;
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = this.getErrorRate();
    const uptime = this.getUptime();

    return {
      cpuUsage,
      memoryUsage,
      activeConnections,
      requestCount,
      avgResponseTime,
      errorRate,
      uptime,
    };
  }

  async getDatabaseMetrics() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalCommands,
        recentCommands,
        dailyCommands,
        successfulCommands,
        failedCommands,
      ] = await Promise.all([
        db.select({ count: count() }).from(apiCommands),
        db.select({ count: count() }).from(apiCommands).where(gte(apiCommands.executedAt, oneHourAgo)),
        db.select({ count: count() }).from(apiCommands).where(gte(apiCommands.executedAt, oneDayAgo)),
        db.select({ count: count() }).from(apiCommands).where(eq(apiCommands.status, 'success')),
        db.select({ count: count() }).from(apiCommands).where(eq(apiCommands.status, 'failed')),
      ]);

      return {
        totalCommands: totalCommands[0].count,
        recentCommands: recentCommands[0].count,
        dailyCommands: dailyCommands[0].count,
        successfulCommands: successfulCommands[0].count,
        failedCommands: failedCommands[0].count,
        successRate: totalCommands[0].count > 0 
          ? (successfulCommands[0].count / totalCommands[0].count) * 100 
          : 100,
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error);
      return {
        totalCommands: 0,
        recentCommands: 0,
        dailyCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        successRate: 0,
      };
    }
  }

  reset() {
    this.requestCounter = 0;
    this.errorCounter = 0;
    this.responseTimes = [];
    this.activeConnections.clear();
  }
}

export const metricsCollector = MetricsCollector.getInstance();