# 开发说明

## 环境要求

- Node.js 20+
- Docker
- npm

## 启动步骤

```bash
docker compose up -d postgres redis
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run db:seed` 会写入 28 组左右的中文演示数据，便于直接查看页面。

演示登录账号：

```text
邮箱: admin@usagemeter.local
密码: Password123!
```

如果页面看不到租户、套餐、API Key、用量或账单数据，先确认：

- 已执行 `npm run db:seed`
- 已使用上面的演示账号登录
- 后端 `http://localhost:7612/health` 正常
- 测试使用 `test` schema，不应清理 `public` schema 的演示数据

## 端口

```text
前端: 7611
后端: 7612
PostgreSQL: 55432
Redis: 6379
```

## 测试

```bash
npm run test:all
```

该命令会启动 PostgreSQL/Redis，生成 Prisma Client，并执行全部后端接口/业务逻辑测试和前端页面测试。

普通测试：

```bash
npm test
```

只跑后端：

```bash
npm test -w apps/api
```

只跑前端：

```bash
npm test -w apps/web
```

后端测试会执行 `prisma db push` 到 `TEST_DATABASE_URL` 指向的 `test` schema，并在每个测试前清理该 schema 的相关业务表，保证 PostgreSQL 测试数据隔离且不影响本地演示数据。

## 范围控制

当前阶段已完成租户、套餐、API Key 管理，受保护 API 鉴权，以及合法调用写入用量事件。

不要在计费链路确认前接入真实支付、邮件、外部网关或后台任务系统。
