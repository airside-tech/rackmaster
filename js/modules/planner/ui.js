import { bindPlannerEvents } from "./bindEvents.js";
import {
    initializeColorPicker as initializePlannerColorPicker,
    initializeSelectedEditorColorPalette as initializeSelectedEditorColorPaletteView,
    updateSelectedEditorPaletteSelection as updateSelectedEditorPaletteSelectionView
} from "./colorControls.js";
import {
    renderLibrary as renderLibraryView,
    renderLibraryCategoryOptions as renderLibraryCategoryOptionsView,
    renderSideCompartmentLibrary as renderSideCompartmentLibraryView,
    renderSideCompartments as renderSideCompartmentsView
} from "./renderLibraryAndSide.js";
import {
    renderPlannerNotice as renderPlannerNoticeView,
    renderRackProfile as renderRackProfileView,
    renderSelectedEditorPanel as renderSelectedEditorPanelView,
    renderSelectedSideItemPanel as renderSelectedSideItemPanelView,
    renderSideViewFaceLabels as renderSideViewFaceLabelsView,
    renderStatus as renderStatusView
} from "./renderPanels.js";
import {
    renderRack as renderRackView,
    renderSideView as renderSideViewView
} from "./renderRackViews.js";

export function createPlannerUi(context) {
    const {
        state,
        defaultRackHeightRU,
        rackUnitHeightRU,
        rackUnitPixelHeight,
        rackNameTagEl,
        rackPropertiesInfoEl,
        rackNameInput,
        rackTagInput,
        rackHeightInput,
        rackDepthInput,
        rackWidthInput,
        rackRoomInput,
        rackOwnerInput,
        rackClearanceInput,
        rackNotesInput,
        plannerNoticeEl,
        rackStageHeadingEl,
        rackInfoEl,
        viewLegendEl,
        viewModeBadgeEl,
        toggleViewButton,
        rackSideLabelFrontEl,
        rackSideLabelRearEl,
        sideCompartmentLibraryEl,
        sideCompartmentLeftEl,
        sideCompartmentRightEl,
        accordionEl,
        libraryCategorySelect,
        libraryNewCategoryNameInput,
        rackEl,
        rackFrameEl,
        sideViewEl,
        documentBody,
        selectedEditorPanelEl,
        selectedEditorModeEl,
        selectedEditorFields,
        selectedEditorColorPresetsEl,
        selectedEditorInfoEl,
        saveSelectedEditorButton,
        deleteSelectedEditorButton,
        clearSelectedEditorButton,
        selectedSideItemFields,
        selectedSideItemInfoEl,
        saveSelectedSideItemButton,
        deleteSelectedSideItemButton,
        clearSideItemSelectionButton,
        libraryFormCollapseEl,
        libraryFormToggleButton,
        libraryFormToggleLabelEl,
        sideCompartmentFormCollapseEl,
        sideCompartmentFormToggleButton,
        sideCompartmentFormToggleLabelEl,
        colorPresets,
        getDefaultColor,
        setDefaultColor,
        adjustBrightness,
        sideCompartmentLibrarySeed,
        getSideCompartmentItems,
        getSideItemBackground,
        getSideItemDisplayLabel,
        setActiveDragSource,
        clearActiveDragSource,
        clearSideCompartmentDropTargets,
        rackPositionToTop,
        getBlockedOppositeFaceComponents,
        getComponentBackground,
        getComponentDepthCm,
        getComponentDisplayColor,
        getComponentRangeLabel,
        getDefaultSideItemColor,
        getRackDepthCm,
        getRackMinDepthClearanceCm,
        getComponentFace,
        getComponentsOnFace,
        getConflictingOppositeFaceComponentIds,
        getOppositeFaceDepthPairs,
        getTotalPowerConsumption,
        getUsedUnitsRU,
        getSelectedRackComponent,
        getSelectedSideCompartmentItem,
        getSelectedLibraryItem,
        syncActiveRackToCatalog,
        setNotice,
        getPlannerActions,
        getPlannerDragDrop,
        plannerFileFlows,
        getHandleExportDrawingPdf,
        loadRackInput,
        loadLibraryInput,
        libraryFormToggleRefs,
        sideCompartmentFormToggleRefs,
        addLibraryComponentButton,
        saveRackPropertiesButton,
        addCustomSideLabelLeftButton,
        addCustomSideLabelRightButton,
        rackIdentityBarEl,
        openRackPropertiesEditor,
        handleSaveRackProperties
    } = context;

    function renderSideViewFaceLabels() {
        renderSideViewFaceLabelsView({
            state,
            rackSideLabelFrontEl,
            rackSideLabelRearEl
        });
    }

    function renderPlannerNotice() {
        renderPlannerNoticeView({
            state,
            plannerNoticeEl
        });
    }

    function renderRackProfile() {
        renderRackProfileView({
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
            rackClearanceInput,
            rackNotesInput,
            rackFrameEl
        });
    }

    function renderStatus() {
        renderStatusView({
            state,
            documentBody,
            rackStageHeadingEl,
            rackInfoEl,
            viewLegendEl,
            viewModeBadgeEl,
            toggleViewButton,
            getRackMetrics: () => {
                const usedUnitsRU = getUsedUnitsRU(state.rackComponents);
                const freeUnitsRU = state.rackHeightRU - usedUnitsRU;
                const totalPowerW = getTotalPowerConsumption(state.rackComponents);
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
                const usageSummaryPercent = Math.max(frontUsagePercentSafe, rearDepthUsagePercentSafe);
                const usageScaleClass = usageSummaryPercent > 80
                    ? "is-red"
                    : usageSummaryPercent > 50
                        ? "is-orange"
                        : "is-green";

                return {
                    freeUnitsRU,
                    frontUsagePercentSafe,
                    rearDepthUsagePercentSafe,
                    totalPowerW,
                    usageScaleClass,
                    usedUnitsRU
                };
            },
            renderPlannerNoticeFn: renderPlannerNotice,
            renderSideViewFaceLabelsFn: renderSideViewFaceLabels
        });
    }

    function renderSideCompartmentLibrary() {
        renderSideCompartmentLibraryView({
            sideCompartmentLibraryEl,
            sideCompartmentLibrarySeed,
            getSideItemBackground,
            setActiveDragSource,
            clearActiveDragSource
        });
    }

    function renderSideCompartments() {
        renderSideCompartmentsView({
            state,
            rackUnitPixelHeight,
            sideCompartmentLeftEl,
            sideCompartmentRightEl,
            getSideCompartmentItems,
            getSideItemBackground,
            getSideItemDisplayLabel,
            clearSideCompartmentDropTargets,
            setActiveDragSource,
            clearActiveDragSource
        });
    }

    function renderRack() {
        renderRackView({
            state,
            rackEl,
            rackUnitHeightRU,
            rackUnitPixelHeight,
            rackPositionToTop,
            getBlockedOppositeFaceComponents,
            getComponentBackground,
            getComponentDepthCm,
            getComponentRangeLabel,
            handleRackComponentDragStart: getPlannerDragDrop().handleRackComponentDragStart,
            clearDragPreview: getPlannerDragDrop().clearDragPreview
        });
    }

    function renderSideView() {
        renderSideViewView({
            state,
            sideViewEl,
            rackUnitPixelHeight,
            rackPositionToTop,
            getRackDepthCm,
            getRackMinDepthClearanceCm,
            getComponentDepthCm,
            getComponentFace,
            getOppositeFaceDepthPairs,
            getConflictingOppositeFaceComponentIds
        });
    }

    function renderLibrary() {
        renderLibraryView({
            state,
            accordionEl,
            handleLibraryDragStart: getPlannerDragDrop().handleLibraryDragStart,
            handleSelectLibraryItem: getPlannerActions().handleSelectLibraryItem,
            getComponentBackground,
            removeLibraryComponent: getPlannerActions().removeLibraryComponent,
            renderLibraryCategoryOptionsFn: renderLibraryCategoryOptions
        });
    }

    function renderLibraryCategoryOptions() {
        renderLibraryCategoryOptionsView({
            state,
            libraryCategorySelect,
            libraryNewCategoryNameInput
        });
    }

    function syncLibraryFormDisclosure() {
        const isExpanded = Boolean(state.libraryFormExpanded);
        libraryFormCollapseEl.classList.toggle("show", isExpanded);
        libraryFormToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        libraryFormToggleButton.setAttribute("aria-label", `${isExpanded ? "Hide" : "Show"} add library component form`);
        libraryFormToggleLabelEl.textContent = isExpanded ? "Hide" : "Show";
    }

    function syncSideCompartmentFormDisclosure() {
        const isExpanded = Boolean(state.sideCompartmentFormExpanded);
        sideCompartmentFormCollapseEl.classList.toggle("show", isExpanded);
        sideCompartmentFormToggleButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        sideCompartmentFormToggleButton.setAttribute("aria-label", `${isExpanded ? "Hide" : "Show"} side compartments`);
        sideCompartmentFormToggleLabelEl.textContent = isExpanded ? "Hide" : "Show";
    }

    function renderSelectedEditorPanel() {
        renderSelectedEditorPanelView({
            state,
            getSelectedRackComponent,
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
        });
    }

    function renderSelectedSideItemPanel() {
        renderSelectedSideItemPanelView({
            getDefaultSideItemColor,
            getSelectedSideCompartmentItem,
            selectedSideItemFields,
            selectedSideItemInfoEl,
            saveSelectedSideItemButton,
            deleteSelectedSideItemButton,
            clearSideItemSelectionButton
        });
    }

    function renderAll() {
        context.rebuildRackSlots(state);
        renderRack();
        renderSideCompartments();
        renderSideView();
        renderLibrary();
        renderSideCompartmentLibrary();
        renderRackProfile();
        renderSelectedEditorPanel();
        renderSelectedSideItemPanel();
        renderStatus();
    }

    function bindEvents() {
        bindPlannerEvents({
            state,
            libraryFormToggleButton,
            sideCompartmentFormToggleButton,
            addLibraryComponentButton,
            saveRackPropertiesButton,
            saveSelectedEditorButton,
            deleteSelectedEditorButton,
            clearSelectedEditorButton,
            saveSelectedSideItemButton,
            deleteSelectedSideItemButton,
            clearSideItemSelectionButton,
            addCustomSideLabelLeftButton,
            addCustomSideLabelRightButton,
            toggleViewButton,
            loadRackInput,
            loadLibraryInput,
            libraryCategorySelect,
            libraryNewCategoryNameInput,
            rackIdentityBarEl,
            rackInfoEl,
            rackEl,
            sideCompartmentLeftEl,
            sideCompartmentRightEl,
            sideViewEl,
            syncLibraryFormDisclosure,
            syncSideCompartmentFormDisclosure,
            plannerFileFlows,
            handleExportDrawingPdf: getHandleExportDrawingPdf(),
            plannerActions: getPlannerActions(),
            plannerDragDrop: getPlannerDragDrop(),
            openRackPropertiesEditor,
            handleSaveRackProperties
        });
    }

    function updateSelectedEditorPaletteSelection(colorHex) {
        updateSelectedEditorPaletteSelectionView({ selectedEditorColorPresetsEl }, colorHex);
    }

    function initializeSelectedEditorColorPalette() {
        initializeSelectedEditorColorPaletteView({
            colorPresets,
            selectedEditorColorPresetsEl,
            selectedEditorFields,
            getSelectedRackComponent,
            getSelectedLibraryItem,
            renderRack,
            renderLibrary,
            renderSelectedEditorPanel,
            syncActiveRackToCatalog,
            setNotice,
            updateSelectedEditorPaletteSelection
        });
    }

    function initializeColorPicker() {
        initializePlannerColorPicker({
            colorPresets,
            getDefaultColor,
            setDefaultColor,
            adjustBrightness
        });
    }

    return {
        bindEvents,
        initializeColorPicker,
        initializeSelectedEditorColorPalette,
        renderAll,
        renderLibrary,
        renderLibraryCategoryOptions,
        renderPlannerNotice,
        renderRack,
        renderRackProfile,
        renderSelectedEditorPanel,
        renderSelectedSideItemPanel,
        renderSideCompartments,
        renderSideCompartmentLibrary,
        renderSideView,
        renderSideViewFaceLabels,
        renderStatus,
        syncLibraryFormDisclosure,
        syncSideCompartmentFormDisclosure,
        updateSelectedEditorPaletteSelection
    };
}