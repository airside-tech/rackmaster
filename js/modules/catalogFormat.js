import { parseCsv, toCsv } from "./csvParser.js";
import { asNumber, asOptionalNumber, createCatalogId, createId } from "./typeUtils.js";

const catalogCsvHeaders = [
    "rowType",
    "roomId",
    "roomName",
    "building",
    "floor",
    "roomNotes",
    "rackId",
    "rackName",
    "rackTag",
    "rackHeightRU",
    "tileX",
    "tileY",
    "depth",
    "power",
    "rackNotes",
    "updatedAt",
    "plannerStateJson"
];

const rackCsvHeaders = [
    "rowType",
    "rackHeightRU",
    "currentView",
    "showVacantSlots",
    "rackName",
    "rackTag",
    "rackRoom",
    "rackOwner",
    "rackDepthCm",
    "rackMinDepthClearanceCm",
    "rackNotes",
    "rackTotalCalculatedConsumptionW",
    "componentId",
    "componentName",
    "componentRU",
    "componentPosition",
    "typeClass",
    "depth",
    "power",
    "notes",
    "customColor"
];

const libraryCsvHeaders = [
    "rowType",
    "categoryName",
    "itemName",
    "ru",
    "typeClass",
    "defaultDepth",
    "defaultPower"
];

function catalogToCsv(catalogPayload) {
    const rows = [];
    const rooms = Array.isArray(catalogPayload.rooms) ? catalogPayload.rooms : [];

    rooms.forEach(room => {
        rows.push({
            rowType: "room",
            roomId: room.id || createCatalogId("room"),
            roomName: room.name || "",
            building: room.building || "",
            floor: room.floor || "",
            roomNotes: room.notes || "",
            rackId: "",
            rackName: "",
            rackTag: "",
            rackHeightRU: "",
            tileX: "",
            tileY: "",
            depth: "",
            power: "",
            rackNotes: "",
            updatedAt: "",
            plannerStateJson: ""
        });

        (Array.isArray(room.racks) ? room.racks : []).forEach(rack => {
            rows.push({
                rowType: "rack",
                roomId: room.id || "",
                roomName: room.name || "",
                building: room.building || "",
                floor: room.floor || "",
                roomNotes: room.notes || "",
                rackId: rack.id || createCatalogId("rack"),
                rackName: rack.name || "",
                rackTag: rack.tag || "",
                rackHeightRU: asNumber(rack.heightRU, 42),
                tileX: rack.tileX == null ? "" : rack.tileX,
                tileY: rack.tileY == null ? "" : rack.tileY,
                depth: asNumber(rack.depth, 0),
                power: asNumber(rack.power, 0),
                rackNotes: rack.notes || "",
                updatedAt: rack.updatedAt || "",
                plannerStateJson: rack.plannerState ? JSON.stringify(rack.plannerState) : ""
            });
        });
    });

    return toCsv(catalogCsvHeaders, rows);
}

function csvToCatalog(csvText) {
    const records = parseCsv(csvText);
    const roomMap = new Map();

    records.forEach(record => {
        const rowType = String(record.rowType || "").trim().toLowerCase();
        if (rowType !== "room" && rowType !== "rack") {
            return;
        }

        const roomId = String(record.roomId || "").trim() || createCatalogId("room");
        if (!roomMap.has(roomId)) {
            roomMap.set(roomId, {
                id: roomId,
                name: String(record.roomName || "").trim() || "Unnamed Room",
                building: String(record.building || "").trim(),
                floor: String(record.floor || "").trim(),
                notes: String(record.roomNotes || "").trim(),
                racks: []
            });
        }

        if (rowType === "rack") {
            const room = roomMap.get(roomId);
            let plannerState = null;
            if (String(record.plannerStateJson || "").trim()) {
                try {
                    plannerState = JSON.parse(record.plannerStateJson);
                } catch (_error) {
                    plannerState = null;
                }
            }

            room.racks.push({
                id: String(record.rackId || "").trim() || createCatalogId("rack"),
                name: String(record.rackName || "").trim() || "Unnamed Rack",
                tag: String(record.rackTag || "").trim() || "RACK",
                heightRU: asNumber(record.rackHeightRU, 42),
                tileX: asOptionalNumber(record.tileX),
                tileY: asOptionalNumber(record.tileY),
                depth: asNumber(record.depth, 0),
                power: asNumber(record.power, 0),
                notes: String(record.rackNotes || "").trim(),
                plannerState,
                updatedAt: String(record.updatedAt || "").trim() || new Date().toISOString()
            });
        }
    });

    return { rooms: Array.from(roomMap.values()) };
}

