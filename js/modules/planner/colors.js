import { normalizeTypeClass } from "../typeUtils.js";

const colorStorageKey = "rackplanner.default-color.v1";

export const colorPresets = [
    { name: "Red", gradient: "linear-gradient(135deg, #b91c1c, #ef4444)", color: "#ef4444" },
    { name: "Orange", gradient: "linear-gradient(135deg, #c2410c, #f97316)", color: "#f97316" },
    { name: "Amber", gradient: "linear-gradient(135deg, #b45309, #f59e0b)", color: "#f59e0b" },
    { name: "Yellow", gradient: "linear-gradient(135deg, #ca8a04, #eab308)", color: "#eab308" },
    { name: "Green", gradient: "linear-gradient(135deg, #15803d, #22c55e)", color: "#22c55e" },
    { name: "Teal", gradient: "linear-gradient(135deg, #0f766e, #14b8a6)", color: "#14b8a6" },
    { name: "Cyan", gradient: "linear-gradient(135deg, #0e7490, #06b6d4)", color: "#06b6d4" },
    { name: "Blue", gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "#3b82f6" },
    { name: "Indigo", gradient: "linear-gradient(135deg, #4338ca, #6366f1)", color: "#6366f1" },
    { name: "Violet", gradient: "linear-gradient(135deg, #6d28d9, #8b5cf6)", color: "#8b5cf6" },
    { name: "Purple", gradient: "linear-gradient(135deg, #7e22ce, #a855f7)", color: "#a855f7" },
    { name: "Pink", gradient: "linear-gradient(135deg, #be185d, #ec4899)", color: "#ec4899" },
    { name: "Brown", gradient: "linear-gradient(135deg, #92400e, #b45309)", color: "#b45309" },
    { name: "Gray", gradient: "linear-gradient(135deg, #4b5563, #9ca3af)", color: "#9ca3af" }
];

export function getDefaultColor() {
    try {
        const stored = localStorage.getItem(colorStorageKey);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (_error) {
        // Fall through to default.
    }

    return { color: "#2c9874", gradient: "linear-gradient(135deg, #1f6a52, #2c9874)" };
}

export function setDefaultColor(color, gradient) {
    localStorage.setItem(colorStorageKey, JSON.stringify({ color, gradient }));
}

export function adjustBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const red = Math.max(0, Math.min((num >> 16) + amt, 255));
    const green = Math.max(0, Math.min(((num >> 8) & 0x00FF) + amt, 255));
    const blue = Math.max(0, Math.min((num & 0x0000FF) + amt, 255));
    return `#${(0x1000000 + red * 0x10000 + green * 0x100 + blue).toString(16).slice(1)}`;
}

export function getComponentDisplayColor(component) {
    if (component?.customColor) {
        return component.customColor;
    }

    const typeClass = normalizeTypeClass(component?.typeClass || "default-component");
    const typeClassColorMap = {
        router: "#1d8a9b",
        switch: "#4d7ea8",
        firewall: "#b6505d",
        "load-balancer": "#7e68a3",
        "access-point": "#678d52",
        nas: "#ab7344",
        san: "#8b5a42",
        "web-server": "#44708b",
        "database-server": "#8b1e5c",
        "app-server": "#6169a8",
        ups: "#708577",
        pdu: "#9a6f53",
        accessories: "#7d8994",
        "custom-component": "#2c9874",
        "default-component": "#9ca3af"
    };

    return typeClassColorMap[typeClass] || typeClassColorMap["default-component"];
}

export function getComponentBackground(component) {
    const baseColor = getComponentDisplayColor(component);
    const darkerShade = adjustBrightness(baseColor, -20);
    return `linear-gradient(135deg, ${darkerShade}, ${baseColor})`;
}
