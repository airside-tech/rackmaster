export function chooseDataFormat(actionLabel, allowedFormats = ["json", "csv", "xlsx"]) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0, 0, 0, 0.45)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "9999";

        const dialog = document.createElement("div");
        dialog.style.background = "#ffffff";
        dialog.style.borderRadius = "12px";
        dialog.style.padding = "18px";
        dialog.style.minWidth = "280px";
        dialog.style.maxWidth = "92vw";
        dialog.style.boxShadow = "0 10px 28px rgba(0,0,0,0.25)";

        const title = document.createElement("h5");
        title.textContent = `${actionLabel} format`;
        title.style.margin = "0 0 8px 0";

        const description = document.createElement("p");
        description.textContent = "Choose a file format:";
        description.style.margin = "0 0 12px 0";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.flexWrap = "wrap";

        const formatLabels = {
            json: "JSON",
            csv: "CSV",
            xlsx: "XLSX"
        };

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        function closeWith(value) {
            overlay.remove();
            resolve(value);
        }

        allowedFormats.forEach(format => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = formatLabels[format] || String(format).toUpperCase();
            button.addEventListener("click", () => closeWith(format));
            actions.appendChild(button);
        });
        cancelButton.addEventListener("click", () => closeWith(null));
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeWith(null);
            }
        });

        actions.appendChild(cancelButton);
        dialog.appendChild(title);
        dialog.appendChild(description);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}
