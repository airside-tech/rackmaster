document.addEventListener("DOMContentLoaded", () => {
    const catalogStorageKey = "rackplanner.catalog.v1";
    const isIndexPage = document.body.classList.contains("index-page");

    function createCatalogId(prefix) {
        return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function readCatalog() {
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

    function writeCatalog(catalog) {
        localStorage.setItem(catalogStorageKey, JSON.stringify(catalog));
    }

    function initIndexPage() {
        const roomNameInput = document.getElementById("roomNameInput");
        const buildingInput = document.getElementById("buildingInput");
        const floorInput = document.getElementById("floorInput");
        const roomNotesInput = document.getElementById("roomNotesInput");
        const createRoomButton = document.getElementById("createRoomButton");
        const newRackNameInput = document.getElementById("newRackName");
        const rackRoomSelect = document.getElementById("rackRoomSelect");
        const newRackTagInput = document.getElementById("newRackTag");
        const newRackHeightInput = document.getElementById("newRackHeight");
        const newTileXInput = document.getElementById("newTileX");
        const newTileYInput = document.getElementById("newTileY");
        const newRackDepthInput = document.getElementById("newRackDepth");
        const newPowerInput = document.getElementById("newPowerConsumption");
        const newRackNotesInput = document.getElementById("newRackNotes");
        const createRackButton = document.getElementById("createNewRack");
        const roomSectionsEl = document.getElementById("roomSections");
        const statusEl = document.getElementById("indexStatus");
        const exportCatalogButton = document.getElementById("exportCatalogButton");
        const importCatalogButton = document.getElementById("importCatalogButton");
        const importCatalogInput = document.getElementById("importCatalogInput");

        if (!roomNameInput || !buildingInput || !floorInput || !roomNotesInput || !createRoomButton || !newRackNameInput || !rackRoomSelect || !newRackTagInput || !newRackHeightInput || !newTileXInput || !newTileYInput || !newRackDepthInput || !newPowerInput || !newRackNotesInput || !createRackButton || !roomSectionsEl || !statusEl || !exportCatalogButton || !importCatalogButton || !importCatalogInput) {
            return;
        }

        let catalog = readCatalog();

        function setStatus(message) {
            statusEl.textContent = message;
        }

        function renderRoomSelect() {
            if (catalog.rooms.length === 0) {
                rackRoomSelect.innerHTML = "<option value=\"\">No rooms available</option>";
                rackRoomSelect.disabled = true;
                return;
            }

            rackRoomSelect.disabled = false;
            rackRoomSelect.innerHTML = catalog.rooms
                .map(room => `<option value="${room.id}">${room.name} (${room.building} / ${room.floor})</option>`)
                .join("");
        }

        function renderRoomSections() {
            roomSectionsEl.innerHTML = "";

            if (catalog.rooms.length === 0) {
                roomSectionsEl.innerHTML = "<div class=\"message-banner\">No equipment rooms yet.</div>";
                return;
            }

            catalog.rooms.forEach(room => {
                const section = document.createElement("article");
                section.className = "room-section";

                const header = document.createElement("div");
                header.className = "room-section__header";

                const titleWrap = document.createElement("div");
                const title = document.createElement("h6");
                title.className = "room-section__title";
                title.textContent = room.name;
                const meta = document.createElement("div");
                meta.className = "room-section__meta";
                meta.textContent = `${room.building} / ${room.floor}${room.notes ? ` | ${room.notes}` : ""}`;

                titleWrap.appendChild(title);
                titleWrap.appendChild(meta);

                const deleteRoomButton = document.createElement("button");
                deleteRoomButton.type = "button";
                deleteRoomButton.className = "danger-button";
                deleteRoomButton.textContent = "Delete Room";
                deleteRoomButton.addEventListener("click", () => {
                    const confirmed = window.confirm(`Delete room '${room.name}' and all racks in it?`);
                    if (!confirmed) {
                        return;
                    }
                    catalog.rooms = catalog.rooms.filter(entry => entry.id !== room.id);
                    writeCatalog(catalog);
                    renderRoomSelect();
                    renderRoomSections();
                    setStatus(`Deleted room ${room.name}.`);
                });

                header.appendChild(titleWrap);
                header.appendChild(deleteRoomButton);
                section.appendChild(header);

                const rackList = document.createElement("div");
                rackList.className = "rack-list";

                const racks = Array.isArray(room.racks) ? room.racks : [];
                if (racks.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "room-section__meta";
                    empty.textContent = "No racks in this room yet.";
                    rackList.appendChild(empty);
                } else {
                    racks.forEach(rack => {
                        const rackItem = document.createElement("div");
                        rackItem.className = "rack-item";

                        const rackInfo = document.createElement("div");
                        rackInfo.className = "rack-item__info";
                        rackInfo.innerHTML = `<strong>${rack.name}</strong> [${rack.tag || "RACK"}]<br><span>${Number(rack.heightRU) || 42} RU | Tile ${rack.tileX || "-"}/${rack.tileY || "-"} | Depth ${rack.depth || 0} cm${rack.power ? ` | ${rack.power} W` : ""}</span>`;

                        const actions = document.createElement("div");
                        actions.className = "rack-item__actions";

                        const editButton = document.createElement("button");
                        editButton.type = "button";
                        editButton.textContent = "Edit";
                        editButton.addEventListener("click", () => {
                            window.location.href = `planner.html?rackId=${encodeURIComponent(rack.id)}`;
                        });

                        const deleteRackButton = document.createElement("button");
                        deleteRackButton.type = "button";
                        deleteRackButton.className = "danger-button";
                        deleteRackButton.textContent = "Delete";
                        deleteRackButton.addEventListener("click", () => {
                            const confirmed = window.confirm(`Delete rack '${rack.name}'?`);
                            if (!confirmed) {
                                return;
                            }
                            room.racks = racks.filter(entry => entry.id !== rack.id);
                            writeCatalog(catalog);
                            renderRoomSections();
                            setStatus(`Deleted rack ${rack.name}.`);
                        });

                        actions.appendChild(editButton);
                        actions.appendChild(deleteRackButton);
                        rackItem.appendChild(rackInfo);
                        rackItem.appendChild(actions);
                        rackList.appendChild(rackItem);
                    });
                }

                section.appendChild(rackList);
                roomSectionsEl.appendChild(section);
            });
        }

        createRoomButton.addEventListener("click", () => {
            const roomName = roomNameInput.value.trim();
            const building = buildingInput.value.trim();
            const floor = floorInput.value.trim();

            if (!roomName || !building || !floor) {
                setStatus("Room name, building, and floor are required.");
                return;
            }

            catalog.rooms.push({
                id: createCatalogId("room"),
                name: roomName,
                building,
                floor,
                notes: roomNotesInput.value.trim(),
                racks: []
            });

            writeCatalog(catalog);
            roomNameInput.value = "";
            buildingInput.value = "";
            floorInput.value = "";
            roomNotesInput.value = "";
            renderRoomSelect();
            renderRoomSections();
            setStatus(`Created room ${roomName}.`);
        });

        createRackButton.addEventListener("click", () => {
            const roomId = rackRoomSelect.value;
            const rackName = newRackNameInput.value.trim();
            const room = catalog.rooms.find(entry => entry.id === roomId);

            if (!room) {
                setStatus("Select an equipment room before creating a rack.");
                return;
            }

            if (!rackName) {
                setStatus("Rack name is required.");
                return;
            }

            const rackTag = newRackTagInput.value.trim() || `RACK-${String((room.racks || []).length + 1).padStart(2, "0")}`;
            const rackHeight = Number(newRackHeightInput.value) || 42;
            const tileX = Number(newTileXInput.value) || null;
            const tileY = Number(newTileYInput.value) || null;
            const depth = Number(newRackDepthInput.value) || 0;
            const power = Number(newPowerInput.value) || 0;
            const notes = newRackNotesInput.value.trim();

            const newRack = {
                id: createCatalogId("rack"),
                name: rackName,
                tag: rackTag,
                heightRU: rackHeight,
                tileX,
                tileY,
                depth,
                power,
                notes,
                plannerState: {
                    rackHeightRU: rackHeight,
                    currentView: "front",
                    showVacantSlots: true,
                    rackProfile: {
                        name: rackName,
                        tag: rackTag,
                        room: `${room.name} (${room.building} / ${room.floor})`,
                        owner: "",
                        notes
                    },
                    components: []
                },
                updatedAt: new Date().toISOString()
            };

            if (!Array.isArray(room.racks)) {
                room.racks = [];
            }
            room.racks.push(newRack);
            writeCatalog(catalog);
            renderRoomSections();

            newRackNameInput.value = "";
            newRackTagInput.value = "";
            newTileXInput.value = "";
            newTileYInput.value = "";
            newRackNotesInput.value = "";
            setStatus(`Created rack ${rackName} in ${room.name}.`);
        });

        exportCatalogButton.addEventListener("click", () => {
            const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "rackplanner-catalog.json";
            anchor.click();
            URL.revokeObjectURL(url);
            setStatus("Catalog exported.");
        });

        importCatalogButton.addEventListener("click", () => importCatalogInput.click());
        importCatalogInput.addEventListener("change", () => {
            const file = importCatalogInput.files[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const parsedCatalog = JSON.parse(event.target.result);
                    if (!parsedCatalog || !Array.isArray(parsedCatalog.rooms)) {
                        throw new Error("Invalid catalog format");
                    }
                    catalog = { rooms: parsedCatalog.rooms };
                    writeCatalog(catalog);
                    renderRoomSelect();
                    renderRoomSections();
                    setStatus("Catalog imported.");
                } catch (_error) {
                    setStatus("Could not import catalog JSON.");
                } finally {
                    importCatalogInput.value = "";
                }
            };
            reader.readAsText(file);
        });

        renderRoomSelect();
        renderRoomSections();
    }

    if (isIndexPage) {
        initIndexPage();
        return;
    }

    const rackEl = document.getElementById("rack");
    const accordionEl = document.getElementById("accordion");
    const rackInfoEl = document.getElementById("rackInfo");
    const viewLegendEl = document.getElementById("viewLegend");
    const rackIdentityBarEl = document.getElementById("rackIdentityBar");
    const rackNameTagEl = document.getElementById("rackNameTag");
    const viewModeBadgeEl = document.getElementById("viewModeBadge");
    const rackPropertiesPanelEl = document.getElementById("rackPropertiesPanel");
    const rackPropertiesInfoEl = document.getElementById("rackPropertiesInfo");
    const rackNameInput = document.getElementById("rackNameInput");
    const rackTagInput = document.getElementById("rackTagInput");
    const rackRoomInput = document.getElementById("rackRoomInput");
    const rackOwnerInput = document.getElementById("rackOwnerInput");
    const rackNotesInput = document.getElementById("rackNotesInput");
    const saveRackPropertiesButton = document.getElementById("saveRackProperties");
    const toggleVacantSlotsButton = document.getElementById("toggleVacantSlots");
    const toggleViewButton = document.getElementById("toggleViewButton");
    const createComponentButton = document.getElementById("createNewComponent");
    const addLibraryComponentButton = document.getElementById("addLibraryComponent");
    const saveSelectedComponentButton = document.getElementById("saveSelectedComponent");
    const deleteSelectedComponentButton = document.getElementById("deleteSelectedComponent");
    const clearSelectionButton = document.getElementById("clearSelection");
    const selectedComponentInfoEl = document.getElementById("selectedComponentInfo");
    const loadRackInput = document.getElementById("loadRackInput");
    const loadLibraryInput = document.getElementById("loadLibraryInput");
    const libraryCategorySelect = document.getElementById("libraryCategorySelect");
    const libraryNewCategoryNameInput = document.getElementById("libraryNewCategoryName");

    if (!rackEl || !accordionEl || !rackInfoEl || !viewLegendEl || !rackIdentityBarEl || !rackNameTagEl || !viewModeBadgeEl || !rackPropertiesPanelEl || !rackPropertiesInfoEl || !rackNameInput || !rackTagInput || !rackRoomInput || !rackOwnerInput || !rackNotesInput || !saveRackPropertiesButton || !toggleVacantSlotsButton || !toggleViewButton || !createComponentButton || !addLibraryComponentButton || !saveSelectedComponentButton || !deleteSelectedComponentButton || !clearSelectionButton || !selectedComponentInfoEl || !loadRackInput || !loadLibraryInput || !libraryCategorySelect || !libraryNewCategoryNameInput) {
        return;
    }

    const rackUnitHeightRU = 1;
    const rackUnitPixelHeight = 27;
    const defaultRackHeightRU = 42;

    const defaultLibrarySeed = [
        {
            name: "Network Devices",
            items: [
                { name: "Router", ru: 2, typeClass: "router", defaultDepth: 60, defaultPower: 250 },
                { name: "Switch", ru: 1, typeClass: "switch", defaultDepth: 35, defaultPower: 90 },
                { name: "Firewall", ru: 1, typeClass: "firewall", defaultDepth: 45, defaultPower: 120 },
                { name: "Load Balancer", ru: 1, typeClass: "load-balancer", defaultDepth: 45, defaultPower: 150 },
                { name: "Access Point", ru: 1, typeClass: "access-point", defaultDepth: 22, defaultPower: 30 }
            ]
        },
        {
            name: "Storage",
            items: [
                { name: "NAS", ru: 2, typeClass: "nas", defaultDepth: 55, defaultPower: 220 },
                { name: "SAN", ru: 4, typeClass: "san", defaultDepth: 85, defaultPower: 450 }
            ]
        },
        {
            name: "Servers",
            items: [
                { name: "Web Server", ru: 2, typeClass: "web-server", defaultDepth: 70, defaultPower: 280 },
                { name: "Database Server", ru: 2, typeClass: "database-server", defaultDepth: 75, defaultPower: 360 },
                { name: "Application Server", ru: 2, typeClass: "app-server", defaultDepth: 70, defaultPower: 300 }
            ]
        },
        {
            name: "Power Equipment",
            items: [
                { name: "UPS", ru: 2, typeClass: "ups", defaultDepth: 66, defaultPower: 500 },
                { name: "PDU", ru: 1, typeClass: "pdu", defaultDepth: 12, defaultPower: 20 }
            ]
        },
        {
            name: "Rack Mounting Equipment",
            items: [
                { name: "Brush Panel", ru: 1, typeClass: "accessories", defaultDepth: 8, defaultPower: 0 },
                { name: "Cable Hoop", ru: 1, typeClass: "accessories", defaultDepth: 12, defaultPower: 0 }
            ]
        },
        {
            name: "KVM",
            items: [
                { name: "KVM Transmitter", ru: 1, typeClass: "kvm", defaultDepth: 30, defaultPower: 35 },
                { name: "KVM Receiver", ru: 1, typeClass: "kvm", defaultDepth: 28, defaultPower: 25 },
                { name: "KVM Manager", ru: 1, typeClass: "kvm", defaultDepth: 35, defaultPower: 45 }
            ]
        }
    ];

    const state = {
        rackHeightRU: defaultRackHeightRU,
        currentView: "front",
        rackProfile: {
            name: "Main Rack",
            tag: "RACK-01",
            room: "",
            owner: "",
            notes: ""
        },
        showVacantSlots: true,
        libraryCategories: createLibraryState(defaultLibrarySeed),
        rackComponents: [],
        rackSlots: createEmptyRackSlots(defaultRackHeightRU),
        selectedComponentId: null,
        dragPreview: null,
        notice: "Drag a component into the rack or create a custom component below."
    };

    const selectedComponentFields = {
        name: document.getElementById("selectedComponentName"),
        ru: document.getElementById("selectedComponentHeight"),
        position: document.getElementById("selectedComponentPosition"),
        depth: document.getElementById("selectedComponentDepth"),
        power: document.getElementById("selectedComponentPower"),
        typeClass: document.getElementById("selectedComponentTypeClass"),
        color: document.getElementById("selectedComponentColor"),
        notes: document.getElementById("selectedComponentNotes")
    };

    const activeRackId = new URLSearchParams(window.location.search).get("rackId");

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

    function createLibraryState(seedCategories) {
        return seedCategories.map(category => ({
            id: createId("category"),
            name: category.name,
            expanded: false,
            items: category.items.map(item => ({
                id: createId("library"),
                name: item.name,
                ru: item.ru,
                typeClass: normalizeTypeClass(item.typeClass || item.name),
                defaultDepth: item.defaultDepth || 0,
                defaultPower: item.defaultPower || 0
            }))
        }));
    }

    function createId(prefix) {
        return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function normalizeTypeClass(value) {
        return String(value || "default-component")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "default-component";
    }

    function createEmptyRackSlots(heightRU) {
        return Array.from({ length: heightRU }, () => ({ front: false, rear: false }));
    }

    function cloneRackComponent(component) {
        return {
            id: component.id || createId("component"),
            name: component.name,
            ru: Number(component.ru) || 1,
            position: Number(component.position) || 1,
            typeClass: normalizeTypeClass(component.typeClass),
            depth: Number(component.depth) || 0,
            power: Number(component.power) || 0,
            notes: String(component.notes || "").trim(),
            customColor: component.customColor || null,
            occupancy: {
                front: true,
                rear: true
            }
        };
    }

    function rebuildRackSlots() {
        state.rackSlots = createEmptyRackSlots(state.rackHeightRU);

        state.rackComponents.forEach(component => {
            for (let offset = 0; offset < component.ru; offset += 1) {
                const slotIndex = component.position - 1 + offset;
                if (state.rackSlots[slotIndex]) {
                    state.rackSlots[slotIndex].front = true;
                    state.rackSlots[slotIndex].rear = true;
                }
            }
        });
    }

    function getUsedUnitsRU() {
        return state.rackComponents.reduce((sum, component) => sum + component.ru, 0);
    }

    function getHighestOccupiedRU() {
        return state.rackComponents.reduce((highest, component) => {
            return Math.max(highest, component.position + component.ru - 1);
        }, 0);
    }

    function getComponentRangeLabel(component) {
        const endRU = component.position + component.ru - 1;
        return component.ru > 1 ? `U${component.position}-U${endRU}` : `U${component.position}`;
    }

    function getSelectedRackComponent() {
        if (!state.selectedComponentId) {
            return null;
        }
        return state.rackComponents.find(component => component.id === state.selectedComponentId) || null;
    }

    function rackPositionToTop(position, componentHeightRU) {
        return (state.rackHeightRU - (position + componentHeightRU - 1)) * rackUnitPixelHeight;
    }

    function clientYToRackPosition(clientY, componentHeightRU) {
        const rackRect = rackEl.getBoundingClientRect();
        const yInRack = Math.max(0, Math.min(clientY - rackRect.top, rackRect.height - 1));
        const slotIndexFromTop = Math.floor(yInRack / rackUnitPixelHeight);
        const rawPosition = state.rackHeightRU - slotIndexFromTop - componentHeightRU + 1;
        const maxStartPosition = Math.max(1, state.rackHeightRU - componentHeightRU + 1);

        return Math.max(1, Math.min(rawPosition, maxStartPosition));
    }

    function isRackPositionAvailable(position, componentHeightRU, componentIdToIgnore = null) {
        if (position < 1 || position + componentHeightRU - 1 > state.rackHeightRU) {
            return false;
        }

        return !state.rackComponents.some(component => {
            if (component.id === componentIdToIgnore) {
                return false;
            }

            const componentStart = component.position;
            const componentEnd = component.position + component.ru - 1;
            const requestedEnd = position + componentHeightRU - 1;

            return !(requestedEnd < componentStart || position > componentEnd);
        });
    }

    function findFirstAvailablePosition(componentHeightRU) {
        const maxStartPosition = state.rackHeightRU - componentHeightRU + 1;

        for (let position = 1; position <= maxStartPosition; position += 1) {
            if (isRackPositionAvailable(position, componentHeightRU)) {
                return position;
            }
        }

        return null;
    }

    function downloadJson(filename, payload) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    function loadJsonFromInput(fileInput, onLoad) {
        const file = fileInput.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const parsed = JSON.parse(event.target.result);
                onLoad(parsed);
            } catch (error) {
                setNotice(`Could not load file: ${error.message}`);
            } finally {
                fileInput.value = "";
            }
        };
        reader.readAsText(file);
    }

    function setNotice(message) {
        state.notice = message;
        renderStatus();
    }

    function renderRackProfile() {
        const rackName = state.rackProfile.name || "Main Rack";
        const rackTag = state.rackProfile.tag || "RACK-01";
        rackNameTagEl.textContent = `${rackName} [${rackTag}]`;
        rackPropertiesInfoEl.textContent = `Rack: ${rackName} (${rackTag})`;

        rackNameInput.value = rackName;
        rackTagInput.value = rackTag;
        rackRoomInput.value = state.rackProfile.room || "";
        rackOwnerInput.value = state.rackProfile.owner || "";
        rackNotesInput.value = state.rackProfile.notes || "";
    }

    function setActiveEditor(mode) {
        if (mode === "rack") {
            rackPropertiesPanelEl.classList.add("is-active");
        } else {
            rackPropertiesPanelEl.classList.remove("is-active");
        }
    }

    function openRackPropertiesEditor() {
        setActiveEditor("rack");
        rackNameInput.focus();
        setNotice("Editing rack properties.");
    }

    function handleSaveRackProperties() {
        const nextName = rackNameInput.value.trim() || "Main Rack";
        const nextTag = rackTagInput.value.trim() || "RACK-01";

        state.rackProfile = {
            name: nextName,
            tag: nextTag,
            room: rackRoomInput.value.trim(),
            owner: rackOwnerInput.value.trim(),
            notes: rackNotesInput.value.trim()
        };

        renderRackProfile();
        renderStatus();
        syncActiveRackToCatalog();
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
        locatedRack.rack.notes = state.rackProfile.notes || locatedRack.rack.notes || "";
        locatedRack.rack.updatedAt = new Date().toISOString();
        locatedRack.rack.plannerState = {
            rackHeightRU: state.rackHeightRU,
            currentView: state.currentView,
            showVacantSlots: state.showVacantSlots,
            rackProfile: state.rackProfile,
            components: state.rackComponents
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

        const fallbackPayload = {
            rackHeightRU: Number(locatedRack.rack.heightRU) || defaultRackHeightRU,
            currentView: "front",
            showVacantSlots: true,
            rackProfile: {
                name: locatedRack.rack.name || "Main Rack",
                tag: locatedRack.rack.tag || "RACK-01",
                room: `${locatedRack.room.name || ""} (${locatedRack.room.building || ""} / ${locatedRack.room.floor || ""})`,
                owner: "",
                notes: locatedRack.rack.notes || ""
            },
            components: []
        };

        loadRackFromFile(locatedRack.rack.plannerState && Array.isArray(locatedRack.rack.plannerState.components)
            ? locatedRack.rack.plannerState
            : fallbackPayload);
        setNotice(`Loaded ${locatedRack.rack.name} from catalog.`);
    }

    function saveLibraryToFile() {
        downloadJson("rackplanner-library.json", {
            version: 1,
            savedAt: new Date().toISOString(),
            categories: state.libraryCategories.map(category => ({
                name: category.name,
                items: category.items.map(item => ({
                    name: item.name,
                    ru: item.ru,
                    typeClass: item.typeClass,
                    defaultDepth: item.defaultDepth,
                    defaultPower: item.defaultPower
                }))
            }))
        });
        setNotice("Library file exported.");
    }

    function loadLibraryFromFile(payload) {
        if (!payload || !Array.isArray(payload.categories)) {
            setNotice("Library file is missing a categories array.");
            return;
        }

        state.libraryCategories = createLibraryState(payload.categories);
        renderLibrary();
        setNotice(`Library loaded with ${state.libraryCategories.length} categories.`);
    }

    function saveRackToFile() {
        downloadJson("rackplanner-rack.json", {
            version: 1,
            savedAt: new Date().toISOString(),
            rackHeightRU: state.rackHeightRU,
            currentView: state.currentView,
            rackProfile: state.rackProfile,
            showVacantSlots: state.showVacantSlots,
            components: state.rackComponents
        });
        setNotice("Rack file exported.");
    }

    function loadRackFromFile(payload) {
        if (!payload || !Array.isArray(payload.components)) {
            setNotice("Rack file is missing a components array.");
            return;
        }

        const nextRackHeight = Number(payload.rackHeightRU) || defaultRackHeightRU;
        const nextComponents = payload.components.map(cloneRackComponent);
        const fitsRack = nextComponents.every(component => component.position + component.ru - 1 <= nextRackHeight);

        if (!fitsRack) {
            setNotice("Rack file contains components outside the saved rack height.");
            return;
        }

        state.rackHeightRU = nextRackHeight;
        state.currentView = payload.currentView === "rear" ? "rear" : "front";
        state.rackProfile = {
            name: String(payload.rackProfile?.name || "Main Rack").trim() || "Main Rack",
            tag: String(payload.rackProfile?.tag || "RACK-01").trim() || "RACK-01",
            room: String(payload.rackProfile?.room || "").trim(),
            owner: String(payload.rackProfile?.owner || "").trim(),
            notes: String(payload.rackProfile?.notes || "").trim()
        };
        state.showVacantSlots = payload.showVacantSlots !== false;
        state.rackComponents = nextComponents;
        state.selectedComponentId = null;
        rebuildRackSlots();
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Rack loaded with ${state.rackComponents.length} components.`);
    }

    function renderStatus() {
        const usedUnitsRU = getUsedUnitsRU();
        const freeUnitsRU = state.rackHeightRU - usedUnitsRU;
        const activeViewText = state.currentView === "front" ? "Front" : "Rear";
        const rackName = state.rackProfile.name || "Main Rack";
        const rackTag = state.rackProfile.tag || "RACK-01";
        const locationLine = [state.rackProfile.room, state.rackProfile.owner].filter(Boolean).join(" | ");

        document.body.classList.toggle("view-front", state.currentView === "front");
        document.body.classList.toggle("view-rear", state.currentView === "rear");
        viewModeBadgeEl.textContent = `${activeViewText.toUpperCase()} SIDE`;

        rackInfoEl.innerHTML = `
            <div><strong>${rackName}</strong> [${rackTag}]</div>
            <div>${locationLine || "No room/owner set yet."}</div>
            <div>Total Rack Size: ${state.rackHeightRU} RU</div>
            <div>Installed: ${usedUnitsRU} RU, Vacant: ${freeUnitsRU} RU</div>
            <div>Active Side: ${activeViewText}</div>
            <div class="message-banner">${state.notice}</div>
        `;
        viewLegendEl.textContent = state.currentView === "front"
            ? "Front view: every placed component also reserves the rear face."
            : "Rear view: showing the same occupancy model from the rear face.";
        toggleVacantSlotsButton.textContent = state.showVacantSlots ? "Hide Vacant Slots" : "Show Vacant Slots";
        toggleViewButton.textContent = state.currentView === "front" ? "Switch to Rear View" : "Switch to Front View";
    }

    function renderRack() {
        rackEl.innerHTML = "";
        rackEl.style.height = `${state.rackHeightRU * rackUnitPixelHeight}px`;

        for (let position = 1; position <= state.rackHeightRU; position += 1) {
            const slot = document.createElement("div");
            const slotLabelLeft = document.createElement("div");
            const slotLabelRight = document.createElement("div");
            const slotIndex = position - 1;
            const slotTop = rackPositionToTop(position, rackUnitHeightRU);
            const isVacant = !state.rackSlots[slotIndex].front && !state.rackSlots[slotIndex].rear;

            slot.className = `rack-slot${state.showVacantSlots && isVacant ? " is-vacant" : ""}`;
            slot.style.top = `${slotTop}px`;
            slot.style.height = `${rackUnitPixelHeight}px`;

            slotLabelLeft.className = "rack-slot-label";
            slotLabelLeft.style.top = `${slotTop + rackUnitPixelHeight / 2}px`;
            slotLabelLeft.textContent = `U${position}`;

            slotLabelRight.className = "rack-slot-label right";
            slotLabelRight.style.top = `${slotTop + rackUnitPixelHeight / 2}px`;
            slotLabelRight.textContent = `U${position}`;

            rackEl.appendChild(slot);
            rackEl.appendChild(slotLabelLeft);
            rackEl.appendChild(slotLabelRight);
        }

        if (state.dragPreview && state.dragPreview.valid) {
            const highlight = document.createElement("div");
            highlight.className = "rack-highlight";
            highlight.style.top = `${rackPositionToTop(state.dragPreview.position, state.dragPreview.ru)}px`;
            highlight.style.height = `${state.dragPreview.ru * rackUnitPixelHeight}px`;
            rackEl.appendChild(highlight);
        }

        state.rackComponents
            .slice()
            .sort((left, right) => right.position - left.position)
            .forEach(component => {
                const componentEl = document.createElement("div");
                const topRow = document.createElement("div");
                const bottomRow = document.createElement("div");
                const nameEl = document.createElement("span");
                const rangeEl = document.createElement("span");
                const depthEl = document.createElement("span");
                const metaEl = document.createElement("span");
                const faceEl = document.createElement("span");

                componentEl.className = `rack-component ${component.typeClass || "default-component"}`;
                componentEl.style.top = `${rackPositionToTop(component.position, component.ru)}px`;
                componentEl.style.height = `${component.ru * rackUnitPixelHeight}px`;
                
                // Apply custom color if set
                if (component.customColor) {
                    const darkerShade = adjustBrightness(component.customColor, -20);
                    componentEl.style.background = `linear-gradient(135deg, ${component.customColor}, ${darkerShade})`;
                }
                
                componentEl.dataset.componentId = component.id;
                                componentEl.dataset.ru = component.ru;
                componentEl.title = component.notes
                    ? `Click to edit ${component.name}\nNotes: ${component.notes}`
                    : `Click to edit ${component.name}`;

                if (component.id === state.selectedComponentId) {
                    componentEl.classList.add("is-selected");
                }

                topRow.className = "rack-component__top";
                bottomRow.className = "rack-component__bottom";
                nameEl.className = "rack-component__name";
                rangeEl.className = "rack-component__range";
                depthEl.className = "rack-component__depth";
                metaEl.className = "rack-component__meta";
                faceEl.className = "rack-component__face";

                nameEl.textContent = component.name;
                rangeEl.textContent = getComponentRangeLabel(component);
                depthEl.textContent = `D: ${component.depth} cm`;
                metaEl.textContent = `${component.ru} RU${component.power ? ` | ${component.power} W` : ""}`;
                faceEl.textContent = state.currentView === "front" ? "Front + Rear reserved" : "Rear face";

                topRow.appendChild(nameEl);
                topRow.appendChild(rangeEl);
                bottomRow.appendChild(metaEl);
                bottomRow.appendChild(faceEl);
                componentEl.appendChild(topRow);
                componentEl.appendChild(depthEl);
                componentEl.appendChild(bottomRow);

                rackEl.appendChild(componentEl);
            });
    }

    function renderLibrary() {
        accordionEl.innerHTML = "";

        state.libraryCategories.forEach((category, categoryIndex) => {
            const card = document.createElement("div");
            const cardHeader = document.createElement("div");
            const cardTitle = document.createElement("h5");
            const toggleButton = document.createElement("button");
            const collapseDiv = document.createElement("div");
            const cardBody = document.createElement("div");

            card.className = "card";
            cardHeader.className = "card-header";
            cardTitle.className = "mb-0";
            toggleButton.className = "btn btn-link";
            toggleButton.type = "button";
            toggleButton.textContent = `${category.name} (${category.items.length})`;
            toggleButton.setAttribute("aria-expanded", category.expanded ? "true" : "false");
            toggleButton.addEventListener("click", () => {
                state.libraryCategories[categoryIndex].expanded = !state.libraryCategories[categoryIndex].expanded;
                renderLibrary();
            });

            collapseDiv.className = `collapse${category.expanded ? " show" : ""}`;
            cardBody.className = "card-body";

            category.items.forEach(item => {
                const itemEl = document.createElement("div");
                const nameEl = document.createElement("div");
                const metaEl = document.createElement("div");
                const actionsEl = document.createElement("div");
                const removeButton = document.createElement("button");

                itemEl.className = `equipment ${item.typeClass}`;
                itemEl.draggable = true;
                itemEl.dataset.component = JSON.stringify(item);
                itemEl.addEventListener("dragstart", handleLibraryDragStart);

                nameEl.className = "equipment__name";
                nameEl.textContent = item.name;

                metaEl.className = "equipment__meta";
                metaEl.textContent = `${item.ru} RU | ${item.defaultDepth} cm | ${item.defaultPower} W`;

                actionsEl.className = "equipment__actions";
                removeButton.className = "library-remove";
                removeButton.type = "button";
                removeButton.textContent = "Remove";
                removeButton.addEventListener("click", event => {
                    event.stopPropagation();
                    removeLibraryComponent(category.id, item.id);
                });

                actionsEl.appendChild(removeButton);
                itemEl.appendChild(nameEl);
                itemEl.appendChild(metaEl);
                itemEl.appendChild(actionsEl);
                cardBody.appendChild(itemEl);
            });

            if (category.items.length === 0) {
                const emptyEl = document.createElement("div");
                emptyEl.className = "equipment__meta";
                emptyEl.textContent = "No components in this category yet.";
                cardBody.appendChild(emptyEl);
            }

            cardTitle.appendChild(toggleButton);
            cardHeader.appendChild(cardTitle);
            collapseDiv.appendChild(cardBody);
            card.appendChild(cardHeader);
            card.appendChild(collapseDiv);
            accordionEl.appendChild(card);
        });

        renderLibraryCategoryOptions();
    }

    function renderLibraryCategoryOptions() {
        const selectedValue = libraryCategorySelect.value;
        const options = state.libraryCategories
            .map(category => `<option value="${category.id}">${category.name}</option>`)
            .join("");

        libraryCategorySelect.innerHTML = `${options}<option value="__new__">New Category...</option>`;

        if (selectedValue && libraryCategorySelect.querySelector(`option[value="${selectedValue}"]`)) {
            libraryCategorySelect.value = selectedValue;
        } else {
            libraryCategorySelect.value = state.libraryCategories[0]?.id || "__new__";
        }

        const useNewCategory = libraryCategorySelect.value === "__new__";
        libraryNewCategoryNameInput.disabled = !useNewCategory;
        if (!useNewCategory) {
            libraryNewCategoryNameInput.value = "";
        }
    }

    function renderAll() {
        rebuildRackSlots();
        renderRack();
        renderLibrary();
        renderRackProfile();
        renderSelectedComponentPanel();
        renderStatus();
    }

    function renderSelectedComponentPanel() {
        const selectedComponent = getSelectedRackComponent();
        const hasSelection = Boolean(selectedComponent);

        Object.values(selectedComponentFields).forEach(field => {
            if (!field) {
                return;
            }
            field.disabled = !hasSelection;
        });

        saveSelectedComponentButton.disabled = !hasSelection;
        deleteSelectedComponentButton.disabled = !hasSelection;
        clearSelectionButton.disabled = !hasSelection;

        if (!hasSelection) {
            selectedComponentFields.name.value = "";
            selectedComponentFields.ru.value = "";
            selectedComponentFields.position.value = "";
            selectedComponentFields.depth.value = "";
            selectedComponentFields.power.value = "";
            selectedComponentFields.typeClass.value = "";
            selectedComponentFields.color.value = "";
            selectedComponentFields.notes.value = "";
            selectedComponentInfoEl.textContent = "Click a component in the rack to view metadata.";
            return;
        }

        selectedComponentFields.name.value = selectedComponent.name;
        selectedComponentFields.ru.value = selectedComponent.ru;
        selectedComponentFields.position.value = selectedComponent.position;
        selectedComponentFields.depth.value = selectedComponent.depth;
        selectedComponentFields.power.value = selectedComponent.power;
        selectedComponentFields.typeClass.value = selectedComponent.typeClass;
        selectedComponentFields.color.value = selectedComponent.customColor || "#2c9874";
        selectedComponentFields.notes.value = selectedComponent.notes || "";
        selectedComponentInfoEl.textContent = `Selected: ${selectedComponent.name} (${getComponentRangeLabel(selectedComponent)})`;
    }

    function addComponentToRack(componentInput) {
        const component = cloneRackComponent(componentInput);

        if (!component.name) {
            setNotice("A component name is required.");
            return false;
        }

        const requestedPosition = componentInput.position != null ? Number(componentInput.position) : null;
        const resolvedPosition = requestedPosition || findFirstAvailablePosition(component.ru);

        if (resolvedPosition == null) {
            setNotice("No vacant position fits that component height.");
            return false;
        }

        if (!isRackPositionAvailable(resolvedPosition, component.ru)) {
            setNotice(`U${resolvedPosition} is already occupied for that height.`);
            return false;
        }

        component.position = resolvedPosition;
        state.rackComponents.push(component);
        state.selectedComponentId = component.id;
        state.dragPreview = null;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`${component.name} placed at ${getComponentRangeLabel(component)}.`);
        return true;
    }

    function removeRackComponent(componentId, requireConfirmation = true) {
        const component = state.rackComponents.find(entry => entry.id === componentId);
        if (!component) {
            return;
        }

        if (requireConfirmation) {
            const shouldDelete = window.confirm(`Delete ${component.name} at ${getComponentRangeLabel(component)}?`);
            if (!shouldDelete) {
                setNotice("Deletion canceled.");
                return;
            }
        }

        const nextComponents = state.rackComponents.filter(component => component.id !== componentId);

        if (nextComponents.length === state.rackComponents.length) {
            return;
        }

        state.rackComponents = nextComponents;
        if (state.selectedComponentId === componentId) {
            state.selectedComponentId = null;
        }
        renderAll();
        syncActiveRackToCatalog();
        setNotice("Component removed from rack.");
    }

    function handleSelectRackComponent(componentId) {
        const component = state.rackComponents.find(entry => entry.id === componentId);
        if (!component) {
            return;
        }
        setActiveEditor("component");
        state.selectedComponentId = componentId;
        renderRack();
        renderSelectedComponentPanel();
        setNotice(`Selected ${component.name} for editing.`);
    }

    function setFieldHint(inputId, hintId, message) {
        const inputEl = document.getElementById(inputId);
        const hintEl = document.getElementById(hintId);
        if (hintEl) {
            hintEl.textContent = message || "";
        }
        if (inputEl) {
            inputEl.classList.toggle("is-invalid", Boolean(message));
            if (message) {
                inputEl.addEventListener("input", function clearHint() {
                    if (hintEl) hintEl.textContent = "";
                    inputEl.classList.remove("is-invalid");
                }, { once: true });
            }
        }
    }

    function clearFormHints(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.querySelectorAll(".field-hint").forEach(el => { el.textContent = ""; });
        form.querySelectorAll("input.is-invalid").forEach(el => el.classList.remove("is-invalid"));
    }

    function handleSaveSelectedComponent() {
        clearFormHints("selectedComponentForm");
        const selectedComponent = getSelectedRackComponent();
        if (!selectedComponent) {
            return;
        }

        const nextName = selectedComponentFields.name.value.trim();
        const nextRU = Number(selectedComponentFields.ru.value) || 1;
        const nextPosition = Number(selectedComponentFields.position.value) || 1;
        const nextDepth = Number(selectedComponentFields.depth.value) || 0;
        const nextPower = Number(selectedComponentFields.power.value) || 0;
        const nextTypeClass = normalizeTypeClass(selectedComponentFields.typeClass.value || selectedComponent.typeClass);
        const nextColor = selectedComponentFields.color.value || null;
        const nextNotes = String(selectedComponentFields.notes.value || "").trim();

        if (!nextName) {
            setFieldHint("selectedComponentName", "hintSelectedName", "Name is required.");
            return;
        }

        if (!isRackPositionAvailable(nextPosition, nextRU, selectedComponent.id)) {
            setFieldHint("selectedComponentPosition", "hintSelectedPosition", "Overlaps another component or exceeds rack height.");
            return;
        }

        selectedComponent.name = nextName;
        selectedComponent.ru = nextRU;
        selectedComponent.position = nextPosition;
        selectedComponent.depth = nextDepth;
        selectedComponent.power = nextPower;
        selectedComponent.typeClass = nextTypeClass;
        selectedComponent.customColor = nextColor;
        selectedComponent.notes = nextNotes;

        setActiveEditor("component");
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Updated ${selectedComponent.name}.`);
    }

    function clearSelectedComponent() {
        state.selectedComponentId = null;
        setActiveEditor("rack");
        renderRack();
        renderSelectedComponentPanel();
        setNotice("Selection cleared.");
    }

    function handleDeleteSelectedComponent() {
        const selectedComponent = getSelectedRackComponent();
        if (!selectedComponent) {
            return;
        }
        removeRackComponent(selectedComponent.id, true);
    }

    function removeLibraryComponent(categoryId, componentId) {
        state.libraryCategories = state.libraryCategories
            .map(category => {
                if (category.id !== categoryId) {
                    return category;
                }

                return {
                    ...category,
                    items: category.items.filter(item => item.id !== componentId)
                };
            })
            .filter(category => category.items.length > 0);

        renderLibrary();
        setNotice("Component removed from library.");
    }

    function handleLibraryDragStart(event) {
        const componentData = event.currentTarget.dataset.component;
        event.dataTransfer.setData("application/json", componentData);
        event.dataTransfer.effectAllowed = "copy";
    }

    function parseDraggedLibraryComponent(event) {
        const rawData = event.dataTransfer.getData("application/json");
        if (!rawData) {
            return null;
        }

        try {
            return JSON.parse(rawData);
        } catch (error) {
            setNotice(`Could not parse dragged component: ${error.message}`);
            return null;
        }
    }

    function updateDragPreview(event) {
        event.preventDefault();
        const draggedComponent = parseDraggedLibraryComponent(event);
        if (!draggedComponent) {
            if (state.dragPreview !== null) {
                state.dragPreview = null;
                renderRack();
            }
            return;
        }

        const ru = Number(draggedComponent.ru) || 1;
        const position = clientYToRackPosition(event.clientY, ru);
        const valid = isRackPositionAvailable(position, ru);
        const prev = state.dragPreview;

        if (!prev || prev.position !== position || prev.valid !== valid || prev.ru !== ru) {
            state.dragPreview = { position, ru, valid };
            renderRack();
        }
    }

    function handleRackDrop(event) {
        event.preventDefault();
        const draggedComponent = parseDraggedLibraryComponent(event);
        state.dragPreview = null;

        if (!draggedComponent) {
            renderRack();
            return;
        }

        const position = clientYToRackPosition(event.clientY, Number(draggedComponent.ru) || 1);
        const placed = addComponentToRack({
            name: draggedComponent.name,
            ru: Number(draggedComponent.ru) || 1,
            position,
            typeClass: draggedComponent.typeClass,
            depth: Number(draggedComponent.defaultDepth) || 0,
            power: Number(draggedComponent.defaultPower) || 0
        });

        if (!placed) {
            renderRack();
        }
    }

    function clearDragPreview() {
        state.dragPreview = null;
        renderRack();
    }

    function handleCreateCustomComponent() {
        clearFormHints("createComponentForm");
        const name = document.getElementById("newComponentName").value.trim();
        const ru = Number(document.getElementById("newComponentHeight").value) || 1;
        const positionValue = document.getElementById("newComponentPosition").value;
        const depth = Number(document.getElementById("newComponentDepth").value) || 0;
        const power = Number(document.getElementById("newComponentPower").value) || 0;
        const defaultColor = getDefaultColor();

        if (!name) {
            setFieldHint("newComponentName", "hintNewName", "Name is required.");
            return;
        }

        if (positionValue) {
            const pos = Number(positionValue);
            if (!isRackPositionAvailable(pos, ru)) {
                setFieldHint("newComponentPosition", "hintNewPosition", `U${pos} is already occupied — leave blank to auto-place.`);
                return;
            }
        }

        const placed = addComponentToRack({
            name,
            ru,
            position: positionValue ? Number(positionValue) : null,
            typeClass: "custom-component",
            depth,
            power,
            customColor: defaultColor.color
        });

        if (placed) {
            document.getElementById("newComponentName").value = "";
            document.getElementById("newComponentPosition").value = "";
        }
    }

    function handleAddLibraryComponent() {
        clearFormHints("libraryForm");
        const selectedCategoryId = libraryCategorySelect.value;
        const rawNewCategoryName = libraryNewCategoryNameInput.value.trim();
        let categoryName = "";

        if (selectedCategoryId === "__new__") {
            categoryName = rawNewCategoryName;
        } else {
            const selectedCategory = state.libraryCategories.find(entry => entry.id === selectedCategoryId);
            categoryName = selectedCategory ? selectedCategory.name : "";
        }

        const componentName = document.getElementById("libraryComponentName").value.trim();
        const ru = Number(document.getElementById("libraryComponentHeight").value) || 1;
        const typeClass = normalizeTypeClass(document.getElementById("libraryComponentClass").value || componentName);
        const defaultDepth = Number(document.getElementById("libraryComponentDepth").value) || 0;
        const defaultPower = Number(document.getElementById("libraryComponentPower").value) || 0;

        if (!categoryName) {
            setFieldHint("libraryNewCategoryName", "hintLibraryCategory", "Select a category or enter a new category name.");
            return;
        }

        if (!componentName) {
            setFieldHint("libraryComponentName", "hintLibraryName", "Name is required.");
            return;
        }

        let category = state.libraryCategories.find(entry => entry.name.toLowerCase() === categoryName.toLowerCase());

        if (!category) {
            category = {
                id: createId("category"),
                name: categoryName,
                expanded: true,
                items: []
            };
            state.libraryCategories.push(category);
        }

        category.items.push({
            id: createId("library"),
            name: componentName,
            ru,
            typeClass,
            defaultDepth,
            defaultPower
        });
        category.expanded = true;
        renderLibrary();
        setNotice(`${componentName} added to ${category.name}.`);

        libraryCategorySelect.value = category.id;
        libraryNewCategoryNameInput.value = "";
        libraryNewCategoryNameInput.disabled = true;
        document.getElementById("libraryComponentName").value = "";
        document.getElementById("libraryComponentClass").value = "";
    }

    function handleIncreaseRackHeight() {
        state.rackHeightRU += rackUnitHeightRU;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Rack height increased to ${state.rackHeightRU} RU.`);
    }

    function handleDecreaseRackHeight() {
        const nextHeight = state.rackHeightRU - rackUnitHeightRU;
        if (nextHeight < getHighestOccupiedRU()) {
            setNotice("Cannot reduce rack height below the highest occupied U position.");
            return;
        }

        if (nextHeight < 1) {
            setNotice("Rack height must remain at least 1 RU.");
            return;
        }

        state.rackHeightRU = nextHeight;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Rack height reduced to ${state.rackHeightRU} RU.`);
    }

    function handleToggleVacantSlots() {
        state.showVacantSlots = !state.showVacantSlots;
        renderAll();
        syncActiveRackToCatalog();
    }

    function handleToggleView() {
        state.currentView = state.currentView === "front" ? "rear" : "front";
        renderStatus();
        renderRack();
        syncActiveRackToCatalog();
    }

    function bindEvents() {
        createComponentButton.addEventListener("click", handleCreateCustomComponent);
        addLibraryComponentButton.addEventListener("click", handleAddLibraryComponent);
        saveRackPropertiesButton.addEventListener("click", handleSaveRackProperties);
        saveSelectedComponentButton.addEventListener("click", handleSaveSelectedComponent);
        deleteSelectedComponentButton.addEventListener("click", handleDeleteSelectedComponent);
        clearSelectionButton.addEventListener("click", clearSelectedComponent);
        document.getElementById("increaseHeight").addEventListener("click", handleIncreaseRackHeight);
        document.getElementById("decreaseHeight").addEventListener("click", handleDecreaseRackHeight);
        toggleVacantSlotsButton.addEventListener("click", handleToggleVacantSlots);
        toggleViewButton.addEventListener("click", handleToggleView);
        document.getElementById("saveRackButton").addEventListener("click", saveRackToFile);
        document.getElementById("saveLibraryButton").addEventListener("click", saveLibraryToFile);
        document.getElementById("loadRackButton").addEventListener("click", () => loadRackInput.click());
        document.getElementById("loadLibraryButton").addEventListener("click", () => loadLibraryInput.click());
        loadRackInput.addEventListener("change", () => loadJsonFromInput(loadRackInput, loadRackFromFile));
        loadLibraryInput.addEventListener("change", () => loadJsonFromInput(loadLibraryInput, loadLibraryFromFile));
        libraryCategorySelect.addEventListener("change", () => {
            const useNewCategory = libraryCategorySelect.value === "__new__";
            libraryNewCategoryNameInput.disabled = !useNewCategory;
            if (!useNewCategory) {
                libraryNewCategoryNameInput.value = "";
            }
        });

        rackIdentityBarEl.addEventListener("click", openRackPropertiesEditor);
        rackInfoEl.addEventListener("click", openRackPropertiesEditor);

        rackEl.addEventListener("dragover", updateDragPreview);
        rackEl.addEventListener("drop", handleRackDrop);
        rackEl.addEventListener("dragleave", event => {
            if (event.relatedTarget && rackEl.contains(event.relatedTarget)) {
                return;
            }
            clearDragPreview();
        });
        rackEl.addEventListener("click", event => {
            const componentEl = event.target.closest(".rack-component");
            if (!componentEl) {
                return;
            }
            handleSelectRackComponent(componentEl.dataset.componentId);
        });
    }

    const colorStorageKey = "rackplanner.default-color.v1";

    const colorPresets = [
        { name: "Router", gradient: "linear-gradient(135deg, #15616d, #1d8a9b)", color: "#1d8a9b" },
        { name: "Switch", gradient: "linear-gradient(135deg, #355c7d, #4d7ea8)", color: "#4d7ea8" },
        { name: "Firewall", gradient: "linear-gradient(135deg, #8e3b46, #b6505d)", color: "#b6505d" },
        { name: "Load Balancer", gradient: "linear-gradient(135deg, #5d4e75, #7e68a3)", color: "#7e68a3" },
        { name: "Access Point", gradient: "linear-gradient(135deg, #4d6d3b, #678d52)", color: "#678d52" },
        { name: "NAS", gradient: "linear-gradient(135deg, #7d5533, #ab7344)", color: "#ab7344" },
        { name: "SAN", gradient: "linear-gradient(135deg, #6b3f2d, #8b5a42)", color: "#8b5a42" },
        { name: "Web Server", gradient: "linear-gradient(135deg, #2f4858, #44708b)", color: "#44708b" },
        { name: "Database Server", gradient: "linear-gradient(135deg, #5f0f40, #8b1e5c)", color: "#8b1e5c" },
        { name: "App Server", gradient: "linear-gradient(135deg, #414770, #6169a8)", color: "#6169a8" },
        { name: "UPS", gradient: "linear-gradient(135deg, #4d5d53, #708577)", color: "#708577" },
        { name: "PDU", gradient: "linear-gradient(135deg, #6f4e37, #9a6f53)", color: "#9a6f53" },
        { name: "Accessories", gradient: "linear-gradient(135deg, #5c6770, #7d8994)", color: "#7d8994" },
        { name: "Custom", gradient: "linear-gradient(135deg, #1f6a52, #2c9874)", color: "#2c9874" }
    ];

    function getDefaultColor() {
        try {
            const stored = localStorage.getItem(colorStorageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed;
            }
        } catch (_error) {
            // Fall through to default
        }
        return { color: "#2c9874", gradient: "linear-gradient(135deg, #1f6a52, #2c9874)" };
    }

    function setDefaultColor(color, gradient) {
        localStorage.setItem(colorStorageKey, JSON.stringify({ color, gradient }));
    }

    function initializeColorPicker() {
        const colorPresetGrid = document.getElementById("colorPresetGrid");
        const customColorInput = document.getElementById("customColorInput");
        const selectedColorPreview = document.getElementById("selectedColorPreview");

        if (!colorPresetGrid || !customColorInput || !selectedColorPreview) {
            return;
        }

        const currentColor = getDefaultColor();
        customColorInput.value = currentColor.color;
        selectedColorPreview.style.background = currentColor.gradient;

        // Create preset buttons
        colorPresets.forEach((preset, index) => {
            const button = document.createElement("button");
            button.className = "color-preset";
            button.type = "button";
            button.style.background = preset.gradient;
            button.title = preset.name;
            button.setAttribute("aria-label", `Select ${preset.name} color`);

            if (preset.color === currentColor.color) {
                button.classList.add("is-selected");
            }

            button.addEventListener("click", () => {
                // Remove previous selection
                colorPresetGrid.querySelectorAll(".color-preset.is-selected").forEach(el => {
                    el.classList.remove("is-selected");
                });
                button.classList.add("is-selected");

                setDefaultColor(preset.color, preset.gradient);
                customColorInput.value = preset.color;
                selectedColorPreview.style.background = preset.gradient;
            });

            colorPresetGrid.appendChild(button);
        });

        // Custom color input
        customColorInput.addEventListener("change", (e) => {
            const color = e.target.value;
            const gradient = `linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)})`;

            // Remove any preset selection
            colorPresetGrid.querySelectorAll(".color-preset.is-selected").forEach(el => {
                el.classList.remove("is-selected");
            });

            setDefaultColor(color, gradient);
            selectedColorPreview.style.background = gradient;
        });

        customColorInput.addEventListener("input", (e) => {
            const color = e.target.value;
            const gradient = `linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)})`;
            selectedColorPreview.style.background = gradient;
        });
    }

    function adjustBrightness(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min((num >> 16) + amt, 255));
        const G = Math.max(0, Math.min(((num >> 8) & 0x00FF) + amt, 255));
        const B = Math.max(0, Math.min((num & 0x0000FF) + amt, 255));
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    }

    bindEvents();
    setActiveEditor("rack");
    initializeColorPicker();
    renderAll();
    loadRackFromCatalog();
});
