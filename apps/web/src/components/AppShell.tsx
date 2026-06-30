import { Activity, AlertTriangle, BellRing, BookOpenText, Building2, ChevronDown, ChevronRight, CreditCard, FileClock, Gauge, KeyRound, LayoutDashboard, LockKeyhole, LogOut, ReceiptText, SearchCheck, ServerCog, Settings, SlidersHorizontal, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const dashboardNavItem = { to: "/", label: "仪表盘", icon: LayoutDashboard };

const managementNavItems = [
  { to: "/tenants", label: "租户", icon: Building2 },
  { to: "/plans", label: "套餐", icon: CreditCard },
  { to: "/api-keys", label: "API Key 管理", icon: KeyRound }
];

const meteringNavItems = [
  { to: "/usage", label: "用量", icon: Activity },
  { to: "/limits", label: "额度监控", icon: Zap },
  { to: "/revenue", label: "收益", icon: TrendingUp },
  { to: "/invoices", label: "账单", icon: Gauge },
  { to: "/billing-runs", label: "账单生成", icon: ReceiptText },
  { to: "/exceptions", label: "异常中心", icon: AlertTriangle },
  { to: "/integration", label: "接入文档", icon: BookOpenText }
];

const settingNavItems = [
  { to: "/settings/system", label: "系统参数", icon: SlidersHorizontal },
  { to: "/settings/password", label: "修改密码", icon: LockKeyhole }
];

const operationNavItems = [
  { to: "/rate-limits", label: "限流策略", icon: Zap },
  { to: "/notifications", label: "通知配置", icon: BellRing },
  { to: "/system/jobs", label: "系统任务", icon: ServerCog }
];

const logNavItems = [
  { to: "/logs/audit", label: "操作审计", icon: SearchCheck },
  { to: "/logs/usage", label: "请求日志", icon: Activity },
  { to: "/logs/billing", label: "账单日志", icon: ReceiptText }
];

function isGroupActive(pathname: string, items: Array<{ to: string }>) {
  return items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export function AppShell() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [managementOpen, setManagementOpen] = useState(false);
  const [meteringOpen, setMeteringOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const showManagementNav = managementOpen || isGroupActive(location.pathname, managementNavItems);
  const showMeteringNav = meteringOpen || isGroupActive(location.pathname, meteringNavItems);
  const showSettingsNav = settingsOpen || location.pathname.startsWith("/settings");
  const showLogsNav = logsOpen || location.pathname.startsWith("/logs");
  const showOperationsNav = operationsOpen || location.pathname.startsWith("/rate-limits") || location.pathname.startsWith("/notifications") || location.pathname.startsWith("/system");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">U</span>
          <span>
            <strong>UsageMeter</strong>
            <small>API 用量计费平台</small>
          </span>
        </div>
        <nav className="nav-list" aria-label="主导航">
          <NavLink to={dashboardNavItem.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>{dashboardNavItem.label}</span>
          </NavLink>
          <button
            type="button"
            className={showManagementNav ? "nav-link nav-group-button active" : "nav-link nav-group-button"}
            aria-expanded={showManagementNav}
            onClick={() => setManagementOpen((open) => !open)}
          >
            <Building2 size={18} aria-hidden="true" />
            <span>业务管理</span>
            {showManagementNav ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
          {showManagementNav ? (
            <div className="sub-nav" aria-label="业务管理子导航">
              {managementNavItems.map((subItem) => {
                const SubIcon = subItem.icon;

                return (
                  <NavLink key={subItem.to} to={subItem.to} className={({ isActive }) => (isActive ? "sub-nav-link active" : "sub-nav-link")}>
                    <SubIcon size={15} aria-hidden="true" />
                    <span>{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            className={showMeteringNav ? "nav-link nav-group-button active" : "nav-link nav-group-button"}
            aria-expanded={showMeteringNav}
            onClick={() => setMeteringOpen((open) => !open)}
          >
            <Activity size={18} aria-hidden="true" />
            <span>计量运营</span>
            {showMeteringNav ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
          {showMeteringNav ? (
            <div className="sub-nav" aria-label="计量运营子导航">
              {meteringNavItems.map((subItem) => {
                const SubIcon = subItem.icon;

                return (
                  <NavLink key={subItem.to} to={subItem.to} className={({ isActive }) => (isActive ? "sub-nav-link active" : "sub-nav-link")}>
                    <SubIcon size={15} aria-hidden="true" />
                    <span>{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            className={showOperationsNav ? "nav-link nav-group-button active" : "nav-link nav-group-button"}
            aria-expanded={showOperationsNav}
            onClick={() => setOperationsOpen((open) => !open)}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>运营配置</span>
            {showOperationsNav ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
          {showOperationsNav ? (
            <div className="sub-nav" aria-label="运营配置子导航">
              {operationNavItems.map((subItem) => {
                const SubIcon = subItem.icon;

                return (
                  <NavLink key={subItem.to} to={subItem.to} className={({ isActive }) => (isActive ? "sub-nav-link active" : "sub-nav-link")}>
                    <SubIcon size={15} aria-hidden="true" />
                    <span>{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            className={location.pathname.startsWith("/logs") ? "nav-link nav-group-button active" : "nav-link nav-group-button"}
            aria-expanded={showLogsNav}
            onClick={() => setLogsOpen((open) => !open)}
          >
            <FileClock size={18} aria-hidden="true" />
            <span>日志</span>
            {showLogsNav ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
          {showLogsNav ? (
            <div className="sub-nav" aria-label="日志子导航">
              {logNavItems.map((subItem) => {
                const SubIcon = subItem.icon;

                return (
                  <NavLink key={subItem.to} to={subItem.to} className={({ isActive }) => (isActive ? "sub-nav-link active" : "sub-nav-link")}>
                    <SubIcon size={15} aria-hidden="true" />
                    <span>{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
          <button
            type="button"
            className={location.pathname.startsWith("/settings") ? "nav-link nav-group-button active" : "nav-link nav-group-button"}
            aria-expanded={showSettingsNav}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <Settings size={18} aria-hidden="true" />
            <span>设置</span>
            {showSettingsNav ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          </button>
          {showSettingsNav ? (
            <div className="sub-nav" aria-label="设置子导航">
              {settingNavItems.map((subItem) => {
                const SubIcon = subItem.icon;

                return (
                  <NavLink key={subItem.to} to={subItem.to} className={({ isActive }) => (isActive ? "sub-nav-link active" : "sub-nav-link")}>
                    <SubIcon size={15} aria-hidden="true" />
                    <span>{subItem.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-meta">
            <strong>{user?.name}</strong>
            <small>{user?.role}</small>
          </div>
          <button type="button" className="logout-button" onClick={() => signOut()}>
            <LogOut size={16} aria-hidden="true" />
            退出
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
