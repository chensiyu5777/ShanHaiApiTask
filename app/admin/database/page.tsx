'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Play, FileText, AlertCircle, CheckCircle, Download, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface DatabaseStatus {
  isConnected: boolean;
  isInitialized: boolean;
  version: string | null;
  initializedAt: string | null;
  error?: string;
}

export default function DatabasePage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [initMode, setInitMode] = useState<'standard' | 'custom'>('standard');
  const [customSql, setCustomSql] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/admin/database/init');
      const result = await response.json();
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to check database status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!adminKey) {
      alert('请输入管理员密钥');
      return;
    }

    if (initMode === 'custom' && !customSql.trim()) {
      alert('请输入自定义 SQL');
      return;
    }

    setInitializing(true);
    try {
      const response = await fetch('/api/admin/database/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: initMode,
          customSql: initMode === 'custom' ? customSql : undefined,
          adminKey,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('数据库初始化成功！');
        checkStatus();
        setAdminKey('');
        setCustomSql('');
      } else {
        alert(`初始化失败: ${result.error}`);
      }
    } catch (error) {
      alert(`初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">数据库管理</h2>
        <p className="text-gray-600">数据库初始化和状态管理</p>
      </div>

      {/* 数据库未连接时显示安装选项 */}
      {!loading && !status?.isConnected && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-900">数据库连接失败</h3>
          </div>
          <p className="text-red-800 mb-4">
            无法连接到数据库。如果您还没有安装数据库软件，可以使用我们的自动安装向导。
          </p>
          <div className="flex space-x-4">
            <Link href="/admin/database/install">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                安装数据库
              </Button>
            </Link>
            <Button variant="outline" onClick={checkStatus}>
              重新连接
            </Button>
          </div>
        </div>
      )}

      {/* 状态卡片 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center mb-4">
          <Database className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold">数据库状态</h3>
        </div>

        {loading ? (
          <p className="text-gray-500">检查状态中...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              {status?.isConnected ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span>连接状态: {status?.isConnected ? '已连接' : '断开'}</span>
            </div>

            <div className="flex items-center space-x-2">
              {status?.isInitialized ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span>初始化状态: {status?.isInitialized ? '已初始化' : '未初始化'}</span>
            </div>

            <div>
              <span className="text-gray-600">版本: </span>
              <span className="font-medium">{status?.version || '未知'}</span>
            </div>

            <div>
              <span className="text-gray-600">初始化时间: </span>
              <span className="font-medium">
                {status?.initializedAt 
                  ? new Date(status.initializedAt).toLocaleString('zh-CN')
                  : '未初始化'
                }
              </span>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Button onClick={checkStatus} variant="outline" size="sm">
            刷新状态
          </Button>
        </div>
      </div>

      {/* 数据库管理操作 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center mb-4">
          <Settings className="w-6 h-6 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold">数据库管理操作</h3>
        </div>

        <p className="text-gray-600 mb-4">
          安装、卸载和管理数据库软件
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/database/install">
            <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              安装数据库
            </Button>
          </Link>
          
          <Link href="/admin/database/uninstall">
            <Button variant="destructive" className="w-full justify-start">
              <Trash2 className="w-4 h-4 mr-2" />
              卸载数据库
            </Button>
          </Link>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-gray-900 mb-2">支持的数据库</h4>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• <strong>PostgreSQL 15.4</strong>: 企业级开源关系数据库</li>
            <li>• <strong>MySQL 8.0.34</strong>: 世界最流行的开源数据库</li>
            <li>• <strong>SQLite3 3.43.0</strong>: 轻量级嵌入式数据库</li>
          </ul>
        </div>
      </div>

      {/* 数据库初始化 */}
      {!status?.isInitialized && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Play className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold">数据库初始化</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                初始化模式
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="initMode"
                    value="standard"
                    checked={initMode === 'standard'}
                    onChange={(e) => setInitMode(e.target.value as 'standard')}
                    className="mr-2"
                  />
                  标准初始化
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="initMode"
                    value="custom"
                    checked={initMode === 'custom'}
                    onChange={(e) => setInitMode(e.target.value as 'custom')}
                    className="mr-2"
                  />
                  自定义初始化
                </label>
              </div>
            </div>

            {initMode === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自定义 SQL
                </label>
                <textarea
                  value={customSql}
                  onChange={(e) => setCustomSql(e.target.value)}
                  placeholder="输入自定义的 SQL 脚本..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理员密钥
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="输入管理员密钥"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <Button 
              onClick={handleInitialize}
              disabled={initializing}
              className="w-full"
            >
              {initializing ? '初始化中...' : '开始初始化'}
            </Button>
          </div>
        </div>
      )}

      {/* Schema 管理 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center mb-4">
          <FileText className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold">Schema 管理</h3>
        </div>

        <p className="text-gray-600 mb-4">
          管理数据库表结构、索引和约束
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start">
            创建新表
          </Button>
          <Button variant="outline" className="justify-start">
            修改表结构
          </Button>
          <Button variant="outline" className="justify-start">
            管理索引
          </Button>
        </div>
      </div>
    </div>
  );
}