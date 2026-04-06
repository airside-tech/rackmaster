import { openTextFileWithPicker, readTextFromInput, saveTextFile } from "../fileIO.js";
import { catalogToCsv, csvToCatalog } from "../catalogFormat.js";
import { readCatalog, writeCatalog } from "../storage.js";
import { createCatalogId } from "../typeUtils.js";
import { chooseDataFormat } from "../shared/chooseDataFormat.js";

function createEmptySideCompartmentState() {
    return {
        front: { left: [], right: [] },
        rear: { left: [], right: [] }
    };
}

export function initIndexPage() {
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
            rackRoomSelect.innerHTML = '<option value="">No rooms available</option>';
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
            roomSectionsEl.innerHTML = '<div class="message-banner">No equipment rooms yet.</div>';
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
                rackProfile: {
                    name: rackName,
                    tag: rackTag,
                    room: `${room.name} (${room.building} / ${room.floor})`,
                    owner: "",
                    rackDepthCm: depth,
                    minDepthClearanceCm: 0,
                    notes
                },
                components: [],
                sideCompartmentItems: createEmptySideCompartmentState()
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
