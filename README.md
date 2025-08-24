# 全栈管理平台

高度可定制的全栈管理平台，基于 Next.js 14 + TypeScript + PostgreSQL + Drizzle ORM 构建。

## 功能特性

### 🚀 核心功能

- **数据库全自动初始化**: 支持标准初始化和自定义 SQL 脚本初始化
- **动态数据库管理**: 表与字段操作、索引优化
- **高度自定义 API**: 指令驱动的 API 命令系统
- **系统监控**: 实时性能监控和资源使用统计
- **审计日志**: 完整的操作日志记录

### 🛠 技术栈

- **前端**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes + TypeScript
- **数据库**: PostgreSQL + Drizzle ORM
- **验证**: Zod
- **图表**: Recharts
- **图标**: Lucide React

## 快速开始

### 1. 环境要求

- Node.js 18+
- PostgreSQL 12+
- npm 或 yarn

### 2. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 3. 环境配置

复制环境变量文件并配置：

\`\`\`bash
cp .env.example .env.local
\`\`\`

配置 `.env.local` 文件：

\`\`\`env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/admin_platform"

# 安全密钥
ADMIN_SECRET_KEY="your-super-secret-admin-key-here"

# 应用配置
NODE_ENV=development
PORT=15777
\`\`\`

### 4. 启动服务

\`\`\`bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
\`\`\`

服务将在 http://localhost:15777 启动

## 项目结构

\`\`\`
├── app/                    # Next.js App Router
│   ├── admin/             # 管理界面
│   │   ├── database/      # 数据库管理页面
│   │   ├── api/           # API 命令页面
│   │   ├── monitor/       # 系统监控页面
│   │   └── settings/      # 系统设置页面
│   └── api/               # API 路由
│       ├── admin/         # 管理员 API
│       └── v1/            # 公共 API v1
├── components/            # React 组件
│   └── ui/               # UI 组件库
├── lib/                  # 核心库
│   ├── command-handlers/ # API 命令处理器
│   ├── db.ts            # 数据库连接
│   ├── schema.ts        # 数据库 Schema
│   ├── database-init.ts # 数据库初始化
│   ├── monitoring.ts    # 系统监控
│   └── utils.ts         # 工具函数
├── types/               # TypeScript 类型定义
└── drizzle/            # Drizzle 迁移文件
\`\`\`

## API 使用指南

### 数据库初始化

\`\`\`bash
# 检查数据库状态
curl http://localhost:15777/api/admin/database/init

# 标准初始化
curl -X POST http://localhost:15777/api/admin/database/init \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "standard",
    "adminKey": "your-admin-key"
  }'

# 自定义 SQL 初始化
curl -X POST http://localhost:15777/api/admin/database/init \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "custom",
    "customSql": "CREATE TABLE test (id SERIAL PRIMARY KEY);",
    "adminKey": "your-admin-key"
  }'
\`\`\`

### API 命令系统

\`\`\`bash
# 获取 API 信息
curl http://localhost:15777/api/v1/command

# 执行命令 - 获取用户列表
curl -X POST http://localhost:15777/api/v1/command \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity": "users",
    "operation": "list",
    "data": {"limit": 10, "offset": 0}
  }'

# 创建用户
curl -X POST http://localhost:15777/api/v1/command \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity": "users",
    "operation": "create",
    "data": {
      "username": "testuser",
      "email": "test@example.com",
      "role": "user"
    }
  }'

# 获取系统配置（需要管理员密钥）
curl -X POST http://localhost:15777/api/v1/command \\
  -H "Content-Type: application/json" \\
  -d '{
    "entity": "system_config",
    "operation": "list",
    "adminKey": "your-admin-key"
  }'
\`\`\`

### 系统监控

\`\`\`bash
# 获取系统指标
curl http://localhost:15777/api/admin/monitoring/metrics
\`\`\`

## 支持的实体和操作

### 用户 (users)

- \`list\`: 获取用户列表
- \`get\`: 获取单个用户
- \`create\`: 创建用户
- \`update\`: 更新用户
- \`delete\`: 删除用户 (需要管理员密钥)
- \`count\`: 获取用户数量

### 系统配置 (system_config)

- \`list\`: 获取配置列表 (需要管理员密钥)
- \`get\`: 获取单个配置 (需要管理员密钥)
- \`create\`: 创建配置 (需要管理员密钥)
- \`update\`: 更新配置 (需要管理员密钥)
- \`delete\`: 删除配置 (需要管理员密钥)
- \`get_by_key\`: 按键获取配置 (需要管理员密钥)

### 审计日志 (audit_logs)

- \`list\`: 获取日志列表
- \`get\`: 获取单个日志
- \`count\`: 获取日志数量
- \`cleanup\`: 清理旧日志 (需要管理员密钥)

## 开发脚本

\`\`\`bash
# 开发服务器 (端口 15777)
npm run dev

# 生产构建
npm run build

# 启动生产服务器
npm start

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 数据库操作
npm run db:generate    # 生成迁移文件
npm run db:migrate     # 执行迁移
npm run db:push        # 推送 schema 变更
npm run db:studio      # 打开 Drizzle Studio
\`\`\`

## 安全注意事项

1. **管理员密钥**: 请确保 \`ADMIN_SECRET_KEY\` 足够复杂且安全存储
2. **数据库安全**: 使用强密码保护 PostgreSQL 数据库
3. **网络安全**: 在生产环境中使用 HTTPS
4. **权限控制**: 定期审查 API 权限配置

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 技术支持

如有问题，请查看文档或提交 Issue。