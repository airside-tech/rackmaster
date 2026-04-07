import { asNumber, asOptionalNumber } from "./typeUtils.js";

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

function parseWorkbookRecords(buffer, fallbackSheetName) {
    const XLSX = getXlsxRuntime();
    const workbook = XLSX.read(buffer, { type: "array" });
    const primarySheetName = workbook.SheetNames[0] || fallbackSheetName;
    const worksheet = workbook.Sheets[primarySheetName];

    if (!worksheet) {
        throw new Error("Excel file does not contain readable data.");
    }

    return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
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
        "rackNotes"
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
            rackNotes: ""
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
                rackNotes: rack.notes || ""
            });
        });
    });

    return buildWorkbookBuffer(headers, rows, "catalog");
}

export function xlsxBufferToCatalogPayload(buffer) {
    const records = parseWorkbookRecords(buffer, "catalog");
    const roomMap = new Map();

    records.forEach(record => {
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
        }

        if (rowType === "rack") {
            roomMap.get(roomKey).racks.push({
                id: null,
                name: String(record.rackName || "").trim() || "Unnamed Rack",
                tag: String(record.rackTag || "").trim() || "RACK",
                heightRU: asNumber(record.rackHeightRU, 42),
                tileX: asOptionalNumber(record.tileX),
                tileY: asOptionalNumber(record.tileY),
                depth: asNumber(record.depth, 0),
                width: asNumber(record.width, 60),
                power: asNumber(record.power, 0),
                notes: String(record.rackNotes || "").trim(),
                plannerState: null,
                updatedAt: ""
            });
        }
    });

    return { rooms: Array.from(roomMap.values()) };
}

export function libraryPayloadToXlsxBuffer(payload) {
    const headers = [
        "rowType",
        "categoryName",
        "itemId",
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
            itemId: "",
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
                itemId: item.id || "",
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
    const records = parseWorkbookRecords(buffer, "library");
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
