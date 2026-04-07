function csvEscape(value) {
    const text = value == null ? "" : String(value);
    if (!/[",\n\r]/.test(text)) {
        return text;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
    const headerLine = headers.map(csvEscape).join(",");
    const bodyLines = rows.map(row => headers.map(header => csvEscape(row[header])).join(","));
    return [headerLine, ...bodyLines].join("\n");
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let index = 0;
    let insideQuotes = false;

    while (index < text.length) {
        const char = text[index];

        if (insideQuotes) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    value += '"';
                    index += 1;
                } else {
                    insideQuotes = false;
                }
            } else {
                value += char;
            }
            index += 1;
            continue;
        }

        if (char === '"') {
            insideQuotes = true;
            index += 1;
            continue;
        }

        if (char === ",") {
            row.push(value);
            value = "";
            index += 1;
            continue;
        }

        if (char === "\n") {
            row.push(value);
            rows.push(row);
            row = [];
            value = "";
            index += 1;
            continue;
        }

        if (char === "\r") {
            index += 1;
            continue;
        }

        value += char;
        index += 1;
    }

    if (value.length > 0 || row.length > 0) {
        row.push(value);
        rows.push(row);
    }

    if (rows.length === 0) {
        return [];
    }

    const [headers, ...dataRows] = rows;
    return dataRows
        .filter(dataRow => dataRow.some(cell => String(cell || "").trim() !== ""))
        .map(dataRow => {
            const result = {};
            headers.forEach((header, idx) => {
                result[header] = dataRow[idx] ?? "";
            });
            return result;
        });
}

export { csvEscape, parseCsv, toCsv };
