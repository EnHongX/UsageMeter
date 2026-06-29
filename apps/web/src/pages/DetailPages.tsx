import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  ApiKey,
  BillingRun,
  ExceptionCase,
  getApiKey,
  getInvoice,
  getPlan,
  getTenant,
  Invoice,
  listApiKeys,
  listBillingRuns,
  listDailyUsage,
  listExceptions,
  listInvoices,
  listRateLimitPolicies,
  listUsageEvents,
  Plan,
  RateLimitPolicy,
  Tenant,
  UsageDailyAggregate,
  UsageEvent
} from "../api/client";
import { formatMoney } from "../utils/money";
import { apiKeyStatusClass, formatApiKeyStatus, formatInvoiceStatus, formatTenantStatus, invoiceStatusClass, tenantStatusClass } from "../utils/status";

function BackLink({ to }: { to: string }) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft size={16} aria-hidden="true" />
      返回
    </Link>
  );
}

export function PlanDetailPage() {
  const { id = "" } = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    getPlan(id).then(setPlan);
  }, [id]);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">套餐详情</p>
        <h1>{plan?.name ?? "加载中"}</h1>
      </div>
      <BackLink to="/plans" />
      {plan ? (
        <section className="detail-panel">
          <dl className="detail-grid">
            <div><dt>币种</dt><dd>{plan.billingCurrency}</dd></div>
            <div><dt>基础费用</dt><dd>{formatMoney(plan.monthlyBaseFee, plan.billingCurrency)}</dd></div>
            <div><dt>包含额度</dt><dd>{plan.includedUnits}</dd></div>
            <div><dt>每日额度</dt><dd>{plan.dailyUnitLimit}</dd></div>
            <div><dt>超额单价</dt><dd>{formatMoney(plan.overageUnitPrice, plan.billingCurrency)}</dd></div>
            <div><dt>套餐 ID</dt><dd><code>{plan.id}</code></dd></div>
          </dl>
        </section>
      ) : null}
    </section>
  );
}

