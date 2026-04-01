export const catalogStorageKey = "rackplanner.catalog.v1";

export function readCatalog() {
    try {
        const rawCatalog = localStorage.getItem(catalogStorageKey);
        if (!rawCatalog) {
            return { rooms: [] };
        }
        const parsedCatalog = JSON.parse(rawCatalog);
        return {
            rooms: Array.isArray(parsedCatalog.rooms) ? parsedCatalog.rooms : []
        };
    } catch (_error) {
        return { rooms: [] };
    }
}

export function writeCatalog(catalog) {
    localStorage.setItem(catalogStorageKey, JSON.stringify(catalog));
}
