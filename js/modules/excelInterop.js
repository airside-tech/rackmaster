import { asNumber, asOptionalNumber } from "./typeUtils.js";

const requiredCatalogHeaders = ["rowType", "building", "floor", "roomName"];
const requiredLibraryHeaders = ["rowType", "categoryName"];

function getXlsxRuntime() {
    const xlsxRuntime = globalThis.XLSX;
    if (!xlsxRuntime) {
        throw new Error("Excel support is not available. Reload the page and try again.");
    }

    return xlsxRuntime;
}

function buildWorkbookBuffer(headers, rows, sheetName) {
    const XLSX = getXlsxRuntime();
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers, skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

function normalizeHeaderName(value) {
    return String(value || "").trim();
}

function assertRequiredHeaders(headers, requiredHeaders, sheetName) {
    const headerSet = new Set(headers.map(normalizeHeaderName));
    const missingHeaders = requiredHeaders.filter(header => !headerSet.has(header));
    if (missingHeaders.length > 0) {
        throw new Error(`Sheet '${sheetName}' is missing required columns: ${missingHeaders.join(", ")}.`);
    }
}

function parseNumberWithWarning(rawValue, fallback, fieldName, rowNumber, warnings) {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
        return parsed;
    }

    const normalized = String(rawValue == null ? "" : rawValue).trim();
    if (normalized !== "") {
        warnings.push(`Row ${rowNumber}: '${fieldName}' value '${normalized}' is invalid. Using ${fallback}.`);
    }
    return fallback;
}

function parseOptionalNumberWithWarning(rawValue, fieldName, rowNumber, warnings) {
    const parsed = asOptionalNumber(rawValue);
    if (parsed != null) {
        return parsed;
    }

    const normalized = String(rawValue == null ? "" : rawValue).trim();
    if (normalized !== "") {
        warnings.push(`Row ${rowNumber}: '${fieldName}' value '${normalized}' is invalid. Leaving it empty.`);
    }
    return null;
}

function parseWorkbookRecords(buffer, fallbackSheetName) {
    const XLSX = getXlsxRuntime();
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: "array" });
    } catch (_error) {
        throw new Error("Invalid Excel file structure. Ensure the file is a valid .xlsx workbook.");
    }

    if (!Array.isArray(workbook?.SheetNames) || workbook.SheetNames.length === 0) {
        throw new Error("Excel file does not contain any worksheets.");
    }

    if (fallbackSheetName && !workbook.SheetNames.includes(fallbackSheetName)) {
        throw new Error(`Expected sheet '${fallbackSheetName}' was not found. Available sheets: ${workbook.SheetNames.join(", ")}.`);
    }

    const primarySheetName = fallbackSheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primarySheetName];

    if (!worksheet) {
        throw new Error(`Worksheet '${primarySheetName}' could not be read.`);
    }

    const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (!Array.isArray(grid) || grid.length === 0) {
        throw new Error(`Sheet '${primarySheetName}' is empty.`);
    }

    const headers = (Array.isArray(grid[0]) ? grid[0] : []).map(normalizeHeaderName).filter(Boolean);
    if (headers.length === 0) {
        throw new Error(`Sheet '${primarySheetName}' does not contain a header row.`);
    }

    const records = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    if (records.length === 0) {
        throw new Error(`Sheet '${primarySheetName}' has headers but no data rows.`);
    }

    return {
        headers,
        records,
        sheetName: primarySheetName
    };
}

export function catalogPayloadToXlsxBuffer(catalogPayload) {
    const headers = [
        "rowType",
        "building",
        "floor",
        "roomName",
        "roomNotes",
        "rackTag",
        "rackName",
        "rackHeightRU",
        "tileX",
        "tileY",
        "depth",
        "width",
        "power",
        "rackNotes",
        "rackPowerA",
        "rackPowerB"
    ];

    const rows = [];
    const rooms = Array.isArray(catalogPayload?.rooms) ? catalogPayload.rooms : [];

    rooms.forEach(room => {
        rows.push({
            rowType: "room",
            building: room.building || "",
            floor: room.floor || "",
            roomName: room.name || "",
            roomNotes: room.notes || "",
            rackTag: "",
            rackName: "",
            rackHeightRU: "",
            tileX: "",
            tileY: "",
            depth: "",
            width: "",
            power: "",
            rackNotes: "",
            rackPowerA: "",
            rackPowerB: ""
        });

        (Array.isArray(room.racks) ? room.racks : []).forEach(rack => {
            rows.push({
                rowType: "rack",
                building: room.building || "",
                floor: room.floor || "",
                roomName: room.name || "",
                roomNotes: room.notes || "",
                rackTag: rack.tag || "",
                rackName: rack.name || "",
                rackHeightRU: asNumber(rack.heightRU, 42),
                tileX: rack.tileX == null ? "" : rack.tileX,
                tileY: rack.tileY == null ? "" : rack.tileY,
                depth: asNumber(rack.depth, 0),
                width: asNumber(rack.width, 60),
                power: asNumber(rack.power, 0),
                rackNotes: rack.notes || "",
                rackPowerA: rack.powerA || "",
                rackPowerB: rack.powerB || ""
            });
        });
    });

    return buildWorkbookBuffer(headers, rows, "catalog");
}

