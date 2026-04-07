export function createCatalogId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTypeClass(value) {
    return String(value || "default-component")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "default-component";
}

export function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function asOptionalNumber(value) {
    if (value == null || String(value).trim() === "") {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
