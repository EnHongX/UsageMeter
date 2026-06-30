import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createTenant, listPlans, listTenants, Plan, Tenant, updateTenant } from "../api/client";
import { Modal } from "../components/Modal";
import { PaginationControls, usePagination } from "../components/Pagination";
import { formatTenantStatus, tenantStatusClass } from "../utils/status";

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const filteredTenants = useMemo(() => {
    const keyword = nameFilter.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const matchesName = keyword ? tenant.name.toLowerCase().includes(keyword) : true;
      const matchesStatus = statusFilter ? tenant.status === statusFilter : true;
      const matchesPlan = planFilter ? tenant.planId === planFilter : true;
      return matchesName && matchesStatus && matchesPlan;
    });
  }, [nameFilter, planFilter, statusFilter, tenants]);
  const pagination = usePagination(filteredTenants);

  async function loadData() {
    const [nextTenants, nextPlans] = await Promise.all([listTenants(), listPlans()]);
    setTenants(nextTenants);
    setPlans(nextPlans);
  }

  useEffect(() => {
    loadData().catch(() => setError("租户加载失败"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await createTenant({
      name: String(form.get("name")),
      planId: String(form.get("planId"))
    });

    setIsCreateOpen(false);
    await loadData();
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTenant) {
      return;
    }

    const form = new FormData(event.currentTarget);
    await updateTenant(editingTenant.id, {
      name: String(form.get("name")),
      planId: String(form.get("planId")),
      status: String(form.get("status")) as Tenant["status"]
    });
    setEditingTenant(null);
    await loadData();
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">业务管理</p>
        <h1>租户</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="list-toolbar">
        <div className="filter-panel compact-filter inline-filter">
          <input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="按租户名称筛选" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按租户状态筛选">
            <option value="">全部状态</option>
            <option value="ACTIVE">启用</option>
            <option value="SUSPENDED">停用</option>
          </select>
          <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} aria-label="按租户套餐筛选">
            <option value="">全部套餐</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          创建租户
        </button>
      </div>
      {isCreateOpen ? (
        <Modal title="创建租户" onClose={() => setIsCreateOpen(false)}>
          <form className="modal-form" onSubmit={handleSubmit}>
            <input name="name" placeholder="租户名称" required />
            <select name="planId" required defaultValue="">
              <option value="" disabled>
                选择套餐
              </option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(false)}>取消</button>
              <button type="submit">创建</button>
            </div>
          </form>
        </Modal>
      ) : null}
      {editingTenant ? (
        <Modal title="编辑租户" onClose={() => setEditingTenant(null)}>
          <form className="modal-form" onSubmit={handleEditSubmit}>
            <input name="name" placeholder="租户名称" required defaultValue={editingTenant.name} />
            <select name="planId" required defaultValue={editingTenant.planId}>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
            <select name="status" required defaultValue={editingTenant.status}>
              <option value="ACTIVE">启用</option>
              <option value="SUSPENDED">停用</option>
            </select>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setEditingTenant(null)}>取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </Modal>
      ) : null}
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>状态</th>
              <th>套餐</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((tenant) => (
              <tr key={tenant.id}>
                <td>{tenant.name}</td>
                <td>
                  <span className={tenantStatusClass(tenant.status)}>{formatTenantStatus(tenant.status)}</span>
                </td>
                <td>{tenant.plan?.name ?? "-"}</td>
                <td>
                  <div className="action-group">
                    <Link className="secondary-button" to={`/tenants/${tenant.id}`}>
                      <Eye size={16} aria-hidden="true" />
                      详情
                    </Link>
                    <button type="button" className="secondary-button" onClick={() => setEditingTenant(tenant)}>
                      <Pencil size={16} aria-hidden="true" />
                      编辑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          startItem={pagination.startItem}
          endItem={pagination.endItem}
          totalItems={pagination.totalItems}
          canGoPrevious={pagination.canGoPrevious}
          canGoNext={pagination.canGoNext}
          onPrevious={pagination.goPrevious}
          onNext={pagination.goNext}
        />
      </div>
    </section>
  );
}
