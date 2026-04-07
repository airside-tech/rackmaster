import { readCatalog, writeCatalog } from "../storage.js";
import { createId, normalizeTypeClass } from "../typeUtils.js";
import {
    adjustBrightness,
    colorPresets,
    getComponentBackground,
    getComponentDisplayColor,
    getDefaultColor,
    setDefaultColor
} from "./colors.js";
import {
    createInitialPlannerState,
    defaultRackHeightRU,
    maximumRackHeightRU,
    rackUnitHeightRU,
    warningRackHeightRU,
    rackUnitPixelHeight
} from "./state.js";
import {
    createEmptySideCompartmentState,
    getDefaultSideItemColor,
    getSideItemBackground,
    getSideItemDisplayLabel,
    normalizeSideCompartmentItem,
    normalizeSideCompartmentState,
    sideCompartmentLibrarySeed
} from "./sideCompartments.js";
import {
    getBlockedOppositeFaceComponents,
    getComponentDepthCm,
    getComponentFace,
    getComponentRangeLabel,
    getComponentsOnFace,
    getConflictingOppositeFaceComponentIds,
    getHighestOccupiedRU,
    getOppositeFaceDepthPairs,
    getPlacementAnalysis,
    getRackDepthCm,
    getRackMinDepthClearanceCm,
    getTotalPowerConsumption,
    getUsedUnitsRU,
    rebuildRackSlots,
    resolvePlacementAttempt,
    findFirstAvailablePosition as findFirstAvailableRackPosition,
    isRackPositionAvailable as isRackPositionAvailableInState
} from "./placementEngine.js";
import { createPlannerFileFlows } from "./fileFlows.js";
import { createPdfExportHandler } from "./pdfExport.js";
import { createPlannerActions } from "./actions.js";
import { createPlannerDragDrop } from "./dragDrop.js";
import { createPlannerHelpers } from "./helpers.js";
import { createRackCatalogHandlers } from "./rackCatalogSync.js";
import { createPlannerUi } from "./ui.js";

