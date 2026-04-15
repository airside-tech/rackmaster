export const libraryStorageKey = "rackplanner.library.v1";
export const libraryCorruptBackupKey = "rackplanner.library.v1.corrupt.backup";

function toSerializableLibraryPayload(categories) {
    return {
        version: 1,
        savedAt: new Date().toISOString(),
        categories: (categories || []).map(category => ({
            name: String(category?.name || "").trim(),
            isSideCompartment: Boolean(category?.isSideCompartment),
            items: (category?.items || []).map(item => ({
                id: String(item?.id || "").trim() || null,
                name: String(item?.name || "").trim(),
                ru: Math.max(1, Number(item?.ru) || 1),
                typeClass: String(item?.typeClass || item?.name || "default-component").trim(),
                description: String(item?.description || ""),
                customColor: item?.customColor || null,
                defaultDepth: Math.max(0, Number(item?.defaultDepth) || 0),
                defaultPower: Math.max(0, Number(item?.defaultPower) || 0),
                isSideCompartment: Boolean(item?.isSideCompartment || category?.isSideCompartment),
                sideItemType: String(item?.sideItemType || "custom-label").trim() || "custom-label"
            }))
        }))
    };
}

export function persistLibraryCategories(categories) {
    try {
        localStorage.setItem(libraryStorageKey, JSON.stringify(toSerializableLibraryPayload(categories)));
    } catch (error) {
        console.warn("Could not persist RackMaster library to localStorage.", error);
    }
}

export function readPersistedLibraryPayload() {
    try {
        const rawLibrary = localStorage.getItem(libraryStorageKey);
        if (!rawLibrary) {
            return null;
        }

        const parsedLibrary = JSON.parse(rawLibrary);
        if (!Array.isArray(parsedLibrary?.categories)) {
            return null;
        }

        return parsedLibrary;
    } catch (error) {
        try {
            const rawLibrary = localStorage.getItem(libraryStorageKey);
            if (rawLibrary) {
                localStorage.setItem(libraryCorruptBackupKey, rawLibrary);
            }
        } catch (_backupError) {
            // Ignore backup failures and continue with defaults.
        }
        console.warn("RackMaster library could not be parsed from localStorage.", error);
        return null;
    }
}
