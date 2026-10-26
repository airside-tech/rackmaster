import { buildRoomMapModel, getRackDimensionsCm } from "./roomMapModel.js";

function rackLabel(rack) {
    return `${rack.name || "Unnamed Rack"} (${rack.tag || "-"})`;
}

function tileCoordinateLabel(value) {
    return value == null ? "-" : String(value);
}

function createDetailRow(label, value) {
    const row = document.createElement("div");
    row.className = "room-map-detail-row";

    const labelEl = document.createElement("span");
    labelEl.className = "room-map-detail-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "room-map-detail-value";
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
}

export function showRoomMapPopup(room, selectedRackId) {
    const model = buildRoomMapModel(room, selectedRackId);
    const roomRacks = Array.isArray(room?.racks) ? room.racks : [];
    if (roomRacks.length === 0) {
        return;
    }

    const racksById = new Map(roomRacks.map(rack => [rack.id, rack]));
    let activeRackId = racksById.has(selectedRackId)
        ? selectedRackId
        : roomRacks[0]?.id || null;

    const overlapRackIds = new Set();
    model.overlapWarnings.forEach(warning => {
        warning.racks.forEach(rack => overlapRackIds.add(rack.id));
    });

    const overlay = document.createElement("div");
    overlay.className = "room-map-overlay";

    const dialog = document.createElement("section");
    dialog.className = "room-map-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Room map");

    const header = document.createElement("header");
    header.className = "room-map-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h5");
    title.className = "room-map-title";
    title.textContent = `Room map: ${room.name || "Unnamed Room"}`;

    const subtitle = document.createElement("p");
    subtitle.className = "room-map-subtitle";
    subtitle.textContent = `${room.building || "-"} / ${room.floor || "-"} | Tile ${model.tileSizeCm}cm x ${model.tileSizeCm}cm | Row gap ${model.rowSpacingTiles} tiles | Side margin ${model.sideMarginTiles} tiles`;

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "room-map-close";
    closeButton.textContent = "Close";

    header.appendChild(titleWrap);
    header.appendChild(closeButton);

    const body = document.createElement("div");
    body.className = "room-map-body";

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "room-map-canvas-wrap";

    const canvas = document.createElement("div");
    canvas.className = "room-map-canvas";
    canvas.style.gridTemplateColumns = `repeat(${model.bounds.width}, var(--room-map-tile-size))`;
    canvas.style.gridTemplateRows = `repeat(${model.bounds.height}, var(--room-map-tile-size))`;

    const tilesLayer = document.createElement("div");
    tilesLayer.className = "room-map-tiles";
    tilesLayer.style.gridTemplateColumns = canvas.style.gridTemplateColumns;
    tilesLayer.style.gridTemplateRows = canvas.style.gridTemplateRows;

    const racksLayer = document.createElement("div");
    racksLayer.className = "room-map-racks";
    racksLayer.style.gridTemplateColumns = canvas.style.gridTemplateColumns;
    racksLayer.style.gridTemplateRows = canvas.style.gridTemplateRows;

    const tileCount = model.bounds.width * model.bounds.height;
    for (let index = 0; index < tileCount; index += 1) {
        const tile = document.createElement("div");
        tile.className = "room-map-tile";
        tilesLayer.appendChild(tile);
    }

    const detailPanel = document.createElement("aside");
    detailPanel.className = "room-map-details";

    const detailTitle = document.createElement("h6");
    detailTitle.className = "room-map-details-title";
    detailTitle.textContent = "Rack Details";

    const detailBody = document.createElement("div");
    detailBody.className = "room-map-detail-list";

    const detailActions = document.createElement("div");
    detailActions.className = "room-map-detail-actions";

    const openPlannerButton = document.createElement("button");
    openPlannerButton.type = "button";
    openPlannerButton.textContent = "Open in Planner";

    detailActions.appendChild(openPlannerButton);

    const overlapBlock = document.createElement("div");
    overlapBlock.className = "room-map-alert";
    if (model.overlapWarnings.length > 0) {
        overlapBlock.textContent = `${model.overlapWarnings.length} tile overlap warning(s) found.`;
    }

    const unplacedBlock = document.createElement("div");
    unplacedBlock.className = "room-map-alert";
    if (model.missingCoordinateRacks.length > 0) {
        const unplacedNames = model.missingCoordinateRacks
            .map(rack => rackLabel(rack))
            .join(", ");
        unplacedBlock.textContent = `Unplaced racks (missing tile coordinates): ${unplacedNames}`;
    }

    detailPanel.appendChild(detailTitle);
    detailPanel.appendChild(detailBody);
    detailPanel.appendChild(detailActions);
    if (model.overlapWarnings.length > 0) {
        detailPanel.appendChild(overlapBlock);
    }
    if (model.missingCoordinateRacks.length > 0) {
        detailPanel.appendChild(unplacedBlock);
    }

    model.placedRacks.forEach(({ rack, footprint }) => {
        const block = document.createElement("button");
        block.type = "button";
        block.className = "room-map-rack";
        block.dataset.rackId = rack.id;
        if (overlapRackIds.has(rack.id)) {
            block.classList.add("is-overlap");
        }

        block.style.gridColumn = `${footprint.startX - model.bounds.minX + 1} / span ${footprint.spanX}`;
        block.style.gridRow = `${footprint.startY - model.bounds.minY + 1} / span ${footprint.spanY}`;
        const rackNameEl = document.createElement("span");
        rackNameEl.className = "room-map-rack-name";
        rackNameEl.textContent = rack.name || "Unnamed Rack";

        const rackTagEl = document.createElement("span");
        rackTagEl.className = "room-map-rack-tag";
        rackTagEl.textContent = rack.tag || rack.name || "Rack";

        block.appendChild(rackNameEl);
        block.appendChild(rackTagEl);
        block.title = `${rackLabel(rack)} | Tile ${tileCoordinateLabel(rack.tileX)}, ${tileCoordinateLabel(rack.tileY)}`;
        block.addEventListener("click", () => {
            activeRackId = rack.id;
            renderSelection();
        });
        racksLayer.appendChild(block);
    });

    canvas.appendChild(tilesLayer);
    canvas.appendChild(racksLayer);
    canvasWrap.appendChild(canvas);

    body.appendChild(canvasWrap);
    body.appendChild(detailPanel);

    dialog.appendChild(header);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const removeDialog = () => {
        document.removeEventListener("keydown", handleEscape);
        window.removeEventListener("resize", handleResize);
        overlay.remove();
    };

    const handleEscape = event => {
        if (event.key === "Escape") {
            removeDialog();
        }
    };

    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            removeDialog();
        }
    });

    closeButton.addEventListener("click", removeDialog);
    document.addEventListener("keydown", handleEscape);

    const applyAutoFit = () => {
        const availableWidth = Math.max(0, canvasWrap.clientWidth - 8);
        const availableHeight = Math.max(0, canvasWrap.clientHeight - 8);
        if (!availableWidth || !availableHeight) {
            return;
        }

        const maxTileSize = window.matchMedia("(max-width: 640px)").matches ? 40 : 56;
        const minTileSize = 18;
        const fitByWidth = Math.floor(availableWidth / model.bounds.width);
        const fitByHeight = Math.floor(availableHeight / model.bounds.height);
        const fitTileSize = Math.min(fitByWidth, fitByHeight);
        const isLargeRoom = fitTileSize < minTileSize;
        const tileSize = isLargeRoom
            ? minTileSize
            : Math.max(minTileSize, Math.min(maxTileSize, fitTileSize));

        canvas.style.setProperty("--room-map-tile-size", `${tileSize}px`);
        canvasWrap.classList.toggle("is-scrollable", isLargeRoom);
    };

    const handleResize = () => applyAutoFit();
    window.addEventListener("resize", handleResize);

    const renderSelection = () => {
        Array.from(racksLayer.querySelectorAll(".room-map-rack")).forEach(button => {
            button.classList.toggle("is-selected", button.dataset.rackId === activeRackId);
        });

        const activeRack = racksById.get(activeRackId) || null;
        detailBody.innerHTML = "";

        if (!activeRack) {
            detailBody.appendChild(createDetailRow("Rack", "No rack selected"));
            openPlannerButton.disabled = true;
            return;
        }

        const { widthCm, depthCm } = getRackDimensionsCm(activeRack);
        const hasTilePlacement = activeRack.tileX != null && activeRack.tileY != null;

        detailBody.appendChild(createDetailRow("Rack", rackLabel(activeRack)));
        detailBody.appendChild(createDetailRow("Height", `${Number(activeRack.heightRU) || 42} RU`));
        detailBody.appendChild(createDetailRow("Tile X", tileCoordinateLabel(activeRack.tileX)));
        detailBody.appendChild(createDetailRow("Tile Y", tileCoordinateLabel(activeRack.tileY)));
        detailBody.appendChild(createDetailRow("Width", `${widthCm} cm`));
        detailBody.appendChild(createDetailRow("Depth", `${depthCm} cm`));
        detailBody.appendChild(createDetailRow("Power", `${Number(activeRack.power) || 0} W`));
        detailBody.appendChild(createDetailRow("Notes", activeRack.notes || "-"));

        if (!hasTilePlacement) {
            detailBody.appendChild(createDetailRow("Placement", "Rack has no tile coordinates."));
        }

        openPlannerButton.disabled = false;
        openPlannerButton.onclick = () => {
            window.location.href = `planner.html?rackId=${encodeURIComponent(activeRack.id)}`;
        };
    };

    renderSelection();
    requestAnimationFrame(applyAutoFit);
    closeButton.focus();
}