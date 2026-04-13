export function renderLibraryCategoryOptions(context) {
    const { state, libraryCategorySelect, libraryNewCategoryNameInput } = context;
    const selectedValue = libraryCategorySelect.value;
    const options = state.libraryCategories
        .map(category => `<option value="${category.id}">${category.name}</option>`)
        .join("");

    libraryCategorySelect.innerHTML = `${options}<option value="__new__">New Category...</option>`;

    if (selectedValue && libraryCategorySelect.querySelector(`option[value="${selectedValue}"]`)) {
        libraryCategorySelect.value = selectedValue;
    } else {
        libraryCategorySelect.value = state.libraryCategories[0]?.id || "__new__";
    }

    const useNewCategory = libraryCategorySelect.value === "__new__";
    libraryNewCategoryNameInput.disabled = !useNewCategory;
    if (!useNewCategory) {
        libraryNewCategoryNameInput.value = "";
    }
}

export function renderLibrary(context) {
    const {
        state,
        accordionEl,
        handleLibraryDragStart,
        handleLibraryDragEnd,
        handleSelectLibraryItem,
        getComponentBackground,
        removeLibraryComponent,
        renderLibraryCategoryOptionsFn
    } = context;

    accordionEl.innerHTML = "";

    state.libraryCategories.forEach((category, categoryIndex) => {
        const card = document.createElement("div");
        const cardHeader = document.createElement("div");
        const cardTitle = document.createElement("h5");
        const toggleButton = document.createElement("button");
        const collapseDiv = document.createElement("div");
        const cardBody = document.createElement("div");

        card.className = "card";
        cardHeader.className = "card-header";
        cardTitle.className = "mb-0";
        toggleButton.className = "btn btn-link";
        toggleButton.type = "button";
        toggleButton.textContent = `${category.name} (${category.items.length})`;
        toggleButton.setAttribute("aria-expanded", category.expanded ? "true" : "false");
        toggleButton.addEventListener("click", () => {
            state.libraryCategories[categoryIndex].expanded = !state.libraryCategories[categoryIndex].expanded;
            renderLibrary(context);
        });

        collapseDiv.className = `collapse${category.expanded ? " show" : ""}`;
        cardBody.className = "card-body";

        category.items.forEach(item => {
            const itemEl = document.createElement("div");
            const nameEl = document.createElement("div");
            const metaEl = document.createElement("div");
            const actionsEl = document.createElement("div");
            const editButton = document.createElement("button");
            const removeButton = document.createElement("button");

            itemEl.className = `equipment ${item.typeClass}`;
            itemEl.draggable = true;
            itemEl.dataset.component = JSON.stringify(item);
            itemEl.addEventListener("dragstart", handleLibraryDragStart);
            itemEl.addEventListener("dragend", handleLibraryDragEnd);
            itemEl.addEventListener("click", () => {
                handleSelectLibraryItem(category.id, item.id);
            });
            itemEl.style.background = getComponentBackground(item);

            if (state.selectedLibraryItemId === item.id) {
                itemEl.classList.add("is-selected");
            }

            nameEl.className = "equipment__name";
            nameEl.textContent = item.name;

            metaEl.className = "equipment__meta";
            metaEl.textContent = item.isSideCompartment
                ? `${item.ru} RU | Side compartment component`
                : `${item.ru} RU | ${item.defaultDepth} cm | ${item.defaultPower} W`;

            actionsEl.className = "equipment__actions";
            editButton.className = "library-edit";
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", event => {
                event.stopPropagation();
                handleSelectLibraryItem(category.id, item.id);
            });

            removeButton.className = "library-remove";
            removeButton.type = "button";
            removeButton.textContent = "Remove";
            removeButton.addEventListener("click", event => {
                event.stopPropagation();
                removeLibraryComponent(category.id, item.id);
            });

            actionsEl.appendChild(editButton);
            actionsEl.appendChild(removeButton);
            itemEl.appendChild(nameEl);
            itemEl.appendChild(metaEl);
            itemEl.appendChild(actionsEl);
            cardBody.appendChild(itemEl);
        });

        if (category.items.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "equipment__meta";
            emptyEl.textContent = "No components in this category yet.";
            cardBody.appendChild(emptyEl);
        }

        cardTitle.appendChild(toggleButton);
        cardHeader.appendChild(cardTitle);
        collapseDiv.appendChild(cardBody);
        card.appendChild(cardHeader);
        card.appendChild(collapseDiv);
        accordionEl.appendChild(card);
    });

    renderLibraryCategoryOptionsFn();
}

