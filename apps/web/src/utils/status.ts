import type { ApiKey, Invoice, Tenant } from "../api/client";

export function formatInvoiceStatus(status: Invoice["status"]) {
  const map = {
    DRAFT: "草稿",
    ISSUED: "已出账",
    PAID: "已支付",
    VOID: "已作废"
  };

  return map[status];
}

export function invoiceStatusClass(status: Invoice["status"]) {
  const map = {
    DRAFT: "status-pill muted",
    ISSUED: "status-pill info",
    PAID: "status-pill success",
    VOID: "status-pill danger"
  };

  return map[status];
}

export function formatApiKeyStatus(status: ApiKey["status"]) {
  return status === "ACTIVE" ? "启用" : "已撤销";
}

export function apiKeyStatusClass(status: ApiKey["status"]) {
  return status === "ACTIVE" ? "status-pill success" : "status-pill danger";
}

export function formatTenantStatus(status: Tenant["status"]) {
  return status === "ACTIVE" ? "启用" : "停用";
}

export function tenantStatusClass(status: Tenant["status"]) {
  return status === "ACTIVE" ? "status-pill success" : "status-pill warning";
}
