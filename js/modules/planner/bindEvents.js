export function bindPlannerEvents(context) {
    const {
        state,
        libraryFormToggleButton,
        sideCompartmentFormToggleButton,
        addLibraryComponentButton,
        saveRackPropertiesButton,
        saveSelectedComponentButton,
        deleteSelectedComponentButton,
        clearSelectionButton,
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
        handleExportDrawingPdf,
        plannerActions,
        plannerDragDrop,
        openRackPropertiesEditor,
        handleSaveRackProperties
    } = context;

    libraryFormToggleButton.addEventListener("click", () => {
        state.libraryFormExpanded = !state.libraryFormExpanded;
        syncLibraryFormDisclosure();
    });
    sideCompartmentFormToggleButton.addEventListener("click", () => {
        state.sideCompartmentFormExpanded = !state.sideCompartmentFormExpanded;
        syncSideCompartmentFormDisclosure();
    });
    addLibraryComponentButton.addEventListener("click", plannerActions.handleAddLibraryComponent);
    saveRackPropertiesButton.addEventListener("click", handleSaveRackProperties);
    saveSelectedComponentButton.addEventListener("click", plannerActions.handleSaveSelectedComponent);
    deleteSelectedComponentButton.addEventListener("click", plannerActions.handleDeleteSelectedComponent);
    clearSelectionButton.addEventListener("click", plannerActions.clearSelectedComponent);
    saveSelectedSideItemButton.addEventListener("click", plannerActions.handleSaveSelectedSideItem);
    deleteSelectedSideItemButton.addEventListener("click", plannerActions.handleDeleteSelectedSideItem);
    clearSideItemSelectionButton.addEventListener("click", plannerActions.clearSelectedSideItem);
    addCustomSideLabelLeftButton.addEventListener("click", () => plannerActions.handleAddCustomSideLabel("left"));
    addCustomSideLabelRightButton.addEventListener("click", () => plannerActions.handleAddCustomSideLabel("right"));
    document.getElementById("increaseHeight").addEventListener("click", plannerActions.handleIncreaseRackHeight);
    document.getElementById("decreaseHeight").addEventListener("click", plannerActions.handleDecreaseRackHeight);
    toggleViewButton.addEventListener("click", plannerActions.handleToggleView);
    document.getElementById("saveRackButton").addEventListener("click", plannerFileFlows.saveRackToFile);
    document.getElementById("saveLibraryButton").addEventListener("click", plannerFileFlows.saveLibraryToFile);
    document.getElementById("exportDrawingButton").addEventListener("click", handleExportDrawingPdf);
    document.getElementById("loadRackButton").addEventListener("click", plannerFileFlows.promptLoadRackFile);
    document.getElementById("loadLibraryButton").addEventListener("click", plannerFileFlows.promptLoadLibraryFile);
    loadRackInput.addEventListener("change", plannerFileFlows.handleRackInputChange);
    loadLibraryInput.addEventListener("change", plannerFileFlows.handleLibraryInputChange);
    libraryCategorySelect.addEventListener("change", () => {
        const useNewCategory = libraryCategorySelect.value === "__new__";
        libraryNewCategoryNameInput.disabled = !useNewCategory;
        if (!useNewCategory) {
            libraryNewCategoryNameInput.value = "";
        }
    });

    rackIdentityBarEl.addEventListener("click", openRackPropertiesEditor);
    rackInfoEl.addEventListener("click", openRackPropertiesEditor);

    rackEl.addEventListener("dragover", plannerDragDrop.updateDragPreview);
    rackEl.addEventListener("drop", plannerDragDrop.handleRackDrop);
    rackEl.addEventListener("dragleave", event => {
        if (event.relatedTarget && rackEl.contains(event.relatedTarget)) {
            return;
        }
        plannerDragDrop.clearDragPreview();
    });
    rackEl.addEventListener("click", event => {
        const componentEl = event.target.closest(".rack-component");
        if (!componentEl) {
            return;
        }
        plannerActions.handleSelectRackComponent(componentEl.dataset.componentId);
    });

    [sideCompartmentLeftEl, sideCompartmentRightEl].forEach(element => {
        element.addEventListener("dragover", plannerDragDrop.handleSideCompartmentDragOver);
        element.addEventListener("drop", plannerDragDrop.handleSideCompartmentDrop);
        element.addEventListener("dragleave", plannerDragDrop.handleSideCompartmentDragLeave);
        element.addEventListener("click", event => {
            const sideItemEl = event.target.closest(".rack-side-item");
            if (!sideItemEl) {
                return;
            }

            plannerActions.handleSelectSideCompartmentItem(sideItemEl.dataset.sideItemId);
        });
    });

    if (sideViewEl) {
        sideViewEl.addEventListener("click", event => {
            const componentEl = event.target.closest(".rack-side-component");
            if (!componentEl) {
                return;
            }

            plannerActions.handleSelectRackComponent(componentEl.dataset.componentId);
        });
    }
}