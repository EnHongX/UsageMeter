import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();
const samplePepper = "change-me";
const count = 28;
const planNames = [
  "Starter API 轻量版",
  "Growth API 成长版",
  "Business API 商业版",
  "Scale API 扩展版",
  "Enterprise API 企业版",
  "AI Gateway 标准版",
  "AI Gateway 专业版",
  "消息服务基础版",
  "消息服务高可用版",
  "搜索服务入门版",
  "搜索服务进阶版",
  "风控调用基础版",
  "风控调用专业版",
  "内容审核标准版",
  "内容审核企业版",
  "实时通知基础版",
  "实时通知增强版",
  "数据同步标准版",
  "数据同步企业版",
  "开放平台基础版",
  "开放平台商业版",
  "计量计费基础版",
  "计量计费专业版",
  "高频调用基础版",
  "高频调用企业版",
  "私有化接入版",
  "全球加速版",
  "金融合规版"
];
const tenantNames = [
  "星河智能科技",
  "云帆数据服务",
  "北辰支付网络",
  "青藤教育平台",
  "澜海跨境电商",
  "远山物流科技",
  "启明内容平台",
  "明川金融科技",
  "深流视频云",
  "有方客户服务",
  "合众营销云",
  "同城生活服务",
  "银杉保险科技",
  "跃迁开发者平台",
  "蓝鲸工业互联网",
  "知微数据分析",
  "万象企业协同",
  "矩阵广告平台",
  "陆港供应链",
  "智筑物业云",
  "百川医疗科技",
  "领航招聘平台",
  "云栖出海服务",
  "天工低代码平台",
  "衡石风控服务",
  "速联通信云",
  "元启会员系统",
  "闻道知识服务"
];
const keyNames = [
  "生产环境服务端 Key",
  "订单服务调用 Key",
  "用户中心调用 Key",
  "计费任务调用 Key",
  "客服系统调用 Key",
  "移动端网关 Key",
  "开放平台回调 Key",
  "数据同步任务 Key",
  "内容审核任务 Key",
  "搜索服务调用 Key",
  "风控校验调用 Key",
  "营销触达服务 Key",
  "报表任务调用 Key",
  "消息推送调用 Key",
  "工作流引擎 Key",
  "Webhook 分发 Key",
  "后台管理调用 Key",
  "合作方接入 Key",
  "沙箱联调 Key",
  "企业 SSO 调用 Key",
  "文件处理任务 Key",
  "实时通知调用 Key",
  "支付回调校验 Key",
  "会员权益服务 Key",
  "日志采集任务 Key",
  "数据看板调用 Key",
  "区域网关调用 Key",
  "合规审计任务 Key"
];

function hashSampleApiKey(apiKey: string) {
  return createHash("sha256").update(`${samplePepper}:${apiKey}`).digest("hex");
}

function dayStart(daysAgo: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date;
}

async function clearDemoData() {
  await prisma.notificationRule.deleteMany();
  await prisma.notificationChannel.deleteMany();
  await prisma.exceptionNote.deleteMany();
  await prisma.exceptionCase.deleteMany();
  await prisma.systemJobRun.deleteMany();
  await prisma.billingRun.deleteMany();
  await prisma.rateLimitEvent.deleteMany();
  await prisma.rateLimitPolicy.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.usageDailyAggregate.deleteMany();
  await prisma.usageEvent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.plan.deleteMany();
}

async function seedPlatform() {
  const admin = await prisma.user.create({
    data: {
      email: "admin@usagemeter.local",
      name: "平台管理员",
      passwordHash: await hashPassword("Password123!"),
      role: "ADMIN"
    }
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: "systemName", value: "UsageMeter" },
      { key: "defaultPageSize", value: "10" },
      { key: "allowRegistration", value: "true" },
      { key: "billingCurrency", value: "USD" }
    ]
  });

  return admin;
}

