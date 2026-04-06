import { maximumRackHeightRU, minimumRackDepthCm } from "./state.js";

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
        rackRoomInput,
        rackOwnerInput,
        rackClearanceInput,
        rackNotesInput
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
    rackRoomInput.value = state.rackProfile.room || "";
    rackOwnerInput.value = state.rackProfile.owner || "";
    rackClearanceInput.value = Number(state.rackProfile.minDepthClearanceCm) || 0;
    rackNotesInput.value = state.rackProfile.notes || "";
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
        usageScaleClass,
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
    const usageSummaryPercent = Math.max(frontUsagePercentSafe, rearDepthUsagePercentSafe);
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
    `;
    viewLegendEl.textContent = state.currentView === "front"
        ? "Front view: showing components mounted on the front face."
        : "Rear view: rear-side placement is allowed when rack depth and clearance permit it.";
    toggleViewButton.textContent = state.currentView === "front" ? "Switch to Rear View" : "Switch to Front View";
}

export function renderSelectedComponentPanel(context) {
    const {
        getSelectedRackComponent,
        getComponentDisplayColor,
        getComponentRangeLabel,
        updateSelectedComponentPaletteSelection,
        selectedComponentFields,
        selectedComponentInfoEl,
        saveSelectedComponentButton,
        deleteSelectedComponentButton,
        clearSelectionButton
    } = context;

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

export function renderSelectedSideItemPanel(context) {
    const {
        getDefaultSideItemColor,
        getSelectedSideCompartmentItem,
        selectedSideItemFields,
        selectedSideItemInfoEl,
        saveSelectedSideItemButton,
        deleteSelectedSideItemButton,
        clearSideItemSelectionButton
    } = context;

    const selectedSideItem = getSelectedSideCompartmentItem();
    const hasSelection = Boolean(selectedSideItem);

    Object.values(selectedSideItemFields).forEach(field => {
        if (!field) {
            return;
        }
        field.disabled = !hasSelection;
    });

    saveSelectedSideItemButton.disabled = !hasSelection;
    deleteSelectedSideItemButton.disabled = !hasSelection;
    clearSideItemSelectionButton.disabled = !hasSelection;

    if (!hasSelection) {
        selectedSideItemFields.name.value = "";
        selectedSideItemFields.side.value = "left";
        selectedSideItemFields.color.value = "#7d8994";
        selectedSideItemFields.notes.value = "";
        selectedSideItemInfoEl.textContent = "Select a side-compartment item to edit.";
        return;
    }

    selectedSideItemFields.name.value = selectedSideItem.name;
    selectedSideItemFields.side.value = selectedSideItem.side;
    selectedSideItemFields.color.value = selectedSideItem.customColor || getDefaultSideItemColor(selectedSideItem.type);
    selectedSideItemFields.notes.value = selectedSideItem.notes || "";
    selectedSideItemInfoEl.textContent = `Selected: ${selectedSideItem.name} (${selectedSideItem.view} / ${selectedSideItem.side})`;
}
