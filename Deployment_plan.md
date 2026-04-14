# Plan: Azure Hosting + Sequential Multi-User Workflow

Azure-first plan is updated with the latest evaluation and recommended branch workflow.

Sequential editing remains accepted.
Deployment remains targeted to Microsoft Azure with Linux containers.
Proceed in phased rollout.
Existing network share remains available for migration and backup.
Live Server compatibility remains a hard requirement during development.
Branch strategy is now explicit: keep `main` demo-safe and do Azure integration work on `azure-server-dev` until merge-ready.

## Recommended Direction

Continue the application according to the Azure deployment plan, not as a PWA-first rewrite.
The current codebase already contains the foundations for API mode, rack-level locks, and server-backed catalog access.
A PWA can still be added later as a thin installability layer, but it should not replace the current next phase.

## Evaluation: Azure Deployment vs PWA

### Azure-first path

Pros:
- Reuses the current local/API runtime split already present in the application.
- Aligns with the confirmed priority of shared multi-user deployment.
- Supports centralized storage, locking, snapshots, backup, and restore.
- Reaches production-usable shared editing faster than an offline-first redesign.

Cons:
- Requires durable persistence for catalog, lock state, and snapshots.
- Requires stronger save acknowledgement and failure handling than the current prototype.
- Depends on network availability for shared editing.

### Thin PWA later

Pros:
- Adds installability and better repeat-load performance.
- Can improve app-shell resilience for static assets.
- Can be layered onto the Azure-backed application later.

Cons:
- Does not solve shared editing, shared persistence, lock ownership, or auditability.
- Is additive UX/platform work, not a replacement for the deployment plan.

### Full offline-capable PWA now

Pros:
- Best fit only if offline field work becomes the main product need.

Cons:
- Significantly higher complexity.
- Requires sync strategy, retry logic, stale data handling, and conflict policy.
- Does not match the current whole-catalog save model well.
- Slower path to shared multi-user delivery.

## Recommended Architecture

Host app and API in Azure Container Apps with Linux containers.
Use Azure Files as primary live datastore for catalog, lock state, and snapshots.
Keep the existing network share for initial migration in and scheduled backup out.
Enforce rack-level lock workflow with one editor per rack at a time.
Add before/after snapshot history per save.
Preserve two runtime modes:
- Local mode for Live Server development and demonstrations.
- API mode for Azure deployment and shared multi-user behavior.

## Branch Workflow

### Branch roles

- `main`: stable demo branch. Must always run in local mode through Live Server with no backend requirement.
- `azure-server-dev`: active integration branch for Azure hosting, shared persistence, locking, identity, and snapshot work.

### Branch rules

1. Keep `main` usable at all times for demonstrations.
2. Develop Azure-specific and server-backed features on `azure-server-dev`.
3. Merge `main` into `azure-server-dev` frequently to reduce drift.
4. Merge back to `main` only in stable slices that preserve local mode behavior.
5. Do not let `azure-server-dev` become a permanent fork; it is an integration branch for this phase.

### Recommended merge checkpoints

1. Cross-mode UI updates that work in both local and API mode.
2. API-mode hardening behind `?mode=api` with no regression to Live Server mode.
3. Deployment, persistence, and operational wiring after the Azure path is stable.

## Implementation Steps

## Phase 1: Azure baseline

Containerize frontend and backend for Azure Container Apps.
Add HTTPS, environment-based configuration, and deployment pipeline support.
Verify that local mode remains unchanged on `main`.

## Phase 2: Shared state

Implement acknowledged API-backed catalog load/save.
Mount Azure Files for catalog, lock state, and versions.
Remove production dependence on browser local storage while keeping local mode for demos.

## Phase 3: Sequential editing

Harden lock acquire, release, and heartbeat with TTL expiry.
Persist lock state beyond process memory.
Show lock owner in planner UI and switch to read-only mode when another user holds the rack.
Add stale-lock admin override endpoint.

## Phase 4: Snapshots

Create before/after snapshots on every save.
Add restore endpoint and planner versions panel.
Include user identity and timestamp in version metadata.

## Phase 5: Network share integration

Perform one-time migration from the network share into Azure Files.
Add nightly backup job from Azure Files back to the existing network share.
Document restore procedure.

## Phase 6: Security and operations

Add identity capture first using name and email, with optional Entra ID later.
Add monitoring, alerts, backup retention, and restore runbook.
Add basic audit logging for lock and save events.

## Relevant Existing Files

- `index.html` — identity entry and catalog-level status indicators for API mode.
- `planner.html` — lock banner, read-only messaging, versions UI, and future install affordances if a thin PWA shell is added later.
- `script.js` — startup path that preserves local-mode demo behavior and routes API mode explicitly.
- `js/modules/index/initIndexPage.js` — API-backed catalog flow and identity propagation.
- `js/modules/planner/initPlannerPage.js` — lock lifecycle initialization.
- `js/modules/planner/actions.js` — enforce lock checks before mutations.
- `js/modules/planner/ui.js` — render lock and read-only state.
- `js/modules/planner/rackCatalogSync.js` — move planner sync from browser-only storage to acknowledged API save flow and snapshots.
- `js/modules/planner/fileFlows.js` — keep import/export while routing active-state saves through API mode.
- `js/modules/storage.js` — maintain local/API storage split and preserve Live Server compatibility.
- `server/index.js` — current backend surface for catalog and lock endpoints, to be hardened for Azure.

## Build-Time Evaluation

- Azure feasibility spike: about 2 to 4 developer days.
- Azure production hardening after a successful spike: about 1 to 2 additional weeks.
- Thin PWA shell only: about 2 to 4 developer days, later if needed.
- Full offline-capable PWA with safe editing and sync: about 2 to 4 weeks minimum and not recommended for the current phase.

## Verification

1. `main` continues to run correctly in Live Server or direct local mode with no backend.
2. Two users open the same rack in API mode: only the lock owner can edit and the second user is read-only.
3. Lock expires after heartbeat loss and can be reclaimed or administratively cleared.
4. Save creates snapshot metadata with user and timestamp, and restore works.
5. Data survives browser refresh and container restart when shared persistence is used.
6. Nightly backup to network share completes and restore drill succeeds.
7. Failed API saves are surfaced to the user instead of failing silently.

## Scope Boundaries

Included now: Azure Linux container deployment, sequential lock-based editing, durable shared persistence, snapshot history, network-share backup path, and explicit branch workflow.
Excluded now: real-time co-editing, merge/conflict resolution, offline editing sync, and full PWA-first architecture.

## Decision Summary

Proceed with the Azure deployment plan on `azure-server-dev`.
Keep `main` as the Live Server demonstration branch throughout development.
Add only thin PWA capabilities later if installability becomes valuable after the Azure path is stable.
Do not shift the next phase into a full offline-first PWA architecture.
