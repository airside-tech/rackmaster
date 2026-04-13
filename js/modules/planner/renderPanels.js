import { defaultRackWidthCm, maximumRackHeightRU, minimumRackDepthCm, minimumRackWidthCm } from "./state.js";

export function renderSideViewFaceLabels(context) {
    const { state, rackSideLabelFrontEl, rackSideLabelRearEl } = context;
    rackSideLabelFrontEl.classList.toggle("is-active", state.currentView === "front");
    rackSideLabelRearEl.classList.toggle("is-active", state.currentView === "rear");
}

export function renderPlannerNotice(context) {
    const { state, plannerNoticeEl } = context;
    plannerNoticeEl.textContent = state.notice;
    plannerNoticeEl.classList.remove("planner-notice--info", "planner-notice--success", "planner-notice--warning", "planner-notice--error");
    plannerNoticeEl.classList.add(`planner-notice--${state.noticeLevel || "info"}`);
}

export function renderRackProfile(context) {
    const {
        state,
        defaultRackHeightRU,
        rackNameTagEl,
        rackPropertiesInfoEl,
        rackNameInput,
        rackTagInput,
        rackHeightInput,
        rackDepthInput,
        rackWidthInput,
        rackRoomInput,
        rackOwnerInput,
        rackPowerAInput,
        rackPowerBInput,
        rackClearanceInput,
        rackNotesInput,
        rackFrameEl
    } = context;

    const rackName = state.rackProfile.name || "Main Rack";
    const rackTag = state.rackProfile.tag || "RACK-01";
    rackNameTagEl.textContent = `${rackName} [${rackTag}]`;
    rackPropertiesInfoEl.textContent = [
        `Rack: ${rackName} (${rackTag})`,
        state.rackProfile.room ? `Room: ${state.rackProfile.room}` : null,
        state.rackProfile.owner ? `Description: ${state.rackProfile.owner}` : null
    ].filter(Boolean).join(" | ");

    rackNameInput.value = rackName;
    rackTagInput.value = rackTag;
    rackHeightInput.value = Number(state.rackHeightRU) || defaultRackHeightRU;
    rackHeightInput.max = String(maximumRackHeightRU);
    rackDepthInput.value = Math.max(minimumRackDepthCm, Number(state.rackProfile.rackDepthCm) || minimumRackDepthCm);
    const rackWidthCm = Math.max(minimumRackWidthCm, Number(state.rackProfile.rackWidthCm) || defaultRackWidthCm);
    rackWidthInput.value = rackWidthCm;
    rackRoomInput.value = state.rackProfile.room || "";
    rackOwnerInput.value = state.rackProfile.owner || "";
    rackPowerAInput.value = state.rackProfile.powerA || "";
    rackPowerBInput.value = state.rackProfile.powerB || "";
    rackClearanceInput.value = Number(state.rackProfile.minDepthClearanceCm) || 0;
    rackNotesInput.value = state.rackProfile.notes || "";

    const baseRackWidthCm = defaultRackWidthCm;
    const baseSideWidthPx = 60;
    const minSideWidthPx = 48;
    const maxSideWidthPx = 220;
    const scaledSideWidthPx = Math.max(
        minSideWidthPx,
        Math.min(maxSideWidthPx, Math.round((rackWidthCm / baseRackWidthCm) * baseSideWidthPx))
    );
    const innerRackWidthPx = 300 + (scaledSideWidthPx * 2);
    rackFrameEl.style.setProperty("--rack-side-width", `${scaledSideWidthPx}px`);
    rackFrameEl.style.setProperty("--rack-frame-inner-width", `${innerRackWidthPx}px`);
}

