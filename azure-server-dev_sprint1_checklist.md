# Azure Server Dev: Sprint 1 Checklist

Purpose: convert the current API-mode prototype into a reliable baseline on `azure-server-dev` while keeping `main` demo-safe.

## Sprint Goal

Deliver a working shared-editing baseline for API mode with durable state assumptions and visible error handling, without regressing local mode behavior.

## Definition of Done

1. API mode supports acknowledged save flow and clear save failure feedback.
2. Rack locking works for two concurrent users with clear read-only behavior for non-owners.
3. Lock handling supports expiry and a basic stale-lock override path.
4. Local mode still works from Live Server with no backend.
5. Updated docs explain how to run and verify both modes.

## Work Items

## A. Save reliability in API mode

- [ ] Replace fire-and-forget save behavior with acknowledged save result handling in `js/modules/storage.js`.
- [ ] Surface save errors in planner and index UI status areas.
- [ ] Add retry-safe client behavior for transient save failures (at least one retry with delay).
- [ ] Ensure no silent failure path remains for API catalog writes.

Acceptance checks:
- [ ] Simulated backend failure shows a user-visible error.
- [ ] Successful save shows success state or clear non-error status.

## B. Lock behavior hardening

- [ ] Validate lock acquire conflict path and display lock owner in notice area.
- [ ] Validate heartbeat failure path switches editor to read-only mode.
- [ ] Add stale-lock override endpoint on server with basic protection (admin token or environment key).
- [ ] Ensure unlock on unload remains best effort and does not block page exit.

Acceptance checks:
- [ ] Two-browser test: one editor lock owner, one read-only user.
- [ ] Heartbeat interruption test: lock owner loses edit privileges on lock loss.
- [ ] Override test: stale lock can be cleared and reclaimed.

## C. Persistence baseline for server mode

- [ ] Move lock state off pure in-memory runtime, or add documented restart behavior for this sprint with explicit risk note.
- [ ] Confirm catalog read/write path is configured by environment variables for Azure portability.
- [ ] Add basic startup validation log output for configured catalog path and lock mode.

Acceptance checks:
- [ ] Restart scenario is tested and documented.
- [ ] Configuration behavior is reproducible from a clean environment.

## D. Local mode safety guard

- [ ] Verify default no-query startup remains local mode.
- [ ] Verify key catalog/planner flows still work in Live Server mode.
- [ ] Add a lightweight smoke checklist for `main` before each merge from `azure-server-dev`.

Acceptance checks:
- [ ] Room creation works in local mode.
- [ ] Rack creation and planner navigation work in local mode.
- [ ] Basic component add/remove/edit works in local mode.

## E. Documentation updates

- [ ] Keep `README.md` aligned with branch workflow and runtime modes.
- [ ] Keep `Deployment_plan.md` aligned with sprint outcomes.
- [ ] Record known gaps that remain for Sprint 2 (snapshots, backup automation, identity uplift).

Acceptance checks:
- [ ] A new developer can run both local and API modes from docs alone.

## Suggested Sprint Order

1. Save reliability in API mode.
2. Lock hardening and stale-lock override.
3. Persistence baseline behavior and config cleanup.
4. Local mode regression checks.
5. Docs and handoff notes.

## Non-Goals for Sprint 1

- Full snapshot/version history UI.
- Complete Azure infrastructure automation.
- Entra ID integration.
- PWA install/offline implementation.
- Real-time co-editing or merge conflict resolution.

## Merge Gate to main

All of the following must pass before merging Sprint 1 slices from `azure-server-dev` to `main`:

- [ ] Local mode smoke checks pass.
- [ ] API mode lock and save checks pass.
- [ ] Documentation updated.
- [ ] No open blocker bugs labeled `sprint1-blocker`.
