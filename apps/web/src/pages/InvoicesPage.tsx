import { useEffect, useMemo, useState } from "react";
import { Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Invoice, listInvoices } from "../api/client";
import { PaginationControls, usePagination } from "../components/Pagination";
import { formatMoney } from "../utils/money";
import { formatInvoiceStatus, invoiceStatusClass } from "../utils/status";

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tenantFilter, setTenantFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startPeriod, setStartPeriod] = useState("");
  const [endPeriod, setEndPeriod] = useState("");
  const filteredInvoices = useMemo(() => {
    const tenantKeyword = tenantFilter.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesTenant = tenantKeyword ? invoice.tenant?.name.toLowerCase().includes(tenantKeyword) : true;
      const matchesStatus = statusFilter ? invoice.status === statusFilter : true;
      const matchesStart = startPeriod ? invoice.billingPeriod >= startPeriod : true;
      const matchesEnd = endPeriod ? invoice.billingPeriod <= endPeriod : true;
      return matchesTenant && matchesStatus && matchesStart && matchesEnd;
    });
  }, [endPeriod, invoices, startPeriod, statusFilter, tenantFilter]);
  const pagination = usePagination(filteredInvoices);

  async function loadData() {
    setInvoices(await listInvoices());
  }

  useEffect(() => {
    loadData().catch(() => setError("账单数据加载失败"));
  }, []);

  function escapeExcelCell(value: string | number) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function exportInvoices() {
    const rows = filteredInvoices.map((invoice) => [
      invoice.tenant?.name ?? "-",
      invoice.billingPeriod,
      invoice.usedUnits,
      invoice.overageUnits,
      invoice.billingCurrency,
      formatMoney(invoice.totalAmount, invoice.billingCurrency),
      formatInvoiceStatus(invoice.status),
      invoice.lineItems.length
    ]);
    const tableRows = [["租户", "账期", "用量", "超额用量", "币种", "总金额", "状态", "明细数"], ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeExcelCell(cell)}</td>`).join("")}</tr>`)
      .join("");
    const workbook = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${tableRows}</table></body></html>`;
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const range = startPeriod || endPeriod ? `${startPeriod || "all"}_${endPeriod || "all"}` : "all";
    link.href = url;
    link.download = `invoices_${range}.xls`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page-section">
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>账单列表</h2>
            <p>按租户、状态和账期区间查询，导出结果与当前查询条件保持一致。</p>
          </div>
          <button type="button" className="small-export-button" onClick={exportInvoices} disabled={filteredInvoices.length === 0}>
            <Download size={16} aria-hidden="true" />
            导出 Excel
          </button>
        </div>
        <div className="filter-panel compact-filter">
          <input value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按账单状态筛选">
            <option value="">全部状态</option>
            <option value="DRAFT">草稿</option>
            <option value="ISSUED">已出账</option>
            <option value="PAID">已支付</option>
            <option value="VOID">已作废</option>
          </select>
          <label className="compact-field">
            <span>开始账期</span>
            <input value={startPeriod} onChange={(event) => setStartPeriod(event.target.value)} type="month" />
          </label>
          <label className="compact-field">
            <span>结束账期</span>
            <input value={endPeriod} onChange={(event) => setEndPeriod(event.target.value)} type="month" />
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>租户</th>
              <th>账期</th>
              <th>用量</th>
              <th>超额用量</th>
              <th>币种</th>
              <th>总金额</th>
              <th>状态</th>
              <th>明细数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.tenant?.name ?? "-"}</td>
                <td>{invoice.billingPeriod}</td>
                <td>{invoice.usedUnits}</td>
                <td>{invoice.overageUnits}</td>
                <td>{invoice.billingCurrency}</td>
                <td>{formatMoney(invoice.totalAmount, invoice.billingCurrency)}</td>
                <td>
                  <span className={invoiceStatusClass(invoice.status)}>{formatInvoiceStatus(invoice.status)}</span>
                </td>
                <td>{invoice.lineItems.length}</td>
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
