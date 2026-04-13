export function createPlannerDragDrop(context) {
    const {
        state,
        rackFrameEl,
        sideCompartmentLeftEl,
        sideCompartmentRightEl,
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
        clientYToSideCompartmentPosition,
        clientYToRackPosition,
        isRackPositionAvailable,
        getPlacementAnalysis,
        resolvePlacementAttempt,
        getComponentRangeLabel,
        addComponentToRack,
        rackEl,
        renderRack,
        renderAll,
        syncActiveRackToCatalog,
        setNotice,
        canMutate = () => true
    } = context;

    let pendingLibrarySideDrop = false;
    let librarySideDropSucceeded = false;
    let pendingLibrarySideComponent = null;
    let lastHoveredSideLane = null;
    let lastHoveredSidePosition = null;

    function ensureCanMutate() {
        if (canMutate()) {
            return true;
        }
        setNotice("Rack is read-only because lock is held by another user.", "warning");
        return false;
    }

    function shouldHandleSideDrag() {
        if (state.activeDragSource === "side-compartment" || state.activeDragSource === "side-library") {
            return true;
        }

        if (state.activeDragSource === "library") {
            return pendingLibrarySideDrop;
        }

        return false;
    }

    function getSideCompartmentElementFromPoint(clientX, clientY) {
        function isWithinRect(rect, x, y, padding = 0) {
            return x >= (rect.left - padding)
                && x <= (rect.right + padding)
                && y >= (rect.top - padding)
                && y <= (rect.bottom + padding);
        }

        if (typeof clientX === "number" && typeof clientY === "number") {
            const elementAtPoint = document.elementFromPoint(clientX, clientY);
            const compartmentAtPoint = elementAtPoint?.closest?.(".rack-side-compartment");
            if (compartmentAtPoint) {
                return compartmentAtPoint;
            }

            const sideCompartments = [sideCompartmentLeftEl, sideCompartmentRightEl].filter(Boolean);
            const sideHitPaddingPx = 10;
            for (const compartmentEl of sideCompartments) {
                const rect = compartmentEl.getBoundingClientRect();
                if (isWithinRect(rect, clientX, clientY, sideHitPaddingPx)) {
                    return compartmentEl;
                }
            }

            if (rackFrameEl) {
                const frameRect = rackFrameEl.getBoundingClientRect();
                if (isWithinRect(frameRect, clientX, clientY, 0) && sideCompartments.length === 2) {
                    const [leftLane, rightLane] = sideCompartments;
                    const leftRect = leftLane.getBoundingClientRect();
                    const rightRect = rightLane.getBoundingClientRect();
                    const leftCenterX = (leftRect.left + leftRect.right) / 2;
                    const rightCenterX = (rightRect.left + rightRect.right) / 2;
                    const distanceToLeft = Math.abs(clientX - leftCenterX);
                    const distanceToRight = Math.abs(clientX - rightCenterX);
                    return distanceToRight < distanceToLeft ? rightLane : leftLane;
                }
            }
        }

        return null;
    }

    function getActiveHighlightedSideLane() {
        if (sideCompartmentRightEl?.classList.contains("is-drop-target")) {
            return "right";
        }

        if (sideCompartmentLeftEl?.classList.contains("is-drop-target")) {
            return "left";
        }

        return null;
    }

    function resolveSideCompartmentElement(event) {
        const pointTarget = getSideCompartmentElementFromPoint(event.clientX, event.clientY);
        if (pointTarget) {
            return pointTarget;
        }

        const targetElement = event.target instanceof Element ? event.target.closest(".rack-side-compartment") : null;
        if (targetElement) {
            return targetElement;
        }
        return event.currentTarget instanceof Element && event.currentTarget.classList.contains("rack-side-compartment")
            ? event.currentTarget
            : null;
    }

    function handleLibraryDragStart(event) {
        if (!ensureCanMutate()) {
            return;
        }
        setActiveDragSource("library");
        const componentData = event.currentTarget.dataset.component;
        const parsedComponent = JSON.parse(componentData);
        pendingLibrarySideDrop = isLibrarySideCompartmentComponent(parsedComponent);
        librarySideDropSucceeded = false;
        pendingLibrarySideComponent = pendingLibrarySideDrop ? parsedComponent : null;
        document.body.classList.toggle("is-side-dragging", pendingLibrarySideDrop);
        lastHoveredSideLane = null;
        lastHoveredSidePosition = null;
        event.dataTransfer.setData("application/json", JSON.stringify({
            source: "library",
            component: parsedComponent
        }));
        event.dataTransfer.setData("text/plain", parsedComponent.name || "library-item");
        event.dataTransfer.effectAllowed = "all";
    }

    function handleLibraryDragEnd() {
        clearActiveDragSource();
        document.body.classList.remove("is-side-dragging");

        if (!pendingLibrarySideDrop) {
            pendingLibrarySideComponent = null;
            lastHoveredSideLane = null;
            lastHoveredSidePosition = null;
            return;
        }

        if (!librarySideDropSucceeded && pendingLibrarySideComponent && lastHoveredSideLane) {
            const sideComponent = pendingLibrarySideComponent;
            const sideRU = Math.max(1, Math.min(Math.floor(Number(sideComponent.ru) || 1), state.rackHeightRU));
            const preferredLane = getActiveHighlightedSideLane() || lastHoveredSideLane;
            const maxStartPosition = Math.max(1, state.rackHeightRU - sideRU + 1);
            const sidePosition = Math.max(1, Math.min(Number(lastHoveredSidePosition) || maxStartPosition, maxStartPosition));

            const added = addSideCompartmentItem({
                type: sideComponent.sideItemType || "custom-label",
                name: sideComponent.name,
                ru: sideRU,
                position: sidePosition,
                notes: "",
                customColor: sideComponent.customColor || getDefaultSideItemColor(sideComponent.sideItemType)
            }, preferredLane, state.currentView);

            librarySideDropSucceeded = Boolean(added);
        }

        if (!librarySideDropSucceeded) {
            setNotice("Could not place side component. Drop it fully inside the left or right side compartment lane.", "warning");
        }

        pendingLibrarySideDrop = false;
        librarySideDropSucceeded = false;
        pendingLibrarySideComponent = null;
        lastHoveredSideLane = null;
        lastHoveredSidePosition = null;
    }

    function handleSideCompartmentDragOver(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }

        event.preventDefault();
        const compartmentEl = resolveSideCompartmentElement(event);
        if (!compartmentEl) {
            clearSideCompartmentDropTargets();
            return;
        }
        clearSideCompartmentDropTargets();
        compartmentEl.classList.add("is-drop-target");

        if (pendingLibrarySideDrop && pendingLibrarySideComponent) {
            const sideRU = Math.max(1, Math.min(Math.floor(Number(pendingLibrarySideComponent.ru) || 1), state.rackHeightRU));
            lastHoveredSideLane = compartmentEl.dataset.side === "right" ? "right" : "left";
            lastHoveredSidePosition = clientYToSideCompartmentPosition(event.clientY, compartmentEl, sideRU);
        }

        event.dataTransfer.dropEffect = "move";
        event.stopPropagation();
    }

    function handleSideCompartmentDragEnter(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }

        event.preventDefault();
        const compartmentEl = resolveSideCompartmentElement(event);
        if (!compartmentEl) {
            return;
        }

        clearSideCompartmentDropTargets();
        compartmentEl.classList.add("is-drop-target");
        event.dataTransfer.dropEffect = "move";
    }

    function handleGlobalDragOver(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        const sideLaneAtPoint = getSideCompartmentElementFromPoint(event.clientX, event.clientY);
        if (!sideLaneAtPoint) {
            clearSideCompartmentDropTargets();
            return;
        }

        event.preventDefault();
        clearSideCompartmentDropTargets();
        sideLaneAtPoint.classList.add("is-drop-target");

        if (pendingLibrarySideDrop && pendingLibrarySideComponent) {
            const sideRU = Math.max(1, Math.min(Math.floor(Number(pendingLibrarySideComponent.ru) || 1), state.rackHeightRU));
            lastHoveredSideLane = sideLaneAtPoint.dataset.side === "right" ? "right" : "left";
            lastHoveredSidePosition = clientYToSideCompartmentPosition(event.clientY, sideLaneAtPoint, sideRU);
        }

        event.dataTransfer.dropEffect = "move";
    }

    function handleGlobalDragEnter(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        const sideLaneAtPoint = getSideCompartmentElementFromPoint(event.clientX, event.clientY);
        if (!sideLaneAtPoint) {
            return;
        }

        clearSideCompartmentDropTargets();
        sideLaneAtPoint.classList.add("is-drop-target");

        if (pendingLibrarySideDrop && pendingLibrarySideComponent) {
            const sideRU = Math.max(1, Math.min(Math.floor(Number(pendingLibrarySideComponent.ru) || 1), state.rackHeightRU));
            lastHoveredSideLane = sideLaneAtPoint.dataset.side === "right" ? "right" : "left";
            lastHoveredSidePosition = clientYToSideCompartmentPosition(event.clientY, sideLaneAtPoint, sideRU);
        }
    }

    function isLibrarySideCompartmentComponent(component) {
        if (!component || typeof component !== "object") {
            return false;
        }

        return Boolean(
            component.isSideCompartment
            || component.typeClass === "side-compartment-component"
        );
    }

    function hasSideCompartmentOverlap(view, side, position, ru, ignoreSideItemId = null) {
        const nextStart = Number(position) || 1;
        const nextEnd = nextStart + (Math.max(1, Number(ru) || 1) - 1);
        const items = getSideCompartmentItems(view, side);

        return items.some(item => {
            if (ignoreSideItemId && item.id === ignoreSideItemId) {
                return false;
            }

            const itemStart = Number(item.position) || 1;
            const itemEnd = itemStart + (Math.max(1, Number(item.ru) || 1) - 1);
            return nextStart <= itemEnd && itemStart <= nextEnd;
        });
    }

    function handleSideCompartmentDrop(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }
        if (!ensureCanMutate()) {
            clearSideCompartmentDropTargets();
            clearActiveDragSource();
            return;
        }
        event.preventDefault();
        const compartmentEl = resolveSideCompartmentElement(event);
        if (!compartmentEl) {
            clearSideCompartmentDropTargets();
            clearActiveDragSource();
            setNotice("Drop target was not recognized as a left/right side compartment. Try dropping fully inside the side lane.", "warning");
            return;
        }
        const payload = parseDraggedPayload(event);
        const targetSide = compartmentEl.dataset.side === "right" ? "right" : "left";

        clearSideCompartmentDropTargets();
        clearActiveDragSource();
        event.stopPropagation();

        if (!payload) {
            setNotice("Could not read dragged data for side placement. Try dragging the item again.", "warning");
            return;
        }

        if (payload.source === "library") {
            const sideComponent = payload.component;
            if (!sideComponent) {
                pendingLibrarySideDrop = false;
                setNotice("Dragged library item data is missing.", "warning");
                return;
            }

            if (!isLibrarySideCompartmentComponent(sideComponent)) {
                pendingLibrarySideDrop = false;
                setNotice("Only side compartment components can be dropped into side compartments.", "warning");
                return;
            }

            const sideRU = Math.max(1, Math.min(Math.floor(Number(sideComponent.ru) || 1), state.rackHeightRU));
            const sidePosition = clientYToSideCompartmentPosition(event.clientY, compartmentEl, sideRU);

            const added = addSideCompartmentItem({
                type: sideComponent.sideItemType || "custom-label",
                name: sideComponent.name,
                ru: sideRU,
                position: sidePosition,
                notes: "",
                customColor: sideComponent.customColor || getDefaultSideItemColor(sideComponent.sideItemType)
            }, targetSide, state.currentView);

            librarySideDropSucceeded = Boolean(added);
            pendingLibrarySideDrop = false;
            pendingLibrarySideComponent = null;
            lastHoveredSideLane = null;
            lastHoveredSidePosition = null;
            return;
        }

        if (payload.source === "side-library" && payload.sideItem) {
            const sideItemSeed = payload.sideItem;
            const sideRU = Math.max(1, Math.min(Math.floor(Number(sideItemSeed.ru) || 1), state.rackHeightRU));
            const sidePosition = clientYToSideCompartmentPosition(event.clientY, compartmentEl, sideRU);

            addSideCompartmentItem({
                type: sideItemSeed.type || "custom-label",
                name: sideItemSeed.name || "Side Item",
                ru: sideRU,
                position: sidePosition,
                notes: sideItemSeed.description || "",
                customColor: sideItemSeed.color || getDefaultSideItemColor(sideItemSeed.type)
            }, targetSide, state.currentView);
            return;
        }

        if (payload.source !== "side-compartment") {
            pendingLibrarySideDrop = false;
            setNotice("That item type cannot be placed in the side compartment.", "warning");
            return;
        }

        const sideItem = getAllSideCompartmentItems().find(item => item.id === payload.sideItemId);
        if (!sideItem) {
            setNotice("Could not find the side item you are trying to move. Try selecting and dragging it again.", "warning");
            return;
        }

        const sideRU = Math.max(1, Math.min(Math.floor(Number(sideItem.ru) || 1), state.rackHeightRU));
        const sidePosition = clientYToSideCompartmentPosition(event.clientY, compartmentEl, sideRU);

        if (hasSideCompartmentOverlap(state.currentView, targetSide, sidePosition, sideRU, sideItem.id)) {
            setNotice(`Cannot move ${sideItem.name} to U${sidePosition}: overlaps another side item in the ${state.currentView} ${targetSide} compartment.`, "warning");
            return;
        }

        sideItem.ru = sideRU;
        sideItem.position = sidePosition;

        if (sideItem.view !== state.currentView || sideItem.side !== targetSide) {
            const sourceItems = getSideCompartmentItems(sideItem.view, sideItem.side).filter(item => item.id !== sideItem.id);
            state.sideCompartmentItems[sideItem.view][sideItem.side] = sourceItems;
            reorderSideCompartmentItems(sideItem.view, sideItem.side);

            sideItem.view = state.currentView;
            sideItem.side = targetSide;
            state.sideCompartmentItems[state.currentView][targetSide].push(sideItem);
            reorderSideCompartmentItems(state.currentView, targetSide);
        }

        reorderSideCompartmentItems(state.currentView, targetSide);

        state.selectedSideItemId = sideItem.id;
        renderAll();
        syncActiveRackToCatalog();
        setNotice(`${sideItem.name} moved to U${sideItem.position} in the ${state.currentView} ${targetSide} compartment.`);
    }

    function handleSideCompartmentDragLeave(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }
        const nextCompartment = getSideCompartmentElementFromPoint(event.clientX, event.clientY);
        if (nextCompartment) {
            clearSideCompartmentDropTargets();
            nextCompartment.classList.add("is-drop-target");
            if (pendingLibrarySideDrop && pendingLibrarySideComponent) {
                const sideRU = Math.max(1, Math.min(Math.floor(Number(pendingLibrarySideComponent.ru) || 1), state.rackHeightRU));
                lastHoveredSideLane = nextCompartment.dataset.side === "right" ? "right" : "left";
                lastHoveredSidePosition = clientYToSideCompartmentPosition(event.clientY, nextCompartment, sideRU);
            }
            return;
        }

        const compartmentEl = resolveSideCompartmentElement(event);
        if (!compartmentEl) {
            clearSideCompartmentDropTargets();
            return;
        }

        const relatedCompartment = event.relatedTarget instanceof Element
            ? event.relatedTarget.closest(".rack-side-compartment")
            : null;
        if (relatedCompartment === compartmentEl) {
            return;
        }

        window.requestAnimationFrame(() => {
            if (!compartmentEl.matches(":hover")) {
                compartmentEl.classList.remove("is-drop-target");
            }
        });
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
        event.dataTransfer.setData("text/plain", componentId || "rack-item");
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
        rackEl?.classList.add("is-drag-over");
        clearSideCompartmentDropTargets();

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
        rackEl?.classList.remove("is-drag-over");
        if (!ensureCanMutate()) {
            state.dragPreview = null;
            renderRack();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
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

        if (draggedComponent.isSideCompartment) {
            renderRack();
            setNotice("Side compartment components must be dropped into the left or right side compartments.", "warning");
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

    function handleGlobalDrop(event) {
        if (!shouldHandleSideDrag()) {
            return;
        }

        const sideLaneAtPoint = getSideCompartmentElementFromPoint(event.clientX, event.clientY);
        if (sideLaneAtPoint) {
            handleSideCompartmentDrop(event);
            return;
        }

        const dropTarget = event.target instanceof Element
            ? event.target.closest(".rack-side-compartment")
            : null;
        if (dropTarget) {
            return;
        }

        clearSideCompartmentDropTargets();
        document.body.classList.remove("is-side-dragging");
        clearActiveDragSource();
        pendingLibrarySideDrop = false;
        librarySideDropSucceeded = false;
        pendingLibrarySideComponent = null;
        lastHoveredSideLane = null;
        lastHoveredSidePosition = null;
        setNotice("Side component was not dropped in a side compartment. Drop it fully inside the left or right lane.", "warning");
    }

    function clearDragPreview() {
        state.dragPreview = null;
        rackEl?.classList.remove("is-drag-over");
        clearActiveDragSource();
        renderRack();
    }

    return {
        clearDragPreview,
        handleGlobalDragEnter,
        handleGlobalDragOver,
        handleGlobalDrop,
        handleLibraryDragEnd,
        handleLibraryDragStart,
        handleRackComponentDragStart,
        handleRackDrop,
        handleSideCompartmentDragEnter,
        handleSideCompartmentDragLeave,
        handleSideCompartmentDragOver,
        handleSideCompartmentDrop,
        updateDragPreview
    };
}