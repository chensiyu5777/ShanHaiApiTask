'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Trash2, AlertTriangle, CheckCircle, Loader, RefreshCw } from 'lucide-react';

interface DatabaseInfo {
  type: 'postgresql' | 'mysql' | 'sqlite3';
  name: string;
  version: string;
  status: 'installed' | 'not_installed' | 'checking';
  installPath?: string;
  serviceStatus?: 'running' | 'stopped' | 'not_found';
}

interface UninstallProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  progress: number;
  status: 'idle' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'error';
  error?: string;
}

export default function DatabaseUninstallPage() {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([
    { type: 'postgresql', name: 'PostgreSQL', version: '15.4', status: 'checking' },
    { type: 'mysql', name: 'MySQL', version: '8.0.34', status: 'checking' },
    { type: 'sqlite3', name: 'SQLite3', version: '3.43.0', status: 'checking' }
  ]);
  
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseInfo | null>(null);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [uninstallProgress, setUninstallProgress] = useState<UninstallProgress>({
    step: 0,
    totalSteps: 4,
    currentStep: '准备卸载',
    progress: 0,
    status: 'idle'
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    // 检查每个数据库的安装状态
    const updatedDatabases = await Promise.all(
      databases.map(async (db) => {
        try {
          // 这里应该调用检查数据库状态的API
          // 目前模拟检查逻辑
          const isInstalled = await checkIfDatabaseInstalled(db.type);
          return {
            ...db,
            status: isInstalled ? 'installed' as const : 'not_installed' as const,
            serviceStatus: isInstalled ? await checkServiceStatus(db.type) : undefined
          };
        } catch (error) {
          return { ...db, status: 'not_installed' as const };
        }
      })
    );
    
    setDatabases(updatedDatabases);
  };

  const checkIfDatabaseInstalled = async (dbType: string): Promise<boolean> => {
    try {
      // 模拟检查数据库是否已安装
      if (dbType === 'postgresql') {
        // 检查是否有PostgreSQL相关进程或服务
        return Math.random() > 0.5; // 模拟结果
      } else if (dbType === 'mysql') {
        // 检查MySQL安装
        return Math.random() > 0.5; // 模拟结果  
      } else if (dbType === 'sqlite3') {
        // 检查SQLite3是否可用
        return Math.random() > 0.3; // SQLite3更可能已安装
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const checkServiceStatus = async (dbType: string): Promise<'running' | 'stopped' | 'not_found'> => {
    // 模拟服务状态检查
    const statuses: ('running' | 'stopped' | 'not_found')[] = ['running', 'stopped', 'not_found'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const handleUninstallDatabase = async () => {
    if (!selectedDatabase || selectedDatabase.status !== 'installed') return;

    setIsUninstalling(true);
    setUninstallProgress({
      step: 0,
      totalSteps: 4,
      currentStep: '准备卸载数据库',
      progress: 0,
      status: 'downloading'
    });
    setShowConfirmDialog(false);

    try {
      const response = await fetch('/api/admin/database/uninstall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseType: selectedDatabase.type,
          adminKey: 'dev-admin-secret-key-12345'
        }),
      });

      const uninstallId = await response.text();
      
      // 开始轮询卸载状态
      pollUninstallStatus(uninstallId);
      
    } catch (error) {
      setUninstallProgress(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '卸载失败'
      }));
      setIsUninstalling(false);
    }
  };

  const pollUninstallStatus = async (uninstallId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/database/uninstall?id=${uninstallId}`);
        const status = await response.json();

        setUninstallProgress(status.data);

        if (status.data.status === 'completed') {
          clearInterval(interval);
          setIsUninstalling(false);
          setSelectedDatabase(null);
          // 重新检查数据库状态
          setTimeout(() => checkDatabaseStatus(), 1000);
        } else if (status.data.status === 'error') {
          clearInterval(interval);
          setIsUninstalling(false);
        }
      } catch (error) {
        console.error('Failed to check uninstall status:', error);
      }
    }, 2000);

    // 30分钟后停止轮询
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const getStatusIcon = (status: string, serviceStatus?: string) => {
    if (status === 'checking') {
      return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
    } else if (status === 'installed') {
      if (serviceStatus === 'running') {
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      } else if (serviceStatus === 'stopped') {
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      } else {
        return <Database className="w-5 h-5 text-blue-600" />;
      }
    } else {
      return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusText = (status: string, serviceStatus?: string) => {
    if (status === 'checking') return '检查中...';
    if (status === 'not_installed') return '未安装';
    if (status === 'installed') {
      if (serviceStatus === 'running') return '运行中';
      if (serviceStatus === 'stopped') return '已安装 (已停止)';
      return '已安装';
    }
    return '未知';
  };

  const getDatabaseColor = (type: string) => {
    switch (type) {
      case 'postgresql': return 'text-blue-600';
      case 'mysql': return 'text-orange-600';
      case 'sqlite3': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">数据库卸载管理</h2>
        <p className="text-gray-600">管理和卸载已安装的数据库软件</p>
      </div>

      {/* 刷新按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={checkDatabaseStatus}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>刷新状态</span>
        </Button>
      </div>

      {/* 数据库列表 */}
      {!isUninstalling && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">已安装的数据库</h3>
          
          <div className="space-y-4">
            {databases.map((db) => (
              <div
                key={db.type}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <Database className={`w-8 h-8 ${getDatabaseColor(db.type)}`} />
                  <div>
                    <h4 className="text-lg font-semibold">{db.name}</h4>
                    <p className="text-sm text-gray-500">版本 {db.version}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(db.status, db.serviceStatus)}
                    <span className="text-sm">
                      {getStatusText(db.status, db.serviceStatus)}
                    </span>
                  </div>
                  
                  {db.status === 'installed' && (
                    <Button
                      onClick={() => {
                        setSelectedDatabase(db);
                        setShowConfirmDialog(true);
                      }}
                      variant="destructive"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>卸载</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {showConfirmDialog && selectedDatabase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <h3 className="text-lg font-semibold">确认卸载</h3>
            </div>
            
            <p className="text-gray-600 mb-4">
              您确定要卸载 <strong>{selectedDatabase.name}</strong> 吗？
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">
                <strong>警告：</strong>此操作将完全删除：
              </p>
              <ul className="text-red-700 text-sm mt-2 space-y-1">
                <li>• 数据库软件和服务</li>
                <li>• 所有数据库文件和数据</li>
                <li>• Node.js 驱动程序</li>
                <li>• 相关配置文件</li>
              </ul>
              <p className="text-red-800 text-sm mt-2 font-semibold">
                此操作无法撤销！
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleUninstallDatabase}
                variant="destructive"
                className="flex-1"
              >
                确认卸载
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 卸载进度 */}
      {isUninstalling && selectedDatabase && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Loader className="w-6 h-6 text-red-600 animate-spin mr-3" />
            <h3 className="text-lg font-semibold">
              正在卸载 {selectedDatabase.name}
            </h3>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{uninstallProgress.currentStep}</span>
              <span>{uninstallProgress.step}/{uninstallProgress.totalSteps}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uninstallProgress.progress}%` }}
              />
            </div>
          </div>

          {uninstallProgress.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                <strong>卸载失败:</strong> {uninstallProgress.error}
              </p>
            </div>
          )}

          {uninstallProgress.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                <CheckCircle className="w-5 h-5 inline mr-2" />
                卸载完成！{selectedDatabase.name} 已被完全移除。
              </p>
            </div>
          )}

          <div className="text-sm text-gray-500 space-y-2 mt-4">
            <p>• 正在停止数据库服务</p>
            <p>• 正在卸载数据库软件</p>
            <p>• 正在清理驱动程序</p>
            <p>• 正在删除数据文件和配置</p>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">重要提示</h4>
        <ul className="text-yellow-800 text-sm space-y-1">
          <li>• 卸载数据库将删除所有相关数据，请提前备份重要数据</li>
          <li>• 卸载过程需要管理员权限</li>
          <li>• 某些数据库可能需要手动删除残留的注册表项</li>
          <li>• 建议在卸载前先停止所有依赖此数据库的应用程序</li>
        </ul>
      </div>
    </div>
  );
}