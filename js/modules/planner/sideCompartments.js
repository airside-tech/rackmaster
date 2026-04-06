import { createId } from "../typeUtils.js";
import { adjustBrightness } from "./colors.js";

export const sideCompartmentLibrarySeed = [
    { type: "fiber-cables", name: "Fibre Optic Cables", description: "Cable tray / slack storage", color: "#1d8a9b" },
    { type: "power-cables", name: "Power Cables", description: "Power routing and excess length", color: "#d97706" },
    { type: "patch-cables", name: "Patch Cables", description: "Patch bundle / service loops", color: "#2c9874" }
];

export function createEmptySideCompartmentState() {
    return {
        front: { left: [], right: [] },
        rear: { left: [], right: [] }
    };
}

export function normalizeSideCompartmentItem(item, fallbackView = "front", fallbackSide = "left", fallbackOrder = 0) {
    const itemType = String(item?.type || "custom-label").trim() || "custom-label";
    return {
        id: item?.id || createId("side-item"),
        view: item?.view === "rear" ? "rear" : (fallbackView === "rear" ? "rear" : "front"),
        side: item?.side === "right" ? "right" : (fallbackSide === "right" ? "right" : "left"),
        type: itemType,
        name: String(item?.name || getSideItemTypeLabel(itemType)).trim() || getSideItemTypeLabel(itemType),
        notes: String(item?.notes || "").trim(),
        customColor: String(item?.customColor || "").trim() || getDefaultSideItemColor(itemType),
        order: Number(item?.order) || fallbackOrder
    };
}

export function normalizeSideCompartmentState(sideCompartmentItems) {
    const normalized = createEmptySideCompartmentState();

    ["front", "rear"].forEach(view => {
        ["left", "right"].forEach(side => {
            const items = sideCompartmentItems?.[view]?.[side];
            normalized[view][side] = Array.isArray(items)
                ? items
                    .map((item, index) => normalizeSideCompartmentItem(item, view, side, index + 1))
                    .sort((leftItem, rightItem) => leftItem.order - rightItem.order)
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
    if (item?.type === "custom-label") {
        return String(item?.notes || "").trim() || String(item?.name || "").trim() || getSideItemTypeLabel(item?.type);
    }

    return getSideItemTypeLabel(item?.type);
}

export function getSideItemBackground(item) {
    const baseColor = item?.customColor || getDefaultSideItemColor(item?.type);
    return `linear-gradient(135deg, ${adjustBrightness(baseColor, -18)}, ${baseColor})`;
}
