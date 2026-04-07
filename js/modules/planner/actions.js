export function createPlannerActions(context) {
    const {
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
        maximumRackHeightRU = 50,
        warningRackHeightRU = 47,
        setActiveEditor,
        renderAll,
        renderRack,
        renderSideCompartments,
        renderSideView,
        renderLibrary,
        renderSelectedEditorPanel,
        renderSelectedSideItemPanel,
        syncActiveRackToCatalog,
        setNotice
    } = context;

    function setFieldHint(inputId, hintId, message) {
        const inputEl = document.getElementById(inputId);
        const hintEl = document.getElementById(hintId);
        if (hintEl) {
            hintEl.textContent = message || "";
        }
        if (inputEl) {
            inputEl.classList.toggle("is-invalid", Boolean(message));
            if (message) {
                inputEl.addEventListener("input", function clearHint() {
                    if (hintEl) {
                        hintEl.textContent = "";
                    }
                    inputEl.classList.remove("is-invalid");
                }, { once: true });
            }
        }
    }

    function clearFormHints(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            return;
        }
        form.querySelectorAll(".field-hint").forEach(el => {
            el.textContent = "";
        });
        form.querySelectorAll("input.is-invalid").forEach(el => {
            el.classList.remove("is-invalid");
        });
    }
    function addComponentToRack(componentInput) {
        const component = cloneRackComponent(componentInput);
        if (!component.name) {
            setNotice("A component name is required.");
            return false;
        }
        const requestedPosition = componentInput.position != null ? Number(componentInput.position) : null;
        const resolvedPosition = requestedPosition || findFirstAvailablePosition(component.ru, component.face || state.currentView, component.depth);
        if (resolvedPosition == null) {
            setNotice("No vacant position fits that component height.");
            return false;
        }

        const placementAnalysis = getPlacementAnalysis(state, resolvedPosition, component.ru, null, component.face || state.currentView, component.depth);
        if (!resolvePlacementAttempt(state, component.name, placementAnalysis, { setNotice, confirmFn: window.confirm })) {
            return false;
        }

        component.face = component.face === "rear" ? "rear" : "front";
        component.position = resolvedPosition;
        state.rackComponents.push(component);
        state.selectedComponentId = component.id;
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        state.selectedSideItemId = null;
        state.dragPreview = null;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`${component.name} placed at ${getComponentRangeLabel(component)}.`);
        return true;
    }

    function addSideCompartmentItem(itemInput, side = "left", view = state.currentView) {
        const normalizedView = view === "rear" ? "rear" : "front";
        const normalizedSide = side === "right" ? "right" : "left";
        const nextItems = getSideCompartmentItems(normalizedView, normalizedSide);
        const sideItem = normalizeSideCompartmentItem({
            ...itemInput,
            view: normalizedView,
            side: normalizedSide,
            order: nextItems.length + 1
        }, normalizedView, normalizedSide, nextItems.length + 1);

        if (!sideItem.name) {
            setNotice("A side-item label is required.");
            return false;
        }

        nextItems.push(sideItem);
        state.selectedComponentId = null;
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        state.selectedSideItemId = sideItem.id;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`${sideItem.name} added to the ${normalizedView} ${normalizedSide} compartment.`);
        return true;
    }

    function removeRackComponent(componentId, requireConfirmation = true) {
        const component = state.rackComponents.find(entry => entry.id === componentId);
        if (!component) {
            return;
        }
        if (requireConfirmation) {
            const shouldDelete = window.confirm(`Delete ${component.name} at ${getComponentRangeLabel(component)}?`);
            if (!shouldDelete) {
                setNotice("Deletion canceled.");
                return;
            }
        }

        const nextComponents = state.rackComponents.filter(componentEntry => componentEntry.id !== componentId);

        if (nextComponents.length === state.rackComponents.length) {
            return;
        }

        state.rackComponents = nextComponents;
        if (state.selectedComponentId === componentId) {
            state.selectedComponentId = null;
        }
        renderAll();
        syncActiveRackToCatalog();
        setNotice("Component removed from rack.");
    }

    function removeSideCompartmentItem(sideItemId, requireConfirmation = true) {
        const selectedSideItem = getAllSideCompartmentItems().find(item => item.id === sideItemId);
        if (!selectedSideItem) {
            return;
        }

        if (requireConfirmation) {
            const confirmed = window.confirm(`Delete ${selectedSideItem.name} from the ${selectedSideItem.view} ${selectedSideItem.side} side compartment?`);
            if (!confirmed) {
                setNotice("Deletion canceled.");
                return;
            }
        }

        const items = getSideCompartmentItems(selectedSideItem.view, selectedSideItem.side);
        const nextItems = items.filter(item => item.id !== sideItemId);
        state.sideCompartmentItems[selectedSideItem.view][selectedSideItem.side] = nextItems;
        reorderSideCompartmentItems(selectedSideItem.view, selectedSideItem.side);

        if (state.selectedSideItemId === sideItemId) {
            state.selectedSideItemId = null;
        }

        renderAll();
        syncActiveRackToCatalog();
        setNotice("Side item removed.");
    }

    function handleSelectRackComponent(componentId) {
        const component = state.rackComponents.find(entry => entry.id === componentId);
        if (!component) {
            return;
        }
        setActiveEditor("component");
        state.selectedComponentId = componentId;
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        state.selectedSideItemId = null;
        renderRack();
        renderLibrary();
        renderSideCompartments();
        renderSideView();
        renderSelectedEditorPanel();
        renderSelectedSideItemPanel();
        setNotice(`Selected ${component.name} for editing.`);
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

    function handleSelectLibraryItem(categoryId, itemId) {
        const category = state.libraryCategories.find(entry => entry.id === categoryId);
        if (!category) {
            return;
        }

        const item = category.items.find(entry => entry.id === itemId);
        if (!item) {
            return;
        }

        setActiveEditor("library");
        category.expanded = true;
        state.selectedComponentId = null;
        state.selectedSideItemId = null;
        state.selectedLibraryCategoryId = categoryId;
        state.selectedLibraryItemId = itemId;
        renderRack();
        renderLibrary();
        renderSideCompartments();
        renderSideView();
        renderSelectedEditorPanel();
        renderSelectedSideItemPanel();
        setNotice(`Selected ${item.name} in the library for editing.`);
    }

    function handleSelectSideCompartmentItem(sideItemId) {
        const sideItem = getAllSideCompartmentItems().find(item => item.id === sideItemId);
        if (!sideItem) {
            return;
        }

        state.selectedComponentId = null;
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        state.selectedSideItemId = sideItemId;
        renderRack();
        renderLibrary();
        renderSideCompartments();
        renderSideView();
        renderSelectedEditorPanel();
        renderSelectedSideItemPanel();
        setNotice(`Selected ${sideItem.name} for editing.`);
    }

    function handleSaveSelectedComponent() {
        clearFormHints("selectedEditorForm");
        const selectedComponent = getSelectedRackComponent();
        if (!selectedComponent) {
            return;
        }

        const nextName = selectedComponentFields.name.value.trim();
        const nextRU = Number(selectedComponentFields.ru.value) || 1;
        const nextPosition = Number(selectedComponentFields.position.value) || 1;
        const nextDepth = Number(selectedComponentFields.depth.value) || 0;
        const nextPower = Number(selectedComponentFields.power.value) || 0;
        const nextDescription = selectedComponentFields.description.value.trim();
        const nextTypeClass = normalizeTypeClass(nextDescription || selectedComponent.typeClass);
        const nextColor = selectedComponentFields.color.value || null;
        const nextNotes = String(selectedComponentFields.notes.value || "").trim();

        if (!nextName) {
            setFieldHint("selectedComponentName", "hintSelectedName", "Name is required.");
            return;
        }

        const placementAnalysis = getPlacementAnalysis(state, nextPosition, nextRU, selectedComponent.id, selectedComponent.face || "front", nextDepth);
        if (placementAnalysis.isOutOfBounds) {
            setFieldHint("selectedComponentPosition", "hintSelectedPosition", "Exceeds rack height.");
            return;
        }

        if (placementAnalysis.exceedsRackDepth) {
            setFieldHint("selectedComponentDepth", "hintSelectedDepth", `Exceeds rack depth of ${state.rackProfile.rackDepthCm} cm.`);
            return;
        }

        if (placementAnalysis.hasSameFaceConflict) {
            setFieldHint("selectedComponentPosition", "hintSelectedPosition", "Overlaps another component on the same side.");
            return;
        }

        if (!resolvePlacementAttempt(state, nextName, placementAnalysis, { setNotice, confirmFn: window.confirm })) {
            return;
        }

        selectedComponent.name = nextName;
        selectedComponent.ru = nextRU;
        selectedComponent.position = nextPosition;
        selectedComponent.depth = nextDepth;
        selectedComponent.power = nextPower;
        selectedComponent.description = nextDescription;
        selectedComponent.typeClass = nextTypeClass;
        selectedComponent.customColor = nextColor;
        selectedComponent.notes = nextNotes;

        setActiveEditor("component");
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Updated ${selectedComponent.name}.`);
    }

    function clearSelectedComponent() {
        state.selectedComponentId = null;
        setActiveEditor("rack");
        renderRack();
        renderLibrary();
        renderSideCompartments();
        renderSideView();
        renderSelectedEditorPanel();
        setNotice("Selection cleared.");
    }

    function clearSelectedLibraryItem() {
        state.selectedLibraryCategoryId = null;
        state.selectedLibraryItemId = null;
        renderRack();
        renderLibrary();
        renderSelectedEditorPanel();
        setNotice("Library selection cleared.");
    }

    function handleSaveSelectedLibraryItem() {
        clearFormHints("selectedEditorForm");
        const selectedLibraryItem = getSelectedLibraryItem();
        if (!selectedLibraryItem) {
            return;
        }

        const nextName = selectedLibraryFields.name.value.trim();
        const nextRU = Math.max(1, Number(selectedLibraryFields.ru.value) || 1);
        const nextDescription = selectedLibraryFields.description.value.trim();
        const nextTypeClass = normalizeTypeClass(nextDescription || nextName);
        const nextDepth = Math.max(0, Number(selectedLibraryFields.depth.value) || 0);
        const nextPower = Math.max(0, Number(selectedLibraryFields.power.value) || 0);
        const nextColor = selectedLibraryFields.color.value || null;

        if (!nextName) {
            setFieldHint("selectedComponentName", "hintSelectedName", "Name is required.");
            return;
        }

        selectedLibraryItem.name = nextName;
        selectedLibraryItem.ru = nextRU;
        selectedLibraryItem.description = nextDescription;
        selectedLibraryItem.typeClass = nextTypeClass;
        selectedLibraryItem.defaultDepth = nextDepth;
        selectedLibraryItem.defaultPower = nextPower;
        selectedLibraryItem.customColor = nextColor;

        const linkedComponents = state.rackComponents.filter(component => component.sourceLibraryItemId === selectedLibraryItem.id);
        let constraintsSkipped = 0;

        linkedComponents.forEach(component => {
            component.name = nextName;
            component.description = nextDescription;
            component.typeClass = nextTypeClass;
            component.power = nextPower;
            component.customColor = nextColor;

            const placementAnalysis = getPlacementAnalysis(
                state,
                component.position,
                nextRU,
                component.id,
                component.face || "front",
                nextDepth
            );

            if (placementAnalysis.isOutOfBounds || placementAnalysis.exceedsRackDepth || placementAnalysis.hasSameFaceConflict) {
                constraintsSkipped += 1;
                return;
            }

            component.ru = nextRU;
            component.depth = nextDepth;
        });

        renderAll();
        syncActiveRackToCatalog();
        if (linkedComponents.length === 0) {
            setNotice(`Updated ${selectedLibraryItem.name} in the library.`);
            return;
        }

        if (constraintsSkipped > 0) {
            setNotice(`Updated ${selectedLibraryItem.name}. Propagated to ${linkedComponents.length - constraintsSkipped}/${linkedComponents.length} placed instances due to rack constraints.`, "warning");
            return;
        }

        setNotice(`Updated ${selectedLibraryItem.name} and propagated to ${linkedComponents.length} placed instances.`);
    }

    function handleDeleteSelectedComponent() {
        const selectedComponent = getSelectedRackComponent();
        if (!selectedComponent) {
            return;
        }
        removeRackComponent(selectedComponent.id, true);
    }

    function handleDeleteSelectedLibraryItem() {
        const selectedLibraryItem = getSelectedLibraryItem();
        if (!selectedLibraryItem) {
            return;
        }

        removeLibraryComponent(state.selectedLibraryCategoryId, selectedLibraryItem.id);
    }

    function handleSaveSelectedEditor() {
        if (getSelectedRackComponent()) {
            handleSaveSelectedComponent();
            return;
        }

        if (getSelectedLibraryItem()) {
            handleSaveSelectedLibraryItem();
        }
    }

    function clearSelectedEditor() {
        if (getSelectedRackComponent()) {
            clearSelectedComponent();
            return;
        }

        if (getSelectedLibraryItem()) {
            clearSelectedLibraryItem();
            return;
        }

        setNotice("Selection cleared.");
    }

    function handleDeleteSelectedEditor() {
        if (getSelectedRackComponent()) {
            handleDeleteSelectedComponent();
            return;
        }

        if (getSelectedLibraryItem()) {
            handleDeleteSelectedLibraryItem();
        }
    }

    function clearSelectedSideItem() {
        state.selectedSideItemId = null;
        renderSideCompartments();
        renderSelectedSideItemPanel();
        setNotice("Side-item selection cleared.");
    }

    function handleSaveSelectedSideItem() {
        const selectedSideItem = getSelectedSideCompartmentItem();
        if (!selectedSideItem) {
            return;
        }

        const nextName = selectedSideItemFields.name.value.trim();
        const nextSide = selectedSideItemFields.side.value === "right" ? "right" : "left";
        const nextColor = selectedSideItemFields.color.value || getDefaultSideItemColor(selectedSideItem.type);
        const nextNotes = String(selectedSideItemFields.notes.value || "").trim();

        if (!nextName) {
            setNotice("A side-item label is required.");
            return;
        }

        if (selectedSideItem.side !== nextSide) {
            const currentItems = getSideCompartmentItems(selectedSideItem.view, selectedSideItem.side);
            state.sideCompartmentItems[selectedSideItem.view][selectedSideItem.side] = currentItems.filter(item => item.id !== selectedSideItem.id);
            reorderSideCompartmentItems(selectedSideItem.view, selectedSideItem.side);

            selectedSideItem.side = nextSide;
            state.sideCompartmentItems[selectedSideItem.view][nextSide].push(selectedSideItem);
            reorderSideCompartmentItems(selectedSideItem.view, nextSide);
        }

        selectedSideItem.name = nextName;
        selectedSideItem.customColor = nextColor;
        selectedSideItem.notes = nextNotes;

        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Updated ${selectedSideItem.name}.`);
    }

    function handleDeleteSelectedSideItem() {
        const selectedSideItem = getSelectedSideCompartmentItem();
        if (!selectedSideItem) {
            return;
        }

        removeSideCompartmentItem(selectedSideItem.id, true);
    }

    function handleAddCustomSideLabel(side) {
        const name = customSideLabelNameInput.value.trim();
        const notes = String(customSideLabelNotesInput.value || "").trim();
        const customColor = customSideLabelColorInput.value || getDefaultSideItemColor("custom-label");

        if (!name) {
            setNotice("Enter a custom side label before adding it.");
            customSideLabelNameInput.focus();
            return;
        }

        const added = addSideCompartmentItem({
            type: "custom-label",
            name,
            notes,
            customColor
        }, side, state.currentView);

        if (!added) {
            return;
        }

        customSideLabelNameInput.value = "";
        customSideLabelNotesInput.value = "";
    }

    function removeLibraryComponent(categoryId, componentId) {
        state.libraryCategories = state.libraryCategories
            .map(category => {
                if (category.id !== categoryId) {
                    return category;
                }

                return {
                    ...category,
                    items: category.items.filter(item => item.id !== componentId)
                };
            })
            .filter(category => category.items.length > 0);

        const selectedCategory = state.libraryCategories.find(category => category.id === state.selectedLibraryCategoryId);
        const hasSelectedItem = selectedCategory
            ? selectedCategory.items.some(item => item.id === state.selectedLibraryItemId)
            : false;
        if (!hasSelectedItem) {
            state.selectedLibraryCategoryId = null;
            state.selectedLibraryItemId = null;
        }

        renderLibrary();
        renderSelectedEditorPanel();
        setNotice("Component removed from library.");
    }

    function handleAddLibraryComponent() {
        clearFormHints("libraryForm");
        const selectedCategoryId = libraryCategorySelect.value;
        const rawNewCategoryName = libraryNewCategoryNameInput.value.trim();
        let categoryName = "";

        if (selectedCategoryId === "__new__") {
            categoryName = rawNewCategoryName;
        } else {
            const selectedCategory = state.libraryCategories.find(entry => entry.id === selectedCategoryId);
            categoryName = selectedCategory ? selectedCategory.name : "";
        }

        const componentName = document.getElementById("libraryComponentName").value.trim();
        const ru = Number(document.getElementById("libraryComponentHeight").value) || 1;
        const description = document.getElementById("libraryComponentClass").value.trim();
        const typeClass = normalizeTypeClass(description || componentName);
        const defaultDepth = Number(document.getElementById("libraryComponentDepth").value) || 0;
        const defaultPower = Number(document.getElementById("libraryComponentPower").value) || 0;
        const customColor = document.getElementById("customColorInput")?.value || null;

        if (!categoryName) {
            setFieldHint("libraryNewCategoryName", "hintLibraryCategory", "Select a category or enter a new category name.");
            return;
        }

        if (!componentName) {
            setFieldHint("libraryComponentName", "hintLibraryName", "Name is required.");
            return;
        }

        let category = state.libraryCategories.find(entry => entry.name.toLowerCase() === categoryName.toLowerCase());

        if (!category) {
            category = {
                id: createId("category"),
                name: categoryName,
                expanded: true,
                items: []
            };
            state.libraryCategories.push(category);
        }

        category.items.push({
            id: createId("library"),
            name: componentName,
            ru,
            typeClass,
            description,
            defaultDepth,
            defaultPower,
            customColor
        });
        category.expanded = true;
        renderLibrary();
        setNotice(`${componentName} added to ${category.name}.`);

        libraryCategorySelect.value = category.id;
        libraryNewCategoryNameInput.value = "";
        libraryNewCategoryNameInput.disabled = true;
        document.getElementById("libraryComponentName").value = "";
        document.getElementById("libraryComponentClass").value = "";
    }

    function handleIncreaseRackHeight() {
        if (state.rackHeightRU >= maximumRackHeightRU) {
            setNotice(`Rack height cannot exceed ${maximumRackHeightRU} RU.`);
            return;
        }

        state.rackHeightRU += rackUnitHeightRU;
        renderAll();
        syncActiveRackToCatalog();

        if (state.rackHeightRU > warningRackHeightRU) {
            setNotice(`Rack height increased to ${state.rackHeightRU} RU. Heights above ${warningRackHeightRU} RU should be reviewed carefully.`, "warning");
            return;
        }

        setNotice(`Rack height increased to ${state.rackHeightRU} RU.`);
    }

    function handleDecreaseRackHeight() {
        const nextHeight = state.rackHeightRU - rackUnitHeightRU;
        if (nextHeight < getHighestOccupiedRU(state.rackComponents)) {
            setNotice("Cannot reduce rack height below the highest occupied U position.");
            return;
        }

        if (nextHeight < 1) {
            setNotice("Rack height must remain at least 1 RU.");
            return;
        }

        state.rackHeightRU = nextHeight;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`Rack height reduced to ${state.rackHeightRU} RU.`);
    }

    function handleToggleView() {
        state.currentView = state.currentView === "front" ? "rear" : "front";
        if (getSelectedSideCompartmentItem()?.view !== state.currentView) {
            state.selectedSideItemId = null;
        }
        renderRack();
        renderSideCompartments();
        renderSideView();
        renderSelectedSideItemPanel();
        renderStatus();
        syncActiveRackToCatalog();
    }

    const renderStatus = context.renderStatus;

    return {
        addComponentToRack,
        addSideCompartmentItem,
        clearSelectedComponent,
        clearSelectedEditor,
        clearSelectedSideItem,
        handleAddCustomSideLabel,
        handleAddLibraryComponent,
        handleDecreaseRackHeight,
        handleDeleteSelectedComponent,
        handleDeleteSelectedEditor,
        handleDeleteSelectedSideItem,
        handleIncreaseRackHeight,
        handleSaveSelectedEditor,
        handleSaveSelectedLibraryItem,
        handleSaveSelectedComponent,
        handleSaveSelectedSideItem,
        handleSelectLibraryItem,
        handleSelectRackComponent,
        handleSelectSideCompartmentItem,
        handleToggleView,
        clearSelectedLibraryItem,
        removeLibraryComponent,
        removeRackComponent,
        removeSideCompartmentItem
    };
}