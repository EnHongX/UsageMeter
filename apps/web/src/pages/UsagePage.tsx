import { useEffect, useState } from "react";
import { Activity, CalendarDays, Gauge } from "lucide-react";
import { listDailyUsage, listUsageEvents, UsageDailyAggregate, UsageEvent } from "../api/client";
import { PaginationControls, usePagination } from "../components/Pagination";

type UsageTab = "daily" | "events";

function statusClass(statusCode: number) {
  if (statusCode >= 500) {
    return "status-pill danger";
  }

  if (statusCode >= 400) {
    return "status-pill warning";
  }

  return "status-pill success";
}

export function UsagePage() {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [dailyUsage, setDailyUsage] = useState<UsageDailyAggregate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UsageTab>("daily");
  const [dailyTenantFilter, setDailyTenantFilter] = useState("");
  const [dailyDateFilter, setDailyDateFilter] = useState("");
  const [eventTenantFilter, setEventTenantFilter] = useState("");
  const [eventRequestFilter, setEventRequestFilter] = useState("");
  const [eventEndpointFilter, setEventEndpointFilter] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState("");
  const filteredDailyUsage = dailyUsage.filter((item) => {
    const matchesTenant = item.tenant?.name.toLowerCase().includes(dailyTenantFilter.trim().toLowerCase()) ?? dailyTenantFilter.trim() === "";
    const matchesDate = dailyDateFilter ? item.date.slice(0, 10) === dailyDateFilter : true;
    return matchesTenant && matchesDate;
  });
  const filteredEvents = events.filter((event) => {
    const tenantKeyword = eventTenantFilter.trim().toLowerCase();
    const requestKeyword = eventRequestFilter.trim().toLowerCase();
    const endpointKeyword = eventEndpointFilter.trim().toLowerCase();
    const matchesTenant = tenantKeyword ? event.tenant?.name.toLowerCase().includes(tenantKeyword) : true;
    const matchesRequest = requestKeyword ? event.requestId.toLowerCase().includes(requestKeyword) : true;
    const matchesEndpoint = endpointKeyword ? event.endpoint.toLowerCase().includes(endpointKeyword) : true;
    const matchesStatus = eventStatusFilter ? String(event.statusCode) === eventStatusFilter : true;
    return matchesTenant && matchesRequest && matchesEndpoint && matchesStatus;
  });
  const eventsPagination = usePagination(filteredEvents);
  const dailyPagination = usePagination(filteredDailyUsage);
  const totalRequests = dailyUsage.reduce((total, item) => total + item.totalRequests, 0);
  const totalCostUnits = dailyUsage.reduce((total, item) => total + item.totalCostUnits, 0);
  const latestDaily = dailyUsage[0];

  async function loadData() {
    const [nextEvents, nextDailyUsage] = await Promise.all([listUsageEvents(), listDailyUsage()]);
    setEvents(nextEvents);
    setDailyUsage(nextDailyUsage);
  }

  useEffect(() => {
    loadData().catch(() => setError("用量数据加载失败"));
  }, []);

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">计量运营</p>
        <h1>用量</h1>
      </div>
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="usage-overview">
        <article className="metric-card accent-teal">
          <span>
            <Activity size={18} aria-hidden="true" />
            请求总数
          </span>
          <strong>{totalRequests}</strong>
        </article>
        <article className="metric-card accent-indigo">
          <span>
            <Gauge size={18} aria-hidden="true" />
            消耗额度
          </span>
          <strong>{totalCostUnits}</strong>
        </article>
        <article className="metric-card accent-amber">
          <span>
            <CalendarDays size={18} aria-hidden="true" />
            最近统计日
          </span>
          <strong>{latestDaily ? latestDaily.date.slice(5, 10) : "-"}</strong>
        </article>
      </div>
      <div className="tab-panel">
        <div className="tab-list" role="tablist" aria-label="用量数据视图">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "daily"}
            className={activeTab === "daily" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("daily")}
          >
            日用量汇总
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "events"}
            className={activeTab === "events" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("events")}
          >
            请求明细
          </button>
        </div>
        {activeTab === "daily" ? (
          <div className="table-panel" role="tabpanel">
            <div className="table-header">
              <div>
                <h2>日用量汇总</h2>
                <p>按租户和日期聚合，用于观察额度消耗和计费口径。</p>
              </div>
            </div>
            <div className="filter-panel">
              <input value={dailyTenantFilter} onChange={(event) => setDailyTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
              <input value={dailyDateFilter} onChange={(event) => setDailyDateFilter(event.target.value)} type="date" aria-label="按日期筛选" />
            </div>
            <table>
              <thead>
                <tr>
                  <th>租户</th>
                  <th>日期</th>
                  <th>请求数</th>
                  <th>总额度</th>
                </tr>
              </thead>
              <tbody>
                {dailyPagination.pageItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.tenant?.name ?? "-"}</td>
                    <td>{item.date.slice(0, 10)}</td>
                    <td>{item.totalRequests}</td>
                    <td>{item.totalCostUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              page={dailyPagination.page}
              totalPages={dailyPagination.totalPages}
              startItem={dailyPagination.startItem}
              endItem={dailyPagination.endItem}
              totalItems={dailyPagination.totalItems}
              canGoPrevious={dailyPagination.canGoPrevious}
              canGoNext={dailyPagination.canGoNext}
              onPrevious={dailyPagination.goPrevious}
              onNext={dailyPagination.goNext}
            />
          </div>
        ) : (
          <div className="table-panel" role="tabpanel">
            <div className="table-header">
              <div>
                <h2>请求明细</h2>
                <p>保留 requestId、接口、状态码和 Key 前缀，用于排查幂等与鉴权问题。</p>
              </div>
            </div>
            <div className="filter-panel">
              <input value={eventTenantFilter} onChange={(event) => setEventTenantFilter(event.target.value)} placeholder="按租户名称筛选" />
              <input value={eventRequestFilter} onChange={(event) => setEventRequestFilter(event.target.value)} placeholder="按请求 ID 筛选" />
              <input value={eventEndpointFilter} onChange={(event) => setEventEndpointFilter(event.target.value)} placeholder="按接口筛选" />
              <select value={eventStatusFilter} onChange={(event) => setEventStatusFilter(event.target.value)} aria-label="按状态码筛选">
                <option value="">全部状态码</option>
                <option value="200">200</option>
                <option value="400">400</option>
                <option value="401">401</option>
                <option value="403">403</option>
                <option value="429">429</option>
                <option value="500">500</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>租户</th>
                  <th>请求 ID</th>
                  <th>接口</th>
                  <th>方法</th>
                  <th>状态码</th>
                  <th>Key 前缀</th>
                  <th>额度</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {eventsPagination.pageItems.map((event) => (
                  <tr key={event.id}>
                    <td>{event.tenant?.name ?? "-"}</td>
                    <td>
                      <code>{event.requestId}</code>
                    </td>
                    <td>{event.endpoint}</td>
                    <td>{event.method}</td>
                    <td>
                      <span className={statusClass(event.statusCode)}>{event.statusCode}</span>
                    </td>
                    <td>{event.apiKey?.keyPrefix ?? "-"}</td>
                    <td>{event.costUnits}</td>
                    <td>{event.occurredAt ? event.occurredAt.slice(0, 16).replace("T", " ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              page={eventsPagination.page}
              totalPages={eventsPagination.totalPages}
              startItem={eventsPagination.startItem}
              endItem={eventsPagination.endItem}
              totalItems={eventsPagination.totalItems}
              canGoPrevious={eventsPagination.canGoPrevious}
              canGoNext={eventsPagination.canGoNext}
              onPrevious={eventsPagination.goPrevious}
              onNext={eventsPagination.goNext}
            />
          </div>
        )}
      </div>
    </section>
  );
}
