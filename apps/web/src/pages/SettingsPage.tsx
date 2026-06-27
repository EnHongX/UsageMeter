import { FormEvent, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { AuditLog, changePassword, getSettings, Invoice, listAuditLogs, listInvoices, listUsageEvents, SystemSettings, updateSettings, UsageEvent } from "../api/client";
import { PaginationControls, usePagination } from "../components/Pagination";
import { formatMoney } from "../utils/money";
import type { BillingCurrency } from "../utils/money";
import { formatInvoiceStatus, invoiceStatusClass } from "../utils/status";

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextSettings = await updateSettings({
      systemName: String(form.get("systemName")),
      defaultPageSize: Number(form.get("defaultPageSize")),
      allowRegistration: form.get("allowRegistration") === "on",
      billingCurrency: String(form.get("billingCurrency")) as BillingCurrency
    });
    setSettings(nextSettings);
    setMessage("系统设置已保存");
  }

  return (
    <section className="page-section">
      {message ? <div className="empty-state">{message}</div> : null}
      {settings ? (
        <form className="settings-panel" onSubmit={handleSettingsSubmit}>
          <div className="settings-grid">
            <label className="setting-field">
              <span>系统名称</span>
              <small>显示在登录页、浏览器标题和后台品牌区域，用于区分部署环境或客户版本。</small>
              <input name="systemName" defaultValue={settings.systemName} required />
            </label>
            <label className="setting-field">
              <span>默认分页条数</span>
              <small>列表页默认每页展示的数据量。数值越大单页信息越多，但表格会更长。</small>
              <input name="defaultPageSize" type="number" min="5" max="100" defaultValue={settings.defaultPageSize} required />
            </label>
            <label className="setting-field">
              <span>账单币种</span>
              <small>新建计费配置时的默认币种。账单按套餐币种独立计费，不做汇率换算。</small>
              <select name="billingCurrency" defaultValue={settings.billingCurrency} required>
                <option value="CNY">人民币 CNY</option>
                <option value="USD">美元 USD</option>
              </select>
            </label>
            <label className="setting-field setting-field-toggle">
              <span>允许注册</span>
              <small>开启后用户可在登录页创建账号；关闭后仅管理员预置或后续后台创建。</small>
              <input name="allowRegistration" type="checkbox" defaultChecked={settings.allowRegistration} />
            </label>
          </div>
          <div className="settings-actions">
            <button type="submit">保存设置</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export function PasswordSettingsPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await changePassword({
      currentPassword: String(form.get("currentPassword")),
      newPassword: String(form.get("newPassword"))
    });
    event.currentTarget.reset();
    setMessage("密码已修改");
  }

  return (
    <section className="page-section">
      {message ? <div className="empty-state">{message}</div> : null}
      <form className="settings-panel" onSubmit={handlePasswordSubmit}>
        <div className="table-header">
          <div>
            <h2>账号密码</h2>
            <p>修改当前登录账号密码，保存后下次登录生效。</p>
          </div>
        </div>
        <div className="settings-grid compact">
          <label className="setting-field">
            <span>当前密码</span>
            <input name="currentPassword" type="password" placeholder="输入当前密码" required />
          </label>
          <label className="setting-field">
            <span>新密码</span>
            <input name="newPassword" type="password" minLength={8} placeholder="至少 8 位" required />
          </label>
        </div>
        <div className="settings-actions">
          <button type="submit">修改密码</button>
        </div>
      </form>
    </section>
  );
}

type LogCategory = "audit" | "usage" | "billing";
type SortDirection = "asc" | "desc";
type AuditSortKey = "createdAt" | "user" | "action" | "resource";
type UsageSortKey = "occurredAt" | "tenant" | "endpoint" | "statusCode" | "costUnits";
type BillingSortKey = "billingPeriod" | "tenant" | "totalAmount" | "status";

const logCategoryMeta: Record<LogCategory, { title: string; description: string }> = {
  audit: {
    title: "操作审计",
    description: "记录后台登录、配置变更、编辑、删除和撤销等管理动作。"
  },
  usage: {
    title: "请求日志",
    description: "按请求维度查看接口、状态码、额度消耗和 API Key 前缀。"
  },
  billing: {
    title: "账单日志",
    description: "按账期查看出账、金额、状态和明细数量，便于财务核对。"
  }
};

function compareValues(left: string | number, right: string | number, direction: SortDirection) {
  const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "zh-CN");
  return direction === "asc" ? result : -result;
}

