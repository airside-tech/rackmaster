export const catalogStorageKey = "rackplanner.catalog.v1";

export function readCatalog() {
    try {
        const rawCatalog = localStorage.getItem(catalogStorageKey);
        if (!rawCatalog) {
            return { rooms: [] };
        }
        const parsedCatalog = JSON.parse(rawCatalog);
        const normalizedRooms = Array.isArray(parsedCatalog.rooms) ? parsedCatalog.rooms : [];
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
    } catch (_error) {
        return { rooms: [] };
    }
}

export function writeCatalog(catalog) {
    localStorage.setItem(catalogStorageKey, JSON.stringify(catalog));
}
