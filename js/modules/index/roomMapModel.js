const tileSizeCmDefault = 60;
const defaultRackWidthCm = 60;
const minimumRackWidthCm = 40;
const defaultRackRowSpacingTiles = 2;
const defaultSideMarginTiles = 2;

export function normalizeTileIndex(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return null;
    }

    const normalized = Math.trunc(numericValue);
    return normalized >= 1 ? normalized : null;
}

export function getRackDimensionsCm(rack) {
    const widthCm = Math.max(minimumRackWidthCm, Number(rack?.width) || defaultRackWidthCm);
    const depthCm = Math.max(0, Number(rack?.depth) || 0);
    return {
        widthCm,
        depthCm
    };
}

export function rackToFootprintTiles(rack, tileSizeCm = tileSizeCmDefault) {
    const startX = normalizeTileIndex(rack?.tileX);
    const startY = normalizeTileIndex(rack?.tileY);

    if (!startX || !startY) {
        return null;
    }

    const { widthCm, depthCm } = getRackDimensionsCm(rack);
    const spanX = Math.max(1, Math.ceil(widthCm / tileSizeCm));
    const spanY = Math.max(1, Math.ceil(depthCm / tileSizeCm));

    return {
        startX,
        startY,
        spanX,
        spanY,
        endX: startX + spanX - 1,
        endY: startY + spanY - 1
    };
}

export function buildRoomMapModel(room, selectedRackId, tileSizeCm = tileSizeCmDefault) {
    const racks = Array.isArray(room?.racks) ? room.racks : [];
    const rowSpacingTiles = defaultRackRowSpacingTiles;
    const sideMarginTiles = defaultSideMarginTiles;
    const placedRacks = [];
    const missingCoordinateRacks = [];

    const rowsByIndex = new Map();

    racks.forEach(rack => {
        const rowIndex = normalizeTileIndex(rack?.tileY);
        const rackIndex = normalizeTileIndex(rack?.tileX);
        const footprint = rackToFootprintTiles(rack, tileSizeCm);
        if (!footprint) {
            missingCoordinateRacks.push(rack);
            return;
        }

        const rowEntries = rowsByIndex.get(rowIndex) || [];
        rowEntries.push({
            rack,
            rackIndex,
            spanX: footprint.spanX,
            spanY: footprint.spanY
        });
        rowsByIndex.set(rowIndex, rowEntries);
    });

    const orderedRowIndexes = Array.from(rowsByIndex.keys()).sort((a, b) => a - b);
    let cursorY = 1;
    let maxEndX = sideMarginTiles + 1;

    orderedRowIndexes.forEach((rowIndex, rowPosition) => {
        const rowEntries = rowsByIndex.get(rowIndex) || [];
        const sortedEntries = rowEntries.sort((left, right) => {
            if (left.rackIndex !== right.rackIndex) {
                return left.rackIndex - right.rackIndex;
            }

            return String(left.rack.id || "").localeCompare(String(right.rack.id || ""));
        });

        let cursorX = sideMarginTiles + 1;
        let rowMaxSpanY = 1;

        sortedEntries.forEach(entry => {
            const mappedFootprint = {
                startX: cursorX,
                startY: cursorY,
                spanX: entry.spanX,
                spanY: entry.spanY,
                endX: cursorX + entry.spanX - 1,
                endY: cursorY + entry.spanY - 1,
                rackIndex: entry.rackIndex,
                rowIndex
            };

            placedRacks.push({
                rack: entry.rack,
                footprint: mappedFootprint
            });

            cursorX += entry.spanX;
            rowMaxSpanY = Math.max(rowMaxSpanY, entry.spanY);
            maxEndX = Math.max(maxEndX, mappedFootprint.endX);
        });

        cursorY += rowMaxSpanY;
        if (rowPosition < orderedRowIndexes.length - 1) {
            cursorY += rowSpacingTiles;
        }
    });

    let minX = 1;
    let minY = 1;
    let maxX = 1;
    let maxY = 1;

    if (placedRacks.length > 0) {
        minX = 1;
        minY = Math.min(...placedRacks.map(entry => entry.footprint.startY));
        maxX = maxEndX + sideMarginTiles;
        maxY = Math.max(...placedRacks.map(entry => entry.footprint.endY));
    }

    const occupancy = new Map();
    placedRacks.forEach(({ rack, footprint }) => {
        for (let y = footprint.startY; y <= footprint.endY; y += 1) {
            for (let x = footprint.startX; x <= footprint.endX; x += 1) {
                const key = `${x}:${y}`;
                const racksOnTile = occupancy.get(key) || [];
                racksOnTile.push(rack);
                occupancy.set(key, racksOnTile);
            }
        }
    });

    const overlapWarnings = [];
    occupancy.forEach((racksOnTile, key) => {
        if (racksOnTile.length <= 1) {
            return;
        }

        const [xText, yText] = key.split(":");
        overlapWarnings.push({
            tileX: Number(xText),
            tileY: Number(yText),
            racks: racksOnTile
        });
    });

    const bounds = {
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX + 1),
        height: Math.max(1, maxY - minY + 1)
    };

    return {
        tileSizeCm,
        selectedRackId,
        rowSpacingTiles,
        sideMarginTiles,
        bounds,
        placedRacks,
        missingCoordinateRacks,
        overlapWarnings
    };
}