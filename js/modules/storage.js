export const catalogStorageKey = "rackplanner.catalog.v1";

const defaultCatalog = { rooms: [] };
let cachedCatalog = { rooms: [] };

function normalizeCatalog(parsedCatalog) {
    const normalizedRooms = Array.isArray(parsedCatalog?.rooms) ? parsedCatalog.rooms : [];
    normalizedRooms.forEach(room => {
        (Array.isArray(room.racks) ? room.racks : []).forEach(rack => {
            if (!Number.isFinite(Number(rack.width))) {
                rack.width = 60;
            }
            if (rack.plannerState?.rackProfile && !Number.isFinite(Number(rack.plannerState.rackProfile.rackWidthCm))) {
                rack.plannerState.rackProfile.rackWidthCm = Number(rack.width) || 60;
            }
        });
    });

    return {
        rooms: normalizedRooms
    };
}

function getStorageMode() {
    const urlMode = new URLSearchParams(window.location.search).get("mode");
    if (urlMode === "api") {
        return "api";
    }
    if (urlMode === "local") {
        return "local";
    }
    return "local";
}

export function getCatalogStorageMode() {
    return getStorageMode();
}

function isApiMode() {
    return getStorageMode() === "api";
}

async function fetchCatalogFromApi() {
    const response = await fetch("/api/catalog", {
        method: "GET",
        headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
        throw new Error(`Catalog API responded with ${response.status}`);
    }
    return response.json();
}

function writeCatalogToApi(catalog) {
    void fetch("/api/catalog", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(catalog)
    }).catch(error => {
        console.warn("Could not sync catalog to API:", error);
    });
}

export async function initializeCatalogStorage() {
    if (!isApiMode()) {
        cachedCatalog = readCatalogFromLocalStorage();
        return;
    }

    try {
        const apiCatalog = await fetchCatalogFromApi();
        cachedCatalog = normalizeCatalog(apiCatalog);
    } catch (error) {
        console.warn("Catalog API unavailable, using local catalog cache:", error);
        cachedCatalog = readCatalogFromLocalStorage();
    }
}

function readCatalogFromLocalStorage() {
    try {
        const rawCatalog = localStorage.getItem(catalogStorageKey);
        if (!rawCatalog) {
            return { ...defaultCatalog };
        }
        const parsedCatalog = JSON.parse(rawCatalog);
        return normalizeCatalog(parsedCatalog);
    } catch (_error) {
        return { ...defaultCatalog };
    }
}

export function readCatalog() {
    if (isApiMode()) {
        return normalizeCatalog(cachedCatalog);
    }

    const catalog = readCatalogFromLocalStorage();
    cachedCatalog = catalog;
    return catalog;
}

export function writeCatalog(catalog) {
    const normalizedCatalog = normalizeCatalog(catalog);
    cachedCatalog = normalizedCatalog;

    if (isApiMode()) {
        writeCatalogToApi(normalizedCatalog);
        return;
    }

    localStorage.setItem(catalogStorageKey, JSON.stringify(normalizedCatalog));
}

export function clearCatalogStorage() {
    if (isApiMode()) {
        cachedCatalog = { ...defaultCatalog };
        writeCatalogToApi(cachedCatalog);
        return;
    }

    Object.keys(localStorage)
        .filter(key => key.startsWith("rackplanner."))
        .forEach(key => localStorage.removeItem(key));
    cachedCatalog = { ...defaultCatalog };
}
