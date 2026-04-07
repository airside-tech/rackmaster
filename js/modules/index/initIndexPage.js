import { openBinaryFileWithPicker, openTextFileWithPicker, readArrayBufferFromInput, readTextFromInput, saveBinaryFile, saveTextFile } from "../fileIO.js";
import { catalogToCsv, csvToCatalog } from "../catalogFormat.js";
import { catalogPayloadToXlsxBuffer, xlsxBufferToCatalogPayload } from "../excelInterop.js";
import { readCatalog, writeCatalog } from "../storage.js";
import { createCatalogId } from "../typeUtils.js";
import { chooseDataFormat } from "../shared/chooseDataFormat.js";

function createEmptySideCompartmentState() {
    return {
        front: { left: [], right: [] },
        rear: { left: [], right: [] }
    };
}

const defaultRackWidthCm = 60;
const minimumRackWidthCm = 40;

function clonePlannerState(plannerState) {
    if (!plannerState) {
        return null;
    }

    return JSON.parse(JSON.stringify(plannerState));
}

function getRoomMatchKey(roomLike) {
    return [
        String(roomLike?.building || "").trim().toLowerCase(),
        String(roomLike?.floor || "").trim().toLowerCase(),
        String(roomLike?.name || roomLike?.roomName || "").trim().toLowerCase()
    ].join("|");
}

function getRackMatchKey(roomLike, rackLike) {
    return [
        getRoomMatchKey(roomLike),
        String(rackLike?.tag || rackLike?.rackTag || "").trim().toLowerCase()
    ].join("|");
}

function buildRoomDisplayLabel(room) {
    return `${room.name} (${room.building} / ${room.floor})`;
}

function buildPlannerState(room, rack, existingPlannerState) {
    const rackWidthCm = Math.max(minimumRackWidthCm, Number(rack.width) || defaultRackWidthCm);
    const nextPlannerState = clonePlannerState(existingPlannerState) || {
        rackHeightRU: Number(rack.heightRU) || 42,
        currentView: "front",
        rackProfile: {
            name: rack.name,
            tag: rack.tag,
            room: buildRoomDisplayLabel(room),
            owner: "",
            rackDepthCm: Number(rack.depth) || 0,
            rackWidthCm,
            minDepthClearanceCm: 0,
            notes: rack.notes || ""
        },
        components: [],
        sideCompartmentItems: createEmptySideCompartmentState()
    };

    nextPlannerState.rackHeightRU = Number(rack.heightRU) || nextPlannerState.rackHeightRU || 42;
    nextPlannerState.rackProfile = {
        ...nextPlannerState.rackProfile,
        name: rack.name,
        tag: rack.tag,
        room: buildRoomDisplayLabel(room),
        rackDepthCm: Number(rack.depth) || 0,
        rackWidthCm,
        notes: rack.notes || ""
    };

    if (!nextPlannerState.sideCompartmentItems) {
        nextPlannerState.sideCompartmentItems = createEmptySideCompartmentState();
    }

    return nextPlannerState;
}