export function initPlannerPage() {
    const rackFrameEl = document.getElementById("rackFrame");
    const rackEl = document.getElementById("rack");
    const rackStageHeadingEl = document.getElementById("rackStageHeading");
    const accordionEl = document.getElementById("accordion");
    const rackInfoEl = document.getElementById("rackInfo");
    const plannerNoticeEl = document.getElementById("plannerNotice");
    const viewLegendEl = document.getElementById("viewLegend");
    const rackIdentityBarEl = document.getElementById("rackIdentityBar");
    const rackNameTagEl = document.getElementById("rackNameTag");
    const viewModeBadgeEl = document.getElementById("viewModeBadge");
    const rackSideLabelFrontEl = document.getElementById("rackSideLabelFront");
    const rackSideLabelRearEl = document.getElementById("rackSideLabelRear");
    const sideCompartmentLeftEl = document.getElementById("sideCompartmentLeft");
    const sideCompartmentRightEl = document.getElementById("sideCompartmentRight");
    const sideCompartmentLibraryEl = document.getElementById("sideCompartmentLibrary");
    const sideViewEl = document.getElementById("rackSideView");
    const rackPropertiesPanelEl = document.getElementById("rackPropertiesPanel");
    const rackPropertiesInfoEl = document.getElementById("rackPropertiesInfo");
    const rackNameInput = document.getElementById("rackNameInput");
    const rackTagInput = document.getElementById("rackTagInput");
    const rackHeightInput = document.getElementById("rackHeightInput");
    const rackDepthInput = document.getElementById("rackDepthInput");
    const rackWidthInput = document.getElementById("rackWidthInput");
    const rackRoomInput = document.getElementById("rackRoomInput");
    const rackOwnerInput = document.getElementById("rackOwnerInput");
    const rackClearanceInput = document.getElementById("rackClearanceInput");
    const rackNotesInput = document.getElementById("rackNotesInput");
    const saveRackPropertiesButton = document.getElementById("saveRackProperties");
    const toggleViewButton = document.getElementById("toggleViewButton");
    const libraryFormToggleButton = document.getElementById("libraryFormToggle");
    const libraryFormToggleLabelEl = document.getElementById("libraryFormToggleLabel");
    const libraryFormCollapseEl = document.getElementById("libraryFormCollapse");
    const sideCompartmentFormToggleButton = document.getElementById("sideCompartmentFormToggle");
    const sideCompartmentFormToggleLabelEl = document.getElementById("sideCompartmentFormToggleLabel");
    const sideCompartmentFormCollapseEl = document.getElementById("sideCompartmentFormCollapse");
    const rackPropertiesToggleButton = document.getElementById("rackPropertiesToggle");
    const rackPropertiesToggleLabelEl = document.getElementById("rackPropertiesToggleLabel");
    const rackPropertiesCollapseEl = document.getElementById("rackPropertiesCollapse");
    const addLibraryComponentButton = document.getElementById("addLibraryComponent");
    const selectedEditorPanelEl = document.getElementById("selectedEditorPanel");
    const selectedEditorModeEl = document.getElementById("selectedEditorMode");
    const saveSelectedEditorButton = document.getElementById("saveSelectedEditor");
    const deleteSelectedEditorButton = document.getElementById("deleteSelectedEditor");
    const clearSelectedEditorButton = document.getElementById("clearSelectedEditor");
    const selectedEditorInfoEl = document.getElementById("selectedEditorInfo");
    const selectedSideItemInfoEl = document.getElementById("selectedSideItemInfo");
    const saveSelectedSideItemButton = document.getElementById("saveSelectedSideItem");
    const deleteSelectedSideItemButton = document.getElementById("deleteSelectedSideItem");
    const clearSideItemSelectionButton = document.getElementById("clearSideItemSelection");
    const loadRackInput = document.getElementById("loadRackInput");
    const loadLibraryInput = document.getElementById("loadLibraryInput");
    const libraryCategorySelect = document.getElementById("libraryCategorySelect");
    const libraryNewCategoryNameInput = document.getElementById("libraryNewCategoryName");
    const customSideLabelNameInput = document.getElementById("customSideLabelName");
    const customSideLabelNotesInput = document.getElementById("customSideLabelNotes");
    const customSideLabelColorInput = document.getElementById("customSideLabelColor");
    const addCustomSideLabelLeftButton = document.getElementById("addCustomSideLabelLeft");
    const addCustomSideLabelRightButton = document.getElementById("addCustomSideLabelRight");

    if (!rackFrameEl || !rackEl || !accordionEl || !rackInfoEl || !plannerNoticeEl || !viewLegendEl || !rackIdentityBarEl || !rackNameTagEl || !viewModeBadgeEl || !rackSideLabelFrontEl || !rackSideLabelRearEl || !sideCompartmentLeftEl || !sideCompartmentRightEl || !sideCompartmentLibraryEl || !rackPropertiesPanelEl || !rackPropertiesInfoEl || !rackNameInput || !rackTagInput || !rackHeightInput || !rackDepthInput || !rackWidthInput || !rackRoomInput || !rackOwnerInput || !rackClearanceInput || !rackNotesInput || !saveRackPropertiesButton || !toggleViewButton || !libraryFormToggleButton || !libraryFormToggleLabelEl || !libraryFormCollapseEl || !sideCompartmentFormToggleButton || !sideCompartmentFormToggleLabelEl || !sideCompartmentFormCollapseEl || !rackPropertiesToggleButton || !rackPropertiesToggleLabelEl || !rackPropertiesCollapseEl || !addLibraryComponentButton || !selectedEditorPanelEl || !selectedEditorModeEl || !saveSelectedEditorButton || !deleteSelectedEditorButton || !clearSelectedEditorButton || !selectedEditorInfoEl || !selectedSideItemInfoEl || !saveSelectedSideItemButton || !deleteSelectedSideItemButton || !clearSideItemSelectionButton || !loadRackInput || !loadLibraryInput || !libraryCategorySelect || !libraryNewCategoryNameInput || !customSideLabelNameInput || !customSideLabelNotesInput || !customSideLabelColorInput || !addCustomSideLabelLeftButton || !addCustomSideLabelRightButton) {
        return;
    }

    const state = createInitialPlannerState();

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
    if (!selectedComponentFields.name || !selectedComponentFields.ru || !selectedComponentFields.position || !selectedComponentFields.depth || !selectedComponentFields.power || !selectedComponentFields.description || !selectedComponentFields.color || !selectedComponentFields.notes || !selectedComponentColorPresetsEl) {
        return;
    }

    const selectedLibraryFields = {
        name: selectedComponentFields.name,
        ru: selectedComponentFields.ru,
        description: selectedComponentFields.description,
        depth: selectedComponentFields.depth,
        power: selectedComponentFields.power,
        color: selectedComponentFields.color
    };
    const selectedSideItemFields = {
        name: document.getElementById("selectedSideItemName"),
        side: document.getElementById("selectedSideItemSide"),
        color: document.getElementById("selectedSideItemColor"),
        notes: document.getElementById("selectedSideItemNotes")
    };

    const activeRackId = new URLSearchParams(window.location.search).get("rackId");

    let plannerUi = null;
    const renderAll = () => plannerUi.renderAll();
    const renderLibrary = () => plannerUi.renderLibrary();
    const renderRack = () => plannerUi.renderRack();
    const renderSelectedEditorPanel = () => plannerUi.renderSelectedEditorPanel();
    const renderSelectedSideItemPanel = () => plannerUi.renderSelectedSideItemPanel();
    const renderSideCompartments = () => plannerUi.renderSideCompartments();
    const renderSideView = () => plannerUi.renderSideView();
    const renderStatus = () => plannerUi.renderStatus();
    const syncLibraryFormDisclosure = () => plannerUi.syncLibraryFormDisclosure();
    const syncSideCompartmentFormDisclosure = () => plannerUi.syncSideCompartmentFormDisclosure();
    const syncRackPropertiesDisclosure = () => plannerUi.syncRackPropertiesDisclosure();
    const bindEvents = () => plannerUi.bindEvents();
    const initializeColorPicker = () => plannerUi.initializeColorPicker();
    const initializeSelectedEditorColorPalette = () => plannerUi.initializeSelectedEditorColorPalette();

    const plannerHelpers = createPlannerHelpers({
        state,
        rackEl,
        rackUnitPixelHeight,
        sideCompartmentLeftEl,
        sideCompartmentRightEl,
        rackPropertiesPanelEl,
        createId,
        normalizeTypeClass,
        findFirstAvailableRackPosition,
        isRackPositionAvailableInState,
        onNoticeChange: () => plannerUi.renderStatus()
    });

    const {
        clearActiveDragSource,
        clearSideCompartmentDropTargets,
        clientYToRackPosition,
        cloneRackComponent,
        findFirstAvailablePosition,
        getAllSideCompartmentItems,
        getSelectedRackComponent,
        getSelectedSideCompartmentItem,
        getSideCompartmentItems,
        isRackPositionAvailable,
        isSideCompartmentDragSourceActive,
        parseDraggedPayload,
        rackPositionToTop,
        reorderSideCompartmentItems,
        setActiveDragSource,
        setActiveEditor,
        setNotice
    } = plannerHelpers;

    let rackCatalogHandlers = null;

    function openRackPropertiesEditor() {
        rackCatalogHandlers.openRackPropertiesEditor();
    }

    function handleSaveRackProperties() {
        rackCatalogHandlers.handleSaveRackProperties();
    }

    function syncActiveRackToCatalog() {
        rackCatalogHandlers.syncActiveRackToCatalog();
    }

    function loadRackFromCatalog() {
        rackCatalogHandlers.loadRackFromCatalog();
    }

    function getSelectedLibraryItem() {
        if (!state.selectedLibraryCategoryId || !state.selectedLibraryItemId) {
            return null;
        }

        const selectedCategory = state.libraryCategories.find(category => category.id === state.selectedLibraryCategoryId);
        if (!selectedCategory) {
            return null;
        }

        return selectedCategory.items.find(item => item.id === state.selectedLibraryItemId) || null;
    }

    const plannerActions = createPlannerActions({
        state,
        rackUnitHeightRU,
        selectedComponentFields,
        selectedLibraryFields,
        selectedSideItemFields,
        customSideLabelNameInput,
        customSideLabelNotesInput,
        customSideLabelColorInput,
        libraryCategorySelect,
        libraryNewCategoryNameInput,
        cloneRackComponent,
        findFirstAvailablePosition,
        getPlacementAnalysis,
        resolvePlacementAttempt,
        getComponentRangeLabel,
        normalizeSideCompartmentItem,
        getDefaultSideItemColor,
        getSideCompartmentItems,
        getAllSideCompartmentItems,
        getSelectedRackComponent,
        getSelectedSideCompartmentItem,
        reorderSideCompartmentItems,
        normalizeTypeClass,
        createId,
        getHighestOccupiedRU,
        maximumRackHeightRU,
        warningRackHeightRU,
        setActiveEditor,
        renderAll,
        renderRack,
        renderSideCompartments,
        renderSideView,
        renderLibrary,
        renderSelectedEditorPanel,
        renderSelectedSideItemPanel,
        syncActiveRackToCatalog,
        setNotice,
        renderStatus
    });

    const plannerDragDrop = createPlannerDragDrop({
        state,
        parseDraggedPayload,
        clearSideCompartmentDropTargets,
        clearActiveDragSource,
        setActiveDragSource,
        isSideCompartmentDragSourceActive,
        getAllSideCompartmentItems,
        getSideCompartmentItems,
        reorderSideCompartmentItems,
        getDefaultSideItemColor,
        addSideCompartmentItem: plannerActions.addSideCompartmentItem,
        clientYToRackPosition,
        isRackPositionAvailable,
        getPlacementAnalysis,
        resolvePlacementAttempt,
        getComponentRangeLabel,
        addComponentToRack: plannerActions.addComponentToRack,
        renderRack,
        renderAll,
        syncActiveRackToCatalog,
        setNotice
    });

    const {
        addComponentToRack,
        addSideCompartmentItem,
        clearSelectedComponent,
        clearSelectedSideItem,
        handleAddCustomSideLabel,
        handleAddLibraryComponent,
        handleDecreaseRackHeight,
        handleDeleteSelectedEditor,
        handleDeleteSelectedSideItem,
        handleIncreaseRackHeight,
        handleSaveSelectedEditor,
        handleSaveSelectedSideItem,
        handleSelectLibraryItem,
        handleSelectRackComponent,
        handleSelectSideCompartmentItem,
        handleToggleView,
        clearSelectedEditor,
        removeLibraryComponent,
        removeRackComponent,
        removeSideCompartmentItem
    } = plannerActions;

    const {
        clearDragPreview,
        handleLibraryDragStart,
        handleRackComponentDragStart,
        handleRackDrop,
        handleSideCompartmentDragLeave,
        handleSideCompartmentDragOver,
        handleSideCompartmentDrop,
        updateDragPreview
    } = plannerDragDrop;

    const getPlannerActions = () => plannerActions;
    const getPlannerDragDrop = () => plannerDragDrop;


    const plannerFileFlows = createPlannerFileFlows({
        state,
        loadRackInput,
        loadLibraryInput,
        setNotice,
        renderAll,
        syncActiveRackToCatalog: () => syncActiveRackToCatalog(),
        cloneRackComponent
    });

    rackCatalogHandlers = createRackCatalogHandlers({
        activeRackId,
        state,
        defaultRackHeightRU,
        rackNameInput,
        rackTagInput,
        rackHeightInput,
        rackDepthInput,
        rackWidthInput,
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
    });

    const handleExportDrawingPdf = createPdfExportHandler({
        state,
        rackFrameEl,
        renderRack: () => plannerUi.renderRack(),
        renderSideCompartments: () => plannerUi.renderSideCompartments(),
        renderSideView: () => plannerUi.renderSideView(),
        setNotice
    });

    plannerUi = createPlannerUi({
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
        documentBody: document.body,
        selectedComponentFields,
        selectedComponentColorPresetsEl,
        selectedEditorPanelEl,
        selectedEditorModeEl,
        selectedEditorFields: selectedComponentFields,
        selectedEditorColorPresetsEl: selectedComponentColorPresetsEl,
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
        rackPropertiesCollapseEl,
        rackPropertiesToggleButton,
        rackPropertiesToggleLabelEl,
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
        getHandleExportDrawingPdf: () => handleExportDrawingPdf,
        loadRackInput,
        loadLibraryInput,
        addLibraryComponentButton,
        saveRackPropertiesButton,
        addCustomSideLabelLeftButton,
        addCustomSideLabelRightButton,
        rackIdentityBarEl,
        openRackPropertiesEditor,
        handleSaveRackProperties,
        rebuildRackSlots
    });

    bindEvents();
    setActiveEditor("rack");
    initializeColorPicker();
    initializeSelectedEditorColorPalette();
    syncLibraryFormDisclosure();
    syncSideCompartmentFormDisclosure();
    syncRackPropertiesDisclosure();
    renderAll();
    loadRackFromCatalog();
}
