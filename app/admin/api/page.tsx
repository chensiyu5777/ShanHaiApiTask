'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, Send, History, Settings } from 'lucide-react';

export default function ApiPage() {
  const [entity, setEntity] = useState('');
  const [operation, setOperation] = useState('');
  const [requestData, setRequestData] = useState('{}');
  const [adminKey, setAdminKey] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCommand = async () => {
    if (!entity || !operation) {
      alert('请输入实体和操作');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(requestData);
    } catch (error) {
      alert('请求数据格式错误，请输入有效的 JSON');
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        entity,
        operation,
        data: parsedData,
        adminKey: adminKey || undefined,
      };

      const apiResponse = await fetch('/api/v1/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await apiResponse.json();
      setResponse(JSON.stringify(result, null, 2));
    } catch (error) {
      setResponse(`错误: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const commonCommands = [
    {
      name: '获取用户列表',
      entity: 'users',
      operation: 'list',
      data: '{"limit": 10, "offset": 0}',
    },
    {
      name: '创建用户',
      entity: 'users',
      operation: 'create',
      data: '{"username": "testuser", "email": "test@example.com", "role": "user"}',
    },
    {
      name: '获取系统配置',
      entity: 'system_config',
      operation: 'list',
      data: '{}',
    },
    {
      name: '查看审计日志',
      entity: 'audit_logs',
      operation: 'list',
      data: '{"limit": 20, "offset": 0}',
    },
  ];

  const applyTemplate = (template: typeof commonCommands[0]) => {
    setEntity(template.entity);
    setOperation(template.operation);
    setRequestData(template.data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">API 命令中心</h2>
        <p className="text-gray-600">执行自定义 API 命令和操作</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 命令构建器 */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <Command className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold">命令构建器</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                实体 (Entity)
              </label>
              <input
                type="text"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="例如: users, system_config"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                操作 (Operation)
              </label>
              <input
                type="text"
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                placeholder="例如: list, create, update, delete"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                请求数据 (JSON)
              </label>
              <textarea
                value={requestData}
                onChange={(e) => setRequestData(e.target.value)}
                placeholder='例如: {"limit": 10, "offset": 0}'
                className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理员密钥 (可选)
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="仅限需要特殊权限的操作"
                className="w-full p-3 border border-gray-300 rounded-md"
              />
            </div>

            <Button 
              onClick={handleSendCommand}
              disabled={loading}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? '执行中...' : '发送命令'}
            </Button>
          </div>
        </div>

        {/* 响应面板 */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <History className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold">响应结果</h3>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="text-sm overflow-auto max-h-96">
              {response || '等待命令执行...'}
            </pre>
          </div>
        </div>
      </div>

      {/* 常用命令模板 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center mb-4">
          <Settings className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold">常用命令模板</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commonCommands.map((template, index) => (
            <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {template.entity}.{template.operation}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate(template)}
              >
                使用模板
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* API 文档 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">API 规范</h3>
        
        <div className="prose text-sm">
          <h4 className="font-medium">请求格式</h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`POST /api/v1/command
Content-Type: application/json

{
  "entity": "string",     // 操作的实体名称
  "operation": "string",  // 操作类型
  "data": {},            // 操作数据（可选）
  "adminKey": "string"   // 管理员密钥（可选）
}`}
          </pre>

          <h4 className="font-medium mt-4">响应格式</h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": boolean,
  "data": any,           // 返回数据
  "error": "string",     // 错误信息（如有）
  "timestamp": "string", // 时间戳
  "requestId": "string"  // 请求ID（可选）
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}