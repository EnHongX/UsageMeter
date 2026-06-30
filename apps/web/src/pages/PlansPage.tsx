import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPlan, listPlans, Plan, updatePlan } from "../api/client";
import { Modal } from "../components/Modal";
import { PaginationControls, usePagination } from "../components/Pagination";
import { formatMoney } from "../utils/money";
import type { BillingCurrency } from "../utils/money";

export function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const filteredPlans = useMemo(() => {
    const keyword = nameFilter.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesName = keyword ? plan.name.toLowerCase().includes(keyword) : true;
      const matchesCurrency = currencyFilter ? plan.billingCurrency === currencyFilter : true;
      return matchesName && matchesCurrency;
    });
  }, [currencyFilter, nameFilter, plans]);
  const pagination = usePagination(filteredPlans);

  async function loadPlans() {
    setPlans(await listPlans());
  }

  useEffect(() => {
    loadPlans().catch(() => setError("套餐加载失败"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const input = {
      name: String(form.get("name")),
      billingCurrency: String(form.get("billingCurrency")) as BillingCurrency,
      monthlyBaseFee: Number(form.get("monthlyBaseFee")),
      includedUnits: Number(form.get("includedUnits")),
      dailyUnitLimit: Number(form.get("dailyUnitLimit")),
      overageUnitPrice: Number(form.get("overageUnitPrice"))
    };

    await createPlan(input);
    setIsCreateOpen(false);
    await loadPlans();
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingPlan) {
      return;
    }

    const form = new FormData(event.currentTarget);
    await updatePlan(editingPlan.id, {
      name: String(form.get("name")),
      billingCurrency: String(form.get("billingCurrency")) as BillingCurrency,
      monthlyBaseFee: Number(form.get("monthlyBaseFee")),
      includedUnits: Number(form.get("includedUnits")),
      dailyUnitLimit: Number(form.get("dailyUnitLimit")),
      overageUnitPrice: Number(form.get("overageUnitPrice"))
    });
    setEditingPlan(null);
    await loadPlans();
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">业务管理</p>
        <h1>套餐</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="list-toolbar">
        <div className="filter-panel compact-filter inline-filter">
          <input value={nameFilter} onChange={(event) => setNameFilter(event.target.value)} placeholder="按套餐名称筛选" />
          <select value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)} aria-label="按套餐币种筛选">
            <option value="">全部币种</option>
            <option value="CNY">人民币 CNY</option>
            <option value="USD">美元 USD</option>
          </select>
        </div>
        <button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          创建套餐
        </button>
      </div>
      {isCreateOpen ? (
        <Modal title="创建套餐" onClose={() => setIsCreateOpen(false)}>
          <form className="modal-form" onSubmit={handleSubmit}>
            <input name="name" placeholder="套餐名称" required />
            <select name="billingCurrency" required defaultValue="CNY">
              <option value="CNY">人民币 CNY</option>
              <option value="USD">美元 USD</option>
            </select>
            <input name="monthlyBaseFee" type="number" min="0" placeholder="基础费用（分/美分）" required />
            <input name="includedUnits" type="number" min="0" placeholder="包含额度" required />
            <input name="dailyUnitLimit" type="number" min="1" placeholder="每日额度" required />
            <input name="overageUnitPrice" type="number" min="0" placeholder="超额单价（分/美分）" required />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(false)}>取消</button>
              <button type="submit">创建</button>
            </div>
          </form>
        </Modal>
      ) : null}
      {editingPlan ? (
        <Modal title="编辑套餐" onClose={() => setEditingPlan(null)}>
          <form className="modal-form" onSubmit={handleEditSubmit}>
            <input name="name" placeholder="套餐名称" required defaultValue={editingPlan.name} />
            <select name="billingCurrency" required defaultValue={editingPlan.billingCurrency}>
              <option value="CNY">人民币 CNY</option>
              <option value="USD">美元 USD</option>
            </select>
            <input name="monthlyBaseFee" type="number" min="0" placeholder="基础费用（分/美分）" required defaultValue={editingPlan.monthlyBaseFee} />
            <input name="includedUnits" type="number" min="0" placeholder="包含额度" required defaultValue={editingPlan.includedUnits} />
            <input name="dailyUnitLimit" type="number" min="1" placeholder="每日额度" required defaultValue={editingPlan.dailyUnitLimit} />
            <input name="overageUnitPrice" type="number" min="0" placeholder="超额单价（分/美分）" required defaultValue={editingPlan.overageUnitPrice} />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setEditingPlan(null)}>取消</button>
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
              <th>币种</th>
              <th>基础费用</th>
              <th>包含额度</th>
              <th>每日额度</th>
              <th>超额单价</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((plan) => (
              <tr key={plan.id}>
                <td>{plan.name}</td>
                <td>{plan.billingCurrency}</td>
                <td>{formatMoney(plan.monthlyBaseFee, plan.billingCurrency)}</td>
                <td>{plan.includedUnits}</td>
                <td>{plan.dailyUnitLimit}</td>
                <td>{formatMoney(plan.overageUnitPrice, plan.billingCurrency)}</td>
                <td>
                  <div className="action-group">
                    <Link className="secondary-button" to={`/plans/${plan.id}`}>
                      <Eye size={16} aria-hidden="true" />
                      详情
                    </Link>
                    <button type="button" className="secondary-button" onClick={() => setEditingPlan(plan)}>
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
