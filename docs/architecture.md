# 架构说明

UsageMeter 采用前后端分离结构：

- `apps/api`：Node.js + Express 后端服务，监听端口 `7612`
- `apps/web`：React + Vite 管理后台，监听端口 `7611`

PostgreSQL 是主数据源。Redis 预留给缓存、限流协调和短生命周期运行状态。

## 后端模块边界

后端模块放在 `apps/api/src/modules`：

- `health`：服务健康检查
- `tenants`：租户管理
- `plans`：套餐管理
- `apiKeys`：API Key 创建、展示前缀、撤销
- `usage`：用量事件和每日聚合查询
- `billing`：账单和账单明细查询
- `protectedApi`：模拟外部受保护 API，负责 API Key 鉴权并写入用量事件

当前已实现 `Tenant / Plan / ApiKey` 基础增删改查，受保护 API 的 API Key 鉴权，以及合法调用写入 `UsageEvent`。

下一阶段要补齐：requestId 幂等计费、每日额度限流、每日聚合原子更新和账单幂等生成。

## 前端模块边界

前端是管理后台壳，已接入真实 API 的页面包括：

- 租户列表与创建
- 套餐列表与创建
- API Key 列表、创建和撤销
- 用量事件和每日聚合查看
- 账单列表查看

当前前端只展示已有数据，不在前端承载任何计费判断。

## 测试边界

`npm run test:all` 会用真实 PostgreSQL/Redis 运行全部测试。后端测试使用 `TEST_DATABASE_URL`，默认指向 `test` schema，避免清理开发环境 `public` schema 的演示数据。