export function renderSideCompartmentLibrary(context) {
    const {
        sideCompartmentLibraryEl,
        sideCompartmentLibrarySeed,
        getSideItemBackground,
        setActiveDragSource,
        clearActiveDragSource
    } = context;

    sideCompartmentLibraryEl.innerHTML = "";

    sideCompartmentLibrarySeed.forEach(item => {
        const itemEl = document.createElement("div");
        const titleEl = document.createElement("div");
        const metaEl = document.createElement("div");

        itemEl.className = "side-item-library-card";
        itemEl.draggable = true;
        itemEl.style.background = getSideItemBackground({ type: item.type, customColor: item.color });
        itemEl.dataset.sideItem = JSON.stringify(item);
        itemEl.title = `Drag ${item.name} into the left or right side compartment`;
        itemEl.addEventListener("dragstart", event => {
            setActiveDragSource("side-library");
            document.body.classList.add("is-side-dragging");
            event.dataTransfer.setData("application/json", JSON.stringify({
                source: "side-library",
                sideItem: item
            }));
            event.dataTransfer.effectAllowed = "copy";
        });
        itemEl.addEventListener("dragend", clearActiveDragSource);

        titleEl.className = "side-item-library-card__title";
        titleEl.textContent = item.name;

        metaEl.className = "side-item-library-card__meta";
        metaEl.textContent = item.description;

        itemEl.appendChild(titleEl);
        itemEl.appendChild(metaEl);
        sideCompartmentLibraryEl.appendChild(itemEl);
    });
}

export function renderSideCompartments(context) {
    const {
        state,
        rackUnitPixelHeight,
        rackPositionToTop,
        sideCompartmentLeftEl,
        sideCompartmentRightEl,
        getSideCompartmentItems,
        getSideItemBackground,
        getSideItemDisplayLabel,
        clearSideCompartmentDropTargets,
        setActiveDragSource,
        clearActiveDragSource
    } = context;

    const containerHeight = `${state.rackHeightRU * rackUnitPixelHeight}px`;
    [
        { element: sideCompartmentLeftEl, side: "left" },
        { element: sideCompartmentRightEl, side: "right" }
    ].forEach(({ element, side }) => {
        const items = getSideCompartmentItems(state.currentView, side)
            .slice()
            .sort((leftItem, rightItem) => {
                if ((leftItem.position || 1) !== (rightItem.position || 1)) {
                    return (rightItem.position || 1) - (leftItem.position || 1);
                }
                return (leftItem.order || 0) - (rightItem.order || 0);
            });

        element.innerHTML = "";
        element.style.height = containerHeight;
        element.dataset.side = side;

        for (let position = 1; position <= state.rackHeightRU; position += 1) {
            const slotEl = document.createElement("div");
            slotEl.className = "rack-side-compartment__slot";
            slotEl.style.top = `${rackPositionToTop(position, 1)}px`;
            slotEl.style.height = `${rackUnitPixelHeight}px`;
            element.appendChild(slotEl);
        }

        if (items.length === 0) {
            const emptyEl = document.createElement("div");
            emptyEl.className = "rack-side-compartment__empty";
            emptyEl.textContent = `Drop ${side} side items here`;
            element.appendChild(emptyEl);
            return;
        }

        items.forEach(item => {
            const itemEl = document.createElement("div");
            const labelEl = document.createElement("div");
            const displayLabel = getSideItemDisplayLabel(item);
            const secondaryNotes = item.type === "custom-label"
                ? ""
                : String(item.notes || "").trim();
            const itemRU = Math.max(1, Math.min(Number(item.ru) || 1, state.rackHeightRU));
            const maxStartPosition = Math.max(1, state.rackHeightRU - itemRU + 1);
            const itemPosition = Math.max(1, Math.min(Number(item.position) || 1, maxStartPosition));

            itemEl.className = "rack-side-item";
            itemEl.style.background = getSideItemBackground(item);
            itemEl.dataset.sideItemId = item.id;
            itemEl.dataset.ru = String(itemRU);
            itemEl.dataset.position = String(itemPosition);
            itemEl.draggable = true;
            itemEl.title = `${displayLabel} (${itemRU}U @ U${itemPosition})`;
            itemEl.style.top = `${rackPositionToTop(itemPosition, itemRU)}px`;
            itemEl.style.height = `${Math.max((itemRU * rackUnitPixelHeight) - 2, 10)}px`;
            if (item.id === state.selectedSideItemId) {
                itemEl.classList.add("is-selected");
            }

            itemEl.addEventListener("dragstart", event => {
                setActiveDragSource("side-compartment");
                document.body.classList.add("is-side-dragging");
                event.dataTransfer.setData("application/json", JSON.stringify({
                    source: "side-compartment",
                    sideItemId: item.id
                }));
                event.dataTransfer.setData("text/plain", item.id || "side-item");
                event.dataTransfer.effectAllowed = "move";
            });
            itemEl.addEventListener("dragend", clearActiveDragSource);

            labelEl.className = "rack-side-item__label";
            labelEl.textContent = displayLabel;
            itemEl.appendChild(labelEl);

            const ruBadgeEl = document.createElement("div");
            ruBadgeEl.className = "rack-side-item__ru";
            ruBadgeEl.textContent = `${itemRU}U`;
            itemEl.appendChild(ruBadgeEl);

            if (secondaryNotes) {
                const notesEl = document.createElement("div");
                notesEl.className = "rack-side-item__notes";
                notesEl.textContent = secondaryNotes;
                itemEl.appendChild(notesEl);
            }

            element.appendChild(itemEl);
        });
    });

    clearSideCompartmentDropTargets();
}
