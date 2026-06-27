import { AlertTriangle, Ban, FileWarning, Gauge, PlayCircle, ReceiptText, ShieldAlert, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Invoice, listDailyUsage, listInvoices, listTenants, listUsageEvents, Tenant, UsageDailyAggregate, UsageEvent } from "../api/client";
import { formatMoney } from "../utils/money";
import { formatInvoiceStatus, invoiceStatusClass } from "../utils/status";

type LoadState = {
  tenants: Tenant[];
  dailyUsage: UsageDailyAggregate[];
  usageEvents: UsageEvent[];
  invoices: Invoice[];
};

type RiskLevel = "normal" | "warning" | "over";
type ExceptionKind = "auth" | "rateLimit" | "server" | "revokedKey";

const initialState: LoadState = {
  tenants: [],
  dailyUsage: [],
  usageEvents: [],
  invoices: []
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
  const [tenants, dailyUsage, usageEvents, invoices] = await Promise.all([listTenants(), listDailyUsage(), listUsageEvents(), listInvoices()]);
  return { tenants, dailyUsage, usageEvents, invoices };
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

function exceptionMeta(kind: ExceptionKind) {
  return {
    auth: { label: "鉴权失败", level: "高", icon: ShieldAlert },
    rateLimit: { label: "限流触发", level: "中", icon: Gauge },
    server: { label: "服务异常", level: "高", icon: FileWarning },
    revokedKey: { label: "撤销 Key 调用", level: "中", icon: Ban }
  }[kind];
}

function classifyExceptions(events: UsageEvent[]) {
  return events.flatMap((event) => {
    const kinds: ExceptionKind[] = [];

    if (event.statusCode === 401 || event.statusCode === 403) {
      kinds.push("auth");
    }

    if (event.statusCode === 429) {
      kinds.push("rateLimit");
    }

    if (event.statusCode >= 500) {
      kinds.push("server");
    }

    if (event.apiKey?.status === "REVOKED") {
      kinds.push("revokedKey");
    }

    return kinds.map((kind) => ({ kind, event }));
  });
}

export function BillingRunsPage() {
  const [data, setData] = useState<LoadState>(initialState);
  const [period, setPeriod] = useState(currentPeriod());
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLaunchLoopData()
      .then((nextData) => {
        setError(null);
        setData(nextData);
      })
      .catch(() => setError("账单生成数据加载失败"));
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
        const status = invoice?.status ?? "PENDING";

        return { tenant, usage, invoice, overageUnits, currency, estimatedAmount, status };
      })
      .filter((row) => (keyword ? row.tenant.name.toLowerCase().includes(keyword) : true))
      .filter((row) => (statusFilter ? row.status === statusFilter : true));
  }, [data.dailyUsage, data.invoices, data.tenants, period, statusFilter, tenantFilter]);

  const metrics = useMemo(
    () => ({
      pending: rows.filter((row) => row.status === "PENDING").length,
      draft: rows.filter((row) => row.status === "DRAFT").length,
      issued: rows.filter((row) => row.status === "ISSUED").length,
      failed: 0
    }),
    [rows]
  );

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">上线闭环</p>
        <h1>账单生成中心</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-amber"><span><TimerReset size={18} aria-hidden="true" />待生成</span><strong>{metrics.pending}</strong></article>
        <article className="metric-card accent-blue"><span><ReceiptText size={18} aria-hidden="true" />草稿</span><strong>{metrics.draft}</strong></article>
        <article className="metric-card accent-teal"><span><ReceiptText size={18} aria-hidden="true" />已出账</span><strong>{metrics.issued}</strong></article>
        <article className="metric-card accent-rose"><span><AlertTriangle size={18} aria-hidden="true" />失败</span><strong>{metrics.failed}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>生成批次</h2>
            <p>当前只展示生成前检查和账单跳转；后端生成接口完成前不会启用生成动作。</p>
          </div>
          <button type="button" disabled title="账单生成接口待实现">
            <PlayCircle size={16} aria-hidden="true" />
            生成账单
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
            <option value="DRAFT">草稿</option>
            <option value="ISSUED">已出账</option>
            <option value="PAID">已支付</option>
            <option value="VOID">已作废</option>
          </select>
          <span className="inline-hint">账单生成接口待实现</span>
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
                  {row.invoice ? <span className={invoiceStatusClass(row.invoice.status)}>{formatInvoiceStatus(row.invoice.status)}</span> : <span className="status-pill muted">待生成</span>}
                </td>
                <td>{formatDateTime(row.invoice?.updatedAt ?? row.invoice?.createdAt)}</td>
                <td>
                  {row.invoice ? (
                    <Link className="secondary-button" to={`/invoices/${row.invoice.id}`}>
                      查看账单
                    </Link>
                  ) : (
                    <button type="button" className="secondary-button" disabled>
                      生成
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

  useEffect(() => {
    loadLaunchLoopData()
      .then((nextData) => {
        setError(null);
        setData(nextData);
      })
      .catch(() => setError("异常数据加载失败"));
  }, []);

  const exceptions = useMemo(() => {
    const tenant = tenantFilter.trim().toLowerCase();

    return classifyExceptions(data.usageEvents)
      .filter((item) => (kindFilter ? item.kind === kindFilter : true))
      .filter((item) => (tenant ? item.event.tenant?.name.toLowerCase().includes(tenant) : true));
  }, [data.usageEvents, kindFilter, tenantFilter]);

  const counts = useMemo(() => {
    const allExceptions = classifyExceptions(data.usageEvents);

    return {
      auth: allExceptions.filter((item) => item.kind === "auth").length,
      rateLimit: allExceptions.filter((item) => item.kind === "rateLimit").length,
      server: allExceptions.filter((item) => item.kind === "server").length,
      revokedKey: allExceptions.filter((item) => item.kind === "revokedKey").length,
      billing: 0
    };
  }, [data.usageEvents]);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">上线闭环</p>
        <h1>异常处理中心</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-rose"><span><ShieldAlert size={18} aria-hidden="true" />鉴权失败数</span><strong>{counts.auth}</strong></article>
        <article className="metric-card accent-amber"><span><Gauge size={18} aria-hidden="true" />限流触发数</span><strong>{counts.rateLimit}</strong></article>
        <article className="metric-card accent-rose"><span><FileWarning size={18} aria-hidden="true" />服务异常数</span><strong>{counts.server}</strong></article>
        <article className="metric-card accent-indigo"><span><Ban size={18} aria-hidden="true" />撤销 Key 调用数</span><strong>{counts.revokedKey}</strong></article>
        <article className="metric-card accent-blue"><span><ReceiptText size={18} aria-hidden="true" />账单失败</span><strong>{counts.billing}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>异常列表</h2>
            <p>从请求日志和 API Key 状态推导，保留跳转日志入口用于进一步排查。</p>
          </div>
        </div>
        <div className="filter-panel compact-filter">
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} aria-label="按异常类型筛选">
            <option value="">全部类型</option>
            <option value="auth">鉴权失败</option>
            <option value="rateLimit">限流触发</option>
            <option value="server">服务异常</option>
            <option value="revokedKey">撤销 Key 调用</option>
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
            {exceptions.map((item) => {
              const meta = exceptionMeta(item.kind);
              const Icon = meta.icon;

              return (
                <tr key={`${item.kind}-${item.event.id}`}>
                  <td><span className={meta.level === "高" ? "status-pill danger" : "status-pill warning"}>{meta.level}</span></td>
                  <td>
                    <span className="exception-kind"><Icon size={15} aria-hidden="true" />{meta.label}</span>
                  </td>
                  <td>{item.event.tenant?.name ?? "-"}</td>
                  <td><code>{item.event.requestId}</code></td>
                  <td>{item.event.endpoint} 返回 {item.event.statusCode}</td>
                  <td>{formatDateTime(item.event.occurredAt)}</td>
                  <td><span className="status-pill muted">待处理</span></td>
                  <td><Link className="secondary-button" to="/logs/usage">查看日志</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