function rebuildCatalogFromEditableImport(importedCatalog, existingCatalog) {
    const existingRoomsByKey = new Map((existingCatalog.rooms || []).map(room => [getRoomMatchKey(room), room]));
    const seenRackKeys = new Set();

    return {
        rooms: (importedCatalog.rooms || []).map(importedRoom => {
            const roomKey = getRoomMatchKey(importedRoom);
            const existingRoom = existingRoomsByKey.get(roomKey) || null;
            const nextRoom = {
                id: existingRoom?.id || createCatalogId("room"),
                name: importedRoom.name,
                building: importedRoom.building,
                floor: importedRoom.floor,
                notes: importedRoom.notes || "",
                racks: []
            };

            const existingRacksByKey = new Map(((existingRoom?.racks) || []).map(rack => [getRackMatchKey(nextRoom, rack), rack]));
            nextRoom.racks = (importedRoom.racks || []).map(importedRack => {
                const rackTag = String(importedRack.tag || "").trim();
                if (!rackTag) {
                    throw new Error(`Rack tag is required for room ${nextRoom.name}.`);
                }

                const rackKey = getRackMatchKey(nextRoom, importedRack);
                if (seenRackKeys.has(rackKey)) {
                    throw new Error(`Duplicate rack tag '${rackTag}' found in ${nextRoom.name}.`);
                }
                seenRackKeys.add(rackKey);

                const existingRack = existingRacksByKey.get(rackKey) || null;
                return {
                    id: existingRack?.id || createCatalogId("rack"),
                    name: importedRack.name,
                    tag: rackTag,
                    heightRU: Number(importedRack.heightRU) || 42,
                    tileX: importedRack.tileX,
                    tileY: importedRack.tileY,
                    depth: Number(importedRack.depth) || 0,
                    width: Math.max(minimumRackWidthCm, Number(importedRack.width) || defaultRackWidthCm),
                    power: Number(importedRack.power) || 0,
                    notes: importedRack.notes || "",
                    plannerState: buildPlannerState(nextRoom, importedRack, existingRack?.plannerState),
                    updatedAt: new Date().toISOString()
                };
            });

            return nextRoom;
        })
    };
}

function validateCatalogPayload(parsedCatalog) {
    if (!parsedCatalog || !Array.isArray(parsedCatalog.rooms)) {
        throw new Error("Invalid catalog format");
    }
}

