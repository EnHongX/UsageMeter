const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7612";

export type Plan = {
  id: string;
  name: string;
  billingCurrency: "USD" | "CNY";
  monthlyBaseFee: number;
  includedUnits: number;
  dailyUnitLimit: number;
  overageUnitPrice: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PlanInput = {
  name: string;
  billingCurrency: Plan["billingCurrency"];
  monthlyBaseFee: number;
  includedUnits: number;
  dailyUnitLimit: number;
  overageUnitPrice: number;
};

export type Tenant = {
  id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  planId: string;
  plan?: Plan;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiKey = {
  id: string;
  tenantId: string;
  keyPrefix: string;
  name: string;
  status: "ACTIVE" | "REVOKED";
  createdAt?: string;
  revokedAt: string | null;
  tenant?: Pick<Tenant, "id" | "name" | "status">;
};

export type CreatedApiKey = ApiKey & {
  key: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
};

export type UsageEvent = {
  id: string;
  requestId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  costUnits: number;
  occurredAt?: string;
  tenant?: Pick<Tenant, "id" | "name" | "status">;
  apiKey?: Pick<ApiKey, "id" | "name" | "keyPrefix" | "status">;
};

export type UsageDailyAggregate = {
  id: string;
  date: string;
  totalRequests: number;
  totalCostUnits: number;
  tenant?: Pick<Tenant, "id" | "name" | "status">;
};

export type Invoice = {
  id: string;
  billingPeriod: string;
  billingCurrency: "USD" | "CNY";
  usedUnits: number;
  overageUnits: number;
  totalAmount: number;
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  tenant?: Pick<Tenant, "id" | "name" | "status">;
  lineItems: Array<{ id?: string; description: string }>;
  baseFee?: number;
  includedUnits?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SystemSettings = {
  systemName: string;
  defaultPageSize: number;
  allowRegistration: boolean;
  billingCurrency: "USD" | "CNY";
};

export type AuditLog = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  createdAt: string;
  user?: Pick<CurrentUser, "id" | "name" | "email" | "role"> | null;
};

export type OperationalStatus = "ACTIVE" | "DISABLED";
export type JobRunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RateLimitPolicy = {
  id: string;
  scope: "PLAN" | "TENANT";
  tenantId: string | null;
  planId: string | null;
  dailyUnitLimit: number;
  warningThresholdPercent: number;
  status: OperationalStatus;
  createdAt?: string;
  updatedAt?: string;
  tenant?: Pick<Tenant, "id" | "name" | "status"> | null;
  plan?: Pick<Plan, "id" | "name" | "dailyUnitLimit"> | null;
};

export type RateLimitPolicyInput = {
  scope: RateLimitPolicy["scope"];
  tenantId?: string | null;
  planId?: string | null;
  dailyUnitLimit: number;
  warningThresholdPercent: number;
  status: OperationalStatus;
};

export type RateLimitEvent = {
  id: string;
  requestId: string;
  endpoint: string;
  costUnits: number;
  limitUnits: number;
  usedUnits: number;
  reason: string;
  occurredAt?: string;
  tenant?: Pick<Tenant, "id" | "name" | "status">;
  apiKey?: Pick<ApiKey, "id" | "name" | "keyPrefix" | "status"> | null;
  policy?: Pick<RateLimitPolicy, "id" | "scope" | "dailyUnitLimit" | "warningThresholdPercent" | "status"> | null;
};

export type BillingRun = {
  id: string;
  tenantId: string;
  invoiceId: string | null;
  billingPeriod: string;
  status: JobRunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  failureReason: string | null;
  createdAt?: string;
  updatedAt?: string;
  tenant?: Pick<Tenant, "id" | "name" | "status">;
  invoice?: Pick<Invoice, "id" | "billingPeriod" | "status" | "totalAmount" | "billingCurrency"> | null;
};

export type BillingRunInput = {
  tenantId: string;
  billingPeriod: string;
  invoiceId?: string | null;
  status?: JobRunStatus;
  failureReason?: string | null;
};

export type ExceptionCase = {
  id: string;
  tenantId: string | null;
  type: "AUTH_FAILURE" | "RATE_LIMITED" | "BILLING_FAILED" | "JOB_FAILED" | "USAGE_ANOMALY" | "SYSTEM_ERROR";
  severity: ExceptionSeverity;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  source: string;
  resourceType: string | null;
  resourceId: string | null;
  summary: string;
  details: string | null;
  assignee: string | null;
  openedAt: string;
  resolvedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  tenant?: Pick<Tenant, "id" | "name" | "status"> | null;
  notes?: ExceptionNote[];
};

export type ExceptionNote = {
  id: string;
  exceptionId: string;
  userId: string | null;
  body: string;
  createdAt: string;
  user?: Pick<CurrentUser, "id" | "name" | "email" | "role"> | null;
};

export type NotificationChannel = {
  id: string;
  name: string;
  type: "WEBHOOK" | "EMAIL";
  target: string;
  status: OperationalStatus;
  lastTestedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  rules?: NotificationRule[];
};

export type NotificationRule = {
  id: string;
  name: string;
  eventType: "USAGE_WARNING" | "RATE_LIMITED" | "BILLING_FAILED" | "JOB_FAILED" | "HIGH_PRIORITY_EXCEPTION";
  severity: ExceptionSeverity | null;
  channelId: string;
  threshold: number | null;
  status: OperationalStatus;
  createdAt?: string;
  updatedAt?: string;
  channel?: NotificationChannel;
};

export type NotificationChannelInput = Pick<NotificationChannel, "name" | "type" | "target" | "status">;
export type NotificationRuleInput = Pick<NotificationRule, "name" | "eventType" | "severity" | "channelId" | "threshold" | "status">;

export type SystemJobRun = {
  id: string;
  jobType: "USAGE_AGGREGATION" | "BILLING_GENERATION" | "NOTIFICATION_DELIVERY" | "DATA_CLEANUP";
  status: JobRunStatus;
  triggeredBy: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  input: unknown;
  output: unknown;
  failureReason: string | null;
  createdAt: string;
};

type ApiResponse<T> = {
  code: string;
  message: string;
  data: T;
};

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return Boolean(value && typeof value === "object" && "code" in value && "message" in value && "data" in value);
}

function normalizeList<T>(value: T[] | { data: T[] }) {
  return Array.isArray(value) ? value : value.data;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown;
    const message = isApiResponse(body) ? body.message : `Request failed with ${response.status}`;
    if (response.status === 401 && path !== "/auth/me" && path !== "/auth/login" && path !== "/auth/register") {
      window.dispatchEvent(new Event("usagemeter:session-expired"));
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as unknown;
  return isApiResponse<T>(body) ? body.data : (body as T);
}

export function getHealth() {
  return request<{ status: string; service: string }>("/health");
}

export function login(input: { email: string; password: string }) {
  return request<{ user: CurrentUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function register(input: { email: string; name: string; password: string }) {
  return request<{ user: CurrentUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function logout() {
  return request<void>("/auth/logout", {
    method: "POST"
  });
}

export function getCurrentUser() {
  return request<{ user: CurrentUser }>("/auth/me");
}

export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return request<void>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listPlans() {
  return normalizeList(await request<Plan[] | { data: Plan[] }>("/plans"));
}

export function getPlan(id: string) {
  return request<Plan>(`/plans/${id}`);
}

export function createPlan(input: PlanInput) {
  return request<Plan>("/plans", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updatePlan(id: string, input: Partial<PlanInput>) {
  return request<Plan>(`/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listTenants() {
  return normalizeList(await request<Tenant[] | { data: Tenant[] }>("/tenants"));
}

export function getTenant(id: string) {
  return request<Tenant>(`/tenants/${id}`);
}

export function createTenant(input: { name: string; planId: string }) {
  return request<Tenant>("/tenants", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateTenant(id: string, input: { name: string; planId: string; status: Tenant["status"] }) {
  return request<Tenant>(`/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listApiKeys() {
  return normalizeList(await request<ApiKey[] | { data: ApiKey[] }>("/api-keys"));
}

export function getApiKey(id: string) {
  return request<ApiKey>(`/api-keys/${id}`);
}

export function createApiKey(input: { tenantId: string; name: string }) {
  return request<CreatedApiKey>("/api-keys", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateApiKey(id: string, input: { name: string }) {
  return request<ApiKey>(`/api-keys/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function revokeApiKey(id: string) {
  return request<ApiKey>(`/api-keys/${id}/revoke`, {
    method: "PATCH"
  });
}

export function deleteApiKey(id: string) {
  return request<void>(`/api-keys/${id}`, {
    method: "DELETE"
  });
}

export async function listUsageEvents() {
  return normalizeList(await request<UsageEvent[] | { data: UsageEvent[] }>("/usage/events"));
}

export async function listDailyUsage() {
  return normalizeList(await request<UsageDailyAggregate[] | { data: UsageDailyAggregate[] }>("/usage/daily"));
}

export async function listInvoices() {
  return normalizeList(await request<Invoice[] | { data: Invoice[] }>("/billing/invoices"));
}

export function getInvoice(id: string) {
  return request<Invoice>(`/billing/invoices/${id}`);
}

export async function listBillingRuns() {
  return normalizeList(await request<BillingRun[] | { data: BillingRun[] }>("/billing/runs"));
}

export function createBillingRun(input: BillingRunInput) {
  return request<BillingRun>("/billing/runs", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function retryBillingRun(id: string) {
  return request<BillingRun>(`/billing/runs/${id}/retry`, {
    method: "PATCH"
  });
}

export async function listRateLimitPolicies() {
  return normalizeList(await request<RateLimitPolicy[] | { data: RateLimitPolicy[] }>("/rate-limits/policies"));
}

export function createRateLimitPolicy(input: RateLimitPolicyInput) {
  return request<RateLimitPolicy>("/rate-limits/policies", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateRateLimitPolicy(id: string, input: Partial<RateLimitPolicyInput>) {
  return request<RateLimitPolicy>(`/rate-limits/policies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listRateLimitEvents() {
  return normalizeList(await request<RateLimitEvent[] | { data: RateLimitEvent[] }>("/rate-limits/events"));
}

export async function listExceptions() {
  return normalizeList(await request<ExceptionCase[] | { data: ExceptionCase[] }>("/exceptions"));
}

export function getException(id: string) {
  return request<ExceptionCase>(`/exceptions/${id}`);
}

export function updateException(id: string, input: Pick<Partial<ExceptionCase>, "status" | "severity" | "assignee">) {
  return request<ExceptionCase>(`/exceptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function createExceptionNote(id: string, input: { body: string }) {
  return request<ExceptionNote>(`/exceptions/${id}/notes`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listNotificationChannels() {
  return normalizeList(await request<NotificationChannel[] | { data: NotificationChannel[] }>("/notifications/channels"));
}

export function createNotificationChannel(input: NotificationChannelInput) {
  return request<NotificationChannel>("/notifications/channels", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateNotificationChannel(id: string, input: Partial<NotificationChannelInput>) {
  return request<NotificationChannel>(`/notifications/channels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function testNotificationChannel(id: string) {
  return request<{ channel: NotificationChannel; delivered: boolean; simulated: boolean }>(`/notifications/channels/${id}/test`, {
    method: "POST"
  });
}

export async function listNotificationRules() {
  return normalizeList(await request<NotificationRule[] | { data: NotificationRule[] }>("/notifications/rules"));
}

export function createNotificationRule(input: NotificationRuleInput) {
  return request<NotificationRule>("/notifications/rules", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateNotificationRule(id: string, input: Partial<NotificationRuleInput>) {
  return request<NotificationRule>(`/notifications/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listSystemJobs() {
  return normalizeList(await request<SystemJobRun[] | { data: SystemJobRun[] }>("/system/jobs"));
}

export function getSystemJob(id: string) {
  return request<SystemJobRun>(`/system/jobs/${id}`);
}

export function getSettings() {
  return request<SystemSettings>("/settings");
}

export function updateSettings(input: SystemSettings) {
  return request<SystemSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function listAuditLogs() {
  return normalizeList(await request<AuditLog[] | { data: AuditLog[] }>("/audit-logs"));
}
