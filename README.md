# Rackmaster

Rackmaster is a rack planning tool for managing rooms, racks, and equipment layouts. It currently supports two runtime modes:
- Local mode for fast Live Server development and demos.
- API mode for shared multi-user behavior and Azure deployment work.

The project is currently following an Azure-first deployment roadmap with sequential rack-level editing locks. See `Deployment_plan.md`.

## New and Current Features

- Room and rack catalog management by building, floor, and room.
- Rack metadata support for RU height, depth, width, tile coordinates, power, tag, and notes.
- Planner with drag-and-drop placement, front/rear view switching, and side view context.
- Side-view component depth labels rendered inside each component (hidden on very narrow components for readability).
- Side compartment support on both sides (front/rear), including custom side labels.
- Rack profile editing (name, tag, room, owner/description, clearance, notes).
- Placement checks for fit, overlap, and depth conflicts across opposite faces.
- Rack and library import/export:
  - Catalog: JSON, CSV, XLSX
  - Rack: JSON, CSV
  - Library: JSON, CSV, XLSX
- Spreadsheet-friendly bulk editing for catalog and library.
- PDF drawing export from planner with landscape layout, front/side/rear view panels, and equipment schedule.
- PDF metadata includes room, description/content, power feed A/B, and rack sizing/usage details.
- Rack notes are exported after the schedule table (when notes are present).
- Left menu save/load controls for Library and Rack are compacted into single-row button pairs.
- Browser localStorage persistence for catalog and planner state.
- API mode support for shared catalog reads/writes and rack lock lifecycle.

## Runtime Modes

### Local mode (default)

Open `index.html` from Live Server or a local static host. No query parameter is required.

Behavior:
- Uses browser storage.
- Optimized for quick demos and development.
- This is the required stable behavior on `main`.

### API mode

Start the backend and open the app with `?mode=api`.

```bash
cd server
npm install
npm start
```

Then open:

```text
http://localhost:3000/index.html?mode=api
```

Behavior:
- Uses API-backed catalog flow.
- Enables rack-level lock flow for sequential editing.
- Used for `azure-server-dev` integration and Azure rollout validation.

## Branch Workflow

- `main`: demo-safe branch. Must always run in local mode with no backend required.
- `azure-server-dev`: integration branch for Azure hosting, shared persistence, lock hardening, identity, and snapshots.

Rules:
1. Keep `main` stable for Live Server demonstrations.
2. Build Azure/server changes on `azure-server-dev`.
3. Merge `main` into `azure-server-dev` frequently to reduce drift.
4. Merge back to `main` only in stable slices that do not break local mode.

## Sprint 1 Checklist

Use `azure-server-dev_sprint1_checklist.md` for concrete first-sprint execution tasks and acceptance criteria.

## How to Use

### 1) Start the App
 
1. Open index.html in a modern browser.
2. Create at least one room (name, building, floor, optional notes).
3. Add a rack to a room (name, tag, height, depth, width, position, power, notes).

### 2) Open Planner for a Rack

1. From the room list, open a rack in planner.
2. Add components to the library category list.
3. Drag components into rack positions.
4. Toggle front/rear view to inspect both faces.
5. Add side compartment items as needed.

### 3) Save and Share Data

1. Export catalog for full site-level backup.
2. Export rack files for single-rack handoff.
3. Export library files for reusable equipment templates.
4. Export PDF from planner for printable documentation.

## Import and Export Notes

- JSON is the best format for full-fidelity backup and restore.
- CSV/XLSX are intended for bulk editing of user-facing fields.
- Spreadsheet imports regenerate or reconcile internal IDs as required.
- Catalog editable imports match rooms/racks by Building + Floor + Room + Rack Tag.
- Rack import validates component fit against rack dimensions before applying.

## File Structure

Top-level files:

- index.html: Catalog page entry point (rooms and racks).
- planner.html: Planner page entry point for rack editing and drawing export.
- script.js: Bootstraps the correct page initializer.
- styles.css: Shared styles for index and planner pages.

Core modules:

- js/modules/storage.js: Runtime storage adapter (local mode and API mode).
- js/modules/fileIO.js: File picker and save helpers.
- js/modules/catalogFormat.js: JSON/CSV conversion for catalog, rack, and library payloads.
- js/modules/excelInterop.js: XLSX conversion for catalog and library payloads.
- js/modules/shared/chooseDataFormat.js: Format selection dialog used by import/export flows.

Page-specific initializers:

- js/modules/index/initIndexPage.js: Catalog page logic and catalog import/export.
- js/modules/planner/initPlannerPage.js: Planner composition and module wiring.

Planner subsystem highlights:

- js/modules/planner/actions.js: User actions and editing handlers.
- js/modules/planner/dragDrop.js: Drag-and-drop behavior.
- js/modules/planner/placementEngine.js: Placement rules, occupancy, depth/conflict analysis.
- js/modules/planner/fileFlows.js: Rack/library import-export workflows.
- js/modules/planner/pdfExport.js: Planner-to-PDF drawing export.
- js/modules/planner/sideCompartments.js: Side compartment state, normalization, and helpers.
- js/modules/planner/renderRackViews.js, renderPanels.js, renderLibraryAndSide.js: UI rendering pipeline.
- js/modules/planner/rackCatalogSync.js: Keeps planner edits synchronized to catalog storage.

## Technical Notes

- Local mode requires no backend.
- API mode requires `server/index.js` running.
- Works in modern browsers.
- Uses browser file APIs and falls back to input-based upload when needed.

## Roadmap Artifacts

- `Deployment_plan.md`: Azure-first deployment strategy, branch workflow, and phased rollout.
- `azure-server-dev_sprint1_checklist.md`: concrete first sprint tasks for the Azure integration branch.
- `TODO.md`: general backlog and non-sprint items.

## License

See LICENSE for details.

## Support

For issues or feature requests, contact the development team at airside-tech.