function normalizeCatalogRackWidths(catalogPayload) {
    (catalogPayload.rooms || []).forEach(room => {
        (room.racks || []).forEach(rack => {
            rack.width = Math.max(minimumRackWidthCm, Number(rack.width) || defaultRackWidthCm);
            if (rack.plannerState?.rackProfile) {
                rack.plannerState.rackProfile.rackWidthCm = Math.max(
                    minimumRackWidthCm,
                    Number(rack.plannerState.rackProfile.rackWidthCm) || rack.width
                );
            }
        });
    });
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
    const newRackWidthInput = document.getElementById("newRackWidth");
    const newPowerInput = document.getElementById("newPowerConsumption");
    const newRackNotesInput = document.getElementById("newRackNotes");
    const createRackButton = document.getElementById("createNewRack");
    const roomSectionsEl = document.getElementById("roomSections");
    const statusEl = document.getElementById("indexStatus");
    const exportCatalogButton = document.getElementById("exportCatalogButton");
    const importCatalogButton = document.getElementById("importCatalogButton");
    const importCatalogInput = document.getElementById("importCatalogInput");
    const clearCatalogButton = document.getElementById("clearCatalogButton");

    if (!roomNameInput || !buildingInput || !floorInput || !roomNotesInput || !createRoomButton || !newRackNameInput || !rackRoomSelect || !newRackTagInput || !newRackHeightInput || !newTileXInput || !newTileYInput || !newRackDepthInput || !newRackWidthInput || !newPowerInput || !newRackNotesInput || !createRackButton || !roomSectionsEl || !statusEl || !exportCatalogButton || !importCatalogButton || !importCatalogInput || !clearCatalogButton) {
        return;
    }

    let catalog = readCatalog();
    normalizeCatalogRackWidths(catalog);

    function setStatus(message) {
        statusEl.textContent = message;
    }

    function persistAndRender() {
        writeCatalog(catalog);
        renderRoomSelect();
        renderRoomSections();
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
                persistAndRender();
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

                    const rackTitle = document.createElement("strong");
                    rackTitle.textContent = `${rack.name} (${rack.tag})`;

                    const rackMeta = document.createElement("div");
                    rackMeta.className = "room-section__meta";
                    const tileX = rack.tileX == null ? "-" : rack.tileX;
                    const tileY = rack.tileY == null ? "-" : rack.tileY;
                    rackMeta.textContent = `${rack.heightRU || 42} RU | Tile ${tileX}, ${tileY} | Depth ${rack.depth || 0} | Width ${Math.max(minimumRackWidthCm, Number(rack.width) || defaultRackWidthCm)} | Power ${rack.power || 0}${rack.notes ? ` | ${rack.notes}` : ""}`;

                    rackInfo.appendChild(rackTitle);
                    rackInfo.appendChild(rackMeta);

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
                    deleteRackButton.textContent = "Delete";
                    deleteRackButton.addEventListener("click", () => {
                        const confirmed = window.confirm(`Delete rack '${rack.name}'?`);
                        if (!confirmed) {
                            return;
                        }

                        room.racks = racks.filter(entry => entry.id !== rack.id);
                        persistAndRender();
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

    async function importCatalogFromFormat(format, source) {
        const parsedCatalog = format === "xlsx"
            ? xlsxBufferToCatalogPayload(source)
            : format === "csv"
                ? csvToCatalog(source)
                : JSON.parse(source);

        validateCatalogPayload(parsedCatalog);

        catalog = format === "json"
            ? { rooms: parsedCatalog.rooms }
            : rebuildCatalogFromEditableImport(parsedCatalog, catalog);

        normalizeCatalogRackWidths(catalog);

        persistAndRender();
        setStatus(`Catalog imported from ${format.toUpperCase()}.`);
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

        roomNameInput.value = "";
        buildingInput.value = "";
        floorInput.value = "";
        roomNotesInput.value = "";
        persistAndRender();
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
        const tileX = newTileXInput.value === "" ? null : Number(newTileXInput.value);
        const tileY = newTileYInput.value === "" ? null : Number(newTileYInput.value);
        const depth = Number(newRackDepthInput.value) || 0;
        const width = Math.max(minimumRackWidthCm, Number(newRackWidthInput.value) || defaultRackWidthCm);
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
            width,
            power,
            notes,
            plannerState: {
                rackHeightRU: rackHeight,
                currentView: "front",
                rackProfile: {
                    name: rackName,
                    tag: rackTag,
                    room: buildRoomDisplayLabel(room),
                    owner: "",
                    rackDepthCm: depth,
                    rackWidthCm: width,
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

        newRackNameInput.value = "";
        newRackTagInput.value = "";
        newRackHeightInput.value = "42";
        newTileXInput.value = "";
        newTileYInput.value = "";
        newRackDepthInput.value = "0";
        newRackWidthInput.value = "60";
        newPowerInput.value = "0";
        newRackNotesInput.value = "";
        persistAndRender();
        setStatus(`Created rack ${rackName} in ${room.name}.`);
    });

    exportCatalogButton.addEventListener("click", async () => {
        const format = await chooseDataFormat("Export");
        if (!format) {
            setStatus("Export canceled.");
            return;
        }

        if (format === "xlsx") {
            try {
                const buffer = catalogPayloadToXlsxBuffer(catalog);
                const saved = await saveBinaryFile(
                    "rackplanner-catalog.xlsx",
                    buffer,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ".xlsx"
                );
                setStatus(saved ? "Catalog exported as XLSX." : "Export canceled.");
            } catch (error) {
                setStatus(`Could not export catalog as XLSX: ${error.message}`);
            }
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
                if (format === "xlsx") {
                    const workbookBuffer = await openBinaryFileWithPicker(format);
                    if (workbookBuffer === "") {
                        setStatus("Import canceled.");
                        return;
                    }

                    await importCatalogFromFormat(format, workbookBuffer);
                    return;
                }

                const rawText = await openTextFileWithPicker(format);
                if (rawText === "") {
                    setStatus("Import canceled.");
                    return;
                }

                await importCatalogFromFormat(format, rawText);
                return;
            } catch (_error) {
                setStatus("Could not import catalog file.");
                return;
            }
        }

        importCatalogInput.dataset.format = format;
        importCatalogInput.accept = format === "csv"
            ? ".csv,text/csv"
            : format === "xlsx"
                ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : ".json,application/json";
        importCatalogInput.click();
    });

    importCatalogInput.addEventListener("change", async () => {
        try {
            const format = importCatalogInput.dataset.format || "json";
            const source = format === "xlsx"
                ? await readArrayBufferFromInput(importCatalogInput)
                : await readTextFromInput(importCatalogInput);

            await importCatalogFromFormat(format, source);
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
