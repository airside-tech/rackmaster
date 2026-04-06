export function updateSelectedComponentPaletteSelection(context, colorHex) {
    const { selectedComponentColorPresetsEl } = context;
    if (!selectedComponentColorPresetsEl) {
        return;
    }

    const normalizedTarget = String(colorHex || "").toLowerCase();
    selectedComponentColorPresetsEl.querySelectorAll(".color-preset").forEach(button => {
        const matches = String(button.dataset.color || "").toLowerCase() === normalizedTarget;
        button.classList.toggle("is-selected", matches);
    });
}

export function initializeSelectedComponentColorPalette(context) {
    const {
        colorPresets,
        selectedComponentColorPresetsEl,
        selectedComponentFields,
        getSelectedRackComponent,
        renderRack,
        renderSelectedComponentPanel,
        syncActiveRackToCatalog,
        setNotice,
        updateSelectedComponentPaletteSelection: updatePaletteSelection
    } = context;

    if (!selectedComponentColorPresetsEl) {
        return;
    }

    selectedComponentColorPresetsEl.innerHTML = "";

    colorPresets.forEach(preset => {
        const button = document.createElement("button");
        button.className = "color-preset";
        button.type = "button";
        button.style.background = preset.gradient;
        button.dataset.color = preset.color;
        button.title = preset.name;
        button.setAttribute("aria-label", `Apply ${preset.name} to selected component`);

        button.addEventListener("click", () => {
            const selectedComponent = getSelectedRackComponent();
            if (!selectedComponent) {
                return;
            }

            selectedComponentFields.color.value = preset.color;
            updatePaletteSelection(preset.color);
            selectedComponent.customColor = preset.color;
            renderRack();
            renderSelectedComponentPanel();
            syncActiveRackToCatalog();
            setNotice(`Updated ${selectedComponent.name} color.`);
        });

        selectedComponentColorPresetsEl.appendChild(button);
    });

    selectedComponentFields.color.addEventListener("input", event => {
        const selectedComponent = getSelectedRackComponent();
        if (!selectedComponent) {
            updatePaletteSelection(event.target.value);
            return;
        }

        const nextColor = event.target.value || null;
        selectedComponent.customColor = nextColor;
        updatePaletteSelection(nextColor);
        renderRack();
        syncActiveRackToCatalog();
    });

    selectedComponentFields.color.addEventListener("change", () => {
        const selectedComponent = getSelectedRackComponent();
        if (!selectedComponent) {
            return;
        }
        setNotice(`Updated ${selectedComponent.name} color.`);
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