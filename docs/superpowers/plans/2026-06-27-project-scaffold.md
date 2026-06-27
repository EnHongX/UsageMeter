# UsageMeter 项目骨架实施计划

**目标：** 创建可运行的 UsageMeter 单仓库骨架，包含 Express 后端、React 前端、PostgreSQL、Redis、测试和文档。

**架构：** 前端放在 `apps/web`，后端放在 `apps/api`。后端先提供基础模块和占位路由，核心计费链路后续实现。

**技术栈：** Node.js、Express、React、Vite、TypeScript、Prisma、PostgreSQL、Redis、Jest、Vitest。

## 任务 1：根目录工作区

- 已创建 `package.json`
- 已创建 `.env.example`
- 已创建 `docker-compose.yml`
- 已更新 `README.md`

## 任务 2：后端骨架

- 已创建 Express 应用入口
- 已创建 `/health`
- 已创建 Prisma schema
- 已创建 Jest + Supertest 冒烟测试

## 任务 3：前端骨架

- 已创建 Vite React 应用
- 已创建管理后台导航和页面
- 已创建 Vitest 冒烟测试

## 任务 4：文档

- 已创建架构文档
- 已创建 API 文档
- 已创建数据库文档
- 已创建开发说明
