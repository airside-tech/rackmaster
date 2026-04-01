import { openTextFileWithPicker, readTextFromInput, saveTextFile } from "./js/modules/fileIO.js";
import { readCatalog, writeCatalog } from "./js/modules/storage.js";
import { asNumber, createCatalogId, createId, normalizeTypeClass } from "./js/modules/typeUtils.js";
import {
    catalogToCsv,
    csvToCatalog,
    csvToLibraryPayload,
    csvToRackPayload,
    libraryPayloadToCsv,
    rackPayloadToCsv
} from "./js/modules/catalogFormat.js";

document.addEventListener("DOMContentLoaded", () => {
    const isIndexPage = document.body.classList.contains("index-page");

    function chooseDataFormat(actionLabel) {
        return new Promise(resolve => {
            const overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.inset = "0";
            overlay.style.background = "rgba(0, 0, 0, 0.45)";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.zIndex = "9999";

            const dialog = document.createElement("div");
            dialog.style.background = "#ffffff";
            dialog.style.borderRadius = "12px";
            dialog.style.padding = "18px";
            dialog.style.minWidth = "280px";
            dialog.style.maxWidth = "92vw";
            dialog.style.boxShadow = "0 10px 28px rgba(0,0,0,0.25)";

            const title = document.createElement("h5");
            title.textContent = `${actionLabel} format`;
            title.style.margin = "0 0 8px 0";

            const description = document.createElement("p");
            description.textContent = "Choose a file format:";
            description.style.margin = "0 0 12px 0";

            const actions = document.createElement("div");
            actions.style.display = "flex";
            actions.style.gap = "8px";
            actions.style.flexWrap = "wrap";

            const jsonButton = document.createElement("button");
            jsonButton.type = "button";
            jsonButton.textContent = "JSON";

            const csvButton = document.createElement("button");
            csvButton.type = "button";
            csvButton.textContent = "CSV";

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.textContent = "Cancel";

            function closeWith(value) {
                overlay.remove();
                resolve(value);
            }

            jsonButton.addEventListener("click", () => closeWith("json"));
            csvButton.addEventListener("click", () => closeWith("csv"));
            cancelButton.addEventListener("click", () => closeWith(null));
            overlay.addEventListener("click", event => {
                if (event.target === overlay) {
                    closeWith(null);
                }
            });

            actions.appendChild(jsonButton);
            actions.appendChild(csvButton);
            actions.appendChild(cancelButton);
            dialog.appendChild(title);
            dialog.appendChild(description);
            dialog.appendChild(actions);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        });
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
        const clearCatalogButton = document.getElementById("clearCatalogButton");

        if (!roomNameInput || !buildingInput || !floorInput || !roomNotesInput || !createRoomButton || !newRackNameInput || !rackRoomSelect || !newRackTagInput || !newRackHeightInput || !newTileXInput || !newTileYInput || !newRackDepthInput || !newPowerInput || !newRackNotesInput || !createRackButton || !roomSectionsEl || !statusEl || !exportCatalogButton || !importCatalogButton || !importCatalogInput || !clearCatalogButton) {
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
                        rackDepthCm: depth,
                        minDepthClearanceCm: 0,
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

        exportCatalogButton.addEventListener("click", async () => {
            const format = await chooseDataFormat("Export");
            if (!format) {
                setStatus("Export canceled.");
                return;
            }

            const isCsv = format === "csv";
            const filename = `rackplanner-catalog.${isCsv ? "csv" : "json"}`;
            const content = isCsv ? catalogToCsv(catalog) : JSON.stringify(catalog, null, 2);
            const saved = await saveTextFile(filename, content, isCsv ? "text/csv" : "application/json", isCsv ? ".csv" : ".json");
            setStatus(saved ? `Catalog exported as ${format.toUpperCase()}.` : "Export canceled.");
        });

        importCatalogButton.addEventListener("click", async () => {
            const format = await chooseDataFormat("Import");
            if (!format) {
                setStatus("Import canceled.");
                return;
            }

            if (window.showOpenFilePicker) {
                try {
                    const rawText = await openTextFileWithPicker(format);
                    if (rawText === "") {
                        setStatus("Import canceled.");
                        return;
                    }

                    const parsedCatalog = format === "csv"
                        ? csvToCatalog(rawText)
                        : JSON.parse(rawText);

                    if (!parsedCatalog || !Array.isArray(parsedCatalog.rooms)) {
                        throw new Error("Invalid catalog format");
                    }

                    catalog = { rooms: parsedCatalog.rooms };
                    writeCatalog(catalog);
                    renderRoomSelect();
                    renderRoomSections();
                    setStatus(`Catalog imported from ${format.toUpperCase()}.`);
                    return;
                } catch (_error) {
                    setStatus("Could not import catalog file.");
                    return;
                }
            }

            importCatalogInput.dataset.format = format;
            importCatalogInput.accept = format === "csv" ? ".csv,text/csv" : ".json,application/json";
            importCatalogInput.click();
        });
        importCatalogInput.addEventListener("change", async () => {
            try {
                const format = importCatalogInput.dataset.format || "json";
                const rawText = await readTextFromInput(importCatalogInput);
                const parsedCatalog = format === "csv"
                    ? csvToCatalog(rawText)
                    : JSON.parse(rawText);

                if (!parsedCatalog || !Array.isArray(parsedCatalog.rooms)) {
                    throw new Error("Invalid catalog format");
                }

                catalog = { rooms: parsedCatalog.rooms };
                writeCatalog(catalog);
                renderRoomSelect();
                renderRoomSections();
                setStatus(`Catalog imported from ${format.toUpperCase()}.`);
            } catch (_error) {
                setStatus("Could not import catalog file.");
            } finally {
                importCatalogInput.value = "";
            }
        });

        clearCatalogButton.addEventListener("click", () => {
            const confirmed = window.confirm("Clear all RackMaster data stored in this browser?");
            if (!confirmed) {
                return;
            }

            Object.keys(localStorage)
                .filter(key => key.startsWith("rackplanner."))
                .forEach(key => localStorage.removeItem(key));

            catalog = { rooms: [] };
            renderRoomSelect();
            renderRoomSections();
            setStatus("Local RackMaster browser data cleared.");
        });

        renderRoomSelect();
        renderRoomSections();
    }

    if (isIndexPage) {
        initIndexPage();
        return;
    }

    const rackEl = document.getElementById("rack");
    const rackStageHeadingEl = document.getElementById("rackStageHeading");
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
    const rackHeightInput = document.getElementById("rackHeightInput");
    const rackDepthInput = document.getElementById("rackDepthInput");
    const rackRoomInput = document.getElementById("rackRoomInput");
    const rackOwnerInput = document.getElementById("rackOwnerInput");
    const rackClearanceInput = document.getElementById("rackClearanceInput");
    const rackNotesInput = document.getElementById("rackNotesInput");
    const saveRackPropertiesButton = document.getElementById("saveRackProperties");
    const toggleVacantSlotsButton = document.getElementById("toggleVacantSlots");
    const toggleViewButton = document.getElementById("toggleViewButton");
    const addLibraryComponentButton = document.getElementById("addLibraryComponent");
    const saveSelectedComponentButton = document.getElementById("saveSelectedComponent");
    const deleteSelectedComponentButton = document.getElementById("deleteSelectedComponent");
    const clearSelectionButton = document.getElementById("clearSelection");
    const selectedComponentInfoEl = document.getElementById("selectedComponentInfo");
    const loadRackInput = document.getElementById("loadRackInput");
    const loadLibraryInput = document.getElementById("loadLibraryInput");
    const libraryCategorySelect = document.getElementById("libraryCategorySelect");
    const libraryNewCategoryNameInput = document.getElementById("libraryNewCategoryName");

    if (!rackEl || !accordionEl || !rackInfoEl || !viewLegendEl || !rackIdentityBarEl || !rackNameTagEl || !viewModeBadgeEl || !rackPropertiesPanelEl || !rackPropertiesInfoEl || !rackNameInput || !rackTagInput || !rackHeightInput || !rackDepthInput || !rackRoomInput || !rackOwnerInput || !rackClearanceInput || !rackNotesInput || !saveRackPropertiesButton || !toggleVacantSlotsButton || !toggleViewButton || !addLibraryComponentButton || !saveSelectedComponentButton || !deleteSelectedComponentButton || !clearSelectionButton || !selectedComponentInfoEl || !loadRackInput || !loadLibraryInput || !libraryCategorySelect || !libraryNewCategoryNameInput) {
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
            rackDepthCm: 0,
            minDepthClearanceCm: 0,
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
        description: document.getElementById("selectedComponentDescription"),
        color: document.getElementById("selectedComponentColor"),
        notes: document.getElementById("selectedComponentNotes")
    };
    const selectedComponentColorPresetsEl = document.getElementById("selectedComponentColorPresets");

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
                description: item.description || "",
                defaultDepth: item.defaultDepth || 0,
                defaultPower: item.defaultPower || 0
            }))
        }));
    }

    function getComponentDisplayColor(component) {
        if (component && component.customColor) {
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

    function updateSelectedComponentPaletteSelection(colorHex) {
        if (!selectedComponentColorPresetsEl) {
            return;
        }

        const normalizedTarget = String(colorHex || "").toLowerCase();
        selectedComponentColorPresetsEl.querySelectorAll(".color-preset").forEach(button => {
            const matches = String(button.dataset.color || "").toLowerCase() === normalizedTarget;
            button.classList.toggle("is-selected", matches);
        });
    }

    function initializeSelectedComponentColorPalette() {
        if (!selectedComponentColorPresetsEl) {
            return;
        }

        selectedComponentColorPresetsEl.innerHTML = "";

        colorPresets.forEach(preset => {
            const button = document.createElement("button");
            button.className = "color-preset";
            button.type = "button";
            button.style.background = preset.gradient;
            button.dataset.color = preset.color;
            button.title = preset.name;
            button.setAttribute("aria-label", `Apply ${preset.name} to selected component`);

            button.addEventListener("click", () => {
                const selectedComponent = getSelectedRackComponent();
                if (!selectedComponent) {
                    return;
                }

                selectedComponentFields.color.value = preset.color;
                updateSelectedComponentPaletteSelection(preset.color);
                selectedComponent.customColor = preset.color;
                renderRack();
                renderSelectedComponentPanel();
                syncActiveRackToCatalog();
                setNotice(`Updated ${selectedComponent.name} color.`);
            });

            selectedComponentColorPresetsEl.appendChild(button);
        });

        selectedComponentFields.color.addEventListener("input", event => {
            const selectedComponent = getSelectedRackComponent();
            if (!selectedComponent) {
                updateSelectedComponentPaletteSelection(event.target.value);
                return;
            }

            const nextColor = event.target.value || null;
            selectedComponent.customColor = nextColor;
            updateSelectedComponentPaletteSelection(nextColor);
            renderRack();
            syncActiveRackToCatalog();
        });

        selectedComponentFields.color.addEventListener("change", () => {
            const selectedComponent = getSelectedRackComponent();
            if (!selectedComponent) {
                return;
            }
            setNotice(`Updated ${selectedComponent.name} color.`);
        });
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
            description: String(component.description || "").trim(),
            depth: Number(component.depth) || 0,
            power: Number(component.power) || 0,
            notes: String(component.notes || "").trim(),
            customColor: component.customColor || null,
            face: component.face === "rear" ? "rear" : "front",
            occupancy: {
                front: component.face === "rear" ? false : true,
                rear: component.face === "rear"
            }
        };
    }

    function parseDraggedPayload(event) {
        const rawData = event.dataTransfer.getData("application/json");
        if (!rawData) {
            return null;
        }

        try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.source) {
                return parsed;
            }
            return {
                source: "library",
                component: parsed
            };
        } catch (error) {
            setNotice(`Could not parse dragged component: ${error.message}`);
            return null;
        }
    }

    function rebuildRackSlots() {
        state.rackSlots = createEmptyRackSlots(state.rackHeightRU);

        state.rackComponents.forEach(component => {
            for (let offset = 0; offset < component.ru; offset += 1) {
                const slotIndex = component.position - 1 + offset;
                if (state.rackSlots[slotIndex]) {
                    if ((component.face || "front") === "rear") {
                        state.rackSlots[slotIndex].rear = true;
                    } else {
                        state.rackSlots[slotIndex].front = true;
                    }
                }
            }
        });
    }

    function getRackDepthCm() {
        return Math.max(0, Number(state.rackProfile.rackDepthCm) || 0);
    }

    function getRackMinDepthClearanceCm() {
        return Math.max(0, Number(state.rackProfile.minDepthClearanceCm) || 0);
    }

    function doComponentsOverlapInRU(leftComponent, rightComponent) {
        const leftEnd = leftComponent.position + leftComponent.ru - 1;
        const rightEnd = rightComponent.position + rightComponent.ru - 1;
        return !(leftEnd < rightComponent.position || leftComponent.position > rightEnd);
    }

    function canFacesShareDepth(candidateComponent, existingComponent) {
        const rackDepthCm = getRackDepthCm();
        const clearanceCm = getRackMinDepthClearanceCm();
        if (rackDepthCm <= 0) {
            return false;
        }

        return (Number(candidateComponent.depth) || 0) + (Number(existingComponent.depth) || 0) + clearanceCm <= rackDepthCm;
    }

    function getBlockedOppositeFaceComponents() {
        const activeFace = state.currentView;
        const oppositeFace = activeFace === "front" ? "rear" : "front";
        const rackDepthCm = getRackDepthCm();
        const clearanceCm = getRackMinDepthClearanceCm();

        if (rackDepthCm <= 0 || clearanceCm <= 0) {
            return [];
        }

        return state.rackComponents.filter(component => {
            if ((component.face || "front") !== oppositeFace) {
                return false;
            }

            const freeDepthCm = rackDepthCm - (Number(component.depth) || 0);
            if (freeDepthCm >= clearanceCm) {
                return false;
            }

            return !state.rackComponents.some(candidate => {
                if ((candidate.face || "front") !== activeFace) {
                    return false;
                }
                return doComponentsOverlapInRU(component, candidate);
            });
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

    function getTotalPowerConsumption() {
        return state.rackComponents.reduce((sum, component) => sum + (Number(component.power) || 0), 0);
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

    function isRackPositionAvailable(position, componentHeightRU, componentIdToIgnore = null, face = state.currentView, depth = 0) {
        if (position < 1 || position + componentHeightRU - 1 > state.rackHeightRU) {
            return false;
        }

        const candidateComponent = {
            position,
            ru: componentHeightRU,
            face,
            depth
        };

        return !state.rackComponents.some(component => {
            if (component.id === componentIdToIgnore) {
                return false;
            }

            if (!doComponentsOverlapInRU(candidateComponent, component)) {
                return false;
            }

            if ((component.face || "front") === face) {
                return true;
            }

            return !canFacesShareDepth(candidateComponent, component);
        });
    }

    function findFirstAvailablePosition(componentHeightRU, face = state.currentView, depth = 0) {
        const maxStartPosition = state.rackHeightRU - componentHeightRU + 1;

        for (let position = 1; position <= maxStartPosition; position += 1) {
            if (isRackPositionAvailable(position, componentHeightRU, null, face, depth)) {
                return position;
            }
        }

        return null;
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
        rackHeightInput.value = Number(state.rackHeightRU) || defaultRackHeightRU;
        rackDepthInput.value = Number(state.rackProfile.rackDepthCm) || 0;
        rackRoomInput.value = state.rackProfile.room || "";
        rackOwnerInput.value = state.rackProfile.owner || "";
        rackClearanceInput.value = Number(state.rackProfile.minDepthClearanceCm) || 0;
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
        const nextHeightRU = Math.max(1, Number(rackHeightInput.value) || state.rackHeightRU || defaultRackHeightRU);
        const nextDepthCm = Math.max(0, Number(rackDepthInput.value) || 0);

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
        locatedRack.rack.depth = Number(state.rackProfile.rackDepthCm) || locatedRack.rack.depth || 0;
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
                rackDepthCm: Number(locatedRack.rack.depth) || 0,
                minDepthClearanceCm: Number(locatedRack.rack.plannerState?.rackProfile?.minDepthClearanceCm) || 0,
                notes: locatedRack.rack.notes || ""
            },
            components: []
        };

        loadRackFromFile(locatedRack.rack.plannerState && Array.isArray(locatedRack.rack.plannerState.components)
            ? locatedRack.rack.plannerState
            : fallbackPayload);
        setNotice(`Loaded ${locatedRack.rack.name} from catalog.`);
    }

    async function saveLibraryToFile() {
        const format = await chooseDataFormat("Export");
        if (!format) {
            setNotice("Library export canceled.");
            return;
        }

        const payload = {
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
        };

        const isCsv = format === "csv";
        const content = isCsv ? libraryPayloadToCsv(payload) : JSON.stringify(payload, null, 2);
        const saved = await saveTextFile(
            `rackplanner-library.${isCsv ? "csv" : "json"}`,
            content,
            isCsv ? "text/csv" : "application/json",
            isCsv ? ".csv" : ".json"
        );
        setNotice(saved ? `Library exported as ${format.toUpperCase()}.` : "Library export canceled.");
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

    async function saveRackToFile() {
        const format = await chooseDataFormat("Export");
        if (!format) {
            setNotice("Rack export canceled.");
            return;
        }

        const totalPowerW = getTotalPowerConsumption();

        const payload = {
            version: 1,
            savedAt: new Date().toISOString(),
            rackHeightRU: state.rackHeightRU,
            currentView: state.currentView,
            rackProfile: {
                ...state.rackProfile,
                totalCalculatedConsumptionW: totalPowerW
            },
            totalCalculatedConsumptionW: totalPowerW,
            showVacantSlots: state.showVacantSlots,
            components: state.rackComponents
        };

        const isCsv = format === "csv";
        const content = isCsv ? rackPayloadToCsv(payload) : JSON.stringify(payload, null, 2);
        const saved = await saveTextFile(
            `rackplanner-rack.${isCsv ? "csv" : "json"}`,
            content,
            isCsv ? "text/csv" : "application/json",
            isCsv ? ".csv" : ".json"
        );
        setNotice(saved ? `Rack exported as ${format.toUpperCase()}.` : "Rack export canceled.");
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
            rackDepthCm: Number(payload.rackProfile?.rackDepthCm) || 0,
            minDepthClearanceCm: Number(payload.rackProfile?.minDepthClearanceCm) || 0,
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
        const totalPowerW = getTotalPowerConsumption();
        const frontUsedRU = state.rackSlots.reduce((sum, slot) => sum + (slot.front ? 1 : 0), 0);
        const frontUsagePercent = state.rackHeightRU > 0
            ? Math.round((frontUsedRU / state.rackHeightRU) * 100)
            : 0;

        const maxDepthCm = Math.max(...state.rackComponents.map(component => Number(component.depth) || 0), 1);
        const depthUsageUnits = state.rackComponents.reduce((sum, component) => {
            return sum + ((Number(component.depth) || 0) * (Number(component.ru) || 1));
        }, 0);
        const rearDepthUsagePercent = state.rackHeightRU > 0
            ? Math.round((depthUsageUnits / (state.rackHeightRU * maxDepthCm)) * 100)
            : 0;

        const frontUsagePercentSafe = Math.max(0, Math.min(frontUsagePercent, 100));
        const rearDepthUsagePercentSafe = Math.max(0, Math.min(rearDepthUsagePercent, 100));

        function getUsageScaleClass(percentValue) {
            return percentValue > 80
                ? "is-red"
                : percentValue > 50
                    ? "is-orange"
                    : "is-green";
        }

        const frontUsageScaleClass = getUsageScaleClass(frontUsagePercentSafe);
        const rearUsageScaleClass = getUsageScaleClass(rearDepthUsagePercentSafe);
        const usageSummaryPercent = Math.max(frontUsagePercentSafe, rearDepthUsagePercentSafe);
        const usageScaleClass = usageSummaryPercent > 80
            ? "is-red"
            : usageSummaryPercent > 50
                ? "is-orange"
                : "is-green";
        const activeViewText = state.currentView === "front" ? "Front" : "Rear";
        const rackName = state.rackProfile.name || "Main Rack";
        const rackTag = state.rackProfile.tag || "RACK-01";
        const locationLine = [state.rackProfile.room, state.rackProfile.owner].filter(Boolean).join(" | ");

        document.body.classList.toggle("view-front", state.currentView === "front");
        document.body.classList.toggle("view-rear", state.currentView === "rear");
        viewModeBadgeEl.textContent = `${activeViewText.toUpperCase()} SIDE`;
        if (rackStageHeadingEl) {
            rackStageHeadingEl.textContent = `Active Side: ${activeViewText}`;
        }

        rackInfoEl.innerHTML = `
            <div class="rack-info-grid">
                <div class="rack-info-col rack-info-col--text">
                    <div><strong>${rackName}</strong> [${rackTag}]</div>
                    <div>${locationLine || "No room/owner set yet."}</div>
                    <div>Total Rack Size: ${state.rackHeightRU} RU</div>
                    <div>Installed: ${usedUnitsRU} RU, Vacant: ${freeUnitsRU} RU</div>
                    <div>Total Calculated Consumption: ${totalPowerW} W</div>
                </div>
                <div class="rack-info-col rack-info-col--usage">
                    <div class="rack-usage-wrap">
                        <div class="rack-usage-title">Overall Usage (max of front/rear): ${usageSummaryPercent}%</div>
                        <div class="rack-usage-bar">
                            <div class="rack-usage-fill ${usageScaleClass}" style="width: ${usageSummaryPercent}%;"></div>
                        </div>
                        <div class="rack-usage-title">Front Side Usage (RU): ${frontUsagePercentSafe}%</div>
                        <div class="rack-usage-bar">
                            <div class="rack-usage-fill ${frontUsageScaleClass}" style="width: ${frontUsagePercentSafe}%;"></div>
                        </div>
                        <div class="rack-usage-title">Rear Side Usage (Depth): ${rearDepthUsagePercentSafe}%</div>
                        <div class="rack-usage-bar">
                            <div class="rack-usage-fill ${rearUsageScaleClass}" style="width: ${rearDepthUsagePercentSafe}%;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="message-banner">${state.notice}</div>
        `;
        viewLegendEl.textContent = state.currentView === "front"
            ? "Front view: showing components mounted on the front face."
            : "Rear view: rear-side placement is allowed when rack depth and clearance permit it.";
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
            const isVacant = state.currentView === "front"
                ? !state.rackSlots[slotIndex].front
                : !state.rackSlots[slotIndex].rear;

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

        getBlockedOppositeFaceComponents()
            .slice()
            .sort((left, right) => right.position - left.position)
            .forEach(component => {
                const blockedEl = document.createElement("div");
                const textEl = document.createElement("span");

                blockedEl.className = "rack-component rack-component--blocked";
                blockedEl.style.top = `${rackPositionToTop(component.position, component.ru)}px`;
                blockedEl.style.height = `${component.ru * rackUnitPixelHeight}px`;

                textEl.className = "rack-component__blocked-text";
                textEl.textContent = `Blocked by: ${component.name}`;

                blockedEl.appendChild(textEl);
                rackEl.appendChild(blockedEl);
            });

        state.rackComponents
            .slice()
            .filter(component => (component.face || "front") === state.currentView)
            .sort((left, right) => right.position - left.position)
            .forEach(component => {
                const componentEl = document.createElement("div");
                const topRow = document.createElement("div");
                const bottomRow = document.createElement("div");
                const nameEl = document.createElement("span");
                const depthEl = document.createElement("span");
                const metaEl = document.createElement("span");

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

                componentEl.draggable = true;
                componentEl.addEventListener("dragstart", handleRackComponentDragStart);
                componentEl.addEventListener("dragend", clearDragPreview);

                topRow.className = "rack-component__top";
                bottomRow.className = "rack-component__bottom";
                nameEl.className = "rack-component__name";
                depthEl.className = "rack-component__depth";
                metaEl.className = "rack-component__meta";

                nameEl.textContent = component.name;
                depthEl.textContent = `D: ${component.depth} cm`;
                metaEl.textContent = `${component.ru} RU`;

                topRow.appendChild(nameEl);
                bottomRow.appendChild(metaEl);
                componentEl.appendChild(topRow);
                componentEl.appendChild(depthEl);
                componentEl.appendChild(bottomRow);

                rackEl.appendChild(componentEl);
            });
    }

    function renderSideView() {
        const sideViewEl = document.getElementById("rackSideView");
        if (!sideViewEl) return;

        const rackDepthCm = getRackDepthCm();
        const clearanceCm = getRackMinDepthClearanceCm();
        const SIDE_VIEW_BASE_DEPTH_CM = 100;
        const SIDE_VIEW_BASE_WIDTH_PX = 200;
        const SIDE_VIEW_MIN_WIDTH_PX = 140;
        const SIDE_VIEW_MAX_WIDTH_PX = 420;
        const sideViewWidthPx = rackDepthCm > 0
            ? Math.max(
                SIDE_VIEW_MIN_WIDTH_PX,
                Math.min(
                    SIDE_VIEW_MAX_WIDTH_PX,
                    Math.round((rackDepthCm / SIDE_VIEW_BASE_DEPTH_CM) * SIDE_VIEW_BASE_WIDTH_PX)
                )
            )
            : SIDE_VIEW_BASE_WIDTH_PX;

        sideViewEl.innerHTML = "";
        sideViewEl.style.width = `${sideViewWidthPx}px`;
        sideViewEl.style.height = `${state.rackHeightRU * rackUnitPixelHeight}px`;

        if (rackDepthCm <= 0) {
            const placeholder = document.createElement("div");
            placeholder.className = "rack-side-placeholder";
            placeholder.textContent = "Set rack depth in Rack Properties to see side view";
            sideViewEl.appendChild(placeholder);
            return;
        }

        // Clearance zone band (if set)
        if (clearanceCm > 0) {
            const bandLeft = (rackDepthCm - clearanceCm) / rackDepthCm * sideViewWidthPx;
            const bandWidth = clearanceCm / rackDepthCm * sideViewWidthPx;
            const clearanceEl = document.createElement("div");
            clearanceEl.className = "rack-side-clearance";
            clearanceEl.style.left = `${bandLeft}px`;
            clearanceEl.style.width = `${bandWidth}px`;
            sideViewEl.appendChild(clearanceEl);
        }

        const frontComponents = state.rackComponents.filter(c => (c.face || "front") === "front");
        const rearComponents = state.rackComponents.filter(c => (c.face || "front") === "rear");

        // Determine which components are in a depth conflict
        const conflictSet = new Set();
        frontComponents.forEach(fc => {
            rearComponents.forEach(rc => {
                if (doComponentsOverlapInRU(fc, rc) && !canFacesShareDepth(fc, rc)) {
                    conflictSet.add(fc.id);
                    conflictSet.add(rc.id);
                }
            });
        });

        // Render components (rear first so front renders on top)
        [...rearComponents, ...frontComponents].forEach(component => {
            const depthCm = Number(component.depth) || 0;
            if (depthCm <= 0) return;

            const isFront = (component.face || "front") === "front";
            const el = document.createElement("div");
            const top = rackPositionToTop(component.position, component.ru);
            const height = component.ru * rackUnitPixelHeight - 2;
            const widthPx = Math.round((depthCm / rackDepthCm) * sideViewWidthPx);

            el.className = `rack-side-component rack-side-component--${isFront ? "front" : "rear"}`;
            if (conflictSet.has(component.id)) {
                el.classList.add("rack-side-component--conflict");
            }
            if (component.id === state.selectedComponentId) {
                el.classList.add("rack-side-component--selected");
            }

            el.style.top = `${top}px`;
            el.style.height = `${height}px`;
            el.style.width = `${widthPx}px`;
            if (isFront) {
                el.style.left = "0";
            } else {
                el.style.right = "0";
            }

            el.title = `${component.name} | ${isFront ? "Front" : "Rear"} | ${depthCm} cm deep`;

            if (height >= 16) {
                const nameEl = document.createElement("span");
                nameEl.className = "rack-side-component__name";
                nameEl.textContent = component.name;
                el.appendChild(nameEl);
            }

            sideViewEl.appendChild(el);
        });

        // Render overlap zones where front+rear physically collide
        frontComponents.forEach(fc => {
            rearComponents.forEach(rc => {
                if (!doComponentsOverlapInRU(fc, rc) || canFacesShareDepth(fc, rc)) return;
                const frontDepth = Number(fc.depth) || 0;
                const rearDepth = Number(rc.depth) || 0;
                const overlapLeft = Math.round((rackDepthCm - rearDepth) / rackDepthCm * sideViewWidthPx);
                const overlapRight = Math.round(frontDepth / rackDepthCm * sideViewWidthPx);
                if (overlapRight <= overlapLeft) return;

                const topRU = Math.max(fc.position, rc.position);
                const bottomRU = Math.min(fc.position + fc.ru - 1, rc.position + rc.ru - 1);
                const overlapEl = document.createElement("div");
                overlapEl.className = "rack-side-overlap";
                overlapEl.style.top = `${rackPositionToTop(topRU, 1)}px`;
                overlapEl.style.height = `${(bottomRU - topRU + 1) * rackUnitPixelHeight - 2}px`;
                overlapEl.style.left = `${overlapLeft}px`;
                overlapEl.style.width = `${overlapRight - overlapLeft}px`;
                sideViewEl.appendChild(overlapEl);
            });
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
        renderSideView();
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
            selectedComponentFields.description.value = "";
            selectedComponentFields.color.value = "";
            updateSelectedComponentPaletteSelection("");
            selectedComponentFields.notes.value = "";
            selectedComponentInfoEl.textContent = "Click a component in the rack to view metadata.";
            return;
        }

        selectedComponentFields.name.value = selectedComponent.name;
        selectedComponentFields.ru.value = selectedComponent.ru;
        selectedComponentFields.position.value = selectedComponent.position;
        selectedComponentFields.depth.value = selectedComponent.depth;
        selectedComponentFields.power.value = selectedComponent.power;
        selectedComponentFields.description.value = selectedComponent.description || "";
        selectedComponentFields.color.value = getComponentDisplayColor(selectedComponent);
        updateSelectedComponentPaletteSelection(selectedComponentFields.color.value);
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
        const resolvedPosition = requestedPosition || findFirstAvailablePosition(component.ru, component.face || state.currentView, component.depth);

        if (resolvedPosition == null) {
            setNotice("No vacant position fits that component height.");
            return false;
        }

        if (!isRackPositionAvailable(resolvedPosition, component.ru, null, component.face || state.currentView, component.depth)) {
            setNotice(`U${resolvedPosition} is already occupied for that height.`);
            return false;
        }

        component.face = component.face === "rear" ? "rear" : "front";
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
        const nextDescription = selectedComponentFields.description.value.trim();
        const nextTypeClass = normalizeTypeClass(nextDescription || selectedComponent.typeClass);
        const nextColor = selectedComponentFields.color.value || null;
        const nextNotes = String(selectedComponentFields.notes.value || "").trim();

        if (!nextName) {
            setFieldHint("selectedComponentName", "hintSelectedName", "Name is required.");
            return;
        }

        if (!isRackPositionAvailable(nextPosition, nextRU, selectedComponent.id, selectedComponent.face || "front", nextDepth)) {
            setFieldHint("selectedComponentPosition", "hintSelectedPosition", "Overlaps another component or exceeds rack height.");
            return;
        }

        selectedComponent.name = nextName;
        selectedComponent.ru = nextRU;
        selectedComponent.position = nextPosition;
        selectedComponent.depth = nextDepth;
        selectedComponent.power = nextPower;
        selectedComponent.description = nextDescription;
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
        event.dataTransfer.setData("application/json", JSON.stringify({
            source: "library",
            component: JSON.parse(componentData)
        }));
        event.dataTransfer.effectAllowed = "copy";
    }

    function handleRackComponentDragStart(event) {
        const componentEl = event.currentTarget;
        const componentId = componentEl.dataset.componentId;
        const componentRU = Number(componentEl.dataset.ru) || 1;

        event.dataTransfer.setData("application/json", JSON.stringify({
            source: "rack",
            componentId,
            ru: componentRU
        }));
        event.dataTransfer.effectAllowed = "move";
    }

    function updateDragPreview(event) {
        event.preventDefault();
        const payload = parseDraggedPayload(event);
        if (!payload) {
            if (state.dragPreview !== null) {
                state.dragPreview = null;
                renderRack();
            }
            return;
        }

        let ru = 1;
        let ignoreComponentId = null;
        let movingComponent = null;

        if (payload.source === "rack") {
            movingComponent = state.rackComponents.find(component => component.id === payload.componentId);
            if (!movingComponent) {
                return;
            }
            ru = movingComponent.ru;
            ignoreComponentId = movingComponent.id;
        } else {
            ru = Number(payload.component?.ru) || 1;
        }

        const position = clientYToRackPosition(event.clientY, ru);
        const valid = isRackPositionAvailable(
            position,
            ru,
            ignoreComponentId,
            payload.source === "rack" ? movingComponent.face || state.currentView : state.currentView,
            payload.source === "rack" ? movingComponent.depth : Number(payload.component?.defaultDepth) || 0
        );
        const prev = state.dragPreview;

        if (!prev || prev.position !== position || prev.valid !== valid || prev.ru !== ru || prev.componentId !== ignoreComponentId) {
            state.dragPreview = { position, ru, valid, componentId: ignoreComponentId };
            renderRack();
        }
    }

    function handleRackDrop(event) {
        event.preventDefault();
        const payload = parseDraggedPayload(event);
        state.dragPreview = null;

        if (!payload) {
            renderRack();
            return;
        }

        if (payload.source === "rack") {
            const movingComponent = state.rackComponents.find(component => component.id === payload.componentId);
            if (!movingComponent) {
                renderRack();
                return;
            }

            const position = clientYToRackPosition(event.clientY, movingComponent.ru);
            if (position === movingComponent.position) {
                renderRack();
                return;
            }

            const canMove = isRackPositionAvailable(position, movingComponent.ru, movingComponent.id, movingComponent.face || state.currentView, movingComponent.depth);
            if (!canMove) {
                setNotice("Cannot move component there because the target units are occupied.");
                renderRack();
                return;
            }

            movingComponent.position = position;
            state.selectedComponentId = movingComponent.id;
            renderAll();
            syncActiveRackToCatalog();
            setNotice(`${movingComponent.name} moved to ${getComponentRangeLabel(movingComponent)}.`);
            return;
        }

        const draggedComponent = payload.component;
        if (!draggedComponent) {
            renderRack();
            return;
        }

        const position = clientYToRackPosition(event.clientY, Number(draggedComponent.ru) || 1);
        const placed = addComponentToRack({
            name: draggedComponent.name,
            ru: Number(draggedComponent.ru) || 1,
            position,
            face: state.currentView,
            typeClass: draggedComponent.typeClass,
            description: draggedComponent.description || "",
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
        const description = document.getElementById("libraryComponentClass").value.trim();
        const typeClass = normalizeTypeClass(description || componentName);
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
            description,
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
        document.getElementById("loadRackButton").addEventListener("click", async () => {
            const format = await chooseDataFormat("Import");
            if (!format) {
                setNotice("Rack import canceled.");
                return;
            }

            if (window.showOpenFilePicker) {
                try {
                    const rawText = await openTextFileWithPicker(format);
                    if (rawText === "") {
                        setNotice("Rack import canceled.");
                        return;
                    }
                    const payload = format === "csv" ? csvToRackPayload(rawText) : JSON.parse(rawText);
                    loadRackFromFile(payload);
                } catch (error) {
                    setNotice(`Could not load rack file: ${error.message}`);
                }
                return;
            }

            loadRackInput.dataset.format = format;
            loadRackInput.accept = format === "csv" ? ".csv,text/csv" : ".json,application/json";
            loadRackInput.click();
        });
        document.getElementById("loadLibraryButton").addEventListener("click", async () => {
            const format = await chooseDataFormat("Import");
            if (!format) {
                setNotice("Library import canceled.");
                return;
            }

            if (window.showOpenFilePicker) {
                try {
                    const rawText = await openTextFileWithPicker(format);
                    if (rawText === "") {
                        setNotice("Library import canceled.");
                        return;
                    }
                    const payload = format === "csv" ? csvToLibraryPayload(rawText) : JSON.parse(rawText);
                    loadLibraryFromFile(payload);
                } catch (error) {
                    setNotice(`Could not load library file: ${error.message}`);
                }
                return;
            }

            loadLibraryInput.dataset.format = format;
            loadLibraryInput.accept = format === "csv" ? ".csv,text/csv" : ".json,application/json";
            loadLibraryInput.click();
        });
        loadRackInput.addEventListener("change", async () => {
            try {
                const format = loadRackInput.dataset.format || "json";
                const rawText = await readTextFromInput(loadRackInput);
                const payload = format === "csv" ? csvToRackPayload(rawText) : JSON.parse(rawText);
                loadRackFromFile(payload);
            } catch (error) {
                setNotice(`Could not load rack file: ${error.message}`);
            } finally {
                loadRackInput.value = "";
            }
        });
        loadLibraryInput.addEventListener("change", async () => {
            try {
                const format = loadLibraryInput.dataset.format || "json";
                const rawText = await readTextFromInput(loadLibraryInput);
                const payload = format === "csv" ? csvToLibraryPayload(rawText) : JSON.parse(rawText);
                loadLibraryFromFile(payload);
            } catch (error) {
                setNotice(`Could not load library file: ${error.message}`);
            } finally {
                loadLibraryInput.value = "";
            }
        });
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
    initializeSelectedComponentColorPalette();
    renderAll();
    loadRackFromCatalog();
});