async function seedPlans() {
  return Promise.all(
    Array.from({ length: count }, (_, index) => {
      const level = index + 1;
      return prisma.plan.create({
        data: {
          name: planNames[index],
          billingCurrency: index % 2 === 0 ? "CNY" : "USD",
          monthlyBaseFee: level * 1500,
          includedUnits: level * 10000,
          dailyUnitLimit: level * 1000,
          overageUnitPrice: 50 + level * 5
        }
      });
    })
  );
}

async function seedTenants(planIds: string[]) {
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      prisma.tenant.create({
        data: {
          name: tenantNames[index],
          status: index % 11 === 0 ? "SUSPENDED" : "ACTIVE",
          planId: planIds[index % planIds.length]
        }
      })
    )
  );
}

async function seedApiKeys(tenantIds: string[]) {
  return Promise.all(
    Array.from({ length: count }, (_, index) => {
      const sampleKey = `sk_live_usage_meter_${String(index + 1).padStart(2, "0")}_sample_key`;
      return prisma.apiKey.create({
        data: {
          tenantId: tenantIds[index % tenantIds.length],
          name: keyNames[index],
          keyHash: hashSampleApiKey(sampleKey),
          keyPrefix: sampleKey.slice(0, 16),
          status: index % 13 === 0 ? "REVOKED" : "ACTIVE",
          revokedAt: index % 13 === 0 ? new Date() : null
        }
      });
    })
  );
}

async function seedUsageEvents(tenantIds: string[], apiKeyIds: string[]) {
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      prisma.usageEvent.create({
        data: {
          tenantId: tenantIds[index % tenantIds.length],
          apiKeyId: apiKeyIds[index % apiKeyIds.length],
          requestId: `req_202606_${String(index + 1).padStart(4, "0")}`,
          endpoint: index % 3 === 0 ? "/api/v1/messages" : "/api/v1/search",
          method: index % 3 === 0 ? "POST" : "GET",
          statusCode: 200,
          costUnits: index % 3 === 0 ? 5 : 1,
          occurredAt: new Date(dayStart(index % 14).getTime() + index * 60_000)
        }
      })
    )
  );
}

async function seedDailyAggregates(tenantIds: string[]) {
  return Promise.all(
    Array.from({ length: count }, (_, index) =>
      prisma.usageDailyAggregate.create({
        data: {
          tenantId: tenantIds[index % tenantIds.length],
          date: dayStart(index % 14),
          totalRequests: 20 + index,
          totalCostUnits: 120 + index * 7
        }
      })
    )
  );
}

async function seedInvoices(tenantIds: string[], plans: Awaited<ReturnType<typeof seedPlans>>) {
  const invoices = await Promise.all(
    Array.from({ length: count }, (_, index) => {
      const plan = plans[index % plans.length];
      const usedUnits = plan.includedUnits + index * 250;
      const overageUnits = Math.max(0, usedUnits - plan.includedUnits);
      const overageAmount = Math.ceil(overageUnits / 1000) * plan.overageUnitPrice;

      return prisma.invoice.create({
        data: {
          tenantId: tenantIds[index % tenantIds.length],
          billingPeriod: `2026-${String((index % 12) + 1).padStart(2, "0")}`,
          billingCurrency: plan.billingCurrency,
          baseFee: plan.monthlyBaseFee,
          includedUnits: plan.includedUnits,
          usedUnits,
          overageUnits,
          totalAmount: plan.monthlyBaseFee + overageAmount,
          status: index % 5 === 0 ? "ISSUED" : "DRAFT"
        }
      });
    })
  );

  await Promise.all(
    invoices.flatMap((invoice, index) => [
      prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: "套餐基础费用",
          amount: invoice.baseFee,
          quantity: 1,
          unitPrice: invoice.baseFee
        }
      }),
      prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: "超额用量费用",
          amount: invoice.totalAmount - invoice.baseFee,
          quantity: invoice.overageUnits,
          unitPrice: invoice.overageUnits > 0 ? Math.ceil((invoice.totalAmount - invoice.baseFee) / invoice.overageUnits) : 0
        }
      })
    ])
  );

  return invoices;
}

