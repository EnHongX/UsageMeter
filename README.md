# UsageMeter

UsageMeter 是一个面向 SaaS 产品的 API 用量管理平台，用来管理租户、套餐、API Key、用量记录、限流和账单生成。

## 技术栈

- 前端：React + Vite，端口 `7611`
- 后端：Node.js + Express，端口 `7612`
- 数据库：PostgreSQL，本地 Docker 端口 `55432`
- 缓存：Redis，本地端口 `6379`
- ORM：Prisma
- 测试：后端 Jest，前端 Vitest

## 本地启动

```bash
docker compose up -d postgres redis
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

前端地址：`http://localhost:7611`

后端健康检查：`http://localhost:7612/health`

演示账号：

```text
邮箱: admin@usagemeter.local
密码: Password123!
```

`npm run db:seed` 会创建该管理员账号，并写入租户、套餐、API Key、用量、账单等演示数据。

## 常用命令

```bash
npm run dev
npm test
npm run test:all
npm run typecheck
npm run build --workspaces
npm run db:generate
npm run db:migrate
npm run db:seed
```

`npm run test:all` 会启动 PostgreSQL/Redis，使用 `test` schema 跑后端接口和业务逻辑测试，再跑前端页面测试。测试不会清空 `public` schema 的演示数据。

`npm run db:seed` 会写入演示数据：管理员账号 1 个，套餐、租户、API Key、用量事件、每日聚合、账单各 28 条，账单明细 56 条。

## 目录结构

```text
apps/api   Express 后端服务
apps/web   React 管理后台
docs       架构、接口、数据库和开发文档
scripts    本地开发辅助脚本
```

## 当前进度

已完成：

- 套餐、租户、API Key 基础管理
- API Key 创建时只返回一次明文，数据库只保存 hash 和前缀
- 受保护接口 `POST /api/v1/messages` 的 API Key 鉴权
- 合法调用写入 `UsageEvent`
- 用量和账单查询接口
- 中文管理后台页面
- 登录会话鉴权，后台业务接口需要先登录
- 一个命令全量测试：`npm run test:all`
- 数据库 ER 图：[docs/er-diagram.mmd](/Users/block/Project/SoloCoder/UsageMeter/docs/er-diagram.mmd)

未完成：

- `X-Request-Id` 幂等计费
- 每日额度限流
- `UsageDailyAggregate` 原子更新
- 账单幂等生成
