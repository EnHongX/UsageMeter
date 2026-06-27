# 数据库说明

当前使用 Prisma 管理 PostgreSQL schema。

ER 图文件：`docs/er-diagram.mmd`

## 核心表

- `Tenant`：租户
- `Plan`：套餐
- `ApiKey`：API Key，只保存 hash 和前缀
- `UsageEvent`：用量事件
- `UsageDailyAggregate`：每日用量聚合
- `Invoice`：账单
- `InvoiceLineItem`：账单明细

## 关键约束

- `Plan.name` 唯一
- `ApiKey.keyHash` 唯一
- `UsageEvent` 对 `tenantId + requestId` 做唯一约束
- `UsageDailyAggregate` 对 `tenantId + date` 做唯一约束
- `Invoice` 对 `tenantId + billingPeriod` 做唯一约束

这些约束是后续实现幂等计费和幂等账单生成的基础。

## 金额

所有金额字段都使用整数，美分为单位，不使用浮点数。

## 本地数据库

Docker 中 PostgreSQL 容器内部端口仍是 `5432`，宿主机映射为 `55432`，避免和本机已有数据库冲突。

## 演示数据

执行：

```bash
npm run db:seed
```

会清空并重建演示数据：

- `User`：1 条，`admin@usagemeter.local / Password123!`
- `Plan`：28 条
- `Tenant`：28 条
- `ApiKey`：28 条
- `UsageEvent`：28 条
- `UsageDailyAggregate`：28 条
- `Invoice`：28 条
- `InvoiceLineItem`：56 条

演示 API Key 仍然只保存 hash 和前缀，不保存明文。

## 测试数据

自动化测试默认使用：

```text
postgresql://usagemeter:usagemeter@localhost:55432/usagemeter?schema=test
```

测试会清理 `test` schema 中的业务表，不清理 `public` schema 的演示数据。