export function TenantDetailPage() {
  const { id = "" } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [dailyUsage, setDailyUsage] = useState<UsageDailyAggregate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [policies, setPolicies] = useState<RateLimitPolicy[]>([]);
  const [billingRuns, setBillingRuns] = useState<BillingRun[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionCase[]>([]);

  useEffect(() => {
    Promise.all([getTenant(id), listApiKeys(), listUsageEvents(), listDailyUsage(), listInvoices(), listRateLimitPolicies(), listBillingRuns(), listExceptions()]).then(
      ([nextTenant, nextApiKeys, nextUsageEvents, nextDailyUsage, nextInvoices, nextPolicies, nextBillingRuns, nextExceptions]) => {
        setTenant(nextTenant);
        setApiKeys(nextApiKeys.filter((apiKey) => apiKey.tenantId === id));
        setUsageEvents(nextUsageEvents.filter((event) => event.tenant?.id === id));
        setDailyUsage(nextDailyUsage.filter((usage) => usage.tenant?.id === id));
        setInvoices(nextInvoices.filter((invoice) => invoice.tenant?.id === id));
        setPolicies(nextPolicies.filter((policy) => policy.tenantId === id || policy.planId === nextTenant.planId));
        setBillingRuns(nextBillingRuns.filter((run) => run.tenantId === id));
        setExceptions(nextExceptions.filter((exception) => exception.tenantId === id));
      }
    );
  }, [id]);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">租户详情</p>
        <h1>{tenant?.name ?? "加载中"}</h1>
      </div>
      <BackLink to="/tenants" />
      {tenant ? (
        <>
          <section className="detail-panel">
            <dl className="detail-grid">
              <div><dt>状态</dt><dd><span className={tenantStatusClass(tenant.status)}>{formatTenantStatus(tenant.status)}</span></dd></div>
              <div><dt>套餐</dt><dd>{tenant.plan?.name ?? "-"}</dd></div>
              <div><dt>API Key</dt><dd>{apiKeys.length}</dd></div>
              <div><dt>限流策略</dt><dd>{policies.length}</dd></div>
              <div><dt>待处理异常</dt><dd>{exceptions.filter((exception) => exception.status !== "RESOLVED").length}</dd></div>
              <div><dt>租户 ID</dt><dd><code>{tenant.id}</code></dd></div>
            </dl>
          </section>

          <section className="table-panel">
            <div className="table-header">
              <div>
                <h2>API Key</h2>
                <p>当前租户下可用于客户 API 调用的 Key。</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>前缀</th>
                  <th>状态</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td>{apiKey.name}</td>
                    <td><code>{apiKey.keyPrefix}</code></td>
                    <td><span className={apiKeyStatusClass(apiKey.status)}>{formatApiKeyStatus(apiKey.status)}</span></td>
                    <td>{apiKey.createdAt ? apiKey.createdAt.slice(0, 16).replace("T", " ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="table-panel">
            <div className="table-header">
              <div>
                <h2>用量明细</h2>
                <p>最近 100 条用量事件中属于当前租户的数据。</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>请求 ID</th>
                  <th>接口</th>
                  <th>方法</th>
                  <th>状态码</th>
                  <th>额度</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {usageEvents.map((event) => (
                  <tr key={event.id}>
                    <td><code>{event.requestId}</code></td>
                    <td>{event.endpoint}</td>
                    <td>{event.method}</td>
                    <td>{event.statusCode}</td>
                    <td>{event.costUnits}</td>
                    <td>{event.occurredAt ? event.occurredAt.slice(0, 16).replace("T", " ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="table-panel">
            <div className="table-header">
              <div>
                <h2>日用量汇总</h2>
                <p>按天聚合的请求数和额度消耗。</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>请求数</th>
                  <th>总额度</th>
                </tr>
              </thead>
              <tbody>
                {dailyUsage.map((usage) => (
                  <tr key={usage.id}>
                    <td>{usage.date.slice(0, 10)}</td>
                    <td>{usage.totalRequests}</td>
                    <td>{usage.totalCostUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="table-panel">
            <div className="table-header">
              <div>
                <h2>账单</h2>
                <p>当前租户历史账单。</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>账期</th>
                  <th>币种</th>
                  <th>用量</th>
                  <th>总金额</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.billingPeriod}</td>
                    <td>{invoice.billingCurrency}</td>
                    <td>{invoice.usedUnits}</td>
                    <td>{formatMoney(invoice.totalAmount, invoice.billingCurrency)}</td>
                    <td><span className={invoiceStatusClass(invoice.status)}>{formatInvoiceStatus(invoice.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="table-panel">
            <div className="table-header">
              <div>
                <h2>运营配置</h2>
                <p>当前租户命中的限流策略、账单运行和异常事项。</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>类型</th>
                  <th>对象</th>
                  <th>状态</th>
                  <th>摘要</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td>限流策略</td>
                    <td>{policy.scope === "TENANT" ? "租户覆盖" : "套餐默认"}</td>
                    <td>{policy.status === "ACTIVE" ? "启用" : "停用"}</td>
                    <td>每日额度 {policy.dailyUnitLimit}，预警 {policy.warningThresholdPercent}%</td>
                  </tr>
                ))}
                {billingRuns.map((run) => (
                  <tr key={run.id}>
                    <td>账单运行</td>
                    <td>{run.billingPeriod}</td>
                    <td>{run.status}</td>
                    <td>{run.failureReason ?? "运行记录已创建"}</td>
                  </tr>
                ))}
                {exceptions.map((exception) => (
                  <tr key={exception.id}>
                    <td>异常</td>
                    <td>{exception.type}</td>
                    <td>{exception.status}</td>
                    <td>{exception.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </section>
  );
}

export function ApiKeyDetailPage() {
  const { id = "" } = useParams();
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    getApiKey(id).then(setApiKey);
  }, [id]);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">API Key 详情</p>
        <h1>{apiKey?.name ?? "加载中"}</h1>
      </div>
      <BackLink to="/api-keys" />
      {apiKey ? (
        <section className="detail-panel">
          <dl className="detail-grid">
            <div><dt>租户</dt><dd>{apiKey.tenant?.name ?? "-"}</dd></div>
            <div><dt>状态</dt><dd><span className={apiKeyStatusClass(apiKey.status)}>{formatApiKeyStatus(apiKey.status)}</span></dd></div>
            <div><dt>Key 前缀</dt><dd><code>{apiKey.keyPrefix}</code></dd></div>
            <div><dt>Key ID</dt><dd><code>{apiKey.id}</code></dd></div>
          </dl>
        </section>
      ) : null}
    </section>
  );
}

export function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    getInvoice(id).then(setInvoice);
  }, [id]);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">账单详情</p>
        <h1>{invoice?.billingPeriod ?? "加载中"}</h1>
      </div>
      <BackLink to="/invoices" />
      {invoice ? (
        <section className="detail-panel">
          <dl className="detail-grid">
            <div><dt>租户</dt><dd>{invoice.tenant?.name ?? "-"}</dd></div>
            <div><dt>状态</dt><dd><span className={invoiceStatusClass(invoice.status)}>{formatInvoiceStatus(invoice.status)}</span></dd></div>
            <div><dt>币种</dt><dd>{invoice.billingCurrency}</dd></div>
            <div><dt>总金额</dt><dd>{formatMoney(invoice.totalAmount, invoice.billingCurrency)}</dd></div>
            <div><dt>基础费用</dt><dd>{formatMoney(invoice.baseFee ?? 0, invoice.billingCurrency)}</dd></div>
            <div><dt>用量</dt><dd>{invoice.usedUnits}</dd></div>
            <div><dt>超额用量</dt><dd>{invoice.overageUnits}</dd></div>
          </dl>
          <div className="line-items">
            {invoice.lineItems.map((item) => (
              <span key={item.id ?? item.description}>{item.description}</span>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
