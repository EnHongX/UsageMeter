# API 文档

后端基础地址：`http://localhost:7612`

除健康检查、登录注册和 `/api/v1/*` 客户侧 API 外，后台管理接口都需要先登录。浏览器通过会话 Cookie 鉴权，测试中使用 `supertest.agent` 保持会话。

演示账号由 `npm run db:seed` 创建：

```text
邮箱: admin@usagemeter.local
密码: Password123!
```

## 健康检查

```http
GET /health
```

响应：

```json
{
  "status": "ok",
  "service": "usagemeter-api"
}
```

## 套餐

```http
GET /plans
POST /plans
GET /plans/:id
PATCH /plans/:id
```

创建套餐请求：

```json
{
  "name": "专业版",
  "monthlyBaseFee": 9900,
  "includedUnits": 100000,
  "dailyUnitLimit": 10000,
  "overageUnitPrice": 200
}
```

金额字段使用整数，单位是美分。

## 租户

```http
GET /tenants
POST /tenants
GET /tenants/:id
PATCH /tenants/:id
```

创建租户请求：

```json
{
  "name": "演示公司",
  "planId": "plan_id"
}
```

## API Key

```http
GET /api-keys
POST /api-keys
GET /api-keys/:id
PATCH /api-keys/:id
PATCH /api-keys/:id/revoke
DELETE /api-keys/:id
```

创建 API Key 请求：

```json
{
  "tenantId": "tenant_id",
  "name": "服务端 Key"
}
```

创建成功时会返回一次完整明文 `key`。数据库只保存 `keyHash` 和 `keyPrefix`，后续列表接口不会返回明文。

## 受保护 API

```http
POST /api/v1/messages
```

请求头：

```http
Authorization: Bearer <apiKey>
X-Request-Id: <stable request id>
```

当前阶段行为：

- 缺少 API Key 返回 `401 missing_api_key`
- API Key 无效返回 `401 invalid_api_key`
- API Key 已撤销返回 `403 revoked_api_key`
- 缺少 `X-Request-Id` 返回 `400 missing_request_id`
- 合法调用会写入 `UsageEvent`

当前 `POST /api/v1/messages` 固定消耗 `5` 个额度单位。

## 用量

```http
GET /usage/events
GET /usage/daily
```

这两个接口会返回真实 PostgreSQL 数据，用于后台查看调用日志和每日聚合。

当前合法调用 `/api/v1/messages` 会写入 `UsageEvent`，每日聚合仍由 seed 或后续聚合逻辑写入。

## 账单

```http
GET /billing/invoices
GET /billing/invoices/:id
```

该接口返回账单及其明细。账单生成逻辑还没实现，目前用于展示 seed 数据和后续生成结果。

## 测试入口

```bash
npm run test:all
```

该命令会使用真实 PostgreSQL 的 `test` schema 走通后台登录、套餐、租户、API Key、受保护 API 鉴权、用量写入、用量查询和账单查询等测试。

## 后续接口

下一阶段再实现：

```http
POST /tenants/:tenantId/invoices/generate
```

下一阶段重点是 requestId 幂等计费、每日额度限流、每日聚合原子更新和账单幂等生成。
