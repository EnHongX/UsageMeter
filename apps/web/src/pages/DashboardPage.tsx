import { Activity, AlertTriangle, BarChart3, Building2, CreditCard, GaugeCircle, KeyRound, LayoutDashboard, ServerCog, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { listApiKeys, listBillingRuns, listDailyUsage, listExceptions, listInvoices, listSystemJobs, listTenants } from "../api/client";
import type { ApiKey, BillingRun, ExceptionCase, Invoice, SystemJobRun, UsageDailyAggregate } from "../api/client";
import { EChart } from "../components/EChart";
import { formatMoney } from "../utils/money";
import type { BillingCurrency } from "../utils/money";

type RangeKey = "week" | "month" | "lastMonth";

type DashboardData = {
  tenants: number;
  apiKeys: ApiKey[];
  dailyUsage: UsageDailyAggregate[];
  invoices: Invoice[];
  billingRuns: BillingRun[];
  exceptions: ExceptionCase[];
  systemJobs: SystemJobRun[];
};

type ChartPoint = {
  label: string;
  value: number;
};

const rangeOptions: Array<{ key: RangeKey; label: string }> = [
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "lastMonth", label: "上月" }
];

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getRange(range: RangeKey) {
  const today = startOfDay(new Date());

  if (range === "week") {
    return { start: addDays(today, -6), end: today };
  }

  if (range === "lastMonth") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0)
    };
  }

  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: today
  };
}

function buildEmptySeries(range: RangeKey) {
  const { start, end } = getRange(range);
  const series: ChartPoint[] = [];

  for (let day = start; day <= end; day = addDays(day, 1)) {
    series.push({ label: formatShortDate(day), value: 0 });
  }

  return series;
}

function isInRange(value: string | undefined, range: RangeKey) {
  const date = value ? startOfDay(new Date(value)) : startOfDay(new Date());
  const { start, end } = getRange(range);

  return date >= start && date <= end;
}

function groupByDay(range: RangeKey, items: Array<{ date?: string; value: number }>) {
  const series = buildEmptySeries(range);
  const lookup = new Map(series.map((point) => [point.label, point]));

  items.forEach((item) => {
    const date = item.date ? new Date(item.date) : new Date();
    const key = formatShortDate(date);
    const point = lookup.get(key);

    if (point) {
      point.value += item.value;
    }
  });

  return series;
}

function sumInvoices(invoices: Invoice[], currency: BillingCurrency) {
  return invoices
    .filter((invoice) => invoice.billingCurrency === currency)
    .reduce((total, invoice) => total + invoice.totalAmount, 0);
}

function buildUsageOption(points: ChartPoint[]): EChartsOption {
  return {
    color: ["#0f766e"],
    grid: { left: 42, right: 18, top: 24, bottom: 34 },
    tooltip: { trigger: "axis", valueFormatter: (value) => `${value} 额度` },
    xAxis: { type: "category", boundaryGap: false, data: points.map((point) => point.label) },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#e8eef5" } } },
    series: [
      {
        name: "消耗额度",
        type: "line",
        smooth: true,
        symbolSize: 7,
        areaStyle: { opacity: 0.08 },
        lineStyle: { width: 3 },
        data: points.map((point) => point.value)
      }
    ]
  };
}

function buildApiKeyOption(points: ChartPoint[]): EChartsOption {
  return {
    color: ["#4f46e5"],
    grid: { left: 36, right: 16, top: 24, bottom: 34 },
    tooltip: { trigger: "axis", valueFormatter: (value) => `${value} 个` },
    xAxis: { type: "category", data: points.map((point) => point.label) },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#e8eef5" } } },
    series: [
      {
        name: "新增 Key",
        type: "bar",
        barMaxWidth: 34,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: points.map((point) => point.value)
      }
    ]
  };
}

function buildRevenueTrendOption(cnyPoints: ChartPoint[], usdPoints: ChartPoint[]): EChartsOption {
  return {
    color: ["#0f766e", "#4f46e5"],
    legend: { top: 0, right: 8 },
    grid: { left: 52, right: 18, top: 42, bottom: 34 },
    tooltip: {
      trigger: "axis",
      formatter: (params: unknown) => {
        const items = Array.isArray(params) ? params : [params];
        return items
          .map((item) => {
            const point = item as { marker?: string; seriesName?: string; name?: string; value?: number };
            const currency = point.seriesName === "美元" ? "USD" : "CNY";
            return `${point.marker ?? ""}${point.seriesName ?? ""} ${point.name ?? ""}: ${formatMoney(Number(point.value ?? 0), currency)}`;
          })
          .join("<br/>");
      }
    },
    xAxis: { type: "category", boundaryGap: false, data: cnyPoints.map((point) => point.label) },
    yAxis: { type: "value", axisLabel: { formatter: (value: number) => `${value / 100}` }, splitLine: { lineStyle: { color: "#e8eef5" } } },
    series: [
      {
        name: "人民币",
        type: "line",
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        data: cnyPoints.map((point) => point.value)
      },
      {
        name: "美元",
        type: "line",
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        data: usdPoints.map((point) => point.value)
      }
    ]
  };
}

