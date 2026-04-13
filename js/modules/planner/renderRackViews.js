/* 
In the renderRackViews module, we have two main functions: renderRack and renderSideView. 
 The renderRack function is responsible for rendering the main rack view, which includes the rack slots, components, 
 and any blocked opposite face components. Each item gets assigned appropriate classes, styles, and event listeners for interactivity.

 The renderSideView function renders a side view of the rack, showing the depth of components and any potential conflicts 
 between front and rear components based on their depth.
*/
export function renderRack(context) {
    const {
        state,
        rackEl,
        rackUnitHeightRU,
        rackUnitPixelHeight,
        rackPositionToTop,
        getBlockedOppositeFaceComponents,
        getComponentBackground,
        getComponentDepthCm,
        getComponentRangeLabel,
        handleRackComponentDragStart,
        clearDragPreview
    } = context;

    rackEl.innerHTML = "";
    rackEl.style.height = `${state.rackHeightRU * rackUnitPixelHeight}px`;

    for (let position = 1; position <= state.rackHeightRU; position += 1) {
        const slot = document.createElement("div");
        const slotLabelLeft = document.createElement("div");
        const slotLabelRight = document.createElement("div");
        const slotTop = rackPositionToTop(position, rackUnitHeightRU);

        slot.className = "rack-slot";
        slot.style.top = `${slotTop}px`;
        slot.style.height = `${rackUnitPixelHeight}px`;

        slotLabelLeft.className = "rack-slot-label";
        slotLabelLeft.style.top = `${slotTop + rackUnitPixelHeight / 2}px`;
        slotLabelLeft.textContent = `U${position}`;

        slotLabelRight.className = "rack-slot-label right";
        slotLabelRight.style.top = `${slotTop + rackUnitPixelHeight / 2}px`;
        slotLabelRight.textContent = `U${position}`;

        rackEl.appendChild(slot);
        rackEl.appendChild(slotLabelLeft);
        rackEl.appendChild(slotLabelRight);
    }

    if (state.dragPreview && state.dragPreview.valid) {
        const highlight = document.createElement("div");
        highlight.className = "rack-highlight";
        highlight.style.top = `${rackPositionToTop(state.dragPreview.position, state.dragPreview.ru)}px`;
        highlight.style.height = `${state.dragPreview.ru * rackUnitPixelHeight}px`;
        rackEl.appendChild(highlight);
    }

    getBlockedOppositeFaceComponents(state)
        .slice()
        .sort((left, right) => right.position - left.position)
        .forEach(component => {
            const blockedEl = document.createElement("div");
            const textEl = document.createElement("span");

            blockedEl.className = "rack-component rack-component--blocked";
            blockedEl.style.top = `${rackPositionToTop(component.position, component.ru)}px`;
            blockedEl.style.height = `${component.ru * rackUnitPixelHeight}px`;

            textEl.className = "rack-component__blocked-text";
            textEl.textContent = `Blocked by: ${component.name}`;

            blockedEl.appendChild(textEl);
            rackEl.appendChild(blockedEl);
        });

    state.rackComponents
        .slice()
        .filter(component => (component.face || "front") === state.currentView)
        .sort((left, right) => right.position - left.position)
        .forEach(component => {
            const componentEl = document.createElement("div");
            const topRow = document.createElement("div");
            const bottomRow = document.createElement("div");
            const nameEl = document.createElement("span");
            const rangeEl = document.createElement("span");
            const metaEl = document.createElement("span");
            const powerW = Number(component.power) || 0;

            componentEl.className = `rack-component ${component.typeClass || "default-component"}`;
            componentEl.style.top = `${rackPositionToTop(component.position, component.ru)}px`;
            componentEl.style.height = `${component.ru * rackUnitPixelHeight}px`;
            componentEl.style.background = getComponentBackground(component);
            componentEl.dataset.componentId = component.id;
            componentEl.dataset.ru = component.ru;
            componentEl.title = component.notes
                ? `Click to edit ${component.name}\nNotes: ${component.notes}`
                : `Click to edit ${component.name}`;

            if (component.id === state.selectedComponentId) {
                componentEl.classList.add("is-selected");
            }

            componentEl.draggable = true;
            componentEl.addEventListener("dragstart", handleRackComponentDragStart);
            componentEl.addEventListener("dragend", clearDragPreview);

            topRow.className = "rack-component__top";
            bottomRow.className = "rack-component__bottom";
            nameEl.className = "rack-component__name";
            rangeEl.className = "rack-component__range";
            metaEl.className = "rack-component__meta";

            nameEl.textContent = component.name;
            rangeEl.textContent = getComponentRangeLabel(component);
            metaEl.textContent = powerW > 0 ? `${powerW} W` : `${component.ru} RU`;

            topRow.appendChild(nameEl);
            bottomRow.appendChild(rangeEl);
            bottomRow.appendChild(metaEl);
            componentEl.appendChild(topRow);
            componentEl.appendChild(bottomRow);
            rackEl.appendChild(componentEl);
        });
}

