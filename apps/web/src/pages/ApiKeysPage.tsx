import { FormEvent, useEffect, useMemo, useState } from "react";
import { Ban, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ApiKey, createApiKey, deleteApiKey, listApiKeys, listTenants, revokeApiKey, Tenant, updateApiKey } from "../api/client";
import { ConfirmDialog, Modal } from "../components/Modal";
import { PaginationControls, usePagination } from "../components/Pagination";
import { apiKeyStatusClass, formatApiKeyStatus } from "../utils/status";

type PendingAction = {
  type: "revoke" | "delete";
  apiKey: ApiKey;
};

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [prefixFilter, setPrefixFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filteredApiKeys = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    const tenant = tenantFilter.trim().toLowerCase();
    const prefix = prefixFilter.trim().toLowerCase();

    return apiKeys.filter((apiKey) => {
      const matchesName = name ? apiKey.name.toLowerCase().includes(name) : true;
      const matchesTenant = tenant ? apiKey.tenant?.name.toLowerCase().includes(tenant) : true;
      const matchesPrefix = prefix ? apiKey.keyPrefix.toLowerCase().includes(prefix) : true;
      const matchesStatus = statusFilter ? apiKey.status === statusFilter : true;
      return matchesName && matchesTenant && matchesPrefix && matchesStatus;
    });
  }, [apiKeys, nameFilter, prefixFilter, statusFilter, tenantFilter]);
  const pagination = usePagination(filteredApiKeys);

  async function loadData() {
    const [nextKeys, nextTenants] = await Promise.all([listApiKeys(), listTenants()]);
    setApiKeys(nextKeys);
    setTenants(nextTenants);
  }

  useEffect(() => {
    loadData().catch(() => setError("API Key 加载失败"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await createApiKey({
      tenantId: String(form.get("tenantId")),
      name: String(form.get("name"))
    });

    setCreatedSecret(created.key);
    setIsCreateOpen(false);
    await loadData();
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingApiKey) {
      return;
    }

    const form = new FormData(event.currentTarget);
    await updateApiKey(editingApiKey.id, {
      name: String(form.get("name"))
    });
    setEditingApiKey(null);
    await loadData();
  }

  async function handleConfirmAction() {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.type === "revoke") {
      await revokeApiKey(pendingAction.apiKey.id);
    } else {
      await deleteApiKey(pendingAction.apiKey.id);
    }

    setPendingAction(null);
    await loadData();
  }

  return (
    <section className="page-section">
      {error ? <div className="empty-state">{error}</div> : null}
      {createdSecret ? (
        <div className="secret-panel">
          <span>新 API Key（仅显示一次）</span>
          <code>{createdSecret}</code>
        </div>
      ) : null}
      <div className="list-toolbar">
        <div className="filter-panel compact-filter inline-filter">
          <input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="按 Key 名称筛选" />
          <input value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
          <input value={prefixFilter} onChange={(event) => setPrefixFilter(event.target.value)} placeholder="按 Key 前缀筛选" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按 API Key 状态筛选">
            <option value="">全部状态</option>
            <option value="ACTIVE">启用</option>
            <option value="REVOKED">已撤销</option>
          </select>
        </div>
        <button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          创建 Key
        </button>
      </div>
      {isCreateOpen ? (
        <Modal title="创建 API Key" onClose={() => setIsCreateOpen(false)}>
          <form className="modal-form" onSubmit={handleSubmit}>
            <input name="name" placeholder="Key 名称" required />
            <select name="tenantId" required defaultValue="">
              <option value="" disabled>
                选择租户
              </option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
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
      {editingApiKey ? (
        <Modal title="编辑 API Key" onClose={() => setEditingApiKey(null)}>
          <form className="modal-form" onSubmit={handleEditSubmit}>
            <input name="name" placeholder="Key 名称" required defaultValue={editingApiKey.name} />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setEditingApiKey(null)}>取消</button>
              <button type="submit">保存</button>
            </div>
          </form>
        </Modal>
      ) : null}
      {pendingAction ? (
        <ConfirmDialog
          title={pendingAction.type === "revoke" ? "撤销 API Key" : "删除 API Key"}
          description={
            pendingAction.type === "revoke"
              ? `确认撤销「${pendingAction.apiKey.name}」？撤销后该 Key 不能继续调用客户 API。`
              : `确认删除「${pendingAction.apiKey.name}」？关联请求明细也会被清理。`
          }
          confirmText={pendingAction.type === "revoke" ? "确认撤销" : "确认删除"}
          onCancel={() => setPendingAction(null)}
          onConfirm={handleConfirmAction}
        />
      ) : null}
      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>租户</th>
              <th>前缀</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((apiKey) => (
              <tr key={apiKey.id}>
                <td>{apiKey.name}</td>
                <td>{apiKey.tenant?.name ?? "-"}</td>
                <td>{apiKey.keyPrefix}</td>
                <td>
                  <span className={apiKeyStatusClass(apiKey.status)}>{formatApiKeyStatus(apiKey.status)}</span>
                </td>
                <td>
                  <div className="action-group">
                    <Link className="secondary-button" to={`/api-keys/${apiKey.id}`}>
                      <Eye size={16} aria-hidden="true" />
                      详情
                    </Link>
                    <button type="button" className="secondary-button" onClick={() => setEditingApiKey(apiKey)}>
                      <Pencil size={16} aria-hidden="true" />
                      编辑
                    </button>
                    <button
                      type="button"
                      className="secondary-button danger-button"
                      disabled={apiKey.status === "REVOKED"}
                      onClick={() => setPendingAction({ type: "revoke", apiKey })}
                    >
                      <Ban size={16} aria-hidden="true" />
                      撤销
                    </button>
                    <button type="button" className="icon-button danger-button" onClick={() => setPendingAction({ type: "delete", apiKey })} title="删除 API Key">
                      <Trash2 size={16} aria-hidden="true" />
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
