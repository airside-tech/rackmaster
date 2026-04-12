import { createId } from "../typeUtils.js";
import { adjustBrightness } from "./colors.js";

export const sideCompartmentLibrarySeed = [
    { type: "fiber-cables", name: "Fibre Optic Cables", description: "Cable tray / slack storage", color: "#1d8a9b", ru: 5 },
    { type: "power-cables", name: "Power Cables", description: "Power routing and excess length", color: "#d97706", ru: 5 },
    { type: "patch-cables", name: "Patch Cables", description: "Patch bundle / service loops", color: "#2c9874", ru: 5 }
];

function clampSideItemRU(value, maxRackHeight = 50) {
    const maxRU = Math.max(1, Number(maxRackHeight) || 50);
    const parsedRU = Math.floor(Number(value) || 1);
    return Math.max(1, Math.min(parsedRU, maxRU));
}

function clampSideItemPosition(value, ru, maxRackHeight = 50, fallbackPosition = 1) {
    const maxRU = Math.max(1, Number(maxRackHeight) || 50);
    const maxStartPosition = Math.max(1, maxRU - ru + 1);
    const parsedPosition = Math.floor(Number(value) || Number(fallbackPosition) || 1);
    return Math.max(1, Math.min(parsedPosition, maxStartPosition));
}

export function createEmptySideCompartmentState() {
    return {
        front: { left: [], right: [] },
        rear: { left: [], right: [] }
    };
}

export function normalizeSideCompartmentItem(item, fallbackView = "front", fallbackSide = "left", fallbackOrder = 0, maxRackHeight = 50) {
    const itemType = String(item?.type || "custom-label").trim() || "custom-label";
    const normalizedRU = clampSideItemRU(item?.ru, maxRackHeight);
    const fallbackPosition = Math.max(1, Number(fallbackOrder) || 1);
    const normalizedPosition = clampSideItemPosition(item?.position, normalizedRU, maxRackHeight, fallbackPosition);

    return {
        id: item?.id || createId("side-item"),
        view: item?.view === "rear" ? "rear" : (fallbackView === "rear" ? "rear" : "front"),
        side: item?.side === "right" ? "right" : (fallbackSide === "right" ? "right" : "left"),
        type: itemType,
        name: String(item?.name || getSideItemTypeLabel(itemType)).trim() || getSideItemTypeLabel(itemType),
        notes: String(item?.notes || "").trim(),
        customColor: String(item?.customColor || "").trim() || getDefaultSideItemColor(itemType),
        ru: normalizedRU,
        position: normalizedPosition,
        order: Number(item?.order) || fallbackOrder
    };
}

export function normalizeSideCompartmentState(sideCompartmentItems, maxRackHeight = 50) {
    const normalized = createEmptySideCompartmentState();

    ["front", "rear"].forEach(view => {
        ["left", "right"].forEach(side => {
            const items = sideCompartmentItems?.[view]?.[side];
            normalized[view][side] = Array.isArray(items)
                ? items
                    .map((item, index) => normalizeSideCompartmentItem(item, view, side, index + 1, maxRackHeight))
                    .sort((leftItem, rightItem) => {
                        if (leftItem.position !== rightItem.position) {
                            return rightItem.position - leftItem.position;
                        }
                        return leftItem.order - rightItem.order;
                    })
                : [];
        });
    });

    return normalized;
}

export function getDefaultSideItemColor(type) {
    const colorMap = {
        "fiber-cables": "#1d8a9b",
        "power-cables": "#d97706",
        "patch-cables": "#2c9874",
        "custom-label": "#7d8994"
    };

    return colorMap[type] || colorMap["custom-label"];
}

export function getSideItemTypeLabel(type) {
    const labelMap = {
        "fiber-cables": "Fibre cables",
        "power-cables": "Power cables",
        "patch-cables": "Patch cables",
        "custom-label": "Custom Label"
    };

    return labelMap[type] || "Side Item";
}

export function getSideItemDisplayLabel(item) {
    return String(item?.name || "").trim() || getSideItemTypeLabel(item?.type);
}

export function getSideItemBackground(item) {
    const baseColor = item?.customColor || getDefaultSideItemColor(item?.type);
    return `linear-gradient(135deg, ${adjustBrightness(baseColor, -18)}, ${baseColor})`;
}