export function renderSideView(context) {
    const {
        state,
        sideViewEl,
        rackUnitPixelHeight,
        rackPositionToTop,
        getRackDepthCm,
        getRackMinDepthClearanceCm,
        getComponentDepthCm,
        getComponentBackground,
        getComponentFace,
        getOppositeFaceDepthPairs,
        getConflictingOppositeFaceComponentIds
    } = context;

    if (!sideViewEl) {
        return;
    }

    sideViewEl.innerHTML = "";
    sideViewEl.style.height = `${state.rackHeightRU * rackUnitPixelHeight}px`;

    const configuredRackDepthCm = Math.max(getRackDepthCm(state), 0);
    const rackDepthWidthPx = Math.max(
        140,
        Math.min(320, Math.round(140 + ((configuredRackDepthCm - 20) * 1.5)))
    );
    const sideViewWidthPx = rackDepthWidthPx;
    const clearanceCm = Math.max(getRackMinDepthClearanceCm(state), 0);
    const depthPairs = getOppositeFaceDepthPairs(state);
    const maxSingleDepthCm = state.rackComponents.reduce((maxDepth, component) => {
        return Math.max(maxDepth, getComponentDepthCm(component));
    }, 1);
    const maxPairDepthCm = depthPairs.reduce((maxDepth, pair) => {
        const combinedDepth = getComponentDepthCm(pair.frontComponent) + getComponentDepthCm(pair.rearComponent) + clearanceCm;
        return Math.max(maxDepth, combinedDepth);
    }, 1);
    const visualRackDepthCm = Math.max(configuredRackDepthCm, maxSingleDepthCm, maxPairDepthCm, 1);
    const conflictIds = new Set(getConflictingOppositeFaceComponentIds(state, depthPairs));

    sideViewEl.style.width = `${rackDepthWidthPx}px`;
    sideViewEl.style.minWidth = `${rackDepthWidthPx}px`;
    sideViewEl.title = `Rack depth: ${configuredRackDepthCm} cm`;

    state.rackComponents
        .slice()
        .sort((left, right) => right.position - left.position)
        .forEach(component => {
            const face = getComponentFace(component);
            const componentDepthCm = Math.max(getComponentDepthCm(component), 1);
            const widthPx = Math.min(
                sideViewWidthPx,
                Math.max(14, Math.round((componentDepthCm / visualRackDepthCm) * sideViewWidthPx))
            );
            const el = document.createElement("div");
            const depthLabelEl = document.createElement("span");

            el.className = `rack-side-component rack-side-component--${face}`;
            if (conflictIds.has(component.id)) {
                el.classList.add("rack-side-component--conflict");
            }
            if (component.id === state.selectedComponentId) {
                el.classList.add("rack-side-component--selected");
            }

            el.dataset.componentId = component.id;
            el.style.top = `${rackPositionToTop(component.position, component.ru)}px`;
            el.style.height = `${Math.max(component.ru * rackUnitPixelHeight - 2, 10)}px`;
            el.style.width = `${widthPx}px`;
            el.style.background = getComponentBackground(component);
            el.title = `${component.name} (${componentDepthCm} cm ${face})`;

            depthLabelEl.className = "rack-side-component__depth";
            depthLabelEl.textContent = widthPx < 56
                ? `${componentDepthCm}cm`
                : `${componentDepthCm} cm`;
            if (widthPx < 36) {
                depthLabelEl.hidden = true;
            }
            el.appendChild(depthLabelEl);

            if (face === "front") {
                el.style.left = "0";
            } else {
                el.style.right = "0";
            }

            sideViewEl.appendChild(el);
        });

    depthPairs.forEach(pair => {
        const frontDepth = Math.max(getComponentDepthCm(pair.frontComponent), 0);
        const rearDepth = Math.max(getComponentDepthCm(pair.rearComponent), 0);
        const frontRight = Math.round((frontDepth / visualRackDepthCm) * sideViewWidthPx);
        const rearLeft = Math.round(((visualRackDepthCm - rearDepth) / visualRackDepthCm) * sideViewWidthPx);
        const sharedTop = rackPositionToTop(pair.topRU, 1);
        const sharedHeight = (pair.bottomRU - pair.topRU + 1) * rackUnitPixelHeight - 2;

        if (pair.canShareDepth || frontRight <= rearLeft) {
            return;
        }

        const overlapEl = document.createElement("div");
        overlapEl.className = "rack-side-overlap";
        overlapEl.style.top = `${sharedTop}px`;
        overlapEl.style.height = `${sharedHeight}px`;
        overlapEl.style.left = `${rearLeft}px`;
        overlapEl.style.width = `${frontRight - rearLeft}px`;
        sideViewEl.appendChild(overlapEl);
    });
}