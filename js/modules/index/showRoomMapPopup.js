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

    const zoomControls = document.createElement("div");
    zoomControls.className = "room-map-zoom-controls";

    const zoomLabel = document.createElement("span");
    zoomLabel.className = "room-map-zoom-label";
    zoomLabel.textContent = "Zoom";

    const zoomOutButton = document.createElement("button");
    zoomOutButton.type = "button";
    zoomOutButton.className = "room-map-zoom-button";
    zoomOutButton.textContent = "-";
    zoomOutButton.setAttribute("aria-label", "Zoom out");

    const zoomLevelSelect = document.createElement("select");
    zoomLevelSelect.className = "room-map-zoom-select";

    const zoomInButton = document.createElement("button");
    zoomInButton.type = "button";
    zoomInButton.className = "room-map-zoom-button";
    zoomInButton.textContent = "+";
    zoomInButton.setAttribute("aria-label", "Zoom in");

    const zoomToSelectionButton = document.createElement("button");
    zoomToSelectionButton.type = "button";
    zoomToSelectionButton.className = "room-map-zoom-to-selection";
    zoomToSelectionButton.textContent = "Zoom To Selection";

    zoomControls.appendChild(zoomLabel);
    zoomControls.appendChild(zoomOutButton);
    zoomControls.appendChild(zoomLevelSelect);
    zoomControls.appendChild(zoomInButton);
    zoomControls.appendChild(zoomToSelectionButton);

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    titleWrap.appendChild(zoomControls);

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

    const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5];
    const zoomOptionValues = ["fit", ...zoomLevels.map(value => String(value))];
    let zoomMode = "fit";
    let currentTileSize = 44;
    let currentManualScale = 1;

    zoomLevelSelect.innerHTML = [
        '<option value="fit">Fit</option>',
        '<option value="0.5">50%</option>',
        '<option value="0.75">75%</option>',
        '<option value="1">100%</option>',
        '<option value="1.25">125%</option>',
        '<option value="1.5">150%</option>',
        '<option value="2">200%</option>',
        '<option value="2.5">250%</option>'
    ].join("");

    const getBaseTileSize = () => (window.matchMedia("(max-width: 640px)").matches ? 34 : 44);
    const getZoomBounds = () => ({
        min: 16,
        max: window.matchMedia("(max-width: 640px)").matches ? 84 : 108
    });

    const clampTileSize = tileSize => {
        const bounds = getZoomBounds();
        return Math.max(bounds.min, Math.min(bounds.max, tileSize));
    };

    const setTileSize = tileSize => {
        currentTileSize = clampTileSize(tileSize);
        canvas.style.setProperty("--room-map-tile-size", `${currentTileSize}px`);

        const nameFontSize = Math.max(9, Math.min(15, Math.round(currentTileSize * 0.24)));
        const tagFontSize = Math.max(8, Math.min(13, Math.round(currentTileSize * 0.2)));
        canvas.style.setProperty("--room-map-rack-name-font-size", `${nameFontSize}px`);
        canvas.style.setProperty("--room-map-rack-tag-font-size", `${tagFontSize}px`);

        const mapWidth = model.bounds.width * currentTileSize;
        const mapHeight = model.bounds.height * currentTileSize;
        const availableWidth = Math.max(0, canvasWrap.clientWidth - 8);
        const availableHeight = Math.max(0, canvasWrap.clientHeight - 8);
        const needsScroll = mapWidth > availableWidth || mapHeight > availableHeight;
        canvasWrap.classList.toggle("is-scrollable", needsScroll);
    };

    const applyAutoFit = () => {
        const availableWidth = Math.max(0, canvasWrap.clientWidth - 8);
        const availableHeight = Math.max(0, canvasWrap.clientHeight - 8);
        if (!availableWidth || !availableHeight) {
            return;
        }

        const { max: maxTileSize, min: minTileSize } = getZoomBounds();
        const fitByWidth = Math.floor(availableWidth / model.bounds.width);
        const fitByHeight = Math.floor(availableHeight / model.bounds.height);
        const fitTileSize = Math.min(fitByWidth, fitByHeight);
        const isLargeRoom = fitTileSize < minTileSize;
        const tileSize = isLargeRoom
            ? minTileSize
            : Math.max(minTileSize, Math.min(maxTileSize, fitTileSize));

        setTileSize(tileSize);
    };

    function applyManualScale(scale) {
        currentManualScale = scale;
        zoomMode = "manual";
        setTileSize(getBaseTileSize() * scale);
        zoomLevelSelect.value = String(scale);
    }

    function applyFitMode() {
        zoomMode = "fit";
        zoomLevelSelect.value = "fit";
        applyAutoFit();
    }

    function getRackButtonById(rackId) {
        return Array.from(racksLayer.querySelectorAll(".room-map-rack"))
            .find(button => button.dataset.rackId === rackId) || null;
    }

    function centerRackInView(rackId) {
        const rackButton = getRackButtonById(rackId);
        if (!rackButton) {
            return;
        }

        const wrapRect = canvasWrap.getBoundingClientRect();
        const rackRect = rackButton.getBoundingClientRect();
        const deltaX = (rackRect.left + rackRect.width / 2) - (wrapRect.left + wrapRect.width / 2);
        const deltaY = (rackRect.top + rackRect.height / 2) - (wrapRect.top + wrapRect.height / 2);
        canvasWrap.scrollLeft += deltaX;
        canvasWrap.scrollTop += deltaY;
    }

    function zoomToSelection() {
        const targetRack = racksById.get(activeRackId) || null;
        if (!targetRack) {
            return;
        }

        const footprintEntry = model.placedRacks.find(entry => entry.rack.id === activeRackId) || null;
        const minimumReadableTileSize = 40;
        if (footprintEntry) {
            const spanX = Math.max(1, footprintEntry.footprint.spanX);
            const spanY = Math.max(1, footprintEntry.footprint.spanY);
            const recommendedTileSize = Math.max(
                minimumReadableTileSize,
                Math.ceil(120 / Math.max(spanX, spanY))
            );

            zoomMode = "manual";
            currentManualScale = Math.max(zoomLevels[0], Math.min(zoomLevels[zoomLevels.length - 1], recommendedTileSize / getBaseTileSize()));
            setTileSize(recommendedTileSize);

            const nearestLevel = zoomLevels.reduce((best, value) => {
                return Math.abs(value - currentManualScale) < Math.abs(best - currentManualScale) ? value : best;
            }, zoomLevels[0]);
            zoomLevelSelect.value = String(nearestLevel);
        }

        requestAnimationFrame(() => {
            centerRackInView(activeRackId);
        });
    }

    zoomLevelSelect.addEventListener("change", () => {
        const nextValue = zoomLevelSelect.value;
        if (nextValue === "fit") {
            applyFitMode();
            return;
        }

        const scale = Number(nextValue);
        if (Number.isFinite(scale)) {
            applyManualScale(scale);
        }
    });

    zoomOutButton.addEventListener("click", () => {
        const selectedValue = zoomLevelSelect.value;
        const currentIndex = zoomOptionValues.indexOf(selectedValue);
        const fallbackIndex = zoomOptionValues.indexOf("1");
        const startIndex = selectedValue === "fit"
            ? fallbackIndex
            : (currentIndex >= 0 ? currentIndex : fallbackIndex);
        const nextIndex = Math.max(0, startIndex - 1);
        zoomLevelSelect.value = zoomOptionValues[nextIndex];
        zoomLevelSelect.dispatchEvent(new Event("change"));
    });

    zoomInButton.addEventListener("click", () => {
        const selectedValue = zoomLevelSelect.value;
        const currentIndex = zoomOptionValues.indexOf(selectedValue);
        const fallbackIndex = zoomOptionValues.indexOf("1");
        const startIndex = selectedValue === "fit"
            ? fallbackIndex
            : (currentIndex >= 0 ? currentIndex : fallbackIndex);
        const nextIndex = Math.min(zoomOptionValues.length - 1, startIndex + 1);
        zoomLevelSelect.value = zoomOptionValues[nextIndex];
        zoomLevelSelect.dispatchEvent(new Event("change"));
    });

    zoomToSelectionButton.addEventListener("click", () => {
        zoomToSelection();
    });

    const handleResize = () => {
        if (zoomMode === "fit") {
            applyAutoFit();
            return;
        }

        setTileSize(getBaseTileSize() * currentManualScale);
    };
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

        zoomToSelectionButton.disabled = !hasTilePlacement;
    };

    renderSelection();
    requestAnimationFrame(() => {
        applyFitMode();
        centerRackInView(activeRackId);
    });
    closeButton.focus();
}