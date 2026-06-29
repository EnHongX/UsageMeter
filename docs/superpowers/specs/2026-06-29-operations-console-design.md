# UsageMeter 运营后台补全设计

日期：2026-06-29

## 该不该做

该做。当前项目已经具备租户、套餐、API Key、用量、账单和基础后台，但离可上线运营产品还缺少运营工作台、策略配置、异常处理、通知配置和系统任务视图。

本阶段采用“页面优先、后端轻实现、核心计费后置”的方案。目标是让后台先形成完整运营闭环，同时为后续真实计费、限流、账单生成和通知投递留下清晰接口。

## 为什么

继续补普通 CRUD 收益有限。上线运营更需要回答这些问题：

- 哪些租户今天接近额度或已经超限？
- 哪些账期还没生成账单，哪些生成失败？
- 哪些异常需要运营处理，处理到哪一步了？
- 限流策略和通知规则在哪里配置？
- 后台任务最近是否正常运行？

本阶段不追求计费强一致和分布式限流完整实现，避免陷入时间黑洞。页面和数据结构先稳定下来，后续再补核心算法和任务执行器。

## 怎么做

### 产品边界

P0 新增或增强 7 个运营能力：

- 运营概览增强
- 租户详情增强
- 限流策略
- 账单生成中心增强
- 异常处理中心增强
- 通知配置
- 系统任务

P0 后端只做轻实现：

- Prisma 数据模型
- 基础列表、详情、创建、更新接口
- seed 数据
- 页面真实读写接口
- 不实现复杂计费一致性、真实限流、真实投递和调度

P1/P2 再实现：

- `X-Request-Id` 幂等计费
- Redis 每日额度限流
- `UsageDailyAggregate` 原子更新
- 账单幂等生成
- Webhook 真实投递和重试
- 细粒度 RBAC

### 导航结构

保留现有主要导航，并补齐运营类入口：

- `仪表盘`
- `租户`
- `套餐`
- `API Key 管理`
- `用量`
- `额度监控`
- `限流策略`
- `收益`
- `账单`
- `账单生成`
- `异常中心`
- `通知配置`
- `系统任务`
- `接入文档`
- `日志`
- `设置`

侧边栏新增 `运营配置` 分组，包含 `限流策略`、`通知配置`、`系统任务`。首版优先保证入口明确，不做复杂权限菜单。

## 页面设计

### 运营概览增强

路由：`/`

目标：让运营人员打开后台后能立即看到今天是否正常。

新增信息：

- 今日请求数
- 今日消耗额度
- 风险租户数
- 待处理异常数
- 待生成账单数
- 任务失败数
- 额度风险排行
- 最近异常
- 最近账单生成记录
- 最近系统任务

数据来源：

- `GET /usage/daily`
- `GET /exceptions`
- `GET /billing/runs`
- `GET /system/jobs`

### 租户详情增强

路由：`/tenants/:id`

目标：把租户运营所需信息集中在一个详情页。

页面区块：

- 基本信息：名称、状态、套餐、创建时间
- 当前额度：今日已用、每日额度、剩余额度、使用率
- 用量趋势：近 7 日请求数和额度消耗
- API Key：名称、前缀、状态、创建时间
- 账单历史：账期、金额、状态
- 限流策略：套餐默认策略和租户覆盖策略
- 异常记录：最近异常、处理状态

轻实现边界：

- 趋势可先用现有每日聚合。
- 限流策略从新表读取。
- 异常记录从 `ExceptionCase` 读取。

### 限流策略

路由：`/rate-limits`

目标：配置套餐默认额度和租户覆盖策略，形成后续真实限流的管理入口。

页面结构：

- 指标：启用策略数、停用策略数、今日触发次数、风险租户数
- 筛选：租户、套餐、状态
- 策略表：作用范围、租户、套餐、每日额度、预警阈值、状态、更新时间
- 策略表单：作用范围、租户、套餐、每日额度、预警阈值、启用状态
- 触发记录：租户、请求 ID、消耗额度、触发原因、时间

策略规则：

- `scope = PLAN` 表示套餐默认策略。
- `scope = TENANT` 表示租户覆盖策略。
- 租户覆盖优先于套餐默认。
- 真实请求拦截 P1 再实现，本阶段只保存配置和展示触发记录。

