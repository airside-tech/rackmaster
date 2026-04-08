export function createPlannerDragDrop(context) {
    const {
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
        addSideCompartmentItem,
        clientYToRackPosition,
        isRackPositionAvailable,
        getPlacementAnalysis,
        resolvePlacementAttempt,
        getComponentRangeLabel,
        addComponentToRack,
        renderRack,
        renderAll,
        syncActiveRackToCatalog,
        setNotice,
        canMutate = () => true
    } = context;

    function ensureCanMutate() {
        if (canMutate()) {
            return true;
        }
        setNotice("Rack is read-only because lock is held by another user.", "warning");
        return false;
    }

    function handleLibraryDragStart(event) {
        if (!ensureCanMutate()) {
            return;
        }
        setActiveDragSource("library");
        const componentData = event.currentTarget.dataset.component;
        event.dataTransfer.setData("application/json", JSON.stringify({
            source: "library",
            component: JSON.parse(componentData)
        }));
        event.dataTransfer.effectAllowed = "copy";
    }

    function handleSideCompartmentDragOver(event) {
        if (!isSideCompartmentDragSourceActive()) {
            return;
        }

        event.preventDefault();
        const compartmentEl = event.currentTarget;
        clearSideCompartmentDropTargets();
        compartmentEl.classList.add("is-drop-target");
        event.dataTransfer.dropEffect = state.activeDragSource === "side-compartment" ? "move" : "copy";
    }

    function handleSideCompartmentDrop(event) {
        if (!ensureCanMutate()) {
            clearSideCompartmentDropTargets();
            clearActiveDragSource();
            return;
        }
        event.preventDefault();
        const payload = parseDraggedPayload(event);
        const targetSide = event.currentTarget.dataset.side === "right" ? "right" : "left";

        clearSideCompartmentDropTargets();
        clearActiveDragSource();

        if (!payload) {
            return;
        }

        if (payload.source === "side-library") {
            const sideItem = payload.sideItem;
            if (!sideItem) {
                return;
            }

            addSideCompartmentItem({
                type: sideItem.type,
                name: sideItem.name,
                notes: "",
                customColor: sideItem.color || getDefaultSideItemColor(sideItem.type)
            }, targetSide, state.currentView);
            return;
        }

        if (payload.source !== "side-compartment") {
            return;
        }

        const sideItem = getAllSideCompartmentItems().find(item => item.id === payload.sideItemId);
        if (!sideItem) {
            return;
        }

        if (sideItem.view !== state.currentView || sideItem.side !== targetSide) {
            const sourceItems = getSideCompartmentItems(sideItem.view, sideItem.side).filter(item => item.id !== sideItem.id);
            state.sideCompartmentItems[sideItem.view][sideItem.side] = sourceItems;
            reorderSideCompartmentItems(sideItem.view, sideItem.side);

            sideItem.view = state.currentView;
            sideItem.side = targetSide;
            state.sideCompartmentItems[state.currentView][targetSide].push(sideItem);
            reorderSideCompartmentItems(state.currentView, targetSide);
        }

        state.selectedSideItemId = sideItem.id;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`${sideItem.name} moved to the ${state.currentView} ${targetSide} compartment.`);
    }

    function handleSideCompartmentDragLeave(event) {
        if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
            return;
        }
        event.currentTarget.classList.remove("is-drop-target");
    }

    function handleRackComponentDragStart(event) {
        if (!ensureCanMutate()) {
            return;
        }
        setActiveDragSource("rack");
        const componentEl = event.currentTarget;
        const componentId = componentEl.dataset.componentId;
        const componentRU = Number(componentEl.dataset.ru) || 1;

        event.dataTransfer.setData("application/json", JSON.stringify({
            source: "rack",
            componentId,
            ru: componentRU
        }));
        event.dataTransfer.effectAllowed = "move";
    }

    function updateDragPreview(event) {
        event.preventDefault();
        const payload = parseDraggedPayload(event);
        if (!payload || (payload.source !== "rack" && payload.source !== "library")) {
            if (state.dragPreview !== null) {
                state.dragPreview = null;
                renderRack();
            }
            return;
        }

        let ru = 1;
        let ignoreComponentId = null;
        let movingComponent = null;

        if (payload.source === "rack") {
            movingComponent = state.rackComponents.find(component => component.id === payload.componentId);
            if (!movingComponent) {
                return;
            }
            ru = movingComponent.ru;
            ignoreComponentId = movingComponent.id;
        } else {
            ru = Number(payload.component?.ru) || 1;
        }

        const position = clientYToRackPosition(event.clientY, ru);
        const valid = isRackPositionAvailable(
            position,
            ru,
            ignoreComponentId,
            payload.source === "rack" ? movingComponent.face || state.currentView : state.currentView,
            payload.source === "rack" ? movingComponent.depth : Number(payload.component?.defaultDepth) || 0
        );
        const prev = state.dragPreview;

        if (!prev || prev.position !== position || prev.valid !== valid || prev.ru !== ru || prev.componentId !== ignoreComponentId) {
            state.dragPreview = { position, ru, valid, componentId: ignoreComponentId };
            renderRack();
        }
    }

    function handleRackDrop(event) {
        if (!ensureCanMutate()) {
            state.dragPreview = null;
            renderRack();
            return;
        }
        event.preventDefault();
        const payload = parseDraggedPayload(event);
        state.dragPreview = null;

        if (!payload) {
            renderRack();
            return;
        }

        if (payload.source !== "rack" && payload.source !== "library") {
            renderRack();
            return;
        }

        if (payload.source === "rack") {
            const movingComponent = state.rackComponents.find(component => component.id === payload.componentId);
            if (!movingComponent) {
                renderRack();
                return;
            }

            const position = clientYToRackPosition(event.clientY, movingComponent.ru);
            if (position === movingComponent.position) {
                renderRack();
                return;
            }

            const placementAnalysis = getPlacementAnalysis(state, position, movingComponent.ru, movingComponent.id, movingComponent.face || state.currentView, movingComponent.depth);
            if (!resolvePlacementAttempt(state, movingComponent.name, placementAnalysis, { setNotice, confirmFn: window.confirm })) {
                renderRack();
                return;
            }

            movingComponent.position = position;
            state.selectedComponentId = movingComponent.id;
            state.selectedSideItemId = null;
            renderAll();
            syncActiveRackToCatalog();
            setNotice(`${movingComponent.name} moved to ${getComponentRangeLabel(movingComponent)}.`);
            return;
        }

        const draggedComponent = payload.component;
        if (!draggedComponent) {
            renderRack();
            return;
        }

        const position = clientYToRackPosition(event.clientY, Number(draggedComponent.ru) || 1);
        const placed = addComponentToRack({
            name: draggedComponent.name,
            ru: Number(draggedComponent.ru) || 1,
            position,
            face: state.currentView,
            typeClass: draggedComponent.typeClass,
            description: draggedComponent.description || "",
            depth: Number(draggedComponent.defaultDepth) || 0,
            power: Number(draggedComponent.defaultPower) || 0,
            customColor: draggedComponent.customColor || null,
            sourceLibraryItemId: draggedComponent.id || null
        });

        if (!placed) {
            renderRack();
        }
    }

    function clearDragPreview() {
        state.dragPreview = null;
        clearActiveDragSource();
        renderRack();
    }

    return {
        clearDragPreview,
        handleLibraryDragStart,
        handleRackComponentDragStart,
        handleRackDrop,
        handleSideCompartmentDragLeave,
        handleSideCompartmentDragOver,
        handleSideCompartmentDrop,
        updateDragPreview
    };
}