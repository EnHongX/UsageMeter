import { CreditCard, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Invoice, listInvoices } from "../api/client";
import { PaginationControls, usePagination } from "../components/Pagination";
import { formatMoney } from "../utils/money";
import { formatInvoiceStatus, invoiceStatusClass } from "../utils/status";

export function RevenuePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tenantFilter, setTenantFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startPeriod, setStartPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const filteredInvoices = useMemo(() => {
    const tenantKeyword = tenantFilter.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesTenant = tenantKeyword ? invoice.tenant?.name.toLowerCase().includes(tenantKeyword) : true;
      const matchesCurrency = currencyFilter ? invoice.billingCurrency === currencyFilter : true;
      const matchesStatus = statusFilter ? invoice.status === statusFilter : true;
      const matchesStart = startPeriod ? invoice.billingPeriod >= startPeriod : true;
      const matchesEnd = endPeriod ? invoice.billingPeriod <= endPeriod : true;
      return matchesTenant && matchesCurrency && matchesStatus && matchesStart && matchesEnd;
    });
  }, [currencyFilter, endPeriod, invoices, startPeriod, statusFilter, tenantFilter]);
  const pagination = usePagination(filteredInvoices);

  useEffect(() => {
    listInvoices()
      .then(setInvoices)
      .catch(() => setError("收益数据加载失败"));
  }, []);

  const summary = useMemo(() => {
    return filteredInvoices.reduce(
      (result, invoice) => {
        result[invoice.billingCurrency] += invoice.totalAmount;
        return result;
      },
      { CNY: 0, USD: 0 }
    );
  }, [filteredInvoices]);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">计量运营</p>
        <h1>收益</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="metric-grid revenue-metrics">
        <article className="metric-card accent-teal">
          <span>
            <CreditCard size={18} aria-hidden="true" />
            人民币收益
          </span>
          <strong>{formatMoney(summary.CNY, "CNY")}</strong>
        </article>
        <article className="metric-card accent-indigo">
          <span>
            <CreditCard size={18} aria-hidden="true" />
            美元收益
          </span>
          <strong>{formatMoney(summary.USD, "USD")}</strong>
        </article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>收益明细</h2>
            <p>来源于账单数据，金额按账单币种独立统计。</p>
          </div>
        </div>
        <div className="filter-panel compact-filter revenue-filter">
          <input className="revenue-filter-tenant" value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
          <select className="revenue-filter-select" value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)} aria-label="按币种筛选">
            <option value="">全部币种</option>
            <option value="CNY">人民币 CNY</option>
            <option value="USD">美元 USD</option>
          </select>
          <select className="revenue-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按账单状态筛选">
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="ISSUED">已出账</option>
            <option value="PAID">已支付</option>
            <option value="VOID">已作废</option>
          </select>
          <div className="period-range-field">
            <span>账期区间</span>
            <div className="period-range-inputs">
              <input value={startPeriod} onChange={(event) => setStartPeriod(event.target.value)} type="month" aria-label="开始账期" />
              <b aria-hidden="true">至</b>
              <input value={endPeriod} onChange={(event) => setEndPeriod(event.target.value)} type="month" aria-label="结束账期" />
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>租户</th>
              <th>账期</th>
              <th>币种</th>
              <th>总金额</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.tenant?.name ?? "-"}</td>
                <td>{invoice.billingPeriod}</td>
                <td>{invoice.billingCurrency}</td>
                <td>{formatMoney(invoice.totalAmount, invoice.billingCurrency)}</td>
                <td>
                  <span className={invoiceStatusClass(invoice.status)}>{formatInvoiceStatus(invoice.status)}</span>
                </td>
                <td>
                  <Link className="secondary-button" to={`/invoices/${invoice.id}`}>
                    <Eye size={16} aria-hidden="true" />
                    详情
                  </Link>
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
