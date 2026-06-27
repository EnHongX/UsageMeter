# Minimal Launch Loop UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three approved frontend pages for UsageMeter's minimal launch loop: billing generation, limit monitoring, and exception handling.

**Architecture:** Implement the pages as UI-only React routes that reuse existing API client methods and existing visual patterns. Derive operational states in the browser from tenants, daily usage, usage events, and invoices; do not add backend algorithms or pretend unavailable actions are active.

**Tech Stack:** React 18, Vite, React Router, TypeScript, Vitest, Testing Library, lucide-react.

---

## File Structure

- Modify `apps/web/src/App.tsx`: add routes for `/limits`, `/billing-runs`, and `/exceptions`.
- Modify `apps/web/src/components/AppShell.tsx`: add sidebar links for the new pages.
- Create `apps/web/src/pages/LaunchLoopPages.tsx`: contains the three focused UI pages and small local helpers for derived state.
- Modify `apps/web/tests/App.test.tsx`: add failing tests first for navigation and page behavior.
- Modify `apps/web/src/styles/global.css`: add only small reusable styles for progress bars and disabled action hints if existing classes are insufficient.

## Tasks

### Task 1: Navigation And Route Smoke Tests

**Files:**
- Modify: `apps/web/tests/App.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/AppShell.tsx`

- [ ] **Step 1: Write failing tests**

Add tests that navigate to `/limits`, `/billing-runs`, and `/exceptions`, expecting headings and sidebar links.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: fail because routes and links do not exist yet.

- [ ] **Step 3: Add minimal route and navigation wiring**

Import the new page components in `App.tsx`, add route entries, and add sidebar links in `AppShell.tsx`.

- [ ] **Step 4: Run tests to verify route smoke tests pass**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: tests progress past route-not-found failures.

### Task 2: Billing Generation Center

**Files:**
- Create/modify: `apps/web/src/pages/LaunchLoopPages.tsx`
- Modify: `apps/web/tests/App.test.tsx`

- [ ] **Step 1: Write failing billing test**

Expect `/billing-runs` to show `账单生成中心`, period filter, disabled `生成账单` action, status metrics, and a link to an existing invoice detail.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: fail because billing center UI is missing.

- [ ] **Step 3: Implement minimal billing page**

Use `listTenants`, `listDailyUsage`, and `listInvoices`. Show current month rows, derive existing invoice state, and disable generation until backend endpoint exists.

- [ ] **Step 4: Run tests**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: billing test passes.

### Task 3: Limit Monitoring

**Files:**
- Modify: `apps/web/src/pages/LaunchLoopPages.tsx`
- Modify: `apps/web/tests/App.test.tsx`
- Modify: `apps/web/src/styles/global.css`

- [ ] **Step 1: Write failing limit-monitoring test**

Expect `/limits` to show `额度与限流监控`, usage risk labels `正常`, `预警`, `超限`, and 429 count.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: fail because limit page behavior is missing.

- [ ] **Step 3: Implement derived usage-risk UI**

Calculate usage percentage from `totalCostUnits / plan.dailyUnitLimit`, classify risk, and render compact progress bars.

- [ ] **Step 4: Run tests**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: limit test passes.

### Task 4: Exception Center

**Files:**
- Modify: `apps/web/src/pages/LaunchLoopPages.tsx`
- Modify: `apps/web/tests/App.test.tsx`

- [ ] **Step 1: Write failing exception test**

Expect `/exceptions` to show derived authentication, rate-limit, and server exceptions from usage events, with jump links to logs.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: fail because exception page behavior is missing.

- [ ] **Step 3: Implement derived exception list**

Classify `401/403`, `429`, and `>=500` usage events. Keep duplicate request and billing failure as empty-state extension points.

- [ ] **Step 4: Run tests**

Run: `npm test -w apps/web -- App.test.tsx`

Expected: exception test passes.

### Task 5: Verification

**Files:**
- All touched frontend files.

- [ ] **Step 1: Run focused frontend tests**

Run: `npm test -w apps/web -- App.test.tsx`

- [ ] **Step 2: Run frontend typecheck**

Run: `npm run typecheck -w apps/web`

- [ ] **Step 3: Run frontend build**

Run: `npm run build -w apps/web`

- [ ] **Step 4: Review git diff**

Run: `git diff -- apps/web/src/App.tsx apps/web/src/components/AppShell.tsx apps/web/src/pages/LaunchLoopPages.tsx apps/web/src/styles/global.css apps/web/tests/App.test.tsx`