export function renderStatus(context) {
    const {
        state,
        documentBody,
        rackStageHeadingEl,
        rackInfoEl,
        viewLegendEl,
        viewModeBadgeEl,
        toggleViewButton,
        getRackMetrics,
        renderPlannerNoticeFn,
        renderSideViewFaceLabelsFn
    } = context;

    const {
        freeUnitsRU,
        frontUsagePercentSafe,
        rearDepthUsagePercentSafe,
        totalPowerW,
        usedUnitsRU
    } = getRackMetrics();

    function getUsageScaleClass(percentValue) {
        return percentValue > 80
            ? "is-red"
            : percentValue > 50
                ? "is-orange"
                : "is-green";
    }

    const frontUsageScaleClass = getUsageScaleClass(frontUsagePercentSafe);
    const rearUsageScaleClass = getUsageScaleClass(rearDepthUsagePercentSafe);
    const activeViewText = state.currentView === "front" ? "Front" : "Rear";
    const rackName = state.rackProfile.name || "Main Rack";
    const rackTag = state.rackProfile.tag || "RACK-01";
    const locationLine = [state.rackProfile.room, state.rackProfile.owner].filter(Boolean).join(" | ");

    documentBody.classList.toggle("view-front", state.currentView === "front");
    documentBody.classList.toggle("view-rear", state.currentView === "rear");
    viewModeBadgeEl.textContent = `${activeViewText.toUpperCase()} SIDE`;
    if (rackStageHeadingEl) {
        rackStageHeadingEl.textContent = `Active Side: ${activeViewText}`;
    }
    renderSideViewFaceLabelsFn();
    renderPlannerNoticeFn();

    rackInfoEl.innerHTML = `
        <div class="rack-info-grid">
            <div class="rack-info-col rack-info-col--text">
                <div><strong>${rackName}</strong> [${rackTag}]</div>
                <div>${locationLine || "No room/owner set yet."}</div>
                <div>Total Rack Size: ${state.rackHeightRU} RU</div>
                <div>Rack Width: ${Math.max(minimumRackWidthCm, Number(state.rackProfile.rackWidthCm) || defaultRackWidthCm)} cm</div>
                <div>Installed: ${usedUnitsRU} RU, Vacant: ${freeUnitsRU} RU</div>
                <div>Total Calculated Consumption: ${totalPowerW} W</div>
            </div>
            <div class="rack-info-col rack-info-col--usage">
                <div class="rack-usage-wrap">
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
    `;
    viewLegendEl.textContent = state.currentView === "front"
        ? "Front view: showing components mounted on the front face."
        : "Rear view: rear-side placement is allowed when rack depth and clearance permit it.";
    toggleViewButton.textContent = state.currentView === "front" ? "Switch to Rear View" : "Switch to Front View";
}

