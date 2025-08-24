'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Database, Download, Settings, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface DatabaseOption {
  id: 'postgresql' | 'mysql' | 'sqlite3';
  name: string;
  description: string;
  version: string;
  downloadUrl: string;
  color: string;
}

interface InstallProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  progress: number;
  status: 'idle' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'error';
  error?: string;
}

interface DatabaseConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
}

export default function DatabaseInstallPage() {
  const [selectedDatabase, setSelectedDatabase] = useState<DatabaseOption | null>(null);
  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    step: 0,
    totalSteps: 4,
    currentStep: '准备安装',
    progress: 0,
    status: 'idle'
  });
  const [isInstalling, setIsInstalling] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: '',
    username: '',
    password: '',
    database: 'admin_platform'
  });

  const databaseOptions: DatabaseOption[] = [
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      description: '功能强大的开源关系数据库，支持复杂查询和JSON数据类型',
      version: '15.4',
      downloadUrl: 'https://get.enterprisedb.com/postgresql/postgresql-15.4-1-windows-x64.exe',
      color: 'text-blue-600'
    },
    {
      id: 'mysql',
      name: 'MySQL',
      description: '世界上最流行的开源关系数据库，性能优异，易于使用',
      version: '8.0.34',
      downloadUrl: 'https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-community-8.0.34.0.msi',
      color: 'text-orange-600'
    },
    {
      id: 'sqlite3',
      name: 'SQLite3',
      description: '轻量级嵌入式数据库，无需服务器，适合小型应用和开发测试',
      version: '3.43.0',
      downloadUrl: 'https://www.sqlite.org/2023/sqlite-tools-win32-x86-3430000.zip',
      color: 'text-green-600'
    }
  ];

  useEffect(() => {
    if (selectedDatabase) {
      if (selectedDatabase.id === 'sqlite3') {
        setDbConfig(prev => ({
          ...prev,
          host: './database.sqlite',
          port: '',
          username: '',
          password: ''
        }));
      } else {
        setDbConfig(prev => ({
          ...prev,
          port: selectedDatabase.id === 'postgresql' ? '5432' : '3306',
          username: selectedDatabase.id === 'postgresql' ? 'postgres' : 'root'
        }));
      }
    }
  }, [selectedDatabase]);

  const handleInstallDatabase = async () => {
    if (!selectedDatabase) return;

    setIsInstalling(true);
    setInstallProgress({
      step: 1,
      totalSteps: 4,
      currentStep: '检查系统环境',
      progress: 0,
      status: 'downloading'
    });

    try {
      const response = await fetch('/api/admin/database/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseType: selectedDatabase.id,
          version: selectedDatabase.version,
          downloadUrl: selectedDatabase.downloadUrl,
          adminKey: 'dev-admin-secret-key-12345'
        }),
      });

      const installId = await response.text();
      
      // 开始轮询安装状态
      pollInstallStatus(installId);
      
    } catch (error) {
      setInstallProgress(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '安装失败'
      }));
      setIsInstalling(false);
    }
  };

  const pollInstallStatus = async (installId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/database/install/status?id=${installId}`);
        const status = await response.json();

        setInstallProgress(status.data);

        if (status.data.status === 'completed') {
          clearInterval(interval);
          setIsInstalling(false);
          setShowConfig(true);
        } else if (status.data.status === 'error') {
          clearInterval(interval);
          setIsInstalling(false);
        }
      } catch (error) {
        console.error('Failed to check install status:', error);
      }
    }, 2000);

    // 30分钟后停止轮询
    setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
  };

  const handleSaveConfig = async () => {
    if (!selectedDatabase) return;

    let connectionString: string;
    if (selectedDatabase.id === 'postgresql') {
      connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
    } else if (selectedDatabase.id === 'mysql') {
      connectionString = `mysql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
    } else if (selectedDatabase.id === 'sqlite3') {
      connectionString = `sqlite://${dbConfig.host}`;
    } else {
      connectionString = '';
    }

    try {
      const response = await fetch('/api/admin/database/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseType: selectedDatabase.id,
          connectionString,
          config: dbConfig,
          adminKey: 'dev-admin-secret-key-12345',
          skipConnectionTest: selectedDatabase.id === 'sqlite3' // SQLite3跳过连接测试
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('数据库配置保存成功！系统将重新启动以应用新配置。');
        window.location.href = '/admin/database';
      } else {
        alert(`配置保存失败: ${result.error}`);
      }
    } catch (error) {
      alert(`配置保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const getStatusIcon = () => {
    if (!installProgress) return <Loader className="w-6 h-6 text-blue-600 animate-spin" />;
    
    switch (installProgress.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Loader className="w-6 h-6 text-blue-600 animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">数据库安装向导</h2>
        <p className="text-gray-600">选择并自动安装数据库软件</p>
      </div>

      {/* 数据库选择 */}
      {!isInstalling && !showConfig && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">选择数据库类型</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {databaseOptions.map((db) => (
              <div
                key={db.id}
                className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedDatabase?.id === db.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedDatabase(db)}
              >
                <div className="flex items-center mb-3">
                  <Database className={`w-8 h-8 ${db.color} mr-3`} />
                  <div>
                    <h4 className="text-xl font-semibold">{db.name}</h4>
                    <p className="text-sm text-gray-500">版本 {db.version}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{db.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={handleInstallDatabase}
              disabled={!selectedDatabase}
              className="px-8 py-3"
            >
              <Download className="w-5 h-5 mr-2" />
              安装 {selectedDatabase?.name}
            </Button>
          </div>
        </div>
      )}

      {/* 安装进度 */}
      {isInstalling && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold ml-3">
              正在安装 {selectedDatabase?.name}
            </h3>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{installProgress.currentStep}</span>
              <span>{installProgress.step}/{installProgress.totalSteps}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${installProgress.progress}%` }}
              />
            </div>
          </div>

          {installProgress.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                <strong>安装失败:</strong> {installProgress.error}
              </p>
            </div>
          )}

          <div className="text-sm text-gray-500 space-y-2">
            <p>• 系统会自动下载并安装数据库软件</p>
            <p>• 安装过程可能需要几分钟，请耐心等待</p>
            <p>• 安装完成后将引导您配置数据库连接</p>
          </div>
        </div>
      )}

      {/* 数据库配置 */}
      {showConfig && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Settings className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold">配置数据库连接</h3>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">
              <CheckCircle className="w-5 h-5 inline mr-2" />
              {selectedDatabase?.name} 安装完成！请配置数据库连接信息。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                主机地址
              </label>
              <input
                type="text"
                value={dbConfig.host}
                onChange={(e) => setDbConfig(prev => ({ ...prev, host: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                端口
              </label>
              <input
                type="text"
                value={dbConfig.port}
                onChange={(e) => setDbConfig(prev => ({ ...prev, port: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={dbConfig.username}
                onChange={(e) => setDbConfig(prev => ({ ...prev, username: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={dbConfig.password}
                onChange={(e) => setDbConfig(prev => ({ ...prev, password: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据库名称
              </label>
              <input
                type="text"
                value={dbConfig.database}
                onChange={(e) => setDbConfig(prev => ({ ...prev, database: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="mt-6 flex space-x-4">
            <Button onClick={handleSaveConfig} className="flex-1">
              保存配置并重启系统
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConfig(false)}
              className="flex-1"
            >
              返回重新选择
            </Button>
          </div>
        </div>
      )}

      {/* 安装说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">安装说明</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• 系统将自动下载并安装选择的数据库软件</li>
          <li>• 安装过程需要管理员权限，可能会弹出UAC确认窗口</li>
          <li>• PostgreSQL 默认端口: 5432，MySQL 默认端口: 3306</li>
          <li>• 安装完成后请记住设置的数据库密码</li>
          <li>• 配置保存后系统将自动重启以应用新的数据库连接</li>
        </ul>
      </div>
    </div>
  );
}