### 账单生成中心增强

路由：`/billing-runs`

目标：让运营按账期查看生成状态，并提供生成、重试和查看入口。

页面结构：

- 筛选：账期、租户、状态
- 指标：待生成、运行中、成功、失败
- 生成预览表：租户、账期、用量、超额用量、预计金额、当前账单状态
- 生成记录表：账期、租户、状态、开始时间、结束时间、耗时、失败原因
- 操作：生成、重试、查看账单

轻实现边界：

- `POST /billing/runs` 创建一条 `BillingRun`。
- `POST /billing/runs` 首版只记录运行状态，不同步创建或修改 `Invoice`。
- 不做完整幂等账单算法，但数据库保留唯一约束基础。

### 异常处理中心增强

路由：`/exceptions`

目标：把请求、限流、账单和任务异常沉淀成可处理事项，而不是只从日志临时推导。

页面结构：

- 指标：待处理、高优先级、今日新增、已关闭
- 筛选：类型、级别、状态、租户、日期
- 异常表：级别、类型、租户、关联对象、摘要、状态、负责人、发生时间
- 异常详情：上下文、关联日志、备注、状态流转
- 操作：标记处理中、关闭、重新打开、添加备注

异常类型：

- `AUTH_FAILURE`
- `RATE_LIMITED`
- `BILLING_FAILED`
- `JOB_FAILED`
- `USAGE_ANOMALY`
- `SYSTEM_ERROR`

状态：

- `OPEN`
- `ACKNOWLEDGED`
- `RESOLVED`

### 通知配置

路由：`/notifications`

目标：配置运营通知入口，后续接 Webhook、邮件和重试。

页面结构：

- 通道列表：名称、类型、目标地址、状态、最近测试时间
- 规则列表：触发条件、严重级别、通道、启用状态
- 通道表单：Webhook URL、邮件地址、签名密钥占位
- 规则表单：事件类型、阈值、通道、启用状态
- 测试按钮：本阶段更新最近测试时间，并返回模拟成功结果。

触发条件：

- 额度达到预警阈值
- 限流触发
- 账单生成失败
- 系统任务失败
- 新增高优先级异常

轻实现边界：

- 只保存配置。
- 不做真实投递、签名、重试队列。

### 系统任务

路由：`/system/jobs`

目标：让运营知道聚合、账单、通知等后台任务是否正常。

页面结构：

- 指标：今日运行次数、成功次数、失败次数、平均耗时
- 筛选：任务类型、状态、日期
- 运行记录表：任务类型、状态、开始时间、结束时间、耗时、触发方式、失败原因
- 任务详情：输入参数、输出摘要、错误信息

任务类型：

- `USAGE_AGGREGATION`
- `BILLING_GENERATION`
- `NOTIFICATION_DELIVERY`
- `DATA_CLEANUP`

状态：

- `PENDING`
- `RUNNING`
- `SUCCESS`
- `FAILED`

轻实现边界：

- 本阶段只保存和展示运行记录。
- 不实现调度器。

## 数据库设计

### RateLimitPolicy

- `id`
- `scope`: `PLAN | TENANT`
- `tenantId`
- `planId`
- `dailyUnitLimit`
- `warningThresholdPercent`
- `status`: `ACTIVE | DISABLED`
- `createdAt`
- `updatedAt`

约束：

- 同一租户最多一条租户覆盖策略。
- 同一套餐最多一条套餐默认策略。

### RateLimitEvent

- `id`
- `tenantId`
- `apiKeyId`
- `policyId`
- `requestId`
- `endpoint`
- `costUnits`
- `limitUnits`
- `usedUnits`
- `reason`
- `occurredAt`

### BillingRun

- `id`
- `tenantId`
- `invoiceId`
- `billingPeriod`
- `status`: `PENDING | RUNNING | SUCCESS | FAILED`
- `startedAt`
- `finishedAt`
- `failureReason`
- `createdAt`
- `updatedAt`

约束：

- 可允许同租户同账期多次运行，用运行记录保留历史。
- 成功账单仍由 `Invoice(tenantId, billingPeriod)` 控制唯一性。

### ExceptionCase

