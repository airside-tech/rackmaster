import { buildRoomMapModel } from "./roomMapModel.js";

function sanitizeFilenamePart(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "room";
}

function rackLabel(rack) {
    const rackName = String(rack?.name || "Unnamed Rack").trim();
    const rackTag = String(rack?.tag || "-").trim();
    return `${rackName} (${rackTag})`;
}

function getOverlapRackIds(model) {
    const overlapRackIds = new Set();
    model.overlapWarnings.forEach(warning => {
        warning.racks.forEach(rack => {
            overlapRackIds.add(rack.id);
        });
    });

    return overlapRackIds;
}

export function exportRoomMapPdf(room) {
    if (typeof window.jspdf === "undefined" || typeof window.jspdf.jsPDF === "undefined") {
        throw new Error("PDF library not loaded. Refresh the page and try again.");
    }

    const model = buildRoomMapModel(room, null);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageW = 297;
    const pageH = 210;
    const margin = 12;
    const titleY = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Room Map: ${room.name || "Unnamed Room"}`, margin, titleY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(75, 75, 75);
    doc.text(
        `${room.building || "-"} / ${room.floor || "-"} | Tile ${model.tileSizeCm}cm x ${model.tileSizeCm}cm | Racks ${(room.racks || []).length}`,
        margin,
        titleY + 6
    );
    doc.setTextColor(0, 0, 0);

    const mapTop = margin + 14;
    const mapWidth = pageW - (margin * 2);
    const mapHeight = 145;

    doc.setDrawColor(190, 200, 194);
    doc.setFillColor(248, 251, 248);
    doc.rect(margin, mapTop, mapWidth, mapHeight, "FD");

    const tileScale = Math.max(
        2,
        Math.min(mapWidth / Math.max(1, model.bounds.width), mapHeight / Math.max(1, model.bounds.height))
    );

    const mapUsedWidth = model.bounds.width * tileScale;
    const mapUsedHeight = model.bounds.height * tileScale;
    const mapOffsetX = margin + ((mapWidth - mapUsedWidth) / 2);
    const mapOffsetY = mapTop + ((mapHeight - mapUsedHeight) / 2);

    if (model.bounds.width <= 90 && model.bounds.height <= 90) {
        doc.setDrawColor(220, 228, 222);
        doc.setLineWidth(0.2);

        for (let x = 0; x <= model.bounds.width; x += 1) {
            const drawX = mapOffsetX + (x * tileScale);
            doc.line(drawX, mapOffsetY, drawX, mapOffsetY + mapUsedHeight);
        }

        for (let y = 0; y <= model.bounds.height; y += 1) {
            const drawY = mapOffsetY + (y * tileScale);
            doc.line(mapOffsetX, drawY, mapOffsetX + mapUsedWidth, drawY);
        }
    }

    const overlapRackIds = getOverlapRackIds(model);
    const placedRackRefs = model.placedRacks.map((entry, index) => ({
        ...entry,
        refNumber: index + 1
    }));

    placedRackRefs.forEach(({ rack, footprint, refNumber }) => {
        const drawX = mapOffsetX + ((footprint.startX - model.bounds.minX) * tileScale);
        const drawY = mapOffsetY + ((footprint.startY - model.bounds.minY) * tileScale);
        const drawW = footprint.spanX * tileScale;
        const drawH = footprint.spanY * tileScale;

        const isOverlap = overlapRackIds.has(rack.id);
        if (isOverlap) {
            doc.setFillColor(237, 183, 126);
            doc.setDrawColor(143, 87, 54);
            doc.setTextColor(73, 36, 18);
        } else {
            doc.setFillColor(147, 206, 179);
            doc.setDrawColor(44, 102, 77);
            doc.setTextColor(22, 54, 40);
        }

        doc.setLineWidth(0.35);
        doc.roundedRect(drawX, drawY, drawW, drawH, 1.5, 1.5, "FD");

        const markerSize = Math.max(6, Math.min(13, Math.min(drawW, drawH) * 0.55));
        const markerX = drawX + 1.2;
        const markerY = drawY + 1.2;
        const markerRadius = Math.max(1.5, Math.min(2.5, markerSize * 0.18));

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(60, 60, 60);
        doc.roundedRect(markerX, markerY, markerSize, markerSize, markerRadius, markerRadius, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.max(7, Math.min(12, markerSize * 0.62)));
        doc.setTextColor(0, 0, 0);
        doc.text(String(refNumber), markerX + (markerSize / 2), markerY + (markerSize * 0.68), { align: "center" });

        if (isOverlap) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(Math.max(7, Math.min(11, markerSize * 0.6)));
            doc.setTextColor(139, 40, 26);
            doc.text("!", drawX + drawW - 2, drawY + 4.2, { align: "right" });
        }

        doc.setTextColor(0, 0, 0);
    });

    const footerStartY = mapTop + mapHeight + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(68, 68, 68);
    doc.text("Rack boxes use reference numbers. Full rack names/tags are listed on the next page.", margin, footerStartY - 1.5);

    if (model.overlapWarnings.length > 0) {
        doc.setTextColor(160, 42, 42);
        doc.text(`Overlap warnings: ${model.overlapWarnings.length} tile(s).`, margin, footerStartY);
    } else {
        doc.setTextColor(37, 120, 77);
        doc.text("Overlap warnings: none.", margin, footerStartY);
    }

    doc.setTextColor(0, 0, 0);

    const missingText = model.missingCoordinateRacks.length > 0
        ? `Unplaced racks: ${model.missingCoordinateRacks.map(entry => rackLabel(entry)).join(", ")}`
        : "Unplaced racks: none.";

    const missingLines = doc.splitTextToSize(missingText, pageW - (margin * 2));
    doc.text(missingLines, margin, footerStartY + 6);

    doc.addPage();

    const tableCols = [
        { key: "ref", header: "Ref", width: 14 },
        { key: "tag", header: "Tag", width: 36 },
        { key: "name", header: "Rack Name", width: 88 },
        { key: "tile", header: "Tile X/Y", width: 24 },
        { key: "span", header: "Span", width: 22 },
        { key: "height", header: "Height", width: 18 },
        { key: "status", header: "Status", width: 71 }
    ];
    const tableWidth = tableCols.reduce((sum, col) => sum + col.width, 0);

    const rackRows = placedRackRefs.map(({ rack, footprint, refNumber }) => ({
        ref: String(refNumber),
        tag: String(rack.tag || "-"),
        name: String(rack.name || "Unnamed Rack"),
        tile: `${rack.tileX == null ? "-" : rack.tileX}/${rack.tileY == null ? "-" : rack.tileY}`,
        span: `${footprint.spanX}x${footprint.spanY}`,
        height: `${Number(rack.heightRU) || 42} RU`,
        status: overlapRackIds.has(rack.id) ? "Overlap warning" : "OK"
    }));

    const unplacedRows = model.missingCoordinateRacks.map(rack => ({
        ref: "-",
        tag: String(rack.tag || "-"),
        name: String(rack.name || "Unnamed Rack"),
        tile: "-/-",
        span: "-",
        height: `${Number(rack.heightRU) || 42} RU`,
        status: "Unplaced (missing tile coordinates)"
    }));

    const allRows = [...rackRows, ...unplacedRows];

    const drawTableHeader = (yPos, pageIndex) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        const titleSuffix = pageIndex > 1 ? ` (cont. ${pageIndex})` : "";
        doc.text(`Rack Reference List${titleSuffix}`, margin, yPos);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text(`${room.name || "Unnamed Room"} | ${room.building || "-"} / ${room.floor || "-"}`, margin, yPos + 5);
        doc.setTextColor(0, 0, 0);

        const tableTop = yPos + 9;
        doc.setFillColor(42, 52, 47);
        doc.setDrawColor(42, 52, 47);
        doc.rect(margin, tableTop, tableWidth, 7, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);

        let cursorX = margin;
        tableCols.forEach(col => {
            doc.text(col.header, cursorX + 1.5, tableTop + 4.7);
            cursorX += col.width;
        });

        doc.setTextColor(0, 0, 0);
        return tableTop + 7;
    };

    let tableY = drawTableHeader(margin, 1);
    let pageIndex = 1;

    allRows.forEach((row, rowIndex) => {
        const wrappedCells = tableCols.map(col => {
            const value = String(row[col.key] || "-");
            const lines = doc.splitTextToSize(value, col.width - 3);
            return lines.length > 0 ? lines : ["-"];
        });

        const rowLineCount = wrappedCells.reduce((max, lines) => Math.max(max, lines.length), 1);
        const rowHeight = Math.max(6, 2 + (rowLineCount * 3.6));

        if (tableY + rowHeight > pageH - margin) {
            doc.addPage();
            pageIndex += 1;
            tableY = drawTableHeader(margin, pageIndex);
        }

        doc.setFillColor(rowIndex % 2 === 0 ? 248 : 255, rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 248 : 255);
        doc.setDrawColor(205, 213, 208);
        doc.rect(margin, tableY, tableWidth, rowHeight, "FD");

        let cellX = margin;
        wrappedCells.forEach((lines, colIndex) => {
            doc.setDrawColor(220, 226, 223);
            doc.line(cellX, tableY, cellX, tableY + rowHeight);

            doc.setFont(colIndex === 0 || colIndex === 1 ? "helvetica" : "helvetica", colIndex === 0 || colIndex === 1 ? "bold" : "normal");
            doc.setFontSize(8.2);

            let lineY = tableY + 3.8;
            lines.forEach(line => {
                doc.text(String(line), cellX + 1.4, lineY);
                lineY += 3.6;
            });

            cellX += tableCols[colIndex].width;
        });
        doc.line(margin + tableWidth, tableY, margin + tableWidth, tableY + rowHeight);

        tableY += rowHeight;
    });

    const fileName = `room-map-${sanitizeFilenamePart(room.name)}.pdf`;
    doc.save(fileName);
}
