'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Server, Users, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

export default function MonitorPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/metrics');
      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
        
        // 更新历史数据
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        setHistoricalData(prev => {
          const newData = [...prev, {
            time: timeString,
            cpu: result.data.cpuUsage,
            memory: result.data.memoryUsage,
            requests: result.data.requestCount,
            responseTime: result.data.avgResponseTime,
          }];
          
          // 只保留最近20个数据点
          return newData.slice(-20);
        });
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时 ${minutes}分钟`;
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return AlertTriangle;
    if (value >= thresholds.warning) return AlertTriangle;
    return CheckCircle;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载监控数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">系统监控</h2>
        <p className="text-gray-600">实时系统性能和资源使用情况</p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics && [
          {
            title: 'CPU 使用率',
            value: `${metrics.cpuUsage.toFixed(1)}%`,
            icon: Server,
            color: getStatusColor(metrics.cpuUsage, { warning: 70, critical: 90 }),
            bgColor: 'bg-blue-50',
            StatusIcon: getStatusIcon(metrics.cpuUsage, { warning: 70, critical: 90 }),
          },
          {
            title: '内存使用率',
            value: `${metrics.memoryUsage.toFixed(1)}%`,
            icon: Activity,
            color: getStatusColor(metrics.memoryUsage, { warning: 80, critical: 95 }),
            bgColor: 'bg-green-50',
            StatusIcon: getStatusIcon(metrics.memoryUsage, { warning: 80, critical: 95 }),
          },
          {
            title: '活跃连接',
            value: metrics.activeConnections.toString(),
            icon: Users,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            StatusIcon: CheckCircle,
          },
          {
            title: '平均响应时间',
            value: `${metrics.avgResponseTime.toFixed(0)}ms`,
            icon: Clock,
            color: getStatusColor(metrics.avgResponseTime, { warning: 500, critical: 1000 }),
            bgColor: 'bg-orange-50',
            StatusIcon: getStatusIcon(metrics.avgResponseTime, { warning: 500, critical: 1000 }),
          },
        ].map((metric, index) => {
          const Icon = metric.icon;
          const StatusIcon = metric.StatusIcon;
          return (
            <div key={index} className={`p-6 rounded-lg border ${metric.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon className={`w-8 h-8 ${metric.color}`} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className={`text-2xl font-bold ${metric.color}`}>
                      {metric.value}
                    </p>
                  </div>
                </div>
                <StatusIcon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 系统信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">系统状态</h3>
          {metrics && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">运行时间</span>
                <span className="font-medium">{formatUptime(metrics.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总请求数</span>
                <span className="font-medium">{metrics.requestCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">错误率</span>
                <span className={`font-medium ${
                  metrics.errorRate > 5 ? 'text-red-600' : 
                  metrics.errorRate > 1 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.errorRate.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">数据库连接</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span>数据库连接正常</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">活跃连接池</span>
              <span className="font-medium">{metrics?.activeConnections || 0}/100</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">API 状态</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span>API 服务运行中</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">端口</span>
              <span className="font-medium">15777</span>
            </div>
          </div>
        </div>
      </div>

      {/* 性能图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">CPU & 内存使用率</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" strokeWidth={2} />
                <Line type="monotone" dataKey="memory" stroke="#10b981" name="内存 %" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">响应时间</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="responseTime" fill="#f59e0b" name="响应时间 (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-center">
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          手动刷新数据
        </button>
      </div>
    </div>
  );
}