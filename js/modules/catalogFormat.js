import { parseCsv, toCsv } from "./csvParser.js";
import { asNumber, asOptionalNumber, createId } from "./typeUtils.js";

const catalogCsvHeaders = [
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

const rackCsvHeaders = [
    "rowType",
    "rackName",
    "rackTag",
    "rackRoom",
    "rackOwner",
    "rackHeightRU",
    "currentView",
    "rackDepthCm",
    "rackWidthCm",
    "rackMinDepthClearanceCm",
    "rackNotes",
    "componentName",
    "componentDescription",
    "componentRU",
    "componentPosition",
    "componentFace",
    "typeClass",
    "depth",
    "power",
    "notes",
    "customColor",
    "sideItemView",
    "sideItemSide",
    "sideItemType",
    "sideItemName",
    "sideItemNotes",
    "sideItemOrder",
    "sideItemCustomColor"
];

const libraryCsvHeaders = [
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

function catalogToCsv(catalogPayload) {
    const rows = [];
    const rooms = Array.isArray(catalogPayload.rooms) ? catalogPayload.rooms : [];

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

function rackPayloadToCsv(payload, defaultRackHeightRU = 42) {
    const rows = [
        {
            rowType: "meta",
            rackName: payload.rackProfile?.name || "Main Rack",
            rackTag: payload.rackProfile?.tag || "RACK-01",
            rackRoom: payload.rackProfile?.room || "",
            rackOwner: payload.rackProfile?.owner || "",
            rackHeightRU: asNumber(payload.rackHeightRU, defaultRackHeightRU),
            currentView: payload.currentView === "rear" ? "rear" : "front",
            rackDepthCm: asNumber(payload.rackProfile?.rackDepthCm, 0),
            rackWidthCm: asNumber(payload.rackProfile?.rackWidthCm, 60),
            rackMinDepthClearanceCm: asNumber(payload.rackProfile?.minDepthClearanceCm, 0),
            rackNotes: payload.rackProfile?.notes || "",
            componentName: "",
            componentDescription: "",
            componentRU: "",
            componentPosition: "",
            componentFace: "",
            typeClass: "",
            depth: "",
            power: "",
            notes: "",
            customColor: "",
            sideItemView: "",
            sideItemSide: "",
            sideItemType: "",
            sideItemName: "",
            sideItemNotes: "",
            sideItemOrder: "",
            sideItemCustomColor: ""
        }
    ];

    (Array.isArray(payload.components) ? payload.components : []).forEach(component => {
        rows.push({
            rowType: "component",
            rackName: "",
            rackTag: "",
            rackRoom: "",
            rackOwner: "",
            rackHeightRU: "",
            currentView: "",
            rackDepthCm: "",
            rackWidthCm: "",
            rackMinDepthClearanceCm: "",
            rackNotes: "",
            componentName: component.name || "",
            componentDescription: component.description || "",
            componentRU: asNumber(component.ru, 1),
            componentPosition: asNumber(component.position, 1),
            componentFace: component.face === "rear" ? "rear" : "front",
            typeClass: component.typeClass || "default-component",
            depth: asNumber(component.depth, 0),
            power: asNumber(component.power, 0),
            notes: component.notes || "",
            customColor: component.customColor || "",
            sideItemView: "",
            sideItemSide: "",
            sideItemType: "",
            sideItemName: "",
            sideItemNotes: "",
            sideItemOrder: "",
            sideItemCustomColor: ""
        });
    });

    const sideCompartmentItems = payload.sideCompartmentItems || {};
    ["front", "rear"].forEach(view => {
        ["left", "right"].forEach(side => {
            (Array.isArray(sideCompartmentItems?.[view]?.[side]) ? sideCompartmentItems[view][side] : []).forEach(item => {
                rows.push({
                    rowType: "sideItem",
                    rackName: "",
                    rackTag: "",
                    rackRoom: "",
                    rackOwner: "",
                    rackHeightRU: "",
                    currentView: "",
                    rackDepthCm: "",
                    rackWidthCm: "",
                    rackMinDepthClearanceCm: "",
                    rackNotes: "",
                    componentName: "",
                    componentDescription: "",
                    componentRU: "",
                    componentPosition: "",
                    componentFace: "",
                    typeClass: "",
                    depth: "",
                    power: "",
                    notes: "",
                    customColor: "",
                    sideItemView: view,
                    sideItemSide: side,
                    sideItemType: item.type || "custom-label",
                    sideItemName: item.name || "",
                    sideItemNotes: item.notes || "",
                    sideItemOrder: asNumber(item.order, 1),
                    sideItemCustomColor: item.customColor || ""
                });
            });
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
            id: createId("component"),
            name: String(record.componentName || "").trim(),
            description: String(record.componentDescription || "").trim(),
            ru: asNumber(record.componentRU, 1),
            position: asNumber(record.componentPosition, 1),
            face: String(record.componentFace || "front").trim() === "rear" ? "rear" : "front",
            typeClass: String(record.typeClass || "default-component").trim() || "default-component",
            depth: asNumber(record.depth, 0),
            power: asNumber(record.power, 0),
            notes: String(record.notes || "").trim(),
            customColor: String(record.customColor || "").trim() || null
        }));

    const sideCompartmentItems = {
        front: { left: [], right: [] },
        rear: { left: [], right: [] }
    };

    records
        .filter(record => String(record.rowType || "").trim().toLowerCase() === "sideitem")
        .forEach(record => {
            const view = String(record.sideItemView || "front").trim() === "rear" ? "rear" : "front";
            const side = String(record.sideItemSide || "left").trim() === "right" ? "right" : "left";
            sideCompartmentItems[view][side].push({
                id: createId("side-item"),
                view,
                side,
                type: String(record.sideItemType || "custom-label").trim() || "custom-label",
                name: String(record.sideItemName || "").trim(),
                notes: String(record.sideItemNotes || "").trim(),
                order: asNumber(record.sideItemOrder, sideCompartmentItems[view][side].length + 1),
                customColor: String(record.sideItemCustomColor || "").trim() || null
            });
        });

    return {
        rackHeightRU: asNumber(meta.rackHeightRU, defaultRackHeightRU),
        currentView: String(meta.currentView || "front").trim() === "rear" ? "rear" : "front",
        rackProfile: {
            name: String(meta.rackName || "Main Rack").trim() || "Main Rack",
            tag: String(meta.rackTag || "RACK-01").trim() || "RACK-01",
            room: String(meta.rackRoom || "").trim(),
            owner: String(meta.rackOwner || "").trim(),
            rackDepthCm: asNumber(meta.rackDepthCm, 0),
            rackWidthCm: asNumber(meta.rackWidthCm, 60),
            minDepthClearanceCm: asNumber(meta.rackMinDepthClearanceCm, 0),
            notes: String(meta.rackNotes || "").trim(),
            totalCalculatedConsumptionW: 0
        },
        components,
        sideCompartmentItems
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

export {
    catalogToCsv,
    csvToCatalog,
    csvToLibraryPayload,
    csvToRackPayload,
    libraryPayloadToCsv,
    rackPayloadToCsv
};
