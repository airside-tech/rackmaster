import { openBinaryFileWithPicker, openTextFileWithPicker, readArrayBufferFromInput, readTextFromInput, saveBinaryFile, saveTextFile } from "../fileIO.js";
import { catalogToCsv, csvToCatalog } from "../catalogFormat.js";
import { catalogPayloadToXlsxBuffer, xlsxBufferToCatalogPayload } from "../excelInterop.js";
import { clearCatalogStorage, getCatalogStorageMode, readCatalog, writeCatalog } from "../storage.js";
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
            powerA: rack.powerA || "",
            powerB: rack.powerB || "",
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
        powerA: rack.powerA || nextPlannerState.rackProfile.powerA || "",
        powerB: rack.powerB || nextPlannerState.rackProfile.powerB || "",
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

    if (parsedCatalog.rooms.length === 0) {
        throw new Error("Catalog contains no rooms to import.");
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
    const newRackPowerAInput = document.getElementById("newRackPowerA");
    const newRackPowerBInput = document.getElementById("newRackPowerB");
    const createRackButton = document.getElementById("createNewRack");
    const roomSectionsEl = document.getElementById("roomSections");
    const statusEl = document.getElementById("indexStatus");
    const exportCatalogButton = document.getElementById("exportCatalogButton");
    const importCatalogButton = document.getElementById("importCatalogButton");
    const importCatalogInput = document.getElementById("importCatalogInput");
    const clearCatalogButton = document.getElementById("clearCatalogButton");

    const requiredElements = {
        roomNameInput,
        buildingInput,
        floorInput,
        roomNotesInput,
        createRoomButton,
        newRackNameInput,
        rackRoomSelect,
        newRackTagInput,
        newRackHeightInput,
        newTileXInput,
        newTileYInput,
        newRackDepthInput,
        newRackWidthInput,
        newPowerInput,
        newRackNotesInput,
        newRackPowerAInput,
        newRackPowerBInput,
        createRackButton,
        roomSectionsEl,
        statusEl,
        exportCatalogButton,
        importCatalogButton,
        importCatalogInput,
        clearCatalogButton
    };
    const missingElementIds = Object.entries(requiredElements)
        .filter(([, element]) => !element)
        .map(([name]) => name);

    if (missingElementIds.length > 0) {
        console.error("RackMaster index initialization aborted. Missing required elements:", missingElementIds.join(", "));
        return;
    }

    let catalog = readCatalog();
    normalizeCatalogRackWidths(catalog);

    const loadedRoomCount = catalog.rooms.length;
    const loadedRackCount = catalog.rooms.reduce((sum, room) => sum + ((room.racks || []).length), 0);
    console.info(`RackMaster catalog loaded: ${loadedRoomCount} room(s), ${loadedRackCount} rack(s).`);

    function setStatus(message) {
        statusEl.textContent = message;
    }

    function prepareLegacyImportInput(format) {
        importCatalogInput.dataset.format = format;
        importCatalogInput.accept = format === "csv"
            ? ".csv,text/csv"
            : format === "xlsx"
                ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : ".json,application/json";
        importCatalogInput.value = "";
    }

    function triggerLegacyImportInput(format) {
        prepareLegacyImportInput(format);
        importCatalogInput.click();
    }

    function openImportFormatPicker(onSelectFormat) {
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
        title.textContent = "Import format";
        title.style.margin = "0 0 8px 0";

        const description = document.createElement("p");
        description.textContent = "Choose a file format:";
        description.style.margin = "0 0 12px 0";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.flexWrap = "wrap";

        function closeDialog() {
            overlay.remove();
        }

        [
            { value: "json", label: "JSON" },
            { value: "csv", label: "CSV" },
            { value: "xlsx", label: "XLSX" }
        ].forEach(option => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = option.label;
            button.addEventListener("click", () => {
                closeDialog();
                onSelectFormat(option.value);
            });
            actions.appendChild(button);
        });

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", () => {
            closeDialog();
            setStatus("Import canceled.");
        });
        actions.appendChild(cancelButton);

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeDialog();
                setStatus("Import canceled.");
            }
        });

        dialog.appendChild(title);
        dialog.appendChild(description);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    function startImportForFormat(format) {
        const openFallbackInput = notice => {
            if (notice) {
                setStatus(notice);
            }
            triggerLegacyImportInput(format);
        };

        if (window.showOpenFilePicker) {
            void (async () => {
                try {
                    if (format === "xlsx") {
                        const workbookBuffer = await openBinaryFileWithPicker(format);
                        if (workbookBuffer === null) {
                            openFallbackInput("Native file picker unavailable. Using browser file input.");
                            return;
                        }
                        if (workbookBuffer === "") {
                            setStatus("Import canceled.");
                            return;
                        }

                        await importCatalogFromFormat(format, workbookBuffer);
                        return;
                    }

                    const rawText = await openTextFileWithPicker(format);
                    if (rawText === null) {
                        openFallbackInput("Native file picker unavailable. Using browser file input.");
                        return;
                    }
                    if (rawText === "") {
                        setStatus("Import canceled.");
                        return;
                    }

                    await importCatalogFromFormat(format, rawText);
                } catch (error) {
                    console.warn("Native import picker failed. Falling back to file input.", error);
                    openFallbackInput("Native picker failed. Using browser file input.");
                }
            })();
            return;
        }

        triggerLegacyImportInput(format);
    }

    function formatImportErrorMessage(error) {
        if (error && typeof error.message === "string" && error.message.trim()) {
            return `Could not import catalog file: ${error.message}`;
        }
        return "Could not import catalog file.";
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
                        const mode = new URLSearchParams(window.location.search).get("mode");
                        const modeQuery = mode ? `&mode=${encodeURIComponent(mode)}` : "";
                        window.location.href = `planner.html?rackId=${encodeURIComponent(rack.id)}${modeQuery}`;
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
        const parsedResult = format === "xlsx"
            ? xlsxBufferToCatalogPayload(source)
            : null;

        const parsedCatalog = format === "xlsx"
            ? parsedResult.payload
            : format === "csv"
                ? csvToCatalog(source)
                : JSON.parse(source);

        validateCatalogPayload(parsedCatalog);

        catalog = format === "json"
            ? { rooms: parsedCatalog.rooms }
            : rebuildCatalogFromEditableImport(parsedCatalog, catalog);

        normalizeCatalogRackWidths(catalog);

        persistAndRender();

        const roomCount = catalog.rooms.length;
        const rackCount = catalog.rooms.reduce((total, room) => total + ((room.racks || []).length), 0);
        const warnings = format === "xlsx" && Array.isArray(parsedResult?.warnings) ? parsedResult.warnings : [];

        if (warnings.length > 0) {
            console.warn("Catalog import warnings:", warnings);
            setStatus(`Catalog imported from ${format.toUpperCase()} (${roomCount} rooms, ${rackCount} racks, ${warnings.length} warning(s)). First warning: ${warnings[0]}`);
            return;
        }

        setStatus(`Catalog imported from ${format.toUpperCase()} (${roomCount} rooms, ${rackCount} racks).`);
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
        const powerA = newRackPowerAInput.value.trim();
        const powerB = newRackPowerBInput.value.trim();

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
                    powerA,
                    powerB,
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
        newRackPowerAInput.value = "";
        newRackPowerBInput.value = "";
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

    importCatalogButton.addEventListener("click", () => {
        // Keep format selection button-based and run import from user click callbacks.
        openImportFormatPicker(startImportForFormat);
    });

    importCatalogInput.addEventListener("change", async () => {
        try {
            const format = importCatalogInput.dataset.format || "json";
            const source = format === "xlsx"
                ? await readArrayBufferFromInput(importCatalogInput)
                : await readTextFromInput(importCatalogInput);

            await importCatalogFromFormat(format, source);
        } catch (error) {
            setStatus(formatImportErrorMessage(error));
        } finally {
            importCatalogInput.value = "";
        }
    });

    clearCatalogButton.addEventListener("click", () => {
        const isApiMode = getCatalogStorageMode() === "api";
        const confirmMessage = isApiMode
            ? "Clear all RackMaster catalog data from the shared API store? This affects all users."
            : "Clear all RackMaster data stored in this browser?";
        const confirmed = window.confirm(confirmMessage);
        if (!confirmed) {
            return;
        }

        clearCatalogStorage();

        catalog = { rooms: [] };
        renderRoomSelect();
        renderRoomSections();
        setStatus(isApiMode ? "Shared RackMaster catalog cleared via API." : "Local RackMaster browser data cleared.");
    });

    renderRoomSelect();
    renderRoomSections();
}
