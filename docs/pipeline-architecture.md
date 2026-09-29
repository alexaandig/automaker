# Lead-to-Cash Pipeline Architecture

## Status

This document is the discovery and implementation plan for transforming Automaker into a commercial Lead-to-Cash workspace. It intentionally does not implement the product. Existing Automaker delivery functionality remains the system of record for software-delivery tasks until the commercial domain is introduced alongside it.

## 1. Existing architecture

Automaker is an npm-workspaces monorepo using Node 22 and TypeScript:

- `apps/ui`: React 19, Vite, TanStack Router, TanStack Query, Zustand, Tailwind, and Electron integration.
- `apps/server`: Express 5 HTTP API, WebSocket events, route factories, services, provider adapters, and authentication/path validation.
- `libs/types`: shared TypeScript contracts consumed by UI and server.
- `libs/platform`: safe `.automaker` path helpers and filesystem setup.
- `libs/utils`: atomic JSON, logging, recovery, and common utilities.
- `libs/*`: prompts, git, model resolution, dependency resolution, and spec parsing.

The normal request path is UI component or hook → HTTP API client → Express route factory → service → filesystem/event bus → HTTP/WebSocket response. The UI has generated TanStack route metadata, a root shell/sidebar, route-level views, reusable board/list/dialog components, React Query caching, and Zustand for application/session state.

Persistence is file-based rather than database-backed. Project data lives under `<project>/.automaker`; feature records are individual `.automaker/features/<id>/feature.json` folders. Global server state uses `DATA_DIR`. Writes commonly use `secure-fs`, atomic temp-file/rename patterns, and recovery-aware JSON reads.

## 2. Extension points and reusable components

### UI

- Existing board Kanban/list primitives, filters, search, badges, dialogs, empty/loading/error states, and responsive layout are reusable for the first pipeline shell.
- Existing sidebar/root layout and project switcher are the correct navigation extension points.
- Existing TanStack Router route files and lazy route conventions should be extended rather than replacing the router.
- Existing API client/auth/path validation wrappers, React Query, and event subscriptions should carry commercial queries and mutations.
- Existing timeline/activity presentation and notification components can be generalized after the first slice.

### Server

- Route factories under `apps/server/src/routes/<module>` provide the module boundary, dependency injection, and validation pattern.
- Services under `apps/server/src/services` are the correct place for domain rules and persistence orchestration.
- `secure-fs`, `@automaker/platform`, `@automaker/utils` atomic/recovery helpers, and the existing event emitter should be reused.
- The existing configurable pipeline service and `/api/pipeline` routes are useful implementation references, but their current meaning is execution workflow configuration, not commercial lifecycle state.
- The existing notifications, event history, and feature timeline services are candidates for cross-domain activity plumbing.

### Shared types

Add commercial contracts to `libs/types` and export them from `libs/types/src/index.ts`. Keep `Feature`, `FeatureStatusWithPipeline`, `PipelineConfig`, and related delivery types intact; they describe Automaker software delivery and must not be silently reinterpreted as CRM entities.

## 3. Terminology conflicts

| Existing Automaker term      | Current meaning                                              | Commercial meaning / resolution                                                                                                        |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Feature / task / card        | A software change executed in a Git worktree                 | Keep as delivery artifact; link optionally to a commercial Project or Proposal deliverable                                             |
| Pipeline step                | Configurable agent execution step between execution statuses | Rename conceptually to `ExecutionPipeline`; do not reuse it for sales stages                                                           |
| Pipeline status              | `pipeline_<id>` feature status                               | Keep for legacy execution cards; commercial stages get a separate typed state machine                                                  |
| Project                      | Opened local Git repository/workspace                        | Preserve as software workspace; introduce commercial Project with an explicit domain namespace or a carefully scoped shared identifier |
| Done / Complete              | Verified delivery and later human-confirmed completion       | Never use for accepted proposal, signed contract, issued invoice, or paid invoice                                                      |
| Customer / client            | May occur in Jira/project text only                          | New first-class entity with contacts, relationships, balances, and activity                                                            |
| Notification / event history | Existing app/runtime notifications and event records         | Reuse infrastructure, but add entity type, actor, organization, and audit semantics                                                    |

The safest initial naming is `CommercialProject` in code only if a collision blocks progress; user-facing language can be “Project”. Avoid changing existing delivery terminology in Phase 1.

## 4. Domain model

The proposed entities and relationships are documented in [`domain-model.md`](./domain-model.md). The minimum invariant is:

`Customer → Project → ProjectBrief → Proposal → Contract → BillingSchedule → Invoice → Payment`

Every downstream record stores its direct parent ID and organization ID. Derived records also retain the source version ID used to create them. Versioned artifacts are append-only once customer-facing or legally/financially issued.

## 5. Pipeline state machine

The commercial pipeline is a projection of domain records, not the database. Each opportunity/project can expose a computed pipeline card with a current commercial stage and attention flags.

### Primary stages

1. `new_lead`
2. `qualification`
3. `project_brief`
4. `proposal_draft`
5. `proposal_sent`
6. `negotiation`
7. `contract_draft`
8. `contract_sent`
9. `signed_won`
10. `invoicing`
11. `partially_paid`
12. `paid`

### Independent attention states

`missing_information`, `proposal_expired`, `contract_changes_requested`, `signature_delayed`, `invoice_overdue`, and `payment_failed` are flags attached to the underlying entity or projection. They must not overwrite the underlying lifecycle status.

### Closed states

`lost`, `cancelled`, and `archived` are terminal or administrative states with explicit actions and audit records.

### Transition rules

- Every transition is validated server-side against the current status, actor permissions, required fields, and source entity state.
- Generated is not approved; accepted is not signed; issued is not paid.
- Proposal acceptance requires an accepted, non-expired version and explicit human action.
- Contract conversion copies the accepted proposal version and retains the source reference.
- Signed contracts and issued invoices are immutable; amendments/credit/refund/void flows create new records.
- Payments are recorded independently and allocated to invoices; partial allocation is supported.
- Unknown or legacy records remain visible and are never silently migrated to a commercial state.

## 6. Persistence strategy

### Phase 1 recommendation: versioned project-local JSON aggregates

Use a new `.automaker/commercial/` directory with bounded aggregate files, for example:

- `customers/<customerId>/customer.json`
- `projects/<projectId>/project.json`
- `projects/<projectId>/briefs/<briefId>/versions/<version>.json`
- `proposals/<proposalId>/proposal.json` and `versions/<version>.json`
- `contracts/<contractId>/contract.json` and `versions/<version>.json`
- `billing-schedules/<id>.json`, `invoices/<id>/invoice.json`, `payments/<id>.json`
- `activity/<eventId>.json` and `audit/<eventId>.json`
- `indexes/*.json` only for rebuildable lookup projections

Use the existing secure path helpers and atomic/recovery-aware writes. Keep indexes rebuildable and never treat them as authoritative. All records include `schemaVersion`, `organizationId`, IDs, timestamps, and actor metadata.

This matches the current architecture and enables a vertical slice without introducing a database migration or a second application. It is not a final accounting-system storage recommendation. Before multi-user concurrency, portals, or high-volume billing, evaluate a transactional database migration behind service interfaces.

## 7. Migration and compatibility

- Do not rename or delete `.automaker/features`, existing pipeline configuration, Jira fields, or execution statuses.
- Add commercial storage only when a project opts into the commercial workspace; absence of `.automaker/commercial` means an empty commercial dataset.
- Preserve existing project/workspace IDs and feature files. Add optional linkage fields only after the commercial entities exist.
- Provide an explicit import/link action rather than guessing that a feature is a customer, lead, or project.
- Version schemas and write readers that tolerate missing optional fields.
- Keep commercial transitions separate from feature status updates, Jira status, Git merges, and agent execution.
- Document a future database migration as a service-level replacement, not a UI rewrite.

## 8. UI navigation

The first navigation group should be a commercial workspace alongside existing delivery tools:

- **Pipeline**: default commercial board/table projection.
- **Customers**: customer list and Customer 360 detail.
- **Projects**: commercial projects and linked briefs.
- **Proposals**: proposal list, editor, and version history.
- **Contracts**: contract workspace and signature state.
- **Billing**: billing dashboard, schedules, invoices, and payments.
- **Activity**: cross-entity timeline and audit views.
- **Settings**: organization, roles, templates, numbering, and integrations.

Existing Board, Dashboard, Agent, Worktrees, Jira, and project settings remain available under a Delivery or existing navigation group. The first implementation can use a new route namespace (`/pipeline`) without changing the default route until the shell is proven.

## 9. First implementation slice (Phase 1)

Build a read/write commercial foundation without proposals, contracts, or payments:

1. Shared types for organization scope, customer, commercial project, pipeline stage, entity references, and activity metadata.
2. A `CommercialStore`/service with atomic JSON persistence under `.automaker/commercial` and schema versioning.
3. Customer and project CRUD APIs with explicit organization/project scoping and input validation.
4. A pipeline projection API that returns customer/project cards and stage/attention metadata.
5. A `/pipeline` UI shell with board/table toggle, stage columns, search/filter, loading/empty/error states, and a create-customer/create-project flow.
6. Optional links from a commercial project to existing delivery features, without altering feature execution semantics.
7. Server and UI tests for persistence recovery, relationship integrity, stage transitions, and pipeline rendering.

### Files expected to change in Phase 1

- `libs/types/src/commercial.ts` (new) and `libs/types/src/index.ts`
- `apps/server/src/services/commercial-store.ts` and `commercial-pipeline-service.ts` (new)
- `apps/server/src/routes/commercial/` and registration in `apps/server/src/index.ts` (new)
- `apps/server/src/services/...` only where shared event/index helpers are needed
- `apps/ui/src/routes/pipeline.tsx` plus route generation output if required by the router workflow
- `apps/ui/src/components/views/commercial-pipeline/` (new), using existing board/list/UI primitives
- `apps/ui/src/lib/http-api-client.ts` or adjacent typed API module, following existing client conventions
- focused server/UI tests under existing test directories
- `docs/domain-model.md` and this architecture document

## 10. Testing strategy

- Unit-test ID generation, schema defaults, JSON recovery, atomic writes, index rebuilds, and relationship validation.
- Test transition guards: invalid stage changes, missing required fields, closed-state protection, and attention flags not replacing lifecycle state.
- Test that a brief/proposal/contract/invoice source version is retained and immutable after issuance.
- Route tests must cover path validation, malformed input, authorization/org scoping, not-found, conflict, and success responses.
- UI tests cover empty/loading/error states, board/table switching, filtering, keyboard-accessible dialogs, and create/link flows.
- Add Playwright coverage for opening Pipeline, creating a customer/project, and navigating from a customer to its project.
- Run focused tests first, then `npm run typecheck`, `npm run lint`, `npm run lint:server:errors`, and relevant builds.

## 11. Risks

- File-based persistence has weak cross-process transaction guarantees and will become unsuitable for concurrent commercial edits.
- Existing “project”, “pipeline”, “feature”, and “done” language can cause accidental coupling unless types and routes are separated.
- Financial/legal immutability and auditability require stricter controls than current task JSON.
- Electron and Web modes must share API behavior without exposing secrets or bypassing server authorization.
- Generated TanStack route metadata may be overwritten by tooling; follow the repository's route generation convention.
- Existing project paths may contain user data that must not be mixed with commercial records without explicit migration.

## 12. Recommended phases

1. Foundation: types, commercial storage, stage projection, navigation shell.
2. CRM: customers, contacts, leads, opportunities.
3. Requirements: projects, briefs, brief versions.
4. Sales: proposal templates, versions, review, send, acceptance.
5. Contracts: conversion, approval, signature lifecycle, amendments.
6. Billing: schedules, invoice lifecycle, payments, allocation, refunds/credits.
7. Operations: activity, audit, notifications, search, reporting.
8. Customer portal.
9. AI assistance with human-only approvals and legally binding actions.
10. External integrations and database/transactional storage evolution.

The next implementation instruction should target Phase 1 only and should not begin CRM-to-billing features in the same change.