export function xlsxBufferToCatalogPayload(buffer) {
    const { records, headers, sheetName } = parseWorkbookRecords(buffer, "catalog");
    assertRequiredHeaders(headers, requiredCatalogHeaders, sheetName);

    const roomMap = new Map();
    const warnings = [];
    let rackRowCount = 0;

    records.forEach((record, index) => {
        const rowNumber = index + 2;
        const rowType = String(record.rowType || "").trim().toLowerCase();
        if (rowType !== "room" && rowType !== "rack") {
            return;
        }

        const building = String(record.building || "").trim();
        const floor = String(record.floor || "").trim();
        const roomName = String(record.roomName || "").trim() || "Unnamed Room";
        const roomKey = [building.toLowerCase(), floor.toLowerCase(), roomName.toLowerCase()].join("|");
        if (!roomMap.has(roomKey)) {
            roomMap.set(roomKey, {
                id: null,
                name: roomName,
                building,
                floor,
                notes: String(record.roomNotes || "").trim(),
                racks: []
            });
        } else {
            const existingRoom = roomMap.get(roomKey);
            const labelsDifferOnlyByCase = existingRoom.name !== roomName
                || existingRoom.building !== building
                || existingRoom.floor !== floor;
            if (labelsDifferOnlyByCase) {
                warnings.push(`Row ${rowNumber}: room '${roomName}' overlaps with existing room key '${existingRoom.name}' when compared case-insensitively.`);
            }
        }

        if (rowType === "rack") {
            rackRowCount += 1;
            roomMap.get(roomKey).racks.push({
                id: null,
                name: String(record.rackName || "").trim() || "Unnamed Rack",
                tag: String(record.rackTag || "").trim() || "RACK",
                heightRU: parseNumberWithWarning(record.rackHeightRU, 42, "rackHeightRU", rowNumber, warnings),
                tileX: parseOptionalNumberWithWarning(record.tileX, "tileX", rowNumber, warnings),
                tileY: parseOptionalNumberWithWarning(record.tileY, "tileY", rowNumber, warnings),
                depth: parseNumberWithWarning(record.depth, 0, "depth", rowNumber, warnings),
                width: parseNumberWithWarning(record.width, 60, "width", rowNumber, warnings),
                power: parseNumberWithWarning(record.power, 0, "power", rowNumber, warnings),
                notes: String(record.rackNotes || "").trim(),
                powerA: String(record.rackPowerA || "").trim(),
                powerB: String(record.rackPowerB || "").trim(),
                plannerState: null,
                updatedAt: ""
            });
        }
    });

    if (roomMap.size === 0) {
        throw new Error("No catalog rows were found. Ensure 'rowType' contains 'room' or 'rack'.");
    }

    if (rackRowCount === 0) {
        warnings.push("No rack rows were found. Imported catalog contains only rooms.");
    }

    return {
        payload: { rooms: Array.from(roomMap.values()) },
        warnings
    };
}

export function libraryPayloadToXlsxBuffer(payload) {
    const headers = [
        "rowType",
        "categoryName",
        "itemName",
        "ru",
        "typeClass",
        "description",
        "customColor",
        "defaultDepth",
        "defaultPower"
    ];

    const rows = [];
    (Array.isArray(payload?.categories) ? payload.categories : []).forEach(category => {
        rows.push({
            rowType: "category",
            categoryName: category.name || "",
            itemName: "",
            ru: "",
            typeClass: "",
            description: "",
            customColor: "",
            defaultDepth: "",
            defaultPower: ""
        });

        (Array.isArray(category.items) ? category.items : []).forEach(item => {
            rows.push({
                rowType: "item",
                categoryName: category.name || "",
                itemName: item.name || "",
                ru: asNumber(item.ru, 1),
                typeClass: item.typeClass || "default-component",
                description: item.description || "",
                customColor: item.customColor || "",
                defaultDepth: asNumber(item.defaultDepth, 0),
                defaultPower: asNumber(item.defaultPower, 0)
            });
        });
    });

    return buildWorkbookBuffer(headers, rows, "library");
}

export function xlsxBufferToLibraryPayload(buffer) {
    const { records, headers, sheetName } = parseWorkbookRecords(buffer, "library");
    assertRequiredHeaders(headers, requiredLibraryHeaders, sheetName);
    const categoriesByName = new Map();

    records.forEach(record => {
        const rowType = String(record.rowType || "").trim().toLowerCase();
        const categoryName = String(record.categoryName || "").trim();
        if (!categoryName) {
            return;
        }

        if (!categoriesByName.has(categoryName)) {
            categoriesByName.set(categoryName, {
                name: categoryName,
                items: []
            });
        }

        if (rowType === "item") {
            categoriesByName.get(categoryName).items.push({
                id: String(record.itemId || "").trim() || null,
                name: String(record.itemName || "").trim(),
                ru: asNumber(record.ru, 1),
                typeClass: String(record.typeClass || "default-component").trim() || "default-component",
                description: String(record.description || "").trim(),
                customColor: String(record.customColor || "").trim() || null,
                defaultDepth: asNumber(record.defaultDepth, 0),
                defaultPower: asNumber(record.defaultPower, 0)
            });
        }
    });

    return {
        categories: Array.from(categoriesByName.values())
    };
}