async function seedOperationsData({
  adminId,
  tenants,
  plans,
  apiKeys,
  invoices
}: {
  adminId: string;
  tenants: Awaited<ReturnType<typeof seedTenants>>;
  plans: Awaited<ReturnType<typeof seedPlans>>;
  apiKeys: Awaited<ReturnType<typeof seedApiKeys>>;
  invoices: Awaited<ReturnType<typeof seedInvoices>>;
}) {
  const policies = await Promise.all([
    ...plans.slice(0, 8).map((plan, index) =>
      prisma.rateLimitPolicy.create({
        data: {
          scope: "PLAN",
          planId: plan.id,
          dailyUnitLimit: plan.dailyUnitLimit,
          warningThresholdPercent: 75 + (index % 3) * 5,
          status: index % 5 === 0 ? "DISABLED" : "ACTIVE"
        }
      })
    ),
    ...tenants.slice(0, 6).map((tenant, index) =>
      prisma.rateLimitPolicy.create({
        data: {
          scope: "TENANT",
          tenantId: tenant.id,
          dailyUnitLimit: (index + 2) * 1500,
          warningThresholdPercent: 80,
          status: "ACTIVE"
        }
      })
    )
  ]);

  await Promise.all(
    tenants.slice(0, 10).map((tenant, index) =>
      prisma.rateLimitEvent.create({
        data: {
          tenantId: tenant.id,
          apiKeyId: apiKeys[index % apiKeys.length].id,
          policyId: policies[index % policies.length].id,
          requestId: `rl_202606_${String(index + 1).padStart(4, "0")}`,
          endpoint: index % 2 === 0 ? "/api/v1/messages" : "/api/v1/search",
          costUnits: 5,
          limitUnits: (index + 2) * 1000,
          usedUnits: (index + 2) * 1000 + 120,
          reason: index % 2 === 0 ? "daily_limit_exceeded" : "warning_threshold_reached",
          occurredAt: new Date(dayStart(index % 5).getTime() + index * 90_000)
        }
      })
    )
  );

  await Promise.all(
    tenants.slice(0, 12).map((tenant, index) =>
      prisma.billingRun.create({
        data: {
          tenantId: tenant.id,
          invoiceId: invoices[index % invoices.length].id,
          billingPeriod: `2026-${String((index % 6) + 1).padStart(2, "0")}`,
          status: index % 4 === 0 ? "FAILED" : index % 4 === 1 ? "RUNNING" : "SUCCESS",
          startedAt: new Date(dayStart(index % 7).getTime() + index * 120_000),
          finishedAt: index % 4 === 1 ? null : new Date(dayStart(index % 7).getTime() + index * 120_000 + 45_000),
          failureReason: index % 4 === 0 ? "用量聚合数据缺失，账单生成已停止" : null
        }
      })
    )
  );

  const cases = await Promise.all(
    tenants.slice(0, 10).map((tenant, index) =>
      prisma.exceptionCase.create({
        data: {
          tenantId: tenant.id,
          type: ["AUTH_FAILURE", "RATE_LIMITED", "BILLING_FAILED", "JOB_FAILED", "USAGE_ANOMALY"][index % 5] as
            | "AUTH_FAILURE"
            | "RATE_LIMITED"
            | "BILLING_FAILED"
            | "JOB_FAILED"
            | "USAGE_ANOMALY",
          severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"][index % 4] as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          status: index % 3 === 0 ? "ACKNOWLEDGED" : index % 5 === 0 ? "RESOLVED" : "OPEN",
          source: index % 2 === 0 ? "api_gateway" : "billing_worker",
          resourceType: index % 2 === 0 ? "request" : "billing_run",
          resourceId: index % 2 === 0 ? `req_202606_${String(index + 1).padStart(4, "0")}` : invoices[index % invoices.length].id,
          summary: index % 2 === 0 ? "客户请求触发运营异常" : "账单或任务执行异常",
          details: "演示数据：用于运营后台异常处理流程展示。",
          assignee: index % 3 === 0 ? "平台管理员" : null,
          openedAt: new Date(dayStart(index % 6).getTime() + index * 180_000),
          resolvedAt: index % 5 === 0 ? new Date(dayStart(index % 6).getTime() + index * 180_000 + 3_600_000) : null
        }
      })
    )
  );

  await Promise.all(
    cases.slice(0, 4).map((exception, index) =>
      prisma.exceptionNote.create({
        data: {
          exceptionId: exception.id,
          userId: adminId,
          body: index % 2 === 0 ? "已联系客户确认调用模式。" : "等待账单任务重跑后复核。"
        }
      })
    )
  );

  const webhook = await prisma.notificationChannel.create({
    data: {
      name: "运营告警 Webhook",
      type: "WEBHOOK",
      target: "https://example.com/usagemeter/webhook",
      status: "ACTIVE",
      lastTestedAt: new Date()
    }
  });
  const email = await prisma.notificationChannel.create({
    data: {
      name: "财务邮件通知",
      type: "EMAIL",
      target: "finance@example.com",
      status: "DISABLED"
    }
  });

  await prisma.notificationRule.createMany({
    data: [
      { name: "额度预警通知", eventType: "USAGE_WARNING", severity: "MEDIUM", channelId: webhook.id, threshold: 80, status: "ACTIVE" },
      { name: "限流触发通知", eventType: "RATE_LIMITED", severity: "HIGH", channelId: webhook.id, threshold: null, status: "ACTIVE" },
      { name: "账单失败通知", eventType: "BILLING_FAILED", severity: "HIGH", channelId: email.id, threshold: null, status: "DISABLED" },
      { name: "高优先级异常通知", eventType: "HIGH_PRIORITY_EXCEPTION", severity: "CRITICAL", channelId: webhook.id, threshold: null, status: "ACTIVE" }
    ]
  });

  await prisma.systemJobRun.createMany({
    data: [
      {
        jobType: "USAGE_AGGREGATION",
        status: "SUCCESS",
        triggeredBy: "schedule",
        startedAt: new Date(dayStart(0).getTime() + 60_000),
        finishedAt: new Date(dayStart(0).getTime() + 92_000),
        durationMs: 32_000,
        input: { date: dayStart(0).toISOString().slice(0, 10) },
        output: { tenants: 28, aggregates: 28 }
      },
      {
        jobType: "BILLING_GENERATION",
        status: "FAILED",
        triggeredBy: "manual",
        startedAt: new Date(dayStart(0).getTime() + 300_000),
        finishedAt: new Date(dayStart(0).getTime() + 345_000),
        durationMs: 45_000,
        input: { billingPeriod: "2026-06" },
        output: { createdInvoices: 11 },
        failureReason: "部分租户缺少聚合数据"
      },
      {
        jobType: "NOTIFICATION_DELIVERY",
        status: "SUCCESS",
        triggeredBy: "event",
        startedAt: new Date(dayStart(1).getTime() + 500_000),
        finishedAt: new Date(dayStart(1).getTime() + 506_000),
        durationMs: 6_000,
        input: { eventType: "RATE_LIMITED" },
        output: { delivered: 3 }
      },
      {
        jobType: "DATA_CLEANUP",
        status: "PENDING",
        triggeredBy: "schedule",
        input: { retentionDays: 180 }
      }
    ]
  });
}

async function main() {
  await clearDemoData();
  const admin = await seedPlatform();

  const plans = await seedPlans();
  const tenants = await seedTenants(plans.map((plan) => plan.id));
  const apiKeys = await seedApiKeys(tenants.map((tenant) => tenant.id));
  await seedUsageEvents(
    tenants.map((tenant) => tenant.id),
    apiKeys.map((apiKey) => apiKey.id)
  );
  await seedDailyAggregates(tenants.map((tenant) => tenant.id));
  const invoices = await seedInvoices(
    tenants.map((tenant) => tenant.id),
    plans
  );
  await seedOperationsData({ adminId: admin.id, tenants, plans, apiKeys, invoices });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
