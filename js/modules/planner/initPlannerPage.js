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
    const addLibraryComponentButton = document.getElementById("addLibraryComponent");
    const saveSelectedComponentButton = document.getElementById("saveSelectedComponent");
    const deleteSelectedComponentButton = document.getElementById("deleteSelectedComponent");
    const clearSelectionButton = document.getElementById("clearSelection");
    const selectedComponentInfoEl = document.getElementById("selectedComponentInfo");
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

    if (!rackFrameEl || !rackEl || !accordionEl || !rackInfoEl || !plannerNoticeEl || !viewLegendEl || !rackIdentityBarEl || !rackNameTagEl || !viewModeBadgeEl || !rackSideLabelFrontEl || !rackSideLabelRearEl || !sideCompartmentLeftEl || !sideCompartmentRightEl || !sideCompartmentLibraryEl || !rackPropertiesPanelEl || !rackPropertiesInfoEl || !rackNameInput || !rackTagInput || !rackHeightInput || !rackDepthInput || !rackRoomInput || !rackOwnerInput || !rackClearanceInput || !rackNotesInput || !saveRackPropertiesButton || !toggleViewButton || !libraryFormToggleButton || !libraryFormToggleLabelEl || !libraryFormCollapseEl || !sideCompartmentFormToggleButton || !sideCompartmentFormToggleLabelEl || !sideCompartmentFormCollapseEl || !addLibraryComponentButton || !saveSelectedComponentButton || !deleteSelectedComponentButton || !clearSelectionButton || !selectedComponentInfoEl || !selectedSideItemInfoEl || !saveSelectedSideItemButton || !deleteSelectedSideItemButton || !clearSideItemSelectionButton || !loadRackInput || !loadLibraryInput || !libraryCategorySelect || !libraryNewCategoryNameInput || !customSideLabelNameInput || !customSideLabelNotesInput || !customSideLabelColorInput || !addCustomSideLabelLeftButton || !addCustomSideLabelRightButton) {
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
    const renderSelectedComponentPanel = () => plannerUi.renderSelectedComponentPanel();
    const renderSelectedSideItemPanel = () => plannerUi.renderSelectedSideItemPanel();
    const renderSideCompartments = () => plannerUi.renderSideCompartments();
    const renderSideView = () => plannerUi.renderSideView();
    const renderStatus = () => plannerUi.renderStatus();
    const syncLibraryFormDisclosure = () => plannerUi.syncLibraryFormDisclosure();
    const syncSideCompartmentFormDisclosure = () => plannerUi.syncSideCompartmentFormDisclosure();
    const bindEvents = () => plannerUi.bindEvents();
    const initializeColorPicker = () => plannerUi.initializeColorPicker();
    const initializeSelectedComponentColorPalette = () => plannerUi.initializeSelectedComponentColorPalette();

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

    const plannerActions = createPlannerActions({
        state,
        rackUnitHeightRU,
        selectedComponentFields,
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
        renderSelectedComponentPanel,
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
        handleDeleteSelectedComponent,
        handleDeleteSelectedSideItem,
        handleIncreaseRackHeight,
        handleSaveSelectedComponent,
        handleSaveSelectedSideItem,
        handleSelectRackComponent,
        handleSelectSideCompartmentItem,
        handleToggleView,
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
        renderLibrary,
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
        sideViewEl,
        documentBody: document.body,
        selectedComponentFields,
        selectedComponentColorPresetsEl,
        selectedComponentInfoEl,
        saveSelectedComponentButton,
        deleteSelectedComponentButton,
        clearSelectionButton,
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
    initializeSelectedComponentColorPalette();
    syncLibraryFormDisclosure();
    syncSideCompartmentFormDisclosure();
    renderAll();
    loadRackFromCatalog();
}