- `id`
- `tenantId`
- `type`
- `severity`: `LOW | MEDIUM | HIGH | CRITICAL`
- `status`: `OPEN | ACKNOWLEDGED | RESOLVED`
- `source`
- `resourceType`
- `resourceId`
- `summary`
- `details`
- `assignee`
- `openedAt`
- `resolvedAt`
- `createdAt`
- `updatedAt`

### ExceptionNote

- `id`
- `exceptionId`
- `userId`
- `body`
- `createdAt`

### NotificationChannel

- `id`
- `name`
- `type`: `WEBHOOK | EMAIL`
- `target`
- `status`: `ACTIVE | DISABLED`
- `lastTestedAt`
- `createdAt`
- `updatedAt`

### NotificationRule

- `id`
- `name`
- `eventType`
- `severity`
- `channelId`
- `threshold`
- `status`: `ACTIVE | DISABLED`
- `createdAt`
- `updatedAt`

### SystemJobRun

- `id`
- `jobType`
- `status`: `PENDING | RUNNING | SUCCESS | FAILED`
- `triggeredBy`
- `startedAt`
- `finishedAt`
- `durationMs`
- `input`
- `output`
- `failureReason`
- `createdAt`

## 接口设计

新增后端模块：

- `apps/api/src/modules/rateLimits`
- `apps/api/src/modules/exceptions`
- `apps/api/src/modules/notifications`
- `apps/api/src/modules/systemJobs`

新增接口：

- `GET /rate-limits/policies`
- `POST /rate-limits/policies`
- `PATCH /rate-limits/policies/:id`
- `GET /rate-limits/events`
- `GET /billing/runs`
- `POST /billing/runs`
- `PATCH /billing/runs/:id/retry`
- `GET /exceptions`
- `GET /exceptions/:id`
- `PATCH /exceptions/:id`
- `POST /exceptions/:id/notes`
- `GET /notifications/channels`
- `POST /notifications/channels`
- `PATCH /notifications/channels/:id`
- `POST /notifications/channels/:id/test`
- `GET /notifications/rules`
- `POST /notifications/rules`
- `PATCH /notifications/rules/:id`
- `GET /system/jobs`
- `GET /system/jobs/:id`

所有后台接口继续走现有 `requireUser` 会话鉴权。

## 前端实现边界

新增或调整页面：

- `DashboardPage`
- `TenantDetailPage`
- `RateLimitsPage`
- `BillingRunsPage`
- `ExceptionsPage`
- `NotificationsPage`
- `SystemJobsPage`

新增或调整 API client 方法：

- `listRateLimitPolicies`
- `createRateLimitPolicy`
- `updateRateLimitPolicy`
- `listRateLimitEvents`
- `listBillingRuns`
- `createBillingRun`
- `retryBillingRun`
- `listExceptions`
- `getException`
- `updateException`
- `createExceptionNote`
- `listNotificationChannels`
- `createNotificationChannel`
- `updateNotificationChannel`
- `testNotificationChannel`
- `listNotificationRules`
- `createNotificationRule`
- `updateNotificationRule`
- `listSystemJobs`
- `getSystemJob`

UI 风格沿用现有后台：

- 表格为主，指标卡为辅。
- 页面密度偏运营工具，不做营销式大图。
- 状态使用统一 badge。
- 表单统一使用现有弹窗组件。
- 页面支持空状态和失败提示。

## 测试

后端测试：

- 新增模型的基础 CRUD。
- 列表接口需要登录。
- 账单运行创建能返回运行记录。
- 异常状态流转和备注创建。
- 通知通道测试接口返回模拟结果。

前端测试：

- 新导航入口可见。
- 新页面在 mock 数据下能渲染。
- 限流策略可创建和更新。
- 账单生成中心能创建运行记录。
- 异常中心能更新状态和添加备注。
- 通知配置能展示通道和规则。
- 系统任务能展示失败原因。

## 明确不做

本阶段不做：

- Redis 分布式限流。
- 强一致 requestId 幂等扣费。
- 用量聚合原子写入。
- 账单真实幂等生成。
- Webhook 真实投递、签名和重试。
- 邮件真实发送。
- 后台任务调度器。
- 多租户后台用户隔离。
- 细粒度 RBAC。

这些能力进入 P1/P2。P0 的交付标准是页面完整、接口可用、数据结构清楚、seed 数据能支撑演示和后续开发。
