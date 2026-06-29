import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Gauge, Plus, Zap } from "lucide-react";
import {
  createRateLimitPolicy,
  listPlans,
  listRateLimitEvents,
  listRateLimitPolicies,
  listTenants,
  Plan,
  RateLimitEvent,
  RateLimitPolicy,
  Tenant,
  updateRateLimitPolicy
} from "../api/client";
import { Modal } from "../components/Modal";

function formatDateTime(value?: string) {
  return value ? value.slice(0, 16).replace("T", " ") : "-";
}

function statusClass(status: string) {
  return status === "ACTIVE" ? "status-pill success" : "status-pill muted";
}

function statusLabel(status: string) {
  return status === "ACTIVE" ? "启用" : "停用";
}

function scopeLabel(scope: string) {
  return scope === "TENANT" ? "租户覆盖" : "套餐默认";
}

type PolicyModalState = {
  policy?: RateLimitPolicy;
};

export function RateLimitsPage() {
  const [policies, setPolicies] = useState<RateLimitPolicy[]>([]);
  const [events, setEvents] = useState<RateLimitEvent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<PolicyModalState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    const [nextPolicies, nextEvents, nextTenants, nextPlans] = await Promise.all([listRateLimitPolicies(), listRateLimitEvents(), listTenants(), listPlans()]);
    setPolicies(nextPolicies);
    setEvents(nextEvents);
    setTenants(nextTenants);
    setPlans(nextPlans);
  }

  useEffect(() => {
    loadData().catch(() => setMessage("限流策略数据加载失败"));
  }, []);

  const filteredPolicies = useMemo(() => {
    const keyword = tenantFilter.trim().toLowerCase();

    return policies
      .filter((policy) => (statusFilter ? policy.status === statusFilter : true))
      .filter((policy) => {
        if (!keyword) {
          return true;
        }

        return [policy.tenant?.name, policy.plan?.name].some((value) => value?.toLowerCase().includes(keyword));
      });
  }, [policies, statusFilter, tenantFilter]);

  const metrics = useMemo(
    () => ({
      active: policies.filter((policy) => policy.status === "ACTIVE").length,
      disabled: policies.filter((policy) => policy.status === "DISABLED").length,
      events: events.length,
      tenantOverrides: policies.filter((policy) => policy.scope === "TENANT").length
    }),
    [events.length, policies]
  );

  async function handlePolicySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scope = String(form.get("scope")) as RateLimitPolicy["scope"];
    const input = {
      scope,
      tenantId: scope === "TENANT" ? String(form.get("tenantId")) : null,
      planId: scope === "PLAN" ? String(form.get("planId")) : null,
      dailyUnitLimit: Number(form.get("dailyUnitLimit")),
      warningThresholdPercent: Number(form.get("warningThresholdPercent")),
      status: String(form.get("status")) as RateLimitPolicy["status"]
    };

    if (modal?.policy) {
      await updateRateLimitPolicy(modal.policy.id, input);
      setMessage("限流策略已更新");
    } else {
      await createRateLimitPolicy(input);
      setMessage("限流策略已创建");
    }

    setModal(null);
    await loadData();
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">运营配置</p>
        <h1>限流策略</h1>
      </div>
      {message ? <div className="empty-state">{message}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-teal"><span><Zap size={18} aria-hidden="true" />启用策略</span><strong>{metrics.active}</strong></article>
        <article className="metric-card accent-slate"><span><Gauge size={18} aria-hidden="true" />停用策略</span><strong>{metrics.disabled}</strong></article>
        <article className="metric-card accent-amber"><span><AlertTriangle size={18} aria-hidden="true" />今日触发</span><strong>{metrics.events}</strong></article>
        <article className="metric-card accent-indigo"><span><Gauge size={18} aria-hidden="true" />租户覆盖</span><strong>{metrics.tenantOverrides}</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>策略列表</h2>
            <p>首版只保存策略配置，真实请求拦截后续接入。</p>
          </div>
          <button type="button" onClick={() => setModal({})}><Plus size={16} aria-hidden="true" />新增策略</button>
        </div>
        <div className="filter-panel compact-filter">
          <input value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户或套餐筛选" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按状态筛选">
            <option value="">全部状态</option>
            <option value="ACTIVE">启用</option>
            <option value="DISABLED">停用</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>作用范围</th>
              <th>对象</th>
              <th>每日额度</th>
              <th>预警阈值</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredPolicies.map((policy) => (
              <tr key={policy.id}>
                <td>{scopeLabel(policy.scope)}</td>
                <td>{policy.scope === "TENANT" ? policy.tenant?.name ?? "-" : policy.plan?.name ?? "-"}</td>
                <td>{policy.dailyUnitLimit}</td>
                <td>{policy.warningThresholdPercent}%</td>
                <td><span className={statusClass(policy.status)}>{statusLabel(policy.status)}</span></td>
                <td>{formatDateTime(policy.updatedAt)}</td>
                <td><button type="button" className="secondary-button" onClick={() => setModal({ policy })}>编辑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>触发记录</h2>
            <p>当前来自轻量表数据，后续由真实限流链路写入。</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>租户</th>
              <th>请求 ID</th>
              <th>接口</th>
              <th>已用/上限</th>
              <th>原因</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.tenant?.name ?? "-"}</td>
                <td><code>{event.requestId}</code></td>
                <td>{event.endpoint}</td>
                <td>{event.usedUnits} / {event.limitUnits}</td>
                <td>{event.reason}</td>
                <td>{formatDateTime(event.occurredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal ? (
        <Modal title={modal.policy ? "编辑限流策略" : "新增限流策略"} onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={handlePolicySubmit}>
            <label>
              作用范围
              <select name="scope" defaultValue={modal.policy?.scope ?? "TENANT"}>
                <option value="TENANT">租户覆盖</option>
                <option value="PLAN">套餐默认</option>
              </select>
            </label>
            <label>
              租户
              <select name="tenantId" defaultValue={modal.policy?.tenantId ?? tenants[0]?.id}>
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <label>
              套餐
              <select name="planId" defaultValue={modal.policy?.planId ?? plans[0]?.id}>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </label>
            <label>
              每日额度
              <input name="dailyUnitLimit" type="number" min="1" defaultValue={modal.policy?.dailyUnitLimit ?? 1000} required />
            </label>
            <label>
              预警阈值
              <input name="warningThresholdPercent" type="number" min="1" max="100" defaultValue={modal.policy?.warningThresholdPercent ?? 80} required />
            </label>
            <label>
              状态
              <select name="status" defaultValue={modal.policy?.status ?? "ACTIVE"}>
                <option value="ACTIVE">启用</option>
                <option value="DISABLED">停用</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
