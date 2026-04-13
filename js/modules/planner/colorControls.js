export function updateSelectedEditorPaletteSelection(context, colorHex) {
    const { selectedEditorColorPresetsEl } = context;
    if (!selectedEditorColorPresetsEl) {
        return;
    }

    const normalizedTarget = String(colorHex || "").toLowerCase();
    selectedEditorColorPresetsEl.querySelectorAll(".color-preset").forEach(button => {
        const matches = String(button.dataset.color || "").toLowerCase() === normalizedTarget;
        button.classList.toggle("is-selected", matches);
    });
}

export function initializeSelectedEditorColorPalette(context) {
    const {
        colorPresets,
        selectedEditorColorPresetsEl,
        selectedEditorFields,
        getSelectedRackComponent,
        getSelectedSideCompartmentItem,
        getSelectedLibraryItem,
        renderRack,
        renderSideCompartments,
        renderLibrary,
        renderSelectedEditorPanel,
        syncActiveRackToCatalog,
        setNotice,
        updateSelectedEditorPaletteSelection: updatePaletteSelection
    } = context;

    if (!selectedEditorColorPresetsEl) {
        return;
    }

    selectedEditorColorPresetsEl.innerHTML = "";

    colorPresets.forEach(preset => {
        const button = document.createElement("button");
        button.className = "color-preset";
        button.type = "button";
        button.style.background = preset.gradient;
        button.dataset.color = preset.color;
        button.title = preset.name;
        button.setAttribute("aria-label", `Apply ${preset.name} to selected item`);

        button.addEventListener("click", () => {
            const selectedComponent = getSelectedRackComponent();
            const selectedSideItem = getSelectedSideCompartmentItem();
            const selectedLibraryItem = getSelectedLibraryItem();
            if (!selectedComponent && !selectedSideItem && !selectedLibraryItem) {
                return;
            }

            selectedEditorFields.color.value = preset.color;
            updatePaletteSelection(preset.color);
            if (selectedComponent) {
                selectedComponent.customColor = preset.color;
                renderRack();
                syncActiveRackToCatalog();
                setNotice(`Updated ${selectedComponent.name} color.`);
            } else if (selectedSideItem) {
                selectedSideItem.customColor = preset.color;
                renderSideCompartments();
                syncActiveRackToCatalog();
                setNotice(`Updated ${selectedSideItem.name} color.`);
            } else {
                selectedLibraryItem.customColor = preset.color;
                renderLibrary();
                setNotice(`Selected ${selectedLibraryItem.name} color.`);
            }
            renderSelectedEditorPanel();
        });

        selectedEditorColorPresetsEl.appendChild(button);
    });

    selectedEditorFields.color.addEventListener("input", event => {
        const selectedComponent = getSelectedRackComponent();
        const selectedSideItem = getSelectedSideCompartmentItem();
        const selectedLibraryItem = getSelectedLibraryItem();
        if (!selectedComponent && !selectedSideItem && !selectedLibraryItem) {
            updatePaletteSelection(event.target.value);
            return;
        }

        const nextColor = event.target.value || null;
        updatePaletteSelection(nextColor);
        if (selectedComponent) {
            selectedComponent.customColor = nextColor;
            renderRack();
            syncActiveRackToCatalog();
            return;
        }

        if (selectedSideItem) {
            selectedSideItem.customColor = nextColor;
            renderSideCompartments();
            syncActiveRackToCatalog();
            return;
        }

        selectedLibraryItem.customColor = nextColor;
        renderLibrary();
    });

    selectedEditorFields.color.addEventListener("change", () => {
        const selectedComponent = getSelectedRackComponent();
        const selectedSideItem = getSelectedSideCompartmentItem();
        const selectedLibraryItem = getSelectedLibraryItem();
        if (!selectedComponent && !selectedSideItem && !selectedLibraryItem) {
            return;
        }
        setNotice(selectedComponent
            ? `Updated ${selectedComponent.name} color.`
            : selectedSideItem
                ? `Updated ${selectedSideItem.name} color.`
                : `Selected ${selectedLibraryItem.name} color.`);
    });
}

export function initializeColorPicker(context) {
    const {
        colorPresets,
        getDefaultColor,
        setDefaultColor,
        adjustBrightness
    } = context;
    const colorPresetGrid = document.getElementById("colorPresetGrid");
    const customColorInput = document.getElementById("customColorInput");
    const selectedColorPreview = document.getElementById("selectedColorPreview");

    if (!colorPresetGrid || !customColorInput || !selectedColorPreview) {
        return;
    }

    const currentColor = getDefaultColor();
    customColorInput.value = currentColor.color;
    selectedColorPreview.style.background = currentColor.gradient;

    colorPresets.forEach(preset => {
        const button = document.createElement("button");
        button.className = "color-preset";
        button.type = "button";
        button.style.background = preset.gradient;
        button.title = preset.name;
        button.setAttribute("aria-label", `Select ${preset.name} color`);

        if (preset.color === currentColor.color) {
            button.classList.add("is-selected");
        }

        button.addEventListener("click", () => {
            colorPresetGrid.querySelectorAll(".color-preset.is-selected").forEach(el => {
                el.classList.remove("is-selected");
            });
            button.classList.add("is-selected");

            setDefaultColor(preset.color, preset.gradient);
            customColorInput.value = preset.color;
            selectedColorPreview.style.background = preset.gradient;
        });

        colorPresetGrid.appendChild(button);
    });

    customColorInput.addEventListener("change", event => {
        const color = event.target.value;
        const gradient = `linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)})`;

        colorPresetGrid.querySelectorAll(".color-preset.is-selected").forEach(el => {
            el.classList.remove("is-selected");
        });

        setDefaultColor(color, gradient);
        selectedColorPreview.style.background = gradient;
    });

    customColorInput.addEventListener("input", event => {
        const color = event.target.value;
        const gradient = `linear-gradient(135deg, ${color}, ${adjustBrightness(color, -20)})`;
        selectedColorPreview.style.background = gradient;
    });
}