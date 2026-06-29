import { AlertTriangle, Ban, FileWarning, Gauge, PlayCircle, ReceiptText, ShieldAlert, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BillingRun,
  createBillingRun,
  ExceptionCase,
  Invoice,
  listBillingRuns,
  listDailyUsage,
  listExceptions,
  listInvoices,
  listTenants,
  listUsageEvents,
  retryBillingRun,
  Tenant,
  updateException,
  UsageDailyAggregate,
  UsageEvent
} from "../api/client";
import { formatMoney } from "../utils/money";

type LoadState = {
  tenants: Tenant[];
  dailyUsage: UsageDailyAggregate[];
  usageEvents: UsageEvent[];
  invoices: Invoice[];
  billingRuns: BillingRun[];
  exceptionCases: ExceptionCase[];
};

type RiskLevel = "normal" | "warning" | "over";

const initialState: LoadState = {
  tenants: [],
  dailyUsage: [],
  usageEvents: [],
  invoices: [],
  billingRuns: [],
  exceptionCases: []
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateTime(value?: string) {
  return value ? value.slice(0, 16).replace("T", " ") : "-";
}

function samePeriod(value: string | undefined, period: string) {
  return value ? value.slice(0, 7) === period : false;
}

function sameDate(value: string | undefined, date: string) {
  return value ? value.slice(0, 10) === date : false;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function loadLaunchLoopData() {
  const [tenants, dailyUsage, usageEvents, invoices, billingRuns, exceptionCases] = await Promise.all([
    listTenants(),
    listDailyUsage(),
    listUsageEvents(),
    listInvoices(),
    listBillingRuns(),
    listExceptions()
  ]);
  return { tenants, dailyUsage, usageEvents, invoices, billingRuns, exceptionCases };
}

function sumTenantUsage(usage: UsageDailyAggregate[], tenantId: string, period: string) {
  return usage
    .filter((item) => item.tenant?.id === tenantId && samePeriod(item.date, period))
    .reduce(
      (result, item) => ({
        totalRequests: result.totalRequests + item.totalRequests,
        totalCostUnits: result.totalCostUnits + item.totalCostUnits
      }),
      { totalRequests: 0, totalCostUnits: 0 }
    );
}

function riskLevel(used: number, limit: number): RiskLevel {
  if (limit <= 0) {
    return "normal";
  }

  const usageRatio = used / limit;

  if (usageRatio >= 1) {
    return "over";
  }

  if (usageRatio >= 0.8) {
    return "warning";
  }

  return "normal";
}

function riskLabel(level: RiskLevel) {
  return {
    normal: "正常",
    warning: "预警",
    over: "超限"
  }[level];
}

function riskClass(level: RiskLevel) {
  return {
    normal: "status-pill success",
    warning: "status-pill warning",
    over: "status-pill danger"
  }[level];
}

function billingRunStatusClass(status: string) {
  return {
    PENDING: "status-pill muted",
    RUNNING: "status-pill warning",
    SUCCESS: "status-pill success",
    FAILED: "status-pill danger"
  }[status] ?? "status-pill muted";
}

function billingRunStatusLabel(status: string) {
  return {
    PENDING: "待生成",
    RUNNING: "运行中",
    SUCCESS: "成功",
    FAILED: "失败"
  }[status] ?? status;
}

function exceptionStatusClass(status: string) {
  return {
    OPEN: "status-pill danger",
    ACKNOWLEDGED: "status-pill warning",
    RESOLVED: "status-pill success"
  }[status] ?? "status-pill muted";
}

function exceptionStatusLabel(status: string) {
  return {
    OPEN: "待处理",
    ACKNOWLEDGED: "处理中",
    RESOLVED: "已关闭"
  }[status] ?? status;
}

function exceptionTypeLabel(type: string) {
  return {
    AUTH_FAILURE: "鉴权失败",
    RATE_LIMITED: "限流触发",
    BILLING_FAILED: "账单失败",
    JOB_FAILED: "任务失败",
    USAGE_ANOMALY: "用量异常",
    SYSTEM_ERROR: "系统异常"
  }[type] ?? type;
}

function severityClass(severity: string) {
  return severity === "CRITICAL" || severity === "HIGH" ? "status-pill danger" : severity === "MEDIUM" ? "status-pill warning" : "status-pill muted";
}

export function BillingRunsPage() {
  const [data, setData] = useState<LoadState>(initialState);
  const [period, setPeriod] = useState(currentPeriod());
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshData() {
    return loadLaunchLoopData()
      .then((nextData) => {
        setError(null);
        setData(nextData);
      })
      .catch(() => setError("账单生成数据加载失败"));
  }

  useEffect(() => {
    refreshData();
  }, []);

  const rows = useMemo(() => {
    const keyword = tenantFilter.trim().toLowerCase();

    return data.tenants
      .map((tenant) => {
        const usage = sumTenantUsage(data.dailyUsage, tenant.id, period);
        const invoice = data.invoices.find((item) => item.tenant?.id === tenant.id && item.billingPeriod === period);
        const includedUnits = invoice?.includedUnits ?? tenant.plan?.includedUnits ?? 0;
        const overageUnits = invoice?.overageUnits ?? Math.max(usage.totalCostUnits - includedUnits, 0);
        const currency = invoice?.billingCurrency ?? tenant.plan?.billingCurrency ?? "CNY";
        const estimatedAmount = invoice?.totalAmount ?? (tenant.plan?.monthlyBaseFee ?? 0) + overageUnits * (tenant.plan?.overageUnitPrice ?? 0);
        const run = data.billingRuns.find((item) => item.tenant?.id === tenant.id && item.billingPeriod === period);
        const status = run?.status ?? "PENDING";

        return { tenant, usage, invoice, run, overageUnits, currency, estimatedAmount, status };
      })
      .filter((row) => (keyword ? row.tenant.name.toLowerCase().includes(keyword) : true))
      .filter((row) => (statusFilter ? row.status === statusFilter : true));
  }, [data.billingRuns, data.dailyUsage, data.invoices, data.tenants, period, statusFilter, tenantFilter]);

  const metrics = useMemo(
    () => ({
      pending: rows.filter((row) => row.status === "PENDING").length,
      running: rows.filter((row) => row.status === "RUNNING").length,
      success: rows.filter((row) => row.status === "SUCCESS").length,
      failed: rows.filter((row) => row.status === "FAILED").length
    }),
    [rows]
  );

  async function handleCreateRun(tenantId: string) {
    await createBillingRun({ tenantId, billingPeriod: period, status: "PENDING" });
    setMessage("已创建账单生成运行记录");
    await refreshData();
  }

  async function handleRetryRun(runId: string) {
    await retryBillingRun(runId);
    setMessage("已重置账单运行记录");
    await refreshData();
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">上线闭环</p>
        <h1>账单生成中心</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      {message ? <div className="empty-state">{message}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-amber"><span><TimerReset size={18} aria-hidden="true" />待生成</span><strong>{metrics.pending}</strong></article>
        <article className="metric-card accent-blue"><span><ReceiptText size={18} aria-hidden="true" />运行中</span><strong>{metrics.running}</strong></article>
        <article className="metric-card accent-teal"><span><ReceiptText size={18} aria-hidden="true" />成功</span><strong>{metrics.success}</strong></article>
        <article className="metric-card accent-rose"><span><AlertTriangle size={18} aria-hidden="true" />失败</span><strong>{metrics.failed}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>生成批次</h2>
            <p>生成按钮先创建运行记录，真实账单幂等生成后续接入。</p>
          </div>
          <button type="button" onClick={() => rows[0] ? handleCreateRun(rows[0].tenant.id) : undefined}>
            <PlayCircle size={16} aria-hidden="true" />
            记录生成
          </button>
        </div>
        <div className="filter-panel compact-filter">
          <label className="compact-field">
            <span>账期</span>
            <input value={period} onChange={(event) => setPeriod(event.target.value)} type="month" aria-label="按账期筛选" />
          </label>
          <input value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按生成状态筛选">
            <option value="">全部状态</option>
            <option value="PENDING">待生成</option>
            <option value="RUNNING">运行中</option>
            <option value="SUCCESS">成功</option>
            <option value="FAILED">失败</option>
          </select>
          <span className="inline-hint">轻实现：只记录运行状态</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>租户</th>
              <th>账期</th>
              <th>用量</th>
              <th>超额用量</th>
              <th>预计金额</th>
              <th>状态</th>
              <th>最后生成时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tenant.id}>
                <td>{row.tenant.name}</td>
                <td>{period}</td>
                <td>{row.invoice?.usedUnits ?? row.usage.totalCostUnits}</td>
                <td>{row.overageUnits}</td>
                <td>{formatMoney(row.estimatedAmount, row.currency)}</td>
                <td>
                  <span className={billingRunStatusClass(row.status)}>{billingRunStatusLabel(row.status)}</span>
                </td>
                <td>{formatDateTime(row.run?.updatedAt ?? row.run?.createdAt)}</td>
                <td>
                  {row.invoice ? (
                    <Link className="secondary-button" to={`/invoices/${row.invoice.id}`}>
                      查看账单
                    </Link>
                  ) : row.run?.status === "FAILED" ? (
                    <button type="button" className="secondary-button" onClick={() => handleRetryRun(row.run?.id ?? "")}>
                      重试
                    </button>
                  ) : (
                    <button type="button" className="secondary-button" onClick={() => handleCreateRun(row.tenant.id)}>
                      记录生成
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function LimitsPage() {
  const [data, setData] = useState<LoadState>(initialState);
  const [date, setDate] = useState(todayDate());
  const [tenantFilter, setTenantFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLaunchLoopData()
      .then((nextData) => {
        setError(null);
        setData(nextData);
      })
      .catch(() => setError("额度监控数据加载失败"));
  }, []);

  const rows = useMemo(() => {
    const keyword = tenantFilter.trim().toLowerCase();

    return data.tenants
      .map((tenant) => {
        const usage = data.dailyUsage.find((item) => item.tenant?.id === tenant.id && sameDate(item.date, date));
        const used = usage?.totalCostUnits ?? 0;
        const limit = tenant.plan?.dailyUnitLimit ?? 0;
        const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
        const level = riskLevel(used, limit);
        const latestEvent = data.usageEvents.find((event) => event.tenant?.id === tenant.id);

        return { tenant, usage, used, limit, percent, level, latestEvent };
      })
      .filter((row) => (keyword ? row.tenant.name.toLowerCase().includes(keyword) : true))
      .filter((row) => (riskFilter ? row.level === riskFilter : true));
  }, [data.dailyUsage, data.tenants, data.usageEvents, date, riskFilter, tenantFilter]);

  const rateLimitedEvents = data.usageEvents.filter((event) => event.statusCode === 429 && sameDate(event.occurredAt, date));
  const totalRequests = rows.reduce((total, row) => total + (row.usage?.totalRequests ?? 0), 0);
  const totalCostUnits = rows.reduce((total, row) => total + row.used, 0);
  const riskyTenants = rows.filter((row) => row.level !== "normal").length;

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">上线闭环</p>
        <h1>额度与限流监控</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-teal"><span><Gauge size={18} aria-hidden="true" />今日请求</span><strong>{totalRequests}</strong></article>
        <article className="metric-card accent-indigo"><span><Gauge size={18} aria-hidden="true" />今日消耗</span><strong>{totalCostUnits}</strong></article>
        <article className="metric-card accent-amber"><span><AlertTriangle size={18} aria-hidden="true" />风险租户</span><strong>{riskyTenants}</strong></article>
        <article className="metric-card accent-rose"><span><Ban size={18} aria-hidden="true" />已触发限流</span><strong>{rateLimitedEvents.length}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>租户额度</h2>
            <p>按每日额度计算使用率，帮助发现接近限额和已经超限的租户。</p>
          </div>
        </div>
        <div className="filter-panel compact-filter">
          <input value={date} onChange={(event) => setDate(event.target.value)} type="date" aria-label="按日期筛选" />
          <input value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} aria-label="按风险等级筛选">
            <option value="">全部风险</option>
            <option value="normal">正常</option>
            <option value="warning">预警</option>
            <option value="over">超限</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>租户</th>
              <th>套餐</th>
              <th>每日额度</th>
              <th>今日已用</th>
              <th>剩余额度</th>
              <th>使用率</th>
              <th>风险等级</th>
              <th>最近请求</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tenant.id}>
                <td>{row.tenant.name}</td>
                <td>{row.tenant.plan?.name ?? "-"}</td>
                <td>{row.limit}</td>
                <td>{row.used}</td>
                <td>{Math.max(row.limit - row.used, 0)}</td>
                <td>
                  <div className="usage-progress" aria-label={`${row.tenant.name} 使用率 ${row.percent}%`}>
                    <span style={{ width: `${Math.min(row.percent, 100)}%` }} />
                  </div>
                  <strong className="usage-percent">{row.percent}%</strong>
                </td>
                <td><span className={riskClass(row.level)}>{riskLabel(row.level)}</span></td>
                <td>{formatDateTime(row.latestEvent?.occurredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>限流事件</h2>
            <p>当前从请求状态码 429 推导，后续可接入真实限流记录。</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>租户</th>
              <th>请求 ID</th>
              <th>接口</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {rateLimitedEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.tenant?.name ?? "-"}</td>
                <td><code>{event.requestId}</code></td>
                <td>{event.endpoint}</td>
                <td>{formatDateTime(event.occurredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ExceptionsPage() {
  const [data, setData] = useState<LoadState>(initialState);
  const [kindFilter, setKindFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshData() {
    return loadLaunchLoopData()
      .then((nextData) => {
        setError(null);
        setData(nextData);
      })
      .catch(() => setError("异常数据加载失败"));
  }

  useEffect(() => {
    refreshData();
  }, []);

  const exceptions = useMemo(() => {
    const tenant = tenantFilter.trim().toLowerCase();

    return data.exceptionCases
      .filter((item) => (kindFilter ? item.type === kindFilter : true))
      .filter((item) => (tenant ? item.tenant?.name.toLowerCase().includes(tenant) : true));
  }, [data.exceptionCases, kindFilter, tenantFilter]);

  const counts = useMemo(() => {
    return {
      open: data.exceptionCases.filter((item) => item.status === "OPEN").length,
      high: data.exceptionCases.filter((item) => item.severity === "HIGH" || item.severity === "CRITICAL").length,
      acknowledged: data.exceptionCases.filter((item) => item.status === "ACKNOWLEDGED").length,
      resolved: data.exceptionCases.filter((item) => item.status === "RESOLVED").length,
      billing: data.exceptionCases.filter((item) => item.type === "BILLING_FAILED").length
    };
  }, [data.exceptionCases]);

  async function handleExceptionStatus(id: string, status: ExceptionCase["status"]) {
    await updateException(id, { status });
    setMessage(status === "RESOLVED" ? "异常已关闭" : "异常状态已更新");
    await refreshData();
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">上线闭环</p>
        <h1>异常处理中心</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      {message ? <div className="empty-state">{message}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-rose"><span><ShieldAlert size={18} aria-hidden="true" />待处理</span><strong>{counts.open}</strong></article>
        <article className="metric-card accent-amber"><span><Gauge size={18} aria-hidden="true" />高优先级</span><strong>{counts.high}</strong></article>
        <article className="metric-card accent-indigo"><span><FileWarning size={18} aria-hidden="true" />处理中</span><strong>{counts.acknowledged}</strong></article>
        <article className="metric-card accent-teal"><span><Ban size={18} aria-hidden="true" />已关闭</span><strong>{counts.resolved}</strong></article>
        <article className="metric-card accent-blue"><span><ReceiptText size={18} aria-hidden="true" />账单失败</span><strong>{counts.billing}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>异常列表</h2>
            <p>异常已沉淀为可处理事项，真实异常产生链路后续接入。</p>
          </div>
        </div>
        <div className="filter-panel compact-filter">
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} aria-label="按异常类型筛选">
            <option value="">全部类型</option>
            <option value="AUTH_FAILURE">鉴权失败</option>
            <option value="RATE_LIMITED">限流触发</option>
            <option value="BILLING_FAILED">账单失败</option>
            <option value="JOB_FAILED">任务失败</option>
            <option value="USAGE_ANOMALY">用量异常</option>
            <option value="SYSTEM_ERROR">系统异常</option>
          </select>
          <input value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
        </div>
        <table>
          <thead>
            <tr>
              <th>级别</th>
              <th>类型</th>
              <th>租户</th>
              <th>关联对象</th>
              <th>摘要</th>
              <th>发生时间</th>
              <th>处理状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((item) => (
              <tr key={item.id}>
                <td><span className={severityClass(item.severity)}>{item.severity}</span></td>
                <td>{exceptionTypeLabel(item.type)}</td>
                <td>{item.tenant?.name ?? "-"}</td>
                <td><code>{item.resourceId ?? item.resourceType ?? "-"}</code></td>
                <td>{item.summary}</td>
                <td>{formatDateTime(item.openedAt)}</td>
                <td><span className={exceptionStatusClass(item.status)}>{exceptionStatusLabel(item.status)}</span></td>
                <td>
                  {item.status === "OPEN" ? (
                    <button type="button" className="secondary-button" onClick={() => handleExceptionStatus(item.id, "ACKNOWLEDGED")}>处理</button>
                  ) : item.status === "ACKNOWLEDGED" ? (
                    <button type="button" className="secondary-button" onClick={() => handleExceptionStatus(item.id, "RESOLVED")}>关闭</button>
                  ) : (
                    <button type="button" className="secondary-button" onClick={() => handleExceptionStatus(item.id, "OPEN")}>重开</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