function rackPayloadToCsv(payload, defaultRackHeightRU = 42) {
    const rows = [
        {
            rowType: "meta",
            rackHeightRU: asNumber(payload.rackHeightRU, defaultRackHeightRU),
            currentView: payload.currentView === "rear" ? "rear" : "front",
            showVacantSlots: payload.showVacantSlots !== false,
            rackName: payload.rackProfile?.name || "Main Rack",
            rackTag: payload.rackProfile?.tag || "RACK-01",
            rackRoom: payload.rackProfile?.room || "",
            rackOwner: payload.rackProfile?.owner || "",
            rackDepthCm: asNumber(payload.rackProfile?.rackDepthCm, 0),
            rackMinDepthClearanceCm: asNumber(payload.rackProfile?.minDepthClearanceCm, 0),
            rackNotes: payload.rackProfile?.notes || "",
            rackTotalCalculatedConsumptionW: asNumber(payload.rackProfile?.totalCalculatedConsumptionW, 0),
            componentId: "",
            componentName: "",
            componentRU: "",
            componentPosition: "",
            typeClass: "",
            depth: "",
            power: "",
            notes: "",
            customColor: ""
        }
    ];

    (Array.isArray(payload.components) ? payload.components : []).forEach(component => {
        rows.push({
            rowType: "component",
            rackHeightRU: "",
            currentView: "",
            showVacantSlots: "",
            rackName: "",
            rackTag: "",
            rackRoom: "",
            rackOwner: "",
            rackDepthCm: "",
            rackMinDepthClearanceCm: "",
            rackNotes: "",
            rackTotalCalculatedConsumptionW: "",
            componentId: component.id || createId("component"),
            componentName: component.name || "",
            componentRU: asNumber(component.ru, 1),
            componentPosition: asNumber(component.position, 1),
            typeClass: component.typeClass || "default-component",
            depth: asNumber(component.depth, 0),
            power: asNumber(component.power, 0),
            notes: component.notes || "",
            customColor: component.customColor || ""
        });
    });

    return toCsv(rackCsvHeaders, rows);
}

function csvToRackPayload(csvText, defaultRackHeightRU = 42) {
    const records = parseCsv(csvText);
    const meta = records.find(record => String(record.rowType || "").trim().toLowerCase() === "meta") || {};
    const components = records
        .filter(record => String(record.rowType || "").trim().toLowerCase() === "component")
        .map(record => ({
            id: String(record.componentId || "").trim() || createId("component"),
            name: String(record.componentName || "").trim(),
            ru: asNumber(record.componentRU, 1),
            position: asNumber(record.componentPosition, 1),
            typeClass: String(record.typeClass || "default-component").trim(),
            depth: asNumber(record.depth, 0),
            power: asNumber(record.power, 0),
            notes: String(record.notes || "").trim(),
            customColor: String(record.customColor || "").trim() || null
        }));

    return {
        rackHeightRU: asNumber(meta.rackHeightRU, defaultRackHeightRU),
        currentView: String(meta.currentView || "front").trim() === "rear" ? "rear" : "front",
        showVacantSlots: String(meta.showVacantSlots || "true").trim().toLowerCase() !== "false",
        rackProfile: {
            name: String(meta.rackName || "Main Rack").trim() || "Main Rack",
            tag: String(meta.rackTag || "RACK-01").trim() || "RACK-01",
            room: String(meta.rackRoom || "").trim(),
            owner: String(meta.rackOwner || "").trim(),
            rackDepthCm: asNumber(meta.rackDepthCm, 0),
            minDepthClearanceCm: asNumber(meta.rackMinDepthClearanceCm, 0),
            notes: String(meta.rackNotes || "").trim(),
            totalCalculatedConsumptionW: asNumber(meta.rackTotalCalculatedConsumptionW, 0)
        },
        components
    };
}

function libraryPayloadToCsv(payload) {
    const rows = [];
    (Array.isArray(payload.categories) ? payload.categories : []).forEach(category => {
        rows.push({
            rowType: "category",
            categoryName: category.name || "",
            itemName: "",
            ru: "",
            typeClass: "",
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
                defaultDepth: asNumber(item.defaultDepth, 0),
                defaultPower: asNumber(item.defaultPower, 0)
            });
        });
    });

    return toCsv(libraryCsvHeaders, rows);
}

function csvToLibraryPayload(csvText) {
    const records = parseCsv(csvText);
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
                name: String(record.itemName || "").trim(),
                ru: asNumber(record.ru, 1),
                typeClass: String(record.typeClass || "default-component").trim() || "default-component",
                defaultDepth: asNumber(record.defaultDepth, 0),
                defaultPower: asNumber(record.defaultPower, 0)
            });
        }
    });

    return {
        categories: Array.from(categoriesByName.values())
    };
}

export {
    catalogToCsv,
    csvToCatalog,
    csvToLibraryPayload,
    csvToRackPayload,
    libraryPayloadToCsv,
    rackPayloadToCsv
};