function buildRevenuePieOption(cnyRevenue: number, usdRevenue: number): EChartsOption {
  return {
    color: ["#0f766e", "#4f46e5"],
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const item = params as { name?: string; value?: number; percent?: number };
        const currency = item.name === "人民币" ? "CNY" : "USD";
        return `${item.name ?? ""}<br/>${formatMoney(Number(item.value ?? 0), currency)} (${item.percent ?? 0}%)`;
      }
    },
    legend: { bottom: 0, left: "center" },
    series: [
      {
        name: "收益构成",
        type: "pie",
        radius: ["48%", "72%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        label: { formatter: "{b}\n{d}%" },
        data: [
          { name: "人民币", value: cnyRevenue },
          { name: "美元", value: usdRevenue }
        ]
      }
    ]
  };
}

export function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("week");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    tenants: 0,
    apiKeys: [],
    dailyUsage: [],
    invoices: [],
    billingRuns: [],
    exceptions: [],
    systemJobs: []
  });

  useEffect(() => {
    Promise.all([listTenants(), listApiKeys(), listDailyUsage(), listInvoices(), listBillingRuns(), listExceptions(), listSystemJobs()])
      .then(([tenants, apiKeys, dailyUsage, invoices, billingRuns, exceptions, systemJobs]) => {
        setError(null);
        setData({
          tenants: tenants.length,
          apiKeys,
          dailyUsage,
          invoices,
          billingRuns,
          exceptions,
          systemJobs
        });
      })
      .catch(() => {
        setError("仪表盘数据加载失败，请确认已登录且后端服务可用。");
        setData({
          tenants: 0,
          apiKeys: [],
          dailyUsage: [],
          invoices: [],
          billingRuns: [],
          exceptions: [],
          systemJobs: []
        });
      });
  }, []);

  const scoped = useMemo(() => {
    const apiKeys = data.apiKeys.filter((apiKey) => isInRange(apiKey.createdAt, range));
    const dailyUsage = data.dailyUsage.filter((usage) => isInRange(usage.date, range));
    const invoices = data.invoices.filter((invoice) => isInRange(invoice.createdAt ?? `${invoice.billingPeriod}-01`, range));
    const apiKeySeries = groupByDay(
      range,
      apiKeys.map((apiKey) => ({ date: apiKey.createdAt, value: 1 }))
    );
    const usageSeries = groupByDay(
      range,
      dailyUsage.map((usage) => ({ date: usage.date, value: usage.totalCostUnits }))
    );
    const revenueSeries = groupByDay(
      range,
      invoices.map((invoice) => ({ date: invoice.createdAt ?? `${invoice.billingPeriod}-01`, value: invoice.totalAmount }))
    );
    const cnyRevenueSeries = groupByDay(
      range,
      invoices.filter((invoice) => invoice.billingCurrency === "CNY").map((invoice) => ({ date: invoice.createdAt ?? `${invoice.billingPeriod}-01`, value: invoice.totalAmount }))
    );
    const usdRevenueSeries = groupByDay(
      range,
      invoices.filter((invoice) => invoice.billingCurrency === "USD").map((invoice) => ({ date: invoice.createdAt ?? `${invoice.billingPeriod}-01`, value: invoice.totalAmount }))
    );
    const cnyRevenue = sumInvoices(invoices, "CNY");
    const usdRevenue = sumInvoices(invoices, "USD");

    return {
      apiKeys,
      dailyUsage,
      invoices,
      apiKeySeries,
      usageSeries,
      revenueSeries,
      cnyRevenueSeries,
      usdRevenueSeries,
      totalUsage: dailyUsage.reduce((total, usage) => total + usage.totalCostUnits, 0),
      totalRequests: dailyUsage.reduce((total, usage) => total + usage.totalRequests, 0),
      cnyRevenue,
      usdRevenue
    };
  }, [data, range]);

  return (
    <section className="page-section dashboard-page">
      {error ? <div className="empty-state">{error}</div> : null}
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">总览</p>
          <h1 className="heading-with-icon">
            <LayoutDashboard size={28} aria-hidden="true" />
            UsageMeter 仪表盘
          </h1>
          <p>查看租户增长、API Key 新增、用量消耗和分币种收益，辅助运营和计费排查。</p>
        </div>
        <div className="dashboard-hero-icon">
          <GaugeCircle size={42} aria-hidden="true" />
        </div>
      </div>

      <div className="dashboard-toolbar" aria-label="仪表盘时间范围">
        {rangeOptions.map((option) => (
          <button key={option.key} type="button" className={range === option.key ? "tab-button active" : "tab-button"} onClick={() => setRange(option.key)}>
            {option.label}
          </button>
        ))}
      </div>

      <div className="metric-grid">
        <article className="metric-card accent-teal">
          <span>
            <Building2 size={18} aria-hidden="true" />
            租户总数
          </span>
          <strong>{data.tenants}</strong>
        </article>
        <article className="metric-card accent-indigo">
          <span>
            <KeyRound size={18} aria-hidden="true" />
            API Key 总数
          </span>
          <strong>{data.apiKeys.length}</strong>
        </article>
        <article className="metric-card accent-amber">
          <span>
            <BarChart3 size={18} aria-hidden="true" />
            新增 Key
          </span>
          <strong>{scoped.apiKeys.length}</strong>
        </article>
        <article className="metric-card accent-rose">
          <span>
            <CreditCard size={18} aria-hidden="true" />
            人民币收益
          </span>
          <strong className="money-pair">{formatMoney(scoped.cnyRevenue, "CNY")}</strong>
        </article>
        <article className="metric-card accent-blue">
          <span>
            <CreditCard size={18} aria-hidden="true" />
            美元收益
          </span>
          <strong className="money-pair">{formatMoney(scoped.usdRevenue, "USD")}</strong>
        </article>
        <article className="metric-card accent-rose">
          <span>
            <AlertTriangle size={18} aria-hidden="true" />
            待处理异常
          </span>
          <strong>{data.exceptions.filter((item) => item.status !== "RESOLVED").length}</strong>
        </article>
        <article className="metric-card accent-slate">
          <span>
            <ServerCog size={18} aria-hidden="true" />
            失败任务
          </span>
          <strong>{data.systemJobs.filter((job) => job.status === "FAILED").length}</strong>
        </article>
        <article className="metric-card accent-amber">
          <span>
            <CreditCard size={18} aria-hidden="true" />
            账单失败
          </span>
          <strong>{data.billingRuns.filter((run) => run.status === "FAILED").length}</strong>
        </article>
      </div>

      <div className="dashboard-insights">
        <article className="chart-card chart-card-wide">
          <div className="panel-title">
            <div>
              <h2>用量趋势</h2>
              <p>{scoped.totalRequests} 次请求，消耗 {scoped.totalUsage} 额度。</p>
            </div>
            <Activity size={22} aria-hidden="true" />
          </div>
          <EChart className="echart-large" ariaLabel="用量趋势图" option={buildUsageOption(scoped.usageSeries)} />
        </article>
        <article className="chart-card chart-card-compact">
          <div className="panel-title">
            <div>
              <h2>收益构成</h2>
              <p>人民币和美元按当前时间范围内账单金额占比展示。</p>
            </div>
            <CreditCard size={22} aria-hidden="true" />
          </div>
          <EChart className="echart-pie" ariaLabel="收益币种占比图" option={buildRevenuePieOption(scoped.cnyRevenue, scoped.usdRevenue)} />
        </article>
        <article className="chart-card chart-card-large">
          <div className="panel-title">
            <div>
              <h2>收益趋势</h2>
              <p>{scoped.invoices.length} 张账单，人民币和美元独立展示。</p>
            </div>
            <TrendingUp size={22} aria-hidden="true" />
          </div>
          <EChart ariaLabel="收益趋势图" option={buildRevenueTrendOption(scoped.cnyRevenueSeries, scoped.usdRevenueSeries)} />
        </article>
        <article className="chart-card chart-card-large">
          <div className="panel-title">
            <div>
              <h2>API Key 新增</h2>
              <p>按创建时间统计新增 Key 数量。</p>
            </div>
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <EChart ariaLabel="API Key 新增趋势图" option={buildApiKeyOption(scoped.apiKeySeries)} />
        </article>
      </div>
    </section>
  );
}
