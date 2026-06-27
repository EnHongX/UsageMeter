import { Activity, AlertTriangle, BookOpenText, Building2, ChevronDown, ChevronRight, CreditCard, FileClock, Gauge, KeyRound, LayoutDashboard, LockKeyhole, LogOut, ReceiptText, SearchCheck, Settings, SlidersHorizontal, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const navItems = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard },
  { to: "/tenants", label: "租户", icon: Building2 },
  { to: "/plans", label: "套餐", icon: CreditCard },
  { to: "/api-keys", label: "API Key 管理", icon: KeyRound },
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

const logNavItems = [
  { to: "/logs/audit", label: "操作审计", icon: SearchCheck },
  { to: "/logs/usage", label: "请求日志", icon: Activity },
  { to: "/logs/billing", label: "账单日志", icon: ReceiptText }
];

export function AppShell() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const showSettingsNav = settingsOpen || location.pathname.startsWith("/settings");
  const showLogsNav = logsOpen || location.pathname.startsWith("/logs");

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
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
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
