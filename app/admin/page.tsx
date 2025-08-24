'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Server, Activity, Settings } from 'lucide-react';

interface DatabaseStatus {
  isConnected: boolean;
  isInitialized: boolean;
  version: string | null;
  initializedAt: string | null;
}

export default function AdminDashboard() {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('/api/admin/database/init');
      const result = await response.json();
      if (result.success) {
        setDbStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to check database status:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: '数据库状态',
      icon: Database,
      status: dbStatus?.isInitialized ? '已初始化' : '未初始化',
      color: dbStatus?.isInitialized ? 'text-green-600' : 'text-red-600',
      bgColor: dbStatus?.isInitialized ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: '连接状态',
      icon: Server,
      status: dbStatus?.isConnected ? '已连接' : '断开连接',
      color: dbStatus?.isConnected ? 'text-green-600' : 'text-red-600',
      bgColor: dbStatus?.isConnected ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: '系统监控',
      icon: Activity,
      status: '运行中',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'API 服务',
      icon: Settings,
      status: '活跃',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">仪表板</h2>
        <p className="text-gray-600">系统状态概览和快速操作</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`p-6 rounded-lg border ${card.bgColor}`}>
              <div className="flex items-center">
                <Icon className={`w-8 h-8 ${card.color}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className={`text-lg font-semibold ${card.color}`}>
                    {loading ? '检查中...' : card.status}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {dbStatus && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">数据库详情</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">版本</p>
              <p className="font-medium">{dbStatus.version || '未知'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">初始化时间</p>
              <p className="font-medium">
                {dbStatus.initializedAt 
                  ? new Date(dbStatus.initializedAt).toLocaleString('zh-CN')
                  : '未初始化'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            onClick={() => window.location.href = '/admin/database'}
            className="justify-start"
          >
            <Database className="w-4 h-4 mr-2" />
            数据库管理
          </Button>
          <Button 
            onClick={() => window.location.href = '/admin/monitor'}
            variant="outline"
            className="justify-start"
          >
            <Activity className="w-4 h-4 mr-2" />
            系统监控
          </Button>
          <Button 
            onClick={checkDatabaseStatus}
            variant="secondary"
            className="justify-start"
          >
            刷新状态
          </Button>
        </div>
      </div>
    </div>
  );
}