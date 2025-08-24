'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Database, Shield, Bell, Save, RefreshCw } from 'lucide-react';

interface SystemConfig {
  id: number;
  configKey: string;
  configValue: any;
  description: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newConfig, setNewConfig] = useState({
    configKey: '',
    configValue: '',
    description: '',
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/v1/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'system_config',
          operation: 'list',
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setConfigs(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (config: SystemConfig) => {
    setSaving(true);
    try {
      const response = await fetch('/api/v1/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'system_config',
          operation: 'update',
          data: {
            id: config.id,
            configValue: config.configValue,
            description: config.description,
            isActive: config.isActive,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('配置保存成功');
        fetchConfigs();
      } else {
        alert(`保存失败: ${result.error}`);
      }
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.configKey || !newConfig.configValue) {
      alert('请填写配置键和配置值');
      return;
    }

    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(newConfig.configValue);
      } catch {
        parsedValue = newConfig.configValue; // 如果不是JSON，就作为字符串
      }

      const response = await fetch('/api/v1/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'system_config',
          operation: 'create',
          data: {
            configKey: newConfig.configKey,
            configValue: parsedValue,
            description: newConfig.description,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert('配置添加成功');
        setNewConfig({ configKey: '', configValue: '', description: '' });
        fetchConfigs();
      } else {
        alert(`添加失败: ${result.error}`);
      }
    } catch (error) {
      alert(`添加失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const updateConfig = (id: number, field: string, value: any) => {
    setConfigs(configs.map(config => 
      config.id === id ? { ...config, [field]: value } : config
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">系统设置</h2>
        <p className="text-gray-600">管理系统配置和参数</p>
      </div>

      {/* 快速设置卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Database className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="font-semibold">数据库设置</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            管理数据库连接池和性能参数
          </p>
          <Button variant="outline" size="sm">
            配置数据库
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Shield className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="font-semibold">安全设置</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            配置API访问控制和安全策略
          </p>
          <Button variant="outline" size="sm">
            安全配置
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Bell className="w-6 h-6 text-yellow-600 mr-2" />
            <h3 className="font-semibold">通知设置</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            配置系统监控和告警通知
          </p>
          <Button variant="outline" size="sm">
            通知配置
          </Button>
        </div>
      </div>

      {/* 添加新配置 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center mb-4">
          <Settings className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold">添加新配置</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              配置键
            </label>
            <input
              type="text"
              value={newConfig.configKey}
              onChange={(e) => setNewConfig({...newConfig, configKey: e.target.value})}
              placeholder="例如: api_timeout"
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              配置值
            </label>
            <input
              type="text"
              value={newConfig.configValue}
              onChange={(e) => setNewConfig({...newConfig, configValue: e.target.value})}
              placeholder='例如: "30000" 或 {"timeout": 30000}'
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <input
              type="text"
              value={newConfig.description}
              onChange={(e) => setNewConfig({...newConfig, description: e.target.value})}
              placeholder="配置说明"
              className="w-full p-3 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleAddConfig}>
            添加配置
          </Button>
        </div>
      </div>

      {/* 系统配置列表 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">系统配置列表</h3>
          <Button 
            onClick={fetchConfigs} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载配置中...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">配置键</th>
                  <th className="text-left py-3 px-4">配置值</th>
                  <th className="text-left py-3 px-4">描述</th>
                  <th className="text-left py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">
                      {config.configKey}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={JSON.stringify(config.configValue)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            updateConfig(config.id, 'configValue', parsed);
                          } catch {
                            updateConfig(config.id, 'configValue', e.target.value);
                          }
                        }}
                        className="w-full p-2 text-sm border border-gray-300 rounded font-mono"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={config.description || ''}
                        onChange={(e) => updateConfig(config.id, 'description', e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={config.isActive}
                          onChange={(e) => updateConfig(config.id, 'isActive', e.target.checked)}
                          className="mr-2"
                        />
                        <span className={config.isActive ? 'text-green-600' : 'text-gray-400'}>
                          {config.isActive ? '启用' : '禁用'}
                        </span>
                      </label>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        onClick={() => handleSaveConfig(config)}
                        disabled={saving}
                        size="sm"
                        variant="outline"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        保存
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}