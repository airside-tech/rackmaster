# Rackmaster

Rackmaster is a browser-based rack planning tool for managing rooms, racks, and equipment layouts. It runs fully client-side, stores data locally, and supports practical import/export workflows for JSON, CSV, and XLSX.

## New and Current Features

- Room and rack catalog management by building, floor, and room.
- Rack metadata support for RU height, depth, width, tile coordinates, power, tag, and notes.
- Planner with drag-and-drop placement, front/rear view switching, and side view context.
- Side compartment support on both sides (front/rear), including custom side labels.
- Rack profile editing (name, tag, room, owner/description, clearance, notes).
- Placement checks for fit, overlap, and depth conflicts across opposite faces.
- Rack and library import/export:
  - Catalog: JSON, CSV, XLSX
  - Rack: JSON, CSV
  - Library: JSON, CSV, XLSX
- Spreadsheet-friendly bulk editing for catalog and library.
- PDF drawing export from planner, including front/rear/side views and equipment schedule.
- Browser localStorage persistence for catalog and planner state.

## How to Use

### Running app locally (VSCode) - Live Server mode (unchanged workflow):
Open app normally (no query parameter).
It runs in local mode and uses browser storage as before.

### API mode (prepared for):
Start backend once Node.js/npm is available, change location to the rackmaster folder.
>> npm install
>> npm start

Open:
>> http://localhost:3000/index.html?mode=api
Planner navigation will keep mode=api automatically


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

- js/modules/storage.js: Read/write catalog state in localStorage.
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

- No backend required.
- Works in modern browsers with localStorage.
- Uses browser file APIs and falls back to input-based upload when needed.

## License

See LICENSE for details.

## Support

For issues or feature requests, contact the development team at airside-tech.
