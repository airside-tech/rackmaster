function getFormatMeta(format) {
    if (format === "csv") {
        return {
            description: "CSV files",
            mimeType: "text/csv",
            extension: ".csv"
        };
    }

    if (format === "xlsx") {
        return {
            description: "Excel files",
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            extension: ".xlsx"
        };
    }

    return {
        description: "JSON files",
        mimeType: "application/json",
        extension: ".json"
    };
}

export async function saveTextFile(filename, textContent, mimeType, extensionWithDot) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: extensionWithDot === ".csv" ? "CSV files" : "JSON files",
                    accept: { [mimeType]: [extensionWithDot] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(textContent);
            await writable.close();
            return true;
        } catch (error) {
            if (error && error.name === "AbortError") {
                return false;
            }
        }
    }

    const blob = new Blob([textContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
}

export async function saveBinaryFile(filename, binaryContent, mimeType, extensionWithDot) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: extensionWithDot === ".xlsx" ? "Excel files" : "Binary files",
                    accept: { [mimeType]: [extensionWithDot] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(binaryContent);
            await writable.close();
            return true;
        } catch (error) {
            if (error && error.name === "AbortError") {
                return false;
            }
        }
    }

    const blob = new Blob([binaryContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
}

export function readTextFromInput(fileInput) {
    return new Promise((resolve, reject) => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
            reject(new Error("No file selected."));
            return;
        }

        const reader = new FileReader();
        reader.onload = event => resolve(String(event.target?.result || ""));
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsText(file);
    });
}

export function readArrayBufferFromInput(fileInput) {
    return new Promise((resolve, reject) => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
            reject(new Error("No file selected."));
            return;
        }

        const reader = new FileReader();
        reader.onload = event => resolve(event.target?.result);
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.readAsArrayBuffer(file);
    });
}

export async function openTextFileWithPicker(format) {
    if (!window.showOpenFilePicker) {
        return null;
    }

    const isCsv = format === "csv";
    try {
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
                description: isCsv ? "CSV files" : "JSON files",
                accept: {
                    [isCsv ? "text/csv" : "application/json"]: [isCsv ? ".csv" : ".json"]
                }
            }]
        });
        const file = await handle.getFile();
        return await file.text();
    } catch (error) {
        if (error && error.name === "AbortError") {
            return "";
        }
        throw error;
    }
}

export async function openBinaryFileWithPicker(format) {
    if (!window.showOpenFilePicker) {
        return null;
    }

    const formatMeta = getFormatMeta(format);
    try {
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{
                description: formatMeta.description,
                accept: {
                    [formatMeta.mimeType]: [formatMeta.extension]
                }
            }]
        });
        const file = await handle.getFile();
        return await file.arrayBuffer();
    } catch (error) {
        if (error && error.name === "AbortError") {
            return "";
        }
        throw error;
    }
}
