export function createRackCatalogHandlers(context) {
    const {
        activeRackId,
        state,
        defaultRackHeightRU,
        rackNameInput,
        rackTagInput,
        rackHeightInput,
        rackDepthInput,
        rackRoomInput,
        rackOwnerInput,
        rackClearanceInput,
        rackNotesInput,
        readCatalog,
        writeCatalog,
        createEmptySideCompartmentState,
        setActiveEditor,
        renderAll,
        setNotice,
        plannerFileFlows
    } = context;
    const minimumRackDepthCm = 20;
    const maximumRackHeightRU = 50;
    const warningRackHeightRU = 47;

    function findRackInCatalog(catalog, rackId) {
        for (const room of catalog.rooms) {
            const roomRacks = Array.isArray(room.racks) ? room.racks : [];
            const rack = roomRacks.find(entry => entry.id === rackId);
            if (rack) {
                return { room, rack };
            }
        }
        return null;
    }

    function openRackPropertiesEditor() {
        setActiveEditor("rack");
        rackNameInput.focus();
        setNotice("Editing rack properties.");
    }

    function handleSaveRackProperties() {
        const nextName = rackNameInput.value.trim() || "Main Rack";
        const nextTag = rackTagInput.value.trim() || "RACK-01";
        const rawNextHeightRU = Number(rackHeightInput.value) || state.rackHeightRU || defaultRackHeightRU;
        const nextHeightRU = Math.max(1, rawNextHeightRU);
        const nextDepthCm = Number(rackDepthInput.value);

        if (nextHeightRU > maximumRackHeightRU) {
            rackHeightInput.value = String(maximumRackHeightRU);
            rackHeightInput.focus();
            setNotice(`Rack height cannot exceed ${maximumRackHeightRU} RU.`);
            return;
        }

        if (!Number.isFinite(nextDepthCm) || nextDepthCm < minimumRackDepthCm) {
            rackDepthInput.value = String(minimumRackDepthCm);
            rackDepthInput.focus();
            setNotice(`Rack depth must be at least ${minimumRackDepthCm} cm.`);
            return;
        }

        state.rackHeightRU = nextHeightRU;

        state.rackProfile = {
            name: nextName,
            tag: nextTag,
            room: rackRoomInput.value.trim(),
            owner: rackOwnerInput.value.trim(),
            rackDepthCm: nextDepthCm,
            minDepthClearanceCm: Number(rackClearanceInput.value) || 0,
            notes: rackNotesInput.value.trim()
        };

        renderAll();
        syncActiveRackToCatalog();
        if (nextHeightRU > warningRackHeightRU) {
            setNotice(`Rack height updated to ${nextHeightRU} RU. Heights above ${warningRackHeightRU} RU should be reviewed carefully.`, "warning");
            return;
        }

        setNotice(`Updated rack profile for ${nextName}.`);
    }

    function syncActiveRackToCatalog() {
        if (!activeRackId) {
            return;
        }

        const catalog = readCatalog();
        const locatedRack = findRackInCatalog(catalog, activeRackId);
        if (!locatedRack) {
            return;
        }

        locatedRack.rack.name = state.rackProfile.name;
        locatedRack.rack.tag = state.rackProfile.tag;
        locatedRack.rack.heightRU = state.rackHeightRU;
        locatedRack.rack.depth = Math.max(minimumRackDepthCm, Number(state.rackProfile.rackDepthCm) || minimumRackDepthCm);
        locatedRack.rack.notes = state.rackProfile.notes || locatedRack.rack.notes || "";
        locatedRack.rack.updatedAt = new Date().toISOString();
        locatedRack.rack.plannerState = {
            rackHeightRU: state.rackHeightRU,
            currentView: state.currentView,
            rackProfile: state.rackProfile,
            components: state.rackComponents,
            sideCompartmentItems: state.sideCompartmentItems
        };

        writeCatalog(catalog);
    }

    function loadRackFromCatalog() {
        if (!activeRackId) {
            return;
        }

        const catalog = readCatalog();
        const locatedRack = findRackInCatalog(catalog, activeRackId);
        if (!locatedRack) {
            setNotice("Rack not found in catalog.");
            return;
        }

        const normalizedRackHeightRU = Math.min(maximumRackHeightRU, Number(locatedRack.rack.heightRU) || defaultRackHeightRU);
        const fallbackPayload = {
            rackHeightRU: normalizedRackHeightRU,
            currentView: "front",
            rackProfile: {
                name: locatedRack.rack.name || "Main Rack",
                tag: locatedRack.rack.tag || "RACK-01",
                room: `${locatedRack.room.name || ""} (${locatedRack.room.building || ""} / ${locatedRack.room.floor || ""})`,
                owner: "",
                rackDepthCm: Math.max(minimumRackDepthCm, Number(locatedRack.rack.depth) || minimumRackDepthCm),
                minDepthClearanceCm: Number(locatedRack.rack.plannerState?.rackProfile?.minDepthClearanceCm) || 0,
                notes: locatedRack.rack.notes || ""
            },
            components: [],
            sideCompartmentItems: createEmptySideCompartmentState()
        };

        plannerFileFlows.loadRackFromFile(locatedRack.rack.plannerState && Array.isArray(locatedRack.rack.plannerState.components)
            ? locatedRack.rack.plannerState
            : fallbackPayload);
        if ((Number(locatedRack.rack.heightRU) || defaultRackHeightRU) > maximumRackHeightRU) {
            setNotice(`Loaded ${locatedRack.rack.name} from catalog. Rack height was limited to ${maximumRackHeightRU} RU.`, "warning");
            return;
        }

        if (normalizedRackHeightRU > warningRackHeightRU) {
            setNotice(`Loaded ${locatedRack.rack.name} from catalog. Heights above ${warningRackHeightRU} RU should be reviewed carefully.`, "warning");
            return;
        }

        setNotice(`Loaded ${locatedRack.rack.name} from catalog.`);
    }

    return {
        handleSaveRackProperties,
        loadRackFromCatalog,
        openRackPropertiesEditor,
        syncActiveRackToCatalog
    };
}