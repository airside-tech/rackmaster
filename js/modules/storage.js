export const catalogStorageKey = "rackplanner.catalog.v1";
export const catalogCorruptBackupKey = "rackplanner.catalog.v1.corrupt.backup";

let cachedCatalog = { rooms: [] };

function createEmptyCatalog() {
    return {
        rooms: []
    };
}

function normalizeCatalog(parsedCatalog) {
    const normalizedRooms = Array.isArray(parsedCatalog?.rooms) ? parsedCatalog.rooms : [];
    normalizedRooms.forEach(room => {
        room.racks = Array.isArray(room.racks) ? room.racks : [];
        room.racks.forEach(rack => {
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
    /* 
    API write function for the catalog
    If called without waiting (async), the errors will not propagate (fire and forget)
    When using liveServer this is used directly.
    */
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
    const getAndParseLocalCatalog = () => {
        const rawCatalog = localStorage.getItem(catalogStorageKey);
        if (!rawCatalog) {
            return createEmptyCatalog();
        }

        const parsedCatalog = JSON.parse(rawCatalog);
        return normalizeCatalog(parsedCatalog);
    };

    try {
        return getAndParseLocalCatalog();
    } catch (error) {
        try {
            const rawCatalog = localStorage.getItem(catalogStorageKey);
            if (rawCatalog) {
                localStorage.setItem(catalogCorruptBackupKey, rawCatalog);
            }
        } catch (_backupError) {
            // Ignore backup failures and continue with a clean catalog.
        }
        console.warn("RackMaster catalog could not be parsed from localStorage. Falling back to empty catalog.", error);
        return createEmptyCatalog();
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

    try {
        localStorage.setItem(catalogStorageKey, JSON.stringify(normalizedCatalog));
    } catch (error) {
        console.warn("Could not persist RackMaster catalog to localStorage.", error);
    }
}

export function clearCatalogStorage() {
    if (isApiMode()) {
        cachedCatalog = createEmptyCatalog();
        writeCatalogToApi(cachedCatalog);
        return;
    }

    Object.keys(localStorage)
        .filter(key => key.startsWith("rackplanner."))
        .forEach(key => localStorage.removeItem(key));
    cachedCatalog = createEmptyCatalog();
}
