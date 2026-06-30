import { useMemo } from "react";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { IntegrationPage } from "./pages/IntegrationPage";
import { BillingRunsPage, ExceptionsPage, LimitsPage } from "./pages/LaunchLoopPages";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PlansPage } from "./pages/PlansPage";
import { RateLimitsPage } from "./pages/RateLimitsPage";
import { RevenuePage } from "./pages/RevenuePage";
import { LogsPage, PasswordSettingsPage, SystemSettingsPage } from "./pages/SettingsPage";
import { SystemJobsPage } from "./pages/SystemJobsPage";
import { TenantsPage } from "./pages/TenantsPage";
import { UsagePage } from "./pages/UsagePage";
import { PlanDetailPage, TenantDetailPage, ApiKeyDetailPage, InvoiceDetailPage } from "./pages/DetailPages";

function createRouter() {
  return createBrowserRouter([
    { path: "/login", element: <AuthPage /> },
    {
      path: "/",
      element: <RequireAuth />,
      children: [
        {
          element: <AppShell />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: "tenants", element: <TenantsPage /> },
            { path: "tenants/:id", element: <TenantDetailPage /> },
            { path: "plans", element: <PlansPage /> },
            { path: "plans/:id", element: <PlanDetailPage /> },
            { path: "api-keys", element: <ApiKeysPage /> },
            { path: "api-keys/:id", element: <ApiKeyDetailPage /> },
            { path: "usage", element: <UsagePage /> },
            { path: "limits", element: <LimitsPage /> },
            { path: "revenue", element: <RevenuePage /> },
            { path: "invoices", element: <InvoicesPage /> },
            { path: "invoices/:id", element: <InvoiceDetailPage /> },
            { path: "billing-runs", element: <BillingRunsPage /> },
            { path: "exceptions", element: <ExceptionsPage /> },
            { path: "rate-limits", element: <RateLimitsPage /> },
            { path: "notifications", element: <NotificationsPage /> },
            { path: "system/jobs", element: <SystemJobsPage /> },
            { path: "integration", element: <IntegrationPage /> },
            { path: "logs", element: <Navigate to="/logs/audit" replace /> },
            { path: "logs/:category", element: <LogsPage /> },
            { path: "settings", element: <Navigate to="/settings/system" replace /> },
            { path: "settings/system", element: <SystemSettingsPage /> },
            { path: "settings/password", element: <PasswordSettingsPage /> }
          ]
        }
      ]
    }
  ]);
}

export function App() {
  const router = useMemo(() => createRouter(), []);

  return (
    <AuthProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </AuthProvider>
  );
}
