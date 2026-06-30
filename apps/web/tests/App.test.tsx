import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../src/App";

const todayIso = new Date().toISOString();

const apiResponses: Record<string, unknown> = {
  "http://localhost:7612/auth/me": {
    user: {
      id: "user_admin",
      email: "admin@usagemeter.local",
      name: "平台管理员",
      role: "ADMIN"
    }
  },
  "http://localhost:7612/plans": {
    data: Array.from({ length: 12 }, (_, index) => ({
        id: `plan_${index + 1}`,
          name: "Growth API 成长版",
        billingCurrency: index % 2 === 0 ? "CNY" : "USD",
        monthlyBaseFee: 9900,
        includedUnits: 100000,
        dailyUnitLimit: 10000,
        overageUnitPrice: 200,
        createdAt: todayIso
      }))
  },
  "http://localhost:7612/tenants": {
    data: [
      {
        id: "tenant_acme",
        name: "星河智能科技",
        status: "ACTIVE",
        planId: "plan_pro",
        plan: {
          id: "plan_pro",
          name: "Growth API 成长版",
          billingCurrency: "CNY",
          dailyUnitLimit: 1000
        }
      },
      {
        id: "tenant_beta",
        name: "云帆出海服务",
        status: "SUSPENDED",
        planId: "plan_2",
        plan: {
          id: "plan_2",
          name: "Growth API 成长版",
          billingCurrency: "USD",
          dailyUnitLimit: 1000
        }
      },
      {
        id: "tenant_gamma",
        name: "北辰数据平台",
        status: "ACTIVE",
        planId: "plan_3",
        plan: {
          id: "plan_3",
          name: "Growth API 成长版",
          billingCurrency: "CNY",
          dailyUnitLimit: 1000
        }
      }
    ]
  },
  "http://localhost:7612/tenants/tenant_acme": {
    id: "tenant_acme",
    name: "星河智能科技",
    status: "ACTIVE",
    planId: "plan_pro",
    plan: {
      id: "plan_pro",
      name: "Growth API 成长版",
      billingCurrency: "CNY"
    }
  },
  "http://localhost:7612/api-keys": {
    data: [
      {
        id: "key_1",
        tenantId: "tenant_acme",
        name: "生产环境服务端 Key",
        keyPrefix: "sk_live_abcd123",
        status: "ACTIVE",
        createdAt: todayIso,
        tenant: {
          id: "tenant_acme",
          name: "星河智能科技"
        }
      },
      {
        id: "key_2",
        tenantId: "tenant_beta",
        name: "离线同步 Key",
        keyPrefix: "sk_test_beta456",
        status: "REVOKED",
        createdAt: todayIso,
        tenant: {
          id: "tenant_beta",
          name: "云帆出海服务"
        }
      }
    ]
  },
  "http://localhost:7612/usage/events": {
    data: [
      {
        id: "usage_1",
        requestId: "req_202606_0001",
        endpoint: "/api/v1/messages",
        method: "POST",
        statusCode: 200,
        costUnits: 5,
        occurredAt: todayIso,
        tenant: { id: "tenant_acme", name: "星河智能科技" },
        apiKey: { keyPrefix: "sk_live_usage_met" }
      },
      {
        id: "usage_401",
        requestId: "req_auth_failed",
        endpoint: "/api/v1/messages",
        method: "POST",
        statusCode: 401,
        costUnits: 0,
        occurredAt: todayIso,
        tenant: { id: "tenant_beta", name: "云帆出海服务" },
        apiKey: { keyPrefix: "sk_test_beta456", status: "REVOKED" }
      },
      {
        id: "usage_429",
        requestId: "req_rate_limited",
        endpoint: "/api/v1/messages",
        method: "POST",
        statusCode: 429,
        costUnits: 0,
        occurredAt: todayIso,
        tenant: { id: "tenant_gamma", name: "北辰数据平台" },
        apiKey: { keyPrefix: "sk_live_gamma" }
      },
      {
        id: "usage_500",
        requestId: "req_server_error",
        endpoint: "/api/v1/messages",
        method: "POST",
        statusCode: 500,
        costUnits: 0,
        occurredAt: todayIso,
        tenant: { id: "tenant_acme", name: "星河智能科技" },
        apiKey: { keyPrefix: "sk_live_usage_met" }
      }
    ]
  },
  "http://localhost:7612/usage/daily": {
    data: [
      {
        id: "daily_1",
        date: todayIso,
        totalRequests: 28,
        totalCostUnits: 140,
        tenant: { id: "tenant_acme", name: "星河智能科技" }
      },
      {
        id: "daily_2",
        date: todayIso,
        totalRequests: 180,
        totalCostUnits: 850,
        tenant: { id: "tenant_beta", name: "云帆出海服务" }
      },
      {
        id: "daily_3",
        date: todayIso,
        totalRequests: 240,
        totalCostUnits: 1200,
        tenant: { id: "tenant_gamma", name: "北辰数据平台" }
      }
    ]
  },
  "http://localhost:7612/billing/invoices": {
    data: [
      {
        id: "invoice_1",
        billingPeriod: "2026-06",
        billingCurrency: "CNY",
        usedUnits: 101000,
        overageUnits: 1000,
        totalAmount: 10100,
        status: "DRAFT",
        createdAt: todayIso,
        tenant: { id: "tenant_acme", name: "星河智能科技" },
        lineItems: [{ description: "套餐基础费用" }, { description: "超额用量费用" }]
      }
    ]
  },
  "http://localhost:7612/billing/runs": {
    data: [
      {
        id: "run_1",
        tenantId: "tenant_acme",
        invoiceId: "invoice_1",
        billingPeriod: "2026-06",
        status: "FAILED",
        startedAt: todayIso,
        finishedAt: todayIso,
        failureReason: "用量聚合数据缺失",
        createdAt: todayIso,
        updatedAt: todayIso,
        tenant: { id: "tenant_acme", name: "星河智能科技", status: "ACTIVE" },
        invoice: {
          id: "invoice_1",
          billingPeriod: "2026-06",
          status: "DRAFT",
          totalAmount: 10100,
          billingCurrency: "CNY"
        }
      }
    ]
  },
  "http://localhost:7612/rate-limits/policies": {
    data: [
      {
        id: "policy_1",
        scope: "TENANT",
        tenantId: "tenant_acme",
        planId: null,
        dailyUnitLimit: 3000,
        warningThresholdPercent: 80,
        status: "ACTIVE",
        updatedAt: todayIso,
        tenant: { id: "tenant_acme", name: "星河智能科技", status: "ACTIVE" },
        plan: null
      },
      {
        id: "policy_2",
        scope: "PLAN",
        tenantId: null,
        planId: "plan_pro",
        dailyUnitLimit: 1000,
        warningThresholdPercent: 75,
        status: "DISABLED",
        updatedAt: todayIso,
        tenant: null,
        plan: { id: "plan_pro", name: "Growth API 成长版", dailyUnitLimit: 1000 }
      }
    ]
  },
  "http://localhost:7612/rate-limits/events": {
    data: [
      {
        id: "rate_event_1",
        requestId: "rl_202606_0001",
        endpoint: "/api/v1/messages",
        costUnits: 5,
        limitUnits: 1000,
        usedUnits: 1120,
        reason: "daily_limit_exceeded",
        occurredAt: todayIso,
        tenant: { id: "tenant_acme", name: "星河智能科技", status: "ACTIVE" }
      }
    ]
  },
  "http://localhost:7612/exceptions": {
    data: [
      {
        id: "exception_1",
        tenantId: "tenant_acme",
        type: "BILLING_FAILED",
        severity: "HIGH",
        status: "OPEN",
        source: "billing_worker",
        resourceType: "billing_run",
        resourceId: "run_1",
        summary: "账单生成失败",
        details: "用量聚合数据缺失",
        assignee: null,
        openedAt: todayIso,
        resolvedAt: null,
        tenant: { id: "tenant_acme", name: "星河智能科技", status: "ACTIVE" },
        notes: []
      },
      {
        id: "exception_2",
        tenantId: "tenant_gamma",
        type: "RATE_LIMITED",
        severity: "MEDIUM",
        status: "ACKNOWLEDGED",
        source: "api_gateway",
        resourceType: "request",
        resourceId: "req_rate_limited",
        summary: "租户触发限流",
        details: null,
        assignee: "平台管理员",
        openedAt: todayIso,
        resolvedAt: null,
        tenant: { id: "tenant_gamma", name: "北辰数据平台", status: "ACTIVE" },
        notes: []
      }
    ]
  },
  "http://localhost:7612/notifications/channels": {
    data: [
      {
        id: "channel_1",
        name: "运营告警 Webhook",
        type: "WEBHOOK",
        target: "https://example.com/hook",
        status: "ACTIVE",
        lastTestedAt: todayIso,
        rules: []
      }
    ]
  },
  "http://localhost:7612/notifications/rules": {
    data: [
      {
        id: "rule_1",
        name: "账单失败通知",
        eventType: "BILLING_FAILED",
        severity: "HIGH",
        channelId: "channel_1",
        threshold: null,
        status: "ACTIVE",
        channel: {
          id: "channel_1",
          name: "运营告警 Webhook",
          type: "WEBHOOK",
          target: "https://example.com/hook",
          status: "ACTIVE",
          lastTestedAt: todayIso
        }
      }
    ]
  },
  "http://localhost:7612/system/jobs": {
    data: [
      {
        id: "job_1",
        jobType: "BILLING_GENERATION",
        status: "FAILED",
        triggeredBy: "manual",
        startedAt: todayIso,
        finishedAt: todayIso,
        durationMs: 45000,
        input: { billingPeriod: "2026-06" },
        output: { createdInvoices: 0 },
        failureReason: "部分租户缺少聚合数据",
        createdAt: todayIso
      }
    ]
  },
  "http://localhost:7612/audit-logs": {
    data: [
      {
        id: "audit_1",
        action: "invoice.export",
        resource: "invoice",
        resourceId: "invoice_1",
        createdAt: "2026-06-27T10:00:00.000Z",
        user: {
          id: "user_admin",
          email: "admin@usagemeter.local",
          name: "平台管理员",
          role: "ADMIN"
        }
      }
    ]
  },
  "http://localhost:7612/settings": {
    systemName: "UsageMeter",
    defaultPageSize: 10,
    allowRegistration: true,
    billingCurrency: "USD"
  }
};

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = apiResponses[url];

      if (!body) {
        return new Response("Not found", { status: 404 });
      }

      return Response.json(body);
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the dashboard shell", async () => {
    render(<App />);

    expect(await screen.findByText("UsageMeter")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "UsageMeter 仪表盘" })).toBeInTheDocument();
    expect(screen.queryByText("工作台")).not.toBeInTheDocument();
    expect(screen.queryByText("运营管理后台")).not.toBeInTheDocument();
    expect(screen.queryByText("当前数据概况")).not.toBeInTheDocument();
    expect(await screen.findByText("API Key 新增")).toBeInTheDocument();
    expect(screen.getByText("收益趋势")).toBeInTheDocument();
    expect(screen.getByLabelText("API Key 新增趋势图")).toBeInTheDocument();
    expect(screen.getByLabelText("用量趋势图")).toBeInTheDocument();
    expect(screen.getByLabelText("收益趋势图")).toBeInTheDocument();
    expect(screen.getByLabelText("收益币种占比图")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/¥101\.00/).length).toBeGreaterThanOrEqual(1));
  });

  it("loads tenants, plans, and API keys from the backend", async () => {
    window.history.pushState({}, "", "/tenants");
    render(<App />);

    expect(await screen.findByText("星河智能科技")).toBeInTheDocument();
    expect(screen.getAllByText("Growth API 成长版").length).toBeGreaterThanOrEqual(1);
  });

  it("shows tenant related data on tenant detail", async () => {
    window.history.pushState({}, "", "/tenants/tenant_acme");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "星河智能科技" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API Key" })).toBeInTheDocument();
    expect(screen.getByText("生产环境服务端 Key")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "用量明细" })).toBeInTheDocument();
    expect(screen.getByText("req_202606_0001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "日用量汇总" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "账单" })).toBeInTheDocument();
  });

  it("loads plans from the backend", async () => {
    window.history.pushState({}, "", "/plans");
    render(<App />);

    expect(await screen.findByText("第 1-10 条，共 12 条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建套餐" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按套餐名称筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按套餐币种筛选")).toBeInTheDocument();
    expect(screen.getAllByText("¥99.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$99.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("100000")).toHaveLength(10);
  });

  it("opens plan creation in a dialog and filters plans", async () => {
    window.history.pushState({}, "", "/plans");
    render(<App />);

    expect(await screen.findByText("第 1-10 条，共 12 条")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "创建套餐" }));
    expect(screen.getByRole("dialog", { name: "创建套餐" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("套餐名称")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("按套餐币种筛选"), { target: { value: "USD" } });
    expect(await screen.findByText("第 1-6 条，共 6 条")).toBeInTheDocument();
    expect(screen.queryByText("第 1-10 条，共 12 条")).not.toBeInTheDocument();
  });

  it("paginates lists with 10 rows per page by default", async () => {
    window.history.pushState({}, "", "/plans");
    render(<App />);

    expect(await screen.findByText("第 1-10 条，共 12 条")).toBeInTheDocument();
    expect(screen.getAllByText("Growth API 成长版")).toHaveLength(10);
    expect(screen.queryByText("第 2 页 / 共 2 页")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    expect(await screen.findByText("第 2 页 / 共 2 页")).toBeInTheDocument();
    expect(screen.getAllByText("Growth API 成长版")).toHaveLength(2);
  });

  it("loads API keys from the backend", async () => {
    window.history.pushState({}, "", "/api-keys");
    render(<App />);

    expect(await screen.findByText("生产环境服务端 Key")).toBeInTheDocument();
    expect(screen.getByText("sk_live_abcd123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建 Key" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按 Key 名称筛选")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按租户名称筛选")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按 Key 前缀筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按 API Key 状态筛选")).toBeInTheDocument();
  });

  it("opens API key creation in a dialog and filters API keys", async () => {
    window.history.pushState({}, "", "/api-keys");
    render(<App />);

    expect(await screen.findByText("生产环境服务端 Key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "创建 Key" }));
    expect(screen.getByRole("dialog", { name: "创建 API Key" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Key 名称")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("按租户名称筛选"), { target: { value: "云帆" } });
    expect(screen.getByText("离线同步 Key")).toBeInTheDocument();
    expect(screen.queryByText("生产环境服务端 Key")).not.toBeInTheDocument();
  });

  it("opens tenant creation in a dialog and filters tenants", async () => {
    window.history.pushState({}, "", "/tenants");
    render(<App />);

    expect(await screen.findByText("星河智能科技")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建租户" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按租户名称筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按租户状态筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按租户套餐筛选")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "创建租户" }));
    expect(screen.getByRole("dialog", { name: "创建租户" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("按租户状态筛选"), { target: { value: "SUSPENDED" } });
    expect(screen.getByText("云帆出海服务")).toBeInTheDocument();
    expect(screen.queryByText("星河智能科技")).not.toBeInTheDocument();
  });

  it("loads usage reports from the backend", async () => {
    window.history.pushState({}, "", "/usage");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "日用量汇总" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "日用量汇总" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "请求明细" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByPlaceholderText("按租户名称筛选")).toBeInTheDocument();
    expect(screen.getByText("请求总数")).toBeInTheDocument();
    expect(screen.getAllByText("140").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("tab", { name: "请求明细" }));

    expect(await screen.findByText("req_202606_0001")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "请求明细" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByPlaceholderText("按请求 ID 筛选")).toBeInTheDocument();
    expect(screen.getAllByText("/api/v1/messages").length).toBeGreaterThanOrEqual(1);
  });

  it("loads invoices from the backend", async () => {
    window.history.pushState({}, "", "/invoices");
    render(<App />);

    expect(await screen.findByText("2026-06")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 Excel" })).toBeInTheDocument();
    expect(screen.getByLabelText("按账单状态筛选")).toBeInTheDocument();
    expect(screen.getByText("开始账期")).toBeInTheDocument();
    expect(screen.getAllByText("¥101.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows billing generation center with lightweight run records", async () => {
    window.history.pushState({}, "", "/billing-runs");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "账单生成中心" })).toBeInTheDocument();
    expect(screen.getAllByText("账单生成").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText("按账期筛选")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按租户名称筛选")).toBeInTheDocument();
    expect(screen.getAllByText("待生成").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("失败").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "记录生成" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("轻实现：只记录运行状态")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看账单" })).toHaveAttribute("href", "/invoices/invoice_1");
  });

  it("shows limit monitoring with usage risk levels", async () => {
    window.history.pushState({}, "", "/limits");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "额度与限流监控" })).toBeInTheDocument();
    expect(screen.getByText("额度监控")).toBeInTheDocument();
    expect(screen.getByText("已触发限流")).toBeInTheDocument();
    expect(screen.getAllByText("正常").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("预警").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("超限").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("120%")).toBeInTheDocument();
    expect(screen.getByText("req_rate_limited")).toBeInTheDocument();
  });

  it("shows exception center from exception cases", async () => {
    window.history.pushState({}, "", "/exceptions");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "异常处理中心" })).toBeInTheDocument();
    expect(screen.getByText("异常中心")).toBeInTheDocument();
    expect(screen.getAllByText("账单失败").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("限流触发").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("账单生成失败")).toBeInTheDocument();
    expect(screen.getByText("租户触发限流")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "处理" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
  });

  it("shows operations configuration pages", async () => {
    window.history.pushState({}, "", "/rate-limits");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "限流策略" })).toBeInTheDocument();
    expect(screen.getAllByText("运营配置").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("租户覆盖").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("rl_202606_0001")).toBeInTheDocument();

    cleanup();
    window.history.pushState({}, "", "/notifications");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "通知配置" })).toBeInTheDocument();
    expect(screen.getAllByText("运营告警 Webhook").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("账单失败通知")).toBeInTheDocument();

    cleanup();
    window.history.pushState({}, "", "/system/jobs");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "系统任务" })).toBeInTheDocument();
    expect(screen.getAllByText("账单生成").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("部分租户缺少聚合数据")).toBeInTheDocument();
  });

  it("loads audit logs with filters and sorting", async () => {
    window.history.pushState({}, "", "/logs/audit");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "操作审计" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按用户、动作、资源 ID 筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "时间 ↓" })).toBeInTheDocument();
    expect(screen.getByText("invoice.export")).toBeInTheDocument();
  });

  it("loads request logs with filters and sorting", async () => {
    window.history.pushState({}, "", "/logs/usage");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "请求日志" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按接口筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "状态码 ↕" })).toBeInTheDocument();
  });

  it("loads billing logs with filters and sorting", async () => {
    window.history.pushState({}, "", "/logs/billing");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "账单日志" })).toBeInTheDocument();
    expect(screen.getByLabelText("按账期筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "总金额 ↕" })).toBeInTheDocument();
  });

  it("loads system settings instead of rendering a blank page", async () => {
    window.history.pushState({}, "", "/settings/system");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "系统参数" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("UsageMeter")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存设置" })).toBeInTheDocument();
  });

  it("loads revenue from the backend", async () => {
    window.history.pushState({}, "", "/revenue");
    render(<App />);

    expect(await screen.findByText("人民币收益")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("按租户名称筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按币种筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("按账单状态筛选")).toBeInTheDocument();
    expect(screen.getByText("账期区间")).toBeInTheDocument();
    expect(screen.getByLabelText("开始账期")).toBeInTheDocument();
    expect(screen.getByLabelText("结束账期")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("¥101.00").length).toBeGreaterThanOrEqual(1));
  });

  it("shows integration examples for real customer API calls", async () => {
    window.history.pushState({}, "", "/integration");
    render(<App />);

    expect(await screen.findByRole("heading", { name: "API 接入" })).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
    expect(screen.getByText("Authorization: Bearer <API_KEY>")).toBeInTheDocument();
    expect(screen.getAllByText(/http:\/\/localhost:7612\/api\/v1\/messages/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "JavaScript" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Python" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Java" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/const response = await fetch/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));

    expect(screen.getByRole("button", { name: "JavaScript" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/const response = await fetch/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "复制 JavaScript 代码" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("fetch")));
  });
});