function SortButton<TSortKey extends string>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort
}: {
  label: string;
  sortKey: TSortKey;
  activeSortKey: TSortKey;
  direction: SortDirection;
  onSort: (sortKey: TSortKey) => void;
}) {
  const active = sortKey === activeSortKey;

  return (
    <button type="button" className="table-sort-button" onClick={() => onSort(sortKey)}>
      {label}
      <span>{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function formatDateTime(value?: string) {
  return value ? value.slice(0, 16).replace("T", " ") : "-";
}

function statusClass(statusCode: number) {
  if (statusCode >= 500) {
    return "status-pill danger";
  }

  if (statusCode >= 400) {
    return "status-pill warning";
  }

  return "status-pill success";
}

function LogSubNav() {
  return (
    <div className="tab-list" role="tablist" aria-label="日志类型">
      {Object.entries(logCategoryMeta).map(([category, meta]) => (
        <NavLink key={category} to={`/logs/${category}`} className={({ isActive }) => (isActive ? "tab-link active" : "tab-link")}>
          {meta.title}
        </NavLink>
      ))}
    </div>
  );
}

export function LogsPage() {
  const { category = "audit" } = useParams();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageEvent[]>([]);
  const [billingLogs, setBillingLogs] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auditKeyword, setAuditKeyword] = useState("");
  const [auditResource, setAuditResource] = useState("");
  const [auditDate, setAuditDate] = useState("");
  const [auditSort, setAuditSort] = useState<AuditSortKey>("createdAt");
  const [auditSortDirection, setAuditSortDirection] = useState<SortDirection>("desc");
  const [usageTenant, setUsageTenant] = useState("");
  const [usageEndpoint, setUsageEndpoint] = useState("");
  const [usageStatus, setUsageStatus] = useState("");
  const [usageDate, setUsageDate] = useState("");
  const [usageSort, setUsageSort] = useState<UsageSortKey>("occurredAt");
  const [usageSortDirection, setUsageSortDirection] = useState<SortDirection>("desc");
  const [billingTenant, setBillingTenant] = useState("");
  const [billingStatus, setBillingStatus] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [billingSort, setBillingSort] = useState<BillingSortKey>("billingPeriod");
  const [billingSortDirection, setBillingSortDirection] = useState<SortDirection>("desc");
  const activeCategory = category as LogCategory;

  function updateAuditSort(sortKey: AuditSortKey) {
    setAuditSortDirection((direction) => (sortKey === auditSort && direction === "asc" ? "desc" : "asc"));
    setAuditSort(sortKey);
  }

  function updateUsageSort(sortKey: UsageSortKey) {
    setUsageSortDirection((direction) => (sortKey === usageSort && direction === "asc" ? "desc" : "asc"));
    setUsageSort(sortKey);
  }

  function updateBillingSort(sortKey: BillingSortKey) {
    setBillingSortDirection((direction) => (sortKey === billingSort && direction === "asc" ? "desc" : "asc"));
    setBillingSort(sortKey);
  }

  const filteredAuditLogs = useMemo(() => {
    const keyword = auditKeyword.trim().toLowerCase();
    const resource = auditResource.trim().toLowerCase();

    return auditLogs
      .filter((log) => {
        const matchesKeyword = keyword
          ? [log.user?.name, log.user?.email, log.action, log.resource, log.resourceId].some((value) => value?.toLowerCase().includes(keyword))
          : true;
        const matchesResource = resource ? log.resource.toLowerCase().includes(resource) : true;
        const matchesDate = auditDate ? log.createdAt.slice(0, 10) === auditDate : true;
        return matchesKeyword && matchesResource && matchesDate;
      })
      .sort((left, right) => {
        const values = {
          createdAt: [left.createdAt, right.createdAt],
          user: [left.user?.name ?? "", right.user?.name ?? ""],
          action: [left.action, right.action],
          resource: [left.resource, right.resource]
        }[auditSort];
        return compareValues(values[0], values[1], auditSortDirection);
      });
  }, [auditDate, auditKeyword, auditLogs, auditResource, auditSort, auditSortDirection]);

  const filteredUsageLogs = useMemo(() => {
    const tenant = usageTenant.trim().toLowerCase();
    const endpoint = usageEndpoint.trim().toLowerCase();

    return usageLogs
      .filter((log) => {
        const matchesTenant = tenant ? log.tenant?.name.toLowerCase().includes(tenant) : true;
        const matchesEndpoint = endpoint ? log.endpoint.toLowerCase().includes(endpoint) : true;
        const matchesStatus = usageStatus ? String(log.statusCode) === usageStatus : true;
        const matchesDate = usageDate ? log.occurredAt?.slice(0, 10) === usageDate : true;
        return matchesTenant && matchesEndpoint && matchesStatus && matchesDate;
      })
      .sort((left, right) => {
        const values = {
          occurredAt: [left.occurredAt ?? "", right.occurredAt ?? ""],
          tenant: [left.tenant?.name ?? "", right.tenant?.name ?? ""],
          endpoint: [left.endpoint, right.endpoint],
          statusCode: [left.statusCode, right.statusCode],
          costUnits: [left.costUnits, right.costUnits]
        }[usageSort];
        return compareValues(values[0], values[1], usageSortDirection);
      });
  }, [usageDate, usageEndpoint, usageLogs, usageSort, usageSortDirection, usageStatus, usageTenant]);

  const filteredBillingLogs = useMemo(() => {
    const tenant = billingTenant.trim().toLowerCase();

    return billingLogs
      .filter((log) => {
        const matchesTenant = tenant ? log.tenant?.name.toLowerCase().includes(tenant) : true;
        const matchesStatus = billingStatus ? log.status === billingStatus : true;
        const matchesPeriod = billingPeriod ? log.billingPeriod === billingPeriod : true;
        return matchesTenant && matchesStatus && matchesPeriod;
      })
      .sort((left, right) => {
        const values = {
          billingPeriod: [left.billingPeriod, right.billingPeriod],
          tenant: [left.tenant?.name ?? "", right.tenant?.name ?? ""],
          totalAmount: [left.totalAmount, right.totalAmount],
          status: [left.status, right.status]
        }[billingSort];
        return compareValues(values[0], values[1], billingSortDirection);
      });
  }, [billingLogs, billingPeriod, billingSort, billingSortDirection, billingStatus, billingTenant]);

  const auditPagination = usePagination(filteredAuditLogs);
  const usagePagination = usePagination(filteredUsageLogs);
  const billingPagination = usePagination(filteredBillingLogs);

  useEffect(() => {
    Promise.all([listAuditLogs(), listUsageEvents(), listInvoices()])
      .then(([nextAuditLogs, nextUsageLogs, nextBillingLogs]) => {
        setAuditLogs(nextAuditLogs);
        setUsageLogs(nextUsageLogs);
        setBillingLogs(nextBillingLogs);
      })
      .catch(() => setError("日志数据加载失败"));
  }, []);

  if (!["audit", "usage", "billing"].includes(category)) {
    return <Navigate to="/logs/audit" replace />;
  }

  const meta = logCategoryMeta[activeCategory];

  return (
    <section className="page-section">
      <LogSubNav />
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.description}</p>
          </div>
        </div>
        {activeCategory === "audit" ? (
          <>
            <div className="filter-panel">
              <input value={auditKeyword} onChange={(event) => setAuditKeyword(event.target.value)} placeholder="按用户、动作、资源 ID 筛选" />
              <input value={auditResource} onChange={(event) => setAuditResource(event.target.value)} placeholder="按资源筛选" />
              <input value={auditDate} onChange={(event) => setAuditDate(event.target.value)} type="date" aria-label="按操作日期筛选" />
            </div>
            <table>
              <thead>
                <tr>
                  <th><SortButton label="时间" sortKey="createdAt" activeSortKey={auditSort} direction={auditSortDirection} onSort={updateAuditSort} /></th>
                  <th><SortButton label="用户" sortKey="user" activeSortKey={auditSort} direction={auditSortDirection} onSort={updateAuditSort} /></th>
                  <th><SortButton label="动作" sortKey="action" activeSortKey={auditSort} direction={auditSortDirection} onSort={updateAuditSort} /></th>
                  <th><SortButton label="资源" sortKey="resource" activeSortKey={auditSort} direction={auditSortDirection} onSort={updateAuditSort} /></th>
                  <th>资源 ID</th>
                </tr>
              </thead>
              <tbody>
                {auditPagination.pageItems.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.user?.name ?? "-"}</td>
                    <td>{log.action}</td>
                    <td>{log.resource}</td>
                    <td><code>{log.resourceId ?? "-"}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls {...auditPagination} onPrevious={auditPagination.goPrevious} onNext={auditPagination.goNext} />
          </>
        ) : null}
        {activeCategory === "usage" ? (
          <>
            <div className="filter-panel">
              <input value={usageTenant} onChange={(event) => setUsageTenant(event.target.value)} placeholder="按租户名称筛选" />
              <input value={usageEndpoint} onChange={(event) => setUsageEndpoint(event.target.value)} placeholder="按接口筛选" />
              <select value={usageStatus} onChange={(event) => setUsageStatus(event.target.value)} aria-label="按状态码筛选">
                <option value="">全部状态码</option>
                <option value="200">200</option>
                <option value="400">400</option>
                <option value="401">401</option>
                <option value="403">403</option>
                <option value="429">429</option>
                <option value="500">500</option>
              </select>
              <input value={usageDate} onChange={(event) => setUsageDate(event.target.value)} type="date" aria-label="按请求日期筛选" />
            </div>
            <table>
              <thead>
                <tr>
                  <th><SortButton label="时间" sortKey="occurredAt" activeSortKey={usageSort} direction={usageSortDirection} onSort={updateUsageSort} /></th>
                  <th><SortButton label="租户" sortKey="tenant" activeSortKey={usageSort} direction={usageSortDirection} onSort={updateUsageSort} /></th>
                  <th>请求 ID</th>
                  <th><SortButton label="接口" sortKey="endpoint" activeSortKey={usageSort} direction={usageSortDirection} onSort={updateUsageSort} /></th>
                  <th>方法</th>
                  <th><SortButton label="状态码" sortKey="statusCode" activeSortKey={usageSort} direction={usageSortDirection} onSort={updateUsageSort} /></th>
                  <th><SortButton label="额度" sortKey="costUnits" activeSortKey={usageSort} direction={usageSortDirection} onSort={updateUsageSort} /></th>
                </tr>
              </thead>
              <tbody>
                {usagePagination.pageItems.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.occurredAt)}</td>
                    <td>{log.tenant?.name ?? "-"}</td>
                    <td><code>{log.requestId}</code></td>
                    <td>{log.endpoint}</td>
                    <td>{log.method}</td>
                    <td><span className={statusClass(log.statusCode)}>{log.statusCode}</span></td>
                    <td>{log.costUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls {...usagePagination} onPrevious={usagePagination.goPrevious} onNext={usagePagination.goNext} />
          </>
        ) : null}
        {activeCategory === "billing" ? (
          <>
            <div className="filter-panel">
              <input value={billingTenant} onChange={(event) => setBillingTenant(event.target.value)} placeholder="按租户名称筛选" />
              <input value={billingPeriod} onChange={(event) => setBillingPeriod(event.target.value)} type="month" aria-label="按账期筛选" />
              <select value={billingStatus} onChange={(event) => setBillingStatus(event.target.value)} aria-label="按账单状态筛选">
                <option value="">全部状态</option>
                <option value="DRAFT">草稿</option>
                <option value="ISSUED">已出账</option>
                <option value="PAID">已支付</option>
                <option value="VOID">已作废</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th><SortButton label="账期" sortKey="billingPeriod" activeSortKey={billingSort} direction={billingSortDirection} onSort={updateBillingSort} /></th>
                  <th><SortButton label="租户" sortKey="tenant" activeSortKey={billingSort} direction={billingSortDirection} onSort={updateBillingSort} /></th>
                  <th>用量</th>
                  <th><SortButton label="总金额" sortKey="totalAmount" activeSortKey={billingSort} direction={billingSortDirection} onSort={updateBillingSort} /></th>
                  <th><SortButton label="状态" sortKey="status" activeSortKey={billingSort} direction={billingSortDirection} onSort={updateBillingSort} /></th>
                  <th>明细数</th>
                </tr>
              </thead>
              <tbody>
                {billingPagination.pageItems.map((log) => (
                  <tr key={log.id}>
                    <td>{log.billingPeriod}</td>
                    <td>{log.tenant?.name ?? "-"}</td>
                    <td>{log.usedUnits}</td>
                    <td>{formatMoney(log.totalAmount, log.billingCurrency)}</td>
                    <td><span className={invoiceStatusClass(log.status)}>{formatInvoiceStatus(log.status)}</span></td>
                    <td>{log.lineItems.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls {...billingPagination} onPrevious={billingPagination.goPrevious} onNext={billingPagination.goNext} />
          </>
        ) : null}
      </div>
    </section>
  );
}
