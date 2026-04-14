# Plan: Azure Hosting + Sequential Multi-User Workflow
Azure-first plan is now updated to your confirmed inputs:

Sequential editing is accepted.
Deployment is adjusted for Microsoft Azure with Linux containers.
Proceed now (phased rollout).
Existing network share is available and used for migration/backup.

## Recommended Architecture

Host app and API in Azure Container Apps (Linux container).
Use Azure Files as primary live datastore for catalog, locks, and snapshots.
Keep your existing network share for initial migration in and scheduled backup out.
Enforce rack-level lock workflow (one editor per rack at a time).
Add before/after snapshot history per save.

# Implementation Steps

## Phase 1: Azure baseline
Containerize frontend + backend, deploy to Azure Container Apps with HTTPS and managed identity.
Add CI/CD pipeline for image build and deployment.

## Phase 2: Shared state
Implement API-backed catalog load/save and remove live dependency on browser local storage.
Mount Azure Files for catalog.json, lock state, and versions.

## Phase 3: Sequential editing
Add lock acquire/release/heartbeat with TTL expiry.
Show lock owner in planner UI; set read-only mode when another user holds lock.
Add stale-lock admin override endpoint.

## Phase 4: Snapshots
Create before/after snapshots on every save.
Add restore endpoint and planner versions panel.

## Phase 5: Network share integration
One-time migration from network share into Azure Files.
Nightly backup job from Azure Files back to existing network share.

## Phase 6: Security and operations
Add identity capture (name/email) first, with optional Entra ID upgrade.
Add monitoring, alerts, backup retention, and restore runbook.
Relevant Existing Files

index.html — add user identity entry and catalog-level lock/status indicators.
planner.html — add lock banner, read-only messaging, versions UI.
initIndexPage.js — switch to API-backed catalog flow and identity propagation.
initPlannerPage.js — lock lifecycle initialization.
actions.js — enforce lock checks before all mutations.
ui.js — render lock/read-only state in controls.
rackCatalogSync.js — move sync target from local to API, trigger snapshots.
fileFlows.js — keep import/export, route active state saves through API.
storage.js — refactor to API adapter or fallback-only usage.

# Verification

Two users open same rack: only lock owner can edit; second user is read-only.
Lock expires after heartbeat loss and can be reclaimed.
Save creates snapshot with user + timestamp; restore works.
Data survives browser refresh and container restart.
Nightly backup to network share completes and restore drill succeeds.

# Scope Boundaries

Included now: Azure Linux container deployment, sequential lock-based editing, snapshot history, network share backup path.
Excluded now: real-time co-editing, merge/conflict resolution, offline editing sync.

# Plan Update: Live Server Compatibility Confirmed
The plan now includes a local-development compatibility section with this approach:

## Use two runtime modes:
Local mode for Live Server development and quick testing.
API mode for Azure deployment and multi-user behavior.
In local mode, keep browser-based storage and a simple single-user lock simulation.
In API mode, use backend endpoints for shared catalog, locks, and snapshots.
This means your developer workflow remains fast and familiar, while production uses the Azure multi-user stack.
