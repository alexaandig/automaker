# Lead-to-Cash Domain Model

## Principles

- Commercial entities are distinct from Automaker delivery `Feature` records.
- Every record is organization-scoped and has a stable ID, `schemaVersion`, `createdAt`, `updatedAt`, and actor metadata.
- Relationships are explicit foreign-key-like IDs; denormalized names are display snapshots only.
- Customer-facing and financially/legal issued artifacts are append-only. Corrections use new versions, amendments, credits, refunds, voids, or replacement records.
- AI can draft and summarize, but cannot approve, accept, sign, issue, mark paid, or execute another legally binding transition.

## Entities

### Organization and access

- **Organization**: commercial tenant/workspace boundary.
- **User**: authenticated actor.
- **Role**: permission set assigned within an organization. Initial permissions should distinguish read, edit, approve, send, sign, issue, collect, refund, and administer.

### CRM and delivery

- **Customer**: legal/business account, billing identity, currency defaults, lifecycle status.
- **Contact**: person related to a customer with communication and billing/signature roles.
- **Lead**: unqualified inbound or outbound prospect; may convert to a customer/contact.
- **Opportunity**: commercial pursuit with owner, expected value, source, and pipeline stage.
- **Project**: commercial engagement linked to one customer, optional primary contact, owner, and optionally existing Automaker delivery features/worktrees.
- **ProjectBrief**: source requirements document for a project; points to a current version.
- **ProjectBriefVersion**: immutable snapshot of requirements, scope, assumptions, exclusions, budget, timeline, and attachments.

### Sales and legal

- **Proposal**: commercial offer linked to a project and source brief version; points to a current proposal version and lifecycle status.
- **ProposalVersion**: immutable customer-facing proposal snapshot including sections, pricing, terms, validity, and acceptance metadata.
- **Contract**: agreement created from an accepted proposal version; links to source proposal/version and billing schedules.
- **ContractVersion**: immutable draft/approved/signed document snapshot.
- **ContractAmendment**: post-signature change request with its own approval/signature lifecycle and parent contract.
- **Signature**: provider-independent signing participant/state linked to a contract version or amendment.

### Billing

- **BillingSchedule**: fixed, milestone, recurring, or custom schedule linked to a contract.
- **Invoice**: financial document linked to a contract, billing schedule, project, customer, and invoice lines.
- **InvoiceLine**: immutable line snapshot with description, quantity, unit price, tax/discount metadata, and source milestone/deliverable.
- **Payment**: received/refunded money with amount, currency, method, reference, and status.
- **PaymentAllocation**: amount of a payment applied to a specific invoice; supports partial allocation and prevents over-allocation.

### Cross-cutting

- **Document**: stored file or rendered artifact with owner entity, checksum, media type, and visibility.
- **Template**: reusable proposal/contract/invoice content with versioning and organization scope.
- **Activity**: user-facing chronological business activity.
- **Notification**: actionable user notification with read/dismiss state.
- **Approval**: explicit human decision for a specific entity/version and action.
- **AuditEvent**: append-only security/compliance record of actor, action, entity, before/after references, reason, and timestamp.

## Relationship graph

```text
Organization
├── Users ── Roles
├── Customers
│   ├── Contacts
│   ├── Leads / Opportunities
│   ├── Projects
│   │   ├── ProjectBrief ── ProjectBriefVersions
│   │   ├── Proposals ── ProposalVersions
│   │   │   └── accepted ProposalVersion → Contract
│   │   ├── Contracts ── ContractVersions / Amendments / Signatures
│   │   │   └── BillingSchedules
│   │   └── Invoices ── InvoiceLines
│   │       └── PaymentAllocations ← Payments
│   └── Documents / Activities
└── Templates / Notifications / Approvals / AuditEvents
```

Required direct links:

- `Project.customerId`
- `ProjectBrief.projectId` and `ProjectBrief.currentVersionId`
- `Proposal.projectId`, `Proposal.sourceBriefVersionId`, and `Proposal.currentVersionId`
- `Contract.projectId`, `Contract.customerId`, `Contract.sourceProposalId`, `Contract.sourceProposalVersionId`, and `Contract.currentVersionId`
- `BillingSchedule.contractId` and `BillingSchedule.projectId`
- `Invoice.customerId`, `Invoice.projectId`, `Invoice.contractId`, and optional `billingScheduleId`
- `PaymentAllocation.paymentId` and `PaymentAllocation.invoiceId`

## Lifecycle status ownership

Statuses belong to their entity, not to a generic pipeline record:

- Opportunity/project projection: `new_lead`, `qualification`, `project_brief`, `proposal_draft`, `proposal_sent`, `negotiation`, `contract_draft`, `contract_sent`, `signed_won`, `invoicing`, `partially_paid`, `paid`, plus `lost`, `cancelled`, `archived`.
- Proposal: `draft`, `internal_review`, `ready_to_send`, `sent`, `viewed`, `negotiation`, `revision_requested`, `accepted`, `rejected`, `expired`, `withdrawn`.
- Contract: `draft`, `internal_review`, `approved`, `sent`, `viewed`, `changes_requested`, `signature_pending`, `partially_signed`, `signed`, `active`, `expired`, `terminated`, `cancelled`.
- Invoice: `draft`, `approved`, `sent`, `viewed`, `partially_paid`, `paid`, `overdue`, `void`, `cancelled`.
- Payment: `pending`, `received`, `partially_allocated`, `allocated`, `failed`, `refunded`, `partially_refunded`.

Attention conditions are independent flags: missing information, proposal expired, contract changes requested, signature delayed, invoice overdue, and payment failed.

## Invariants

1. A proposal must reference a project brief version; editing a brief creates a new version and never rewrites a proposal source.
2. Customer-facing proposal revisions create a new proposal version; previous versions remain readable.
3. Only an accepted proposal version can seed a contract.
4. A signed contract cannot be edited in place; changes require an amendment.
5. An issued invoice cannot be silently changed; corrections use void/reissue, credit, or adjustment records.
6. Payment totals are calculated from payment allocations, not manually entered invoice status.
7. A payment allocation cannot exceed the unapplied payment amount or invoice outstanding amount.
8. Every transition and approval is server-side authorized and audit logged.
9. Deleting a customer/project with downstream records is prohibited; archive/deactivate instead.
10. Existing Automaker task/Jira/agent state remains independent, with optional explicit links to commercial projects or deliverables.

## Phase 1 storage shape

The initial file-backed implementation can use one directory per aggregate and immutable version files:

```text
.automaker/commercial/
├── customers/<id>/customer.json
├── projects/<id>/project.json
│   └── briefs/<briefId>/versions/<version>.json
├── proposals/<id>/proposal.json
│   └── versions/<version>.json
├── contracts/<id>/contract.json
│   └── versions/<version>.json
├── billing-schedules/<id>.json
├── invoices/<id>/invoice.json
├── payments/<id>.json
├── payment-allocations/<id>.json
├── documents/<id>.json
├── activities/<id>.json
├── approvals/<id>.json
├── audit-events/<id>.json
└── indexes/<rebuildable-index>.json
```

The store must validate organization scope and relationship existence on every write, use atomic writes, and rebuild indexes from authoritative records after corruption or migration.

## Future database mapping

The service boundary should make a later relational migration possible without changing route/UI contracts. Natural tables are organizations, users, roles, customers, contacts, leads, opportunities, projects, brief versions, proposals, proposal versions, contracts, contract versions, amendments, signatures, billing schedules, invoices, invoice lines, payments, allocations, documents, templates, activities, notifications, approvals, and audit events. Version IDs and source IDs must remain stable across that migration.
