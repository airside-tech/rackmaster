export function createPlannerHelpers(context) {
    const {
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
        onNoticeChange
    } = context;

    function classifyNoticeLevel(message) {
        const normalizedMessage = String(message || "").toLowerCase();

        if (
            normalizedMessage.includes("cannot")
            || normalizedMessage.includes("could not")
            || normalizedMessage.includes("exceeds")
            || normalizedMessage.includes("required")
            || normalizedMessage.includes("already occupied")
            || normalizedMessage.includes("not found")
            || normalizedMessage.includes("must be")
            || normalizedMessage.includes("blocked")
        ) {
            return "error";
        }

        if (
            normalizedMessage.includes("warning")
            || normalizedMessage.includes("canceled")
            || normalizedMessage.includes("continue anyway")
            || normalizedMessage.includes("no vacant")
        ) {
            return "warning";
        }

        if (
            normalizedMessage.includes("updated")
            || normalizedMessage.includes("loaded")
            || normalizedMessage.includes("placed")
            || normalizedMessage.includes("added")
            || normalizedMessage.includes("removed")
            || normalizedMessage.includes("increased")
            || normalizedMessage.includes("reduced")
            || normalizedMessage.includes("selected")
            || normalizedMessage.includes("editing")
            || normalizedMessage.includes("cleared")
        ) {
            return "success";
        }

        return "info";
    }

    function getSideCompartmentItems(view = state.currentView, side) {
        const normalizedView = view === "rear" ? "rear" : "front";
        const normalizedSide = side === "right" ? "right" : "left";
        return state.sideCompartmentItems[normalizedView][normalizedSide];
    }

    function getAllSideCompartmentItems() {
        return ["front", "rear"].flatMap(view => ["left", "right"].flatMap(side => getSideCompartmentItems(view, side)));
    }

    function getSelectedSideCompartmentItem() {
        if (!state.selectedSideItemId) {
            return null;
        }

        return getAllSideCompartmentItems().find(item => item.id === state.selectedSideItemId) || null;
    }

    function reorderSideCompartmentItems(view, side) {
        const items = getSideCompartmentItems(view, side)
            .slice()
            .sort((leftItem, rightItem) => {
                const leftPosition = Number(leftItem.position) || 1;
                const rightPosition = Number(rightItem.position) || 1;

                if (leftPosition !== rightPosition) {
                    return rightPosition - leftPosition;
                }

                return (Number(leftItem.order) || 0) - (Number(rightItem.order) || 0);
            });

        state.sideCompartmentItems[view === "rear" ? "rear" : "front"][side === "right" ? "right" : "left"] = items;
        items.forEach((item, index) => {
            item.order = index + 1;
        });
    }

    function clearSideCompartmentDropTargets() {
        [sideCompartmentLeftEl, sideCompartmentRightEl].forEach(element => {
            element.classList.remove("is-drop-target");
        });
    }

    function setActiveDragSource(source) {
        state.activeDragSource = source || null;
    }

    function clearActiveDragSource() {
        state.activeDragSource = null;
        clearSideCompartmentDropTargets();
        document.body.classList.remove("is-side-dragging");
    }

    function isSideCompartmentDragSourceActive() {
        return state.activeDragSource === "library" || state.activeDragSource === "side-library" || state.activeDragSource === "side-compartment";
    }

    function cloneRackComponent(component) {
        return {
            id: component.id || createId("component"),
            name: component.name,
            ru: Number(component.ru) || 1,
            position: Number(component.position) || 1,
            typeClass: normalizeTypeClass(component.typeClass),
            description: String(component.description || "").trim(),
            depth: Number(component.depth) || 0,
            power: Number(component.power) || 0,
            notes: String(component.notes || "").trim(),
            customColor: component.customColor || null,
            sourceLibraryItemId: component.sourceLibraryItemId || null,
            face: component.face === "rear" ? "rear" : "front",
            occupancy: {
                front: component.face === "rear" ? false : true,
                rear: component.face === "rear"
            }
        };
    }

    function parseDraggedPayload(event) {
        const rawData = event.dataTransfer.getData("application/json");
        if (!rawData) {
            return null;
        }

        try {
            const parsed = JSON.parse(rawData);
            if (parsed && parsed.source) {
                return parsed;
            }
            return {
                source: "library",
                component: parsed
            };
        } catch (error) {
            setNotice(`Could not parse dragged component: ${error.message}`);
            return null;
        }
    }

    function getSelectedRackComponent() {
        if (!state.selectedComponentId) {
            return null;
        }
        return state.rackComponents.find(component => component.id === state.selectedComponentId) || null;
    }

    function rackPositionToTop(position, componentHeightRU) {
        return (state.rackHeightRU - (position + componentHeightRU - 1)) * rackUnitPixelHeight;
    }

    function clientYToRackPosition(clientY, componentHeightRU) {
        const rackRect = rackEl.getBoundingClientRect();
        const yInRack = Math.max(0, Math.min(clientY - rackRect.top, rackRect.height - 1));
        const slotIndexFromTop = Math.floor(yInRack / rackUnitPixelHeight);
        const rawPosition = state.rackHeightRU - slotIndexFromTop - componentHeightRU + 1;
        const maxStartPosition = Math.max(1, state.rackHeightRU - componentHeightRU + 1);

        return Math.max(1, Math.min(rawPosition, maxStartPosition));
    }

    function clientYToSideCompartmentPosition(clientY, sideCompartmentEl, componentHeightRU) {
        const sideRect = sideCompartmentEl.getBoundingClientRect();
        const yInSide = Math.max(0, Math.min(clientY - sideRect.top, sideRect.height - 1));
        const slotIndexFromTop = Math.floor(yInSide / rackUnitPixelHeight);
        const rawPosition = state.rackHeightRU - slotIndexFromTop - componentHeightRU + 1;
        const maxStartPosition = Math.max(1, state.rackHeightRU - componentHeightRU + 1);

        return Math.max(1, Math.min(rawPosition, maxStartPosition));
    }

    function isRackPositionAvailable(position, componentHeightRU, componentIdToIgnore = null, face = state.currentView, depth = 0) {
        return isRackPositionAvailableInState(state, position, componentHeightRU, componentIdToIgnore, face, depth);
    }

    function findFirstAvailablePosition(componentHeightRU, face = state.currentView, depth = 0) {
        return findFirstAvailableRackPosition(state, componentHeightRU, face, depth);
    }

    function setNotice(message, level) {
        state.notice = message;
        state.noticeLevel = level || classifyNoticeLevel(message);
        onNoticeChange();
    }

    function setActiveEditor(mode) {
        if (mode === "rack") {
            rackPropertiesPanelEl.classList.add("is-active");
        } else {
            rackPropertiesPanelEl.classList.remove("is-active");
        }
    }

    return {
        clearActiveDragSource,
        clearSideCompartmentDropTargets,
        clientYToSideCompartmentPosition,
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
    };
}