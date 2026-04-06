export function chooseDataFormat(actionLabel) {
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

        const jsonButton = document.createElement("button");
        jsonButton.type = "button";
        jsonButton.textContent = "JSON";

        const csvButton = document.createElement("button");
        csvButton.type = "button";
        csvButton.textContent = "CSV";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        function closeWith(value) {
            overlay.remove();
            resolve(value);
        }

        jsonButton.addEventListener("click", () => closeWith("json"));
        csvButton.addEventListener("click", () => closeWith("csv"));
        cancelButton.addEventListener("click", () => closeWith(null));
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeWith(null);
            }
        });

        actions.appendChild(jsonButton);
        actions.appendChild(csvButton);
        actions.appendChild(cancelButton);
        dialog.appendChild(title);
        dialog.appendChild(description);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}
