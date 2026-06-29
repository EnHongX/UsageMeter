# Operations Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a page-first operations console with lightweight backend tables and APIs for rate limits, billing runs, exceptions, notifications, and system jobs.

**Architecture:** Add Prisma models and focused Express modules that expose authenticated CRUD-style APIs. Extend the React admin with dense operational pages that read and write real data while deferring hard billing, rate limiting, delivery, and scheduling logic.

**Tech Stack:** Prisma, PostgreSQL, Express, Zod, React, Vite, React Router, Vitest, Jest, Supertest.

---

### Task 1: Database Models and Seed Data

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add Prisma enums and models**

Add models for `RateLimitPolicy`, `RateLimitEvent`, `BillingRun`, `ExceptionCase`, `ExceptionNote`, `NotificationChannel`, `NotificationRule`, and `SystemJobRun`.

- [ ] **Step 2: Connect relations**

Connect tenant, plan, api key, invoice, and user relations where the UI needs names or status.

- [ ] **Step 3: Add seed records**

Seed representative policies, events, billing runs, exception cases, notification channels/rules, and job runs.

- [ ] **Step 4: Validate Prisma schema**

Run: `npm run db:generate -w apps/api`

Expected: Prisma client generation succeeds.

### Task 2: Lightweight Backend APIs

**Files:**
- Create: `apps/api/src/modules/rateLimits/rateLimits.routes.ts`
- Create: `apps/api/src/modules/exceptions/exceptions.routes.ts`
- Create: `apps/api/src/modules/notifications/notifications.routes.ts`
- Create: `apps/api/src/modules/systemJobs/systemJobs.routes.ts`
- Modify: `apps/api/src/modules/billing/billing.routes.ts`
- Modify: `apps/api/src/routes.ts`

- [ ] **Step 1: Add rate limit routes**

Expose `GET /rate-limits/policies`, `POST /rate-limits/policies`, `PATCH /rate-limits/policies/:id`, and `GET /rate-limits/events`.

- [ ] **Step 2: Add billing run routes**

Expose `GET /billing/runs`, `POST /billing/runs`, and `PATCH /billing/runs/:id/retry`. These routes only create or update run records.

- [ ] **Step 3: Add exception routes**

Expose `GET /exceptions`, `GET /exceptions/:id`, `PATCH /exceptions/:id`, and `POST /exceptions/:id/notes`.

- [ ] **Step 4: Add notification routes**

Expose channel and rule list/create/update APIs plus a simulated channel test endpoint.

- [ ] **Step 5: Add system job routes**

Expose `GET /system/jobs` and `GET /system/jobs/:id`.

### Task 3: Frontend API Client

**Files:**
- Modify: `apps/web/src/api/client.ts`

- [ ] **Step 1: Add TypeScript types**

Add types matching the lightweight backend response shape.

- [ ] **Step 2: Add client methods**

Add list/create/update/test functions for rate limits, billing runs, exceptions, notifications, and system jobs.

### Task 4: Operations Pages and Navigation

**Files:**
- Modify: `apps/web/src/components/AppShell.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/pages/DashboardPage.tsx`
- Modify: `apps/web/src/pages/DetailPages.tsx`
- Modify: `apps/web/src/pages/LaunchLoopPages.tsx`
- Create: `apps/web/src/pages/RateLimitsPage.tsx`
- Create: `apps/web/src/pages/NotificationsPage.tsx`
- Create: `apps/web/src/pages/SystemJobsPage.tsx`

- [ ] **Step 1: Add operations navigation group**

Add `限流策略`, `通知配置`, and `系统任务` under an `运营配置` group.

- [ ] **Step 2: Enhance dashboard**

Load exceptions, billing runs, and system jobs to show operational health.

- [ ] **Step 3: Enhance tenant detail**

Show tenant policy, exceptions, and billing run context.

- [ ] **Step 4: Replace derived exception and billing data with API data**

Use `ExceptionCase` and `BillingRun` APIs where available.

- [ ] **Step 5: Add rate limit, notification, and system job pages**

Build table-first operational pages with modal forms for editable resources.

### Task 5: Tests and Verification

**Files:**
- Create: `apps/api/tests/operations.test.ts`
- Modify: `apps/web/tests/App.test.tsx`

- [ ] **Step 1: Add backend API tests**

Test authenticated list/create/update flows for the new lightweight APIs.

- [ ] **Step 2: Add frontend route smoke tests**

Test that the new navigation entries and pages render with mocked API responses.

- [ ] **Step 3: Run verification**

Run:

```bash
npm run typecheck --workspaces
npm run test:all
```

Expected: typecheck and test suite pass.
