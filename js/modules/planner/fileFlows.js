import { openBinaryFileWithPicker, openTextFileWithPicker, readArrayBufferFromInput, readTextFromInput, saveBinaryFile, saveTextFile } from "../fileIO.js";
import {
    csvToLibraryPayload,
    csvToRackPayload,
    libraryPayloadToCsv,
    rackPayloadToCsv
} from "../catalogFormat.js";
import { libraryPayloadToXlsxBuffer, xlsxBufferToLibraryPayload } from "../excelInterop.js";
import { chooseDataFormat } from "../shared/chooseDataFormat.js";
import {
    createLibraryState,
    defaultRackWidthCm,
    defaultRackHeightRU,
    maximumRackHeightRU,
    minimumRackDepthCm,
    minimumRackWidthCm,
    warningRackHeightRU
} from "./state.js";
import { createId } from "../typeUtils.js";
import { normalizeSideCompartmentState } from "./sideCompartments.js";
import { getTotalPowerConsumption, rebuildRackSlots } from "./placementEngine.js";

export function createPlannerFileFlows(context) {
    const {
        state,
        loadRackInput,
        loadLibraryInput,
        setNotice,
        renderAll,
        syncActiveRackToCatalog,
        cloneRackComponent
    } = context;

    function normalizeLibraryLookupText(value) {
        return String(value || "").trim().toLowerCase();
    }

    function buildLibraryItemKey(categoryName, itemName) {
        return `${normalizeLibraryLookupText(categoryName)}|${normalizeLibraryLookupText(itemName)}`;
    }

    function buildExistingItemIdLookup() {
        const existingItemIdByKey = new Map();
        (state.libraryCategories || []).forEach(category => {
            (category.items || []).forEach(item => {
                const key = buildLibraryItemKey(category.name, item.name);
                if (key === "|") {
                    return;
                }
                existingItemIdByKey.set(key, item.id);
            });
        });
        return existingItemIdByKey;
    }

    function getNextLibraryId(usedIds) {
        let nextId = createId("library");
        while (usedIds.has(nextId)) {
            nextId = createId("library");
        }
        return nextId;
    }

    function reconcileLibraryPayloadIds(payload) {
        const existingItemIdByKey = buildExistingItemIdLookup();
        const usedIds = new Set();
        const seenItemKeys = new Set();
        let preservedIdCount = 0;
        let generatedIdCount = 0;

        const normalizedCategories = (payload.categories || []).map(category => {
            const categoryName = String(category?.name || "").trim();
            return {
                name: categoryName,
                items: (category?.items || []).map(item => ({
                    ...item,
                    name: String(item?.name || "").trim(),
                    id: String(item?.id || "").trim() || null
                }))
            };
        });

        normalizedCategories.forEach(category => {
            (category.items || []).forEach(item => {
                if (!item.name) {
                    throw new Error(`Category '${category.name || "Unnamed Category"}' contains an item with an empty name.`);
                }

                const itemKey = buildLibraryItemKey(category.name, item.name);
                if (seenItemKeys.has(itemKey)) {
                    throw new Error(`Duplicate item name '${item.name}' found in category '${category.name || "Unnamed Category"}'.`);
                }
                seenItemKeys.add(itemKey);

                const preservedId = existingItemIdByKey.get(itemKey) || null;
                if (preservedId) {
                    item.id = preservedId;
                    preservedIdCount += 1;
                }

                const candidateId = item.id || null;
                if (candidateId && usedIds.has(candidateId)) {
                    throw new Error(`Duplicate item ID '${candidateId}' found during import. Use unique item names per category or remove legacy itemId values.`);
                }

                if (!candidateId) {
                    item.id = getNextLibraryId(usedIds);
                    generatedIdCount += 1;
                }

                usedIds.add(item.id);
            });
        });

        return {
            payload: {
                ...payload,
                categories: normalizedCategories
            },
            preservedIdCount,
            generatedIdCount
        };
    }

    function loadLibraryFromFile(payload, format = "json") {
        if (!payload || !Array.isArray(payload.categories)) {
            setNotice("Library file is missing a categories array.");
            return;
        }

        const isEditableImport = format === "csv" || format === "xlsx";
        const normalizedPayload = isEditableImport
            ? reconcileLibraryPayloadIds(payload)
            : { payload, preservedIdCount: 0, generatedIdCount: 0 };

        state.libraryCategories = createLibraryState(normalizedPayload.payload.categories);
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        renderAll();

        const itemCount = state.libraryCategories.reduce((sum, category) => sum + (category.items || []).length, 0);
        if (isEditableImport) {
            setNotice(`Library loaded with ${state.libraryCategories.length} categories and ${itemCount} items. Preserved ${normalizedPayload.preservedIdCount} IDs, generated ${normalizedPayload.generatedIdCount} IDs automatically.`);
            return;
        }

        setNotice(`Library loaded with ${state.libraryCategories.length} categories.`);
    }

    async function saveLibraryToFile() {
        const format = await chooseDataFormat("Export", ["json", "csv", "xlsx"]);
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
                    id: item.id,
                    name: item.name,
                    ru: item.ru,
                    typeClass: item.typeClass,
                    description: item.description || "",
                    customColor: item.customColor || null,
                    defaultDepth: item.defaultDepth,
                    defaultPower: item.defaultPower
                }))
            }))
        };

        if (format === "xlsx") {
            try {
                const buffer = libraryPayloadToXlsxBuffer(payload);
                const saved = await saveBinaryFile(
                    "rackplanner-library.xlsx",
                    buffer,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ".xlsx"
                );
                setNotice(saved ? "Library exported as XLSX. Item IDs are managed automatically during import." : "Library export canceled.");
            } catch (error) {
                setNotice(`Could not export library as XLSX: ${error.message}`);
            }
            return;
        }

        const isCsv = format === "csv";
        const content = isCsv ? libraryPayloadToCsv(payload) : JSON.stringify(payload, null, 2);
        const saved = await saveTextFile(
            `rackplanner-library.${isCsv ? "csv" : "json"}`,
            content,
            isCsv ? "text/csv" : "application/json",
            isCsv ? ".csv" : ".json"
        );
        if (!saved) {
            setNotice("Library export canceled.");
            return;
        }

        if (isCsv) {
            setNotice("Library exported as CSV. Item IDs are managed automatically during import.");
            return;
        }

        setNotice(`Library exported as ${format.toUpperCase()}.`);
    }

    function loadRackFromFile(payload) {
        if (!payload || !Array.isArray(payload.components)) {
            setNotice("Rack file is missing a components array.");
            return;
        }

        const requestedRackHeight = Number(payload.rackHeightRU) || defaultRackHeightRU;
        const nextRackHeight = Math.min(maximumRackHeightRU, requestedRackHeight);
        const nextComponents = payload.components.map(cloneRackComponent);
        const nextRackDepthCm = Math.max(minimumRackDepthCm, Number(payload.rackProfile?.rackDepthCm) || minimumRackDepthCm);
        const nextRackWidthCm = Math.max(minimumRackWidthCm, Number(payload.rackProfile?.rackWidthCm) || defaultRackWidthCm);
        const fitsRack = nextComponents.every(component => component.position + component.ru - 1 <= nextRackHeight);
        const fitsRackDepth = nextComponents.every(component => (Number(component.depth) || 0) <= nextRackDepthCm);

        if (!fitsRack) {
            setNotice("Rack file contains components outside the saved rack height.");
            return;
        }

        if (!fitsRackDepth) {
            setNotice(`Rack file contains components deeper than the rack depth of ${nextRackDepthCm} cm.`);
            return;
        }

        state.rackHeightRU = nextRackHeight;
        state.currentView = payload.currentView === "rear" ? "rear" : "front";
        state.rackProfile = {
            name: String(payload.rackProfile?.name || "Main Rack").trim() || "Main Rack",
            tag: String(payload.rackProfile?.tag || "RACK-01").trim() || "RACK-01",
            room: String(payload.rackProfile?.room || "").trim(),
            owner: String(payload.rackProfile?.owner || "").trim(),
            powerA: String(payload.rackProfile?.powerA || "").trim(),
            powerB: String(payload.rackProfile?.powerB || "").trim(),
            rackDepthCm: nextRackDepthCm,
            rackWidthCm: nextRackWidthCm,
            minDepthClearanceCm: Number(payload.rackProfile?.minDepthClearanceCm) || 0,
            notes: String(payload.rackProfile?.notes || "").trim()
        };
        state.rackComponents = nextComponents;
        state.sideCompartmentItems = normalizeSideCompartmentState(payload.sideCompartmentItems);
        state.selectedComponentId = null;
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        state.selectedSideItemId = null;
        rebuildRackSlots(state);
        renderAll();
        syncActiveRackToCatalog();

        if (requestedRackHeight > maximumRackHeightRU) {
            setNotice(`Rack loaded with ${state.rackComponents.length} components. Rack height was limited to ${maximumRackHeightRU} RU.`, "warning");
            return;
        }

        if (nextRackHeight > warningRackHeightRU) {
            setNotice(`Rack loaded with ${state.rackComponents.length} components. Heights above ${warningRackHeightRU} RU should be reviewed carefully.`, "warning");
            return;
        }

        setNotice(`Rack loaded with ${state.rackComponents.length} components.`);
    }

    async function saveRackToFile() {
        const format = await chooseDataFormat("Export", ["json", "csv"]);
        if (!format) {
            setNotice("Rack export canceled.");
            return;
        }

        const totalPowerW = getTotalPowerConsumption(state.rackComponents);
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
            components: state.rackComponents,
            sideCompartmentItems: state.sideCompartmentItems
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

    async function promptLoadRackFile() {
        const format = await chooseDataFormat("Import", ["json", "csv"]);
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
    }

    async function promptLoadLibraryFile() {
        const format = await chooseDataFormat("Import", ["json", "csv", "xlsx"]);
        if (!format) {
            setNotice("Library import canceled.");
            return;
        }

        if (window.showOpenFilePicker) {
            try {
                if (format === "xlsx") {
                    const workbookBuffer = await openBinaryFileWithPicker(format);
                    if (workbookBuffer === "") {
                        setNotice("Library import canceled.");
                        return;
                    }
                    const payload = xlsxBufferToLibraryPayload(workbookBuffer);
                    loadLibraryFromFile(payload, format);
                    return;
                }

                const rawText = await openTextFileWithPicker(format);
                if (rawText === "") {
                    setNotice("Library import canceled.");
                    return;
                }
                const payload = format === "csv" ? csvToLibraryPayload(rawText) : JSON.parse(rawText);
                loadLibraryFromFile(payload, format);
            } catch (error) {
                setNotice(`Could not load library file: ${error.message}`);
            }
            return;
        }

        loadLibraryInput.dataset.format = format;
        loadLibraryInput.accept = format === "csv"
            ? ".csv,text/csv"
            : format === "xlsx"
                ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                : ".json,application/json";
        loadLibraryInput.click();
    }

    async function handleRackInputChange() {
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
    }

    async function handleLibraryInputChange() {
        try {
            const format = loadLibraryInput.dataset.format || "json";
            const payload = format === "xlsx"
                ? xlsxBufferToLibraryPayload(await readArrayBufferFromInput(loadLibraryInput))
                : format === "csv"
                    ? csvToLibraryPayload(await readTextFromInput(loadLibraryInput))
                    : JSON.parse(await readTextFromInput(loadLibraryInput));
            loadLibraryFromFile(payload, format);
        } catch (error) {
            setNotice(`Could not load library file: ${error.message}`);
        } finally {
            loadLibraryInput.value = "";
        }
    }

    return {
        handleLibraryInputChange,
        handleRackInputChange,
        loadLibraryFromFile,
        loadRackFromFile,
        promptLoadLibraryFile,
        promptLoadRackFile,
        saveLibraryToFile,
        saveRackToFile
    };
}