export function renderSelectedEditorPanel(context) {
    const {
        state,
        getSelectedRackComponent,
        getSelectedSideCompartmentItem,
        getDefaultSideItemColor,
        getComponentDisplayColor,
        getComponentRangeLabel,
        updateSelectedEditorPaletteSelection,
        selectedEditorPanelEl,
        selectedEditorModeEl,
        selectedEditorFields,
        selectedEditorInfoEl,
        saveSelectedEditorButton,
        deleteSelectedEditorButton,
        clearSelectedEditorButton
    } = context;

    const selectedComponent = getSelectedRackComponent();
    const selectedCategory = state.libraryCategories.find(category => category.id === state.selectedLibraryCategoryId) || null;
    const selectedLibraryItem = selectedCategory
        ? selectedCategory.items.find(item => item.id === state.selectedLibraryItemId) || null
        : null;
    const selectedSideItem = getSelectedSideCompartmentItem();
    const mode = selectedComponent
        ? "component"
        : selectedSideItem
            ? "side-item"
        : selectedLibraryItem
            ? "library"
            : "empty";
    const hasSelection = mode !== "empty";
    const isLibraryMode = mode === "library";
    const isRackMode = mode === "component";
    const isSideItemMode = mode === "side-item";

    Object.values(selectedEditorFields).forEach(field => {
        if (!field) {
            return;
        }
        field.disabled = !hasSelection;
    });

    if (selectedEditorFields.position) {
        selectedEditorFields.position.disabled = !hasSelection || isLibraryMode;
    }
    if (selectedEditorFields.notes) {
        selectedEditorFields.notes.disabled = !hasSelection || isLibraryMode;
    }
    if (selectedEditorFields.side) {
        selectedEditorFields.side.disabled = !isSideItemMode;
    }

    saveSelectedEditorButton.disabled = !hasSelection;
    deleteSelectedEditorButton.disabled = !hasSelection;
    clearSelectedEditorButton.disabled = !hasSelection;

    selectedEditorPanelEl.classList.toggle("is-component-mode", isRackMode);
    selectedEditorPanelEl.classList.toggle("is-library-mode", mode === "library");
    selectedEditorPanelEl.classList.toggle("is-side-item-mode", isSideItemMode);
    selectedEditorPanelEl.classList.toggle("is-empty-mode", mode === "empty");

    if (!hasSelection) {
        selectedEditorModeEl.textContent = "No Selection";
        selectedEditorFields.name.value = "";
        selectedEditorFields.ru.value = "";
        selectedEditorFields.position.value = "";
        if (selectedEditorFields.side) {
            selectedEditorFields.side.value = "left";
        }
        selectedEditorFields.depth.value = "";
        selectedEditorFields.power.value = "";
        selectedEditorFields.description.value = "";
        selectedEditorFields.color.value = "#9ca3af";
        updateSelectedEditorPaletteSelection("");
        selectedEditorFields.notes.value = "";
        selectedEditorInfoEl.textContent = "Select a component, library item, or side-compartment item to edit.";
        return;
    }

    if (isRackMode) {
        selectedEditorModeEl.textContent = "Component";
        selectedEditorFields.name.value = selectedComponent.name;
        selectedEditorFields.ru.value = selectedComponent.ru;
        selectedEditorFields.position.value = selectedComponent.position;
        if (selectedEditorFields.side) {
            selectedEditorFields.side.value = "left";
        }
        selectedEditorFields.depth.value = selectedComponent.depth;
        selectedEditorFields.power.value = selectedComponent.power;
        selectedEditorFields.description.value = selectedComponent.description || "";
        selectedEditorFields.color.value = getComponentDisplayColor(selectedComponent);
        updateSelectedEditorPaletteSelection(selectedEditorFields.color.value);
        selectedEditorFields.notes.value = selectedComponent.notes || "";
        selectedEditorInfoEl.textContent = `Selected: ${selectedComponent.name} (${getComponentRangeLabel(selectedComponent)})`;
        return;
    }

    if (isSideItemMode) {
        selectedEditorModeEl.textContent = "Side Item";
        selectedEditorFields.name.value = selectedSideItem.name;
        selectedEditorFields.ru.value = Math.max(1, Number(selectedSideItem.ru) || 1);
        selectedEditorFields.position.value = Math.max(1, Number(selectedSideItem.position) || 1);
        if (selectedEditorFields.side) {
            selectedEditorFields.side.value = selectedSideItem.side;
        }
        selectedEditorFields.depth.value = "";
        selectedEditorFields.power.value = "";
        selectedEditorFields.description.value = "";
        selectedEditorFields.color.value = selectedSideItem.customColor || getDefaultSideItemColor(selectedSideItem.type);
        updateSelectedEditorPaletteSelection(selectedEditorFields.color.value);
        selectedEditorFields.notes.value = selectedSideItem.notes || "";
        selectedEditorInfoEl.textContent = `Selected: ${selectedSideItem.name} (${selectedSideItem.view} / ${selectedSideItem.side}, ${Math.max(1, Number(selectedSideItem.ru) || 1)}U @ U${Math.max(1, Number(selectedSideItem.position) || 1)})`;
        return;
    }

    selectedEditorModeEl.textContent = "Library Item";
    selectedEditorFields.name.value = selectedLibraryItem.name;
    selectedEditorFields.ru.value = selectedLibraryItem.ru;
    selectedEditorFields.position.value = "";
    if (selectedEditorFields.side) {
        selectedEditorFields.side.value = "left";
    }
    selectedEditorFields.depth.value = selectedLibraryItem.defaultDepth || 0;
    selectedEditorFields.power.value = selectedLibraryItem.defaultPower || 0;
    selectedEditorFields.description.value = selectedLibraryItem.description || "";
    selectedEditorFields.color.value = selectedLibraryItem.customColor || getComponentDisplayColor(selectedLibraryItem);
    updateSelectedEditorPaletteSelection(selectedEditorFields.color.value);
    selectedEditorFields.notes.value = "";
    selectedEditorInfoEl.textContent = `Selected: ${selectedLibraryItem.name} (${selectedCategory.name})`;
}

