import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ServerCog } from "lucide-react";
import { listSystemJobs, SystemJobRun } from "../api/client";

function formatDateTime(value?: string | null) {
  return value ? value.slice(0, 16).replace("T", " ") : "-";
}

function statusClass(status: string) {
  return {
    PENDING: "status-pill muted",
    RUNNING: "status-pill warning",
    SUCCESS: "status-pill success",
    FAILED: "status-pill danger"
  }[status] ?? "status-pill muted";
}

function statusLabel(status: string) {
  return {
    PENDING: "待运行",
    RUNNING: "运行中",
    SUCCESS: "成功",
    FAILED: "失败"
  }[status] ?? status;
}

function jobTypeLabel(type: string) {
  return {
    USAGE_AGGREGATION: "用量聚合",
    BILLING_GENERATION: "账单生成",
    NOTIFICATION_DELIVERY: "通知投递",
    DATA_CLEANUP: "数据清理"
  }[type] ?? type;
}

function formatJson(value: unknown) {
  if (!value) {
    return "-";
  }

  return JSON.stringify(value);
}

export function SystemJobsPage() {
  const [jobs, setJobs] = useState<SystemJobRun[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listSystemJobs()
      .then(setJobs)
      .catch(() => setMessage("系统任务数据加载失败"));
  }, []);

  const filteredJobs = useMemo(
    () => jobs.filter((job) => (typeFilter ? job.jobType === typeFilter : true)).filter((job) => (statusFilter ? job.status === statusFilter : true)),
    [jobs, statusFilter, typeFilter]
  );

  const metrics = useMemo(
    () => ({
      total: jobs.length,
      success: jobs.filter((job) => job.status === "SUCCESS").length,
      failed: jobs.filter((job) => job.status === "FAILED").length,
      avgDuration:
        Math.round(
          jobs.filter((job) => typeof job.durationMs === "number").reduce((total, job) => total + Number(job.durationMs ?? 0), 0) /
            Math.max(jobs.filter((job) => typeof job.durationMs === "number").length, 1)
        ) || 0
    }),
    [jobs]
  );

  return (
    <section className="page-section">
      <div className="page-heading">
        <p className="eyebrow">运营配置</p>
        <h1>系统任务</h1>
      </div>
      {message ? <div className="empty-state">{message}</div> : null}
      <div className="metric-grid">
        <article className="metric-card accent-blue"><span><ServerCog size={18} aria-hidden="true" />运行记录</span><strong>{metrics.total}</strong></article>
        <article className="metric-card accent-teal"><span><CheckCircle2 size={18} aria-hidden="true" />成功</span><strong>{metrics.success}</strong></article>
        <article className="metric-card accent-rose"><span><AlertTriangle size={18} aria-hidden="true" />失败</span><strong>{metrics.failed}</strong></article>
        <article className="metric-card accent-indigo"><span><Clock3 size={18} aria-hidden="true" />平均耗时</span><strong>{metrics.avgDuration}ms</strong></article>
      </div>
      <div className="table-panel">
        <div className="table-header">
          <div>
            <h2>任务运行记录</h2>
            <p>首版只展示任务记录，不实现调度器。</p>
          </div>
        </div>
        <div className="filter-panel compact-filter">
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="按任务类型筛选">
            <option value="">全部任务</option>
            <option value="USAGE_AGGREGATION">用量聚合</option>
            <option value="BILLING_GENERATION">账单生成</option>
            <option value="NOTIFICATION_DELIVERY">通知投递</option>
            <option value="DATA_CLEANUP">数据清理</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="按状态筛选">
            <option value="">全部状态</option>
            <option value="PENDING">待运行</option>
            <option value="RUNNING">运行中</option>
            <option value="SUCCESS">成功</option>
            <option value="FAILED">失败</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>任务类型</th>
              <th>状态</th>
              <th>触发方式</th>
              <th>开始时间</th>
              <th>结束时间</th>
              <th>耗时</th>
              <th>失败原因</th>
              <th>输入</th>
              <th>输出</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => (
              <tr key={job.id}>
                <td>{jobTypeLabel(job.jobType)}</td>
                <td><span className={statusClass(job.status)}>{statusLabel(job.status)}</span></td>
                <td>{job.triggeredBy}</td>
                <td>{formatDateTime(job.startedAt)}</td>
                <td>{formatDateTime(job.finishedAt)}</td>
                <td>{job.durationMs ? `${job.durationMs}ms` : "-"}</td>
                <td>{job.failureReason ?? "-"}</td>
                <td><code>{formatJson(job.input)}</code></td>
                <td><code>{formatJson(job.output)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
