import {
    getComponentRangeLabel,
    getConflictingOppositeFaceComponentIds,
    getRackDepthCm,
    getRackMinDepthClearanceCm,
    getTotalPowerConsumption,
    getUsedUnitsRU
} from "./placementEngine.js";

export function createPdfExportHandler(context) {
    const {
        state,
        rackFrameEl,
        renderRack,
        renderSideCompartments,
        renderSideView,
        setNotice
    } = context;

    function restorePlannerUi(savedView, savedSelectedId, savedSelectedSideItemId) {
        state.currentView = savedView;
        state.selectedComponentId = savedSelectedId;
        state.selectedSideItemId = savedSelectedSideItemId;
        document.body.classList.remove("view-front", "view-rear");
        document.body.classList.add(savedView === "rear" ? "view-rear" : "view-front");
        renderRack();
        renderSideCompartments();
        renderSideView();
    }

    return async function handleExportDrawingPdf() {
        if (typeof window.jspdf === "undefined" || typeof window.html2canvas === "undefined") {
            setNotice("PDF libraries not loaded. Please refresh the page and try again.");
            return;
        }

        const exportButton = document.getElementById("exportDrawingButton");
        if (exportButton) {
            exportButton.disabled = true;
        }
        setNotice("Preparing PDF export — rendering views…");

        const savedView = state.currentView;
        const savedSelectedId = state.selectedComponentId;
        const savedSelectedSideItemId = state.selectedSideItemId;
        const sideViewEl = document.getElementById("rackSideView");
        const sidePanelEl = sideViewEl ? sideViewEl.closest(".rack-side-panel") || sideViewEl : null;
        const originalLabelTransformById = new Map();

        function setSideCompartmentLabelsForPdfExport() {
            const labels = Array.from(document.querySelectorAll(".rack-side-item__label"));
            labels.forEach(labelEl => {
                if (!originalLabelTransformById.has(labelEl)) {
                    originalLabelTransformById.set(labelEl, labelEl.style.transform);
                }
                labelEl.style.transform = "none";
            });
        }

        try {
            document.body.classList.add("is-pdf-exporting");
            state.selectedComponentId = null;
            state.selectedSideItemId = null;

            state.currentView = "front";
            document.body.classList.remove("view-front", "view-rear");
            document.body.classList.add("view-front");
            renderRack();
            renderSideCompartments();
            renderSideView();
            setSideCompartmentLabelsForPdfExport();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const frontCanvas = await html2canvas(rackFrameEl, {
                scale: 1,
                backgroundColor: "#1a1d1b",
                useCORS: true,
                logging: false
            });
            const sideCanvas = await html2canvas(sidePanelEl, {
                scale: 1,
                backgroundColor: null,
                useCORS: true,
                logging: false
            });

            state.currentView = "rear";
            document.body.classList.remove("view-front", "view-rear");
            document.body.classList.add("view-rear");
            renderRack();
            renderSideCompartments();
            renderSideView();
            setSideCompartmentLabelsForPdfExport();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const rearCanvas = await html2canvas(rackFrameEl, {
                scale: 1,
                backgroundColor: "#1a1d1b",
                useCORS: true,
                logging: false
            });

            restorePlannerUi(savedView, savedSelectedId, savedSelectedSideItemId);

            const conflictSet = getConflictingOppositeFaceComponentIds(state);
            const usedRU = getUsedUnitsRU(state.rackComponents);
            const totalPower = getTotalPowerConsumption(state.rackComponents);
            const rackDepth = getRackDepthCm(state);
            const clearance = getRackMinDepthClearanceCm(state);
            const revDate = new Date().toISOString().slice(0, 10);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 12;

            const footerY = pageH - 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(130, 130, 130);
            doc.text(`${state.rackProfile.tag} · Rev: ${revDate} · Rackmaster`, margin, footerY);
            doc.setTextColor(0, 0, 0);

            let topY = margin + 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(state.rackProfile.name || "Rack", margin, topY);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`[${state.rackProfile.tag || "—"}]`, margin + 85, topY);
            doc.setTextColor(0, 0, 0);

            topY += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.text(
                `Room: ${state.rackProfile.room || "—"}   Description / Content: ${state.rackProfile.owner || "—"}`,
                margin,
                topY
            );

            topY += 4.5;
            doc.text(
                `Height: ${state.rackHeightRU} RU   Depth: ${rackDepth > 0 ? `${rackDepth} cm` : "—"}   Min. Clear.: ${clearance > 0 ? `${clearance} cm` : "—"}`,
                margin,
                topY
            );

            topY += 4.5;
            doc.text(
                `Powered from A: ${state.rackProfile.powerA || "—"}   Powered from B: ${state.rackProfile.powerB || "—"}`,
                margin,
                topY
            );

            topY += 4.5;
            const conflictText = conflictSet.size > 0
                ? `${conflictSet.size} component(s) in conflict`
                : "No conflicts";
            doc.text(
                `Used: ${usedRU} of ${state.rackHeightRU} RU   Free: ${state.rackHeightRU - usedRU} RU   Total Power: ${totalPower} W   Conflicts: ${conflictText}`,
                margin,
                topY
            );

            topY += 3;
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(margin, topY, pageW - margin, topY);

            const nativeFrontH = frontCanvas.height;
            const nativeFrontW = frontCanvas.width;
            const nativeSideW = sideCanvas.width;
            const nativeSideH = sideCanvas.height;
            const nativeRearW = rearCanvas.width;
            const nativeRearH = rearCanvas.height;

            const viewsX = margin;
            const viewsY = topY + 6;
            const viewsAvailW = pageW - margin * 2;
            const viewsAvailH = pageH - viewsY - 12;
            const viewGap = 6;

            const columnW = (viewsAvailW - viewGap * 2) / 3;
            const frontScale = Math.min(columnW / nativeFrontW, viewsAvailH / nativeFrontH);
            const sideScale = Math.min(columnW / nativeSideW, viewsAvailH / nativeSideH);
            const rearScale = Math.min(columnW / nativeRearW, viewsAvailH / nativeRearH);

            const frontW = nativeFrontW * frontScale;
            const frontH = nativeFrontH * frontScale;
            const sideW = nativeSideW * sideScale;
            const sideH = nativeSideH * sideScale;
            const rearW = nativeRearW * rearScale;
            const rearH = nativeRearH * rearScale;

            const frontX = viewsX + (columnW - frontW) / 2;
            const sideX = viewsX + columnW + viewGap + (columnW - sideW) / 2;
            const rearX = viewsX + (columnW + viewGap) * 2 + (columnW - rearW) / 2;
            const frontY = viewsY + (viewsAvailH - frontH) / 2;
            const sideY = viewsY + (viewsAvailH - sideH) / 2;
            const rearY = viewsY + (viewsAvailH - rearH) / 2;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);

            const labelY = viewsY - 3;
            doc.text("FRONT VIEW", frontX + frontW / 2, labelY, { align: "center" });
            doc.text("SIDE VIEW (DEPTH)", sideX + sideW / 2, labelY, { align: "center" });
            doc.text("REAR VIEW", rearX + rearW / 2, labelY, { align: "center" });
            doc.setTextColor(0, 0, 0);

            doc.addImage(frontCanvas.toDataURL("image/jpeg", 0.82), "JPEG", frontX, frontY, frontW, frontH);
            doc.addImage(sideCanvas.toDataURL("image/jpeg", 0.82), "JPEG", sideX, sideY, sideW, sideH);
            doc.addImage(rearCanvas.toDataURL("image/jpeg", 0.82), "JPEG", rearX, rearY, rearW, rearH);

            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.2);
            doc.rect(frontX, frontY, frontW, frontH);
            doc.rect(sideX, sideY, sideW, sideH);
            doc.rect(rearX, rearY, rearW, rearH);

            doc.addPage();

            let y2 = margin + 5;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(`Equipment Schedule — ${state.rackProfile.name} [${state.rackProfile.tag}]`, margin, y2);
            y2 += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Rev: ${revDate}  ·  ${state.rackHeightRU} RU total  ·  ${usedRU} RU used  ·  ${state.rackComponents.length} items  ·  ${totalPower} W`,
                margin,
                y2
            );
            y2 += 4.5;
            doc.text(`Room: ${state.rackProfile.room || "—"}`, margin, y2);
            doc.setTextColor(0, 0, 0);
            y2 += 6;

            const cols = [
                { header: "Name", w: 50 },
                { header: "Face", w: 13 },
                { header: "Position", w: 18 },
                { header: "Height (RU)", w: 22 },
                { header: "Depth (cm)", w: 20 },
                { header: "Power (W)", w: 20 },
                { header: "Description", w: 44 },
                { header: "Notes", w: 50 }
            ];
            const tableW = cols.reduce((sum, column) => sum + column.w, 0);
            const rowH = 5.5;
            const usableH = pageH - margin - 10;

            const drawTableHeader = startY => {
                doc.setFillColor(35, 35, 35);
                doc.rect(margin, startY, tableW, 6, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                let cx = margin;
                cols.forEach(column => {
                    doc.text(column.header, cx + 1.5, startY + 4);
                    cx += column.w;
                });
                doc.setTextColor(0, 0, 0);
                return startY + 6;
            };

            y2 = drawTableHeader(y2);

            const sorted = state.rackComponents
                .slice()
                .sort((left, right) => {
                    if ((left.face || "front") !== (right.face || "front")) {
                        return (left.face || "front") === "front" ? -1 : 1;
                    }
                    return left.position - right.position;
                });

            let rowIndex = 0;
            for (const component of sorted) {
                if (y2 + rowH > usableH) {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(130, 130, 130);
                    doc.text(`${state.rackProfile.tag} · Rev: ${revDate} · Rackmaster`, margin, pageH - 5);
                    doc.setTextColor(0, 0, 0);
                    doc.addPage();
                    y2 = margin + 5;
                    y2 = drawTableHeader(y2);
                    rowIndex = 0;
                }

                doc.setFillColor(rowIndex % 2 === 0 ? 248 : 255, rowIndex % 2 === 0 ? 248 : 255, rowIndex % 2 === 0 ? 248 : 255);
                doc.rect(margin, y2, tableW, rowH, "F");

                const values = [
                    component.name || "—",
                    (component.face || "front") === "front" ? "Front" : "Rear",
                    getComponentRangeLabel(component),
                    String(component.ru),
                    String(Number(component.depth) || 0),
                    String(Number(component.power) || 0),
                    (component.description || "—").slice(0, 32),
                    (component.notes || "—").slice(0, 40)
                ];

                if (conflictSet.has(component.id)) {
                    doc.setTextColor(180, 30, 30);
                }
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                let cx = margin;
                values.forEach((value, index) => {
                    const maxW = cols[index].w - 3;
                    let text = String(value);
                    while (text.length > 1 && doc.getTextWidth(text) > maxW) {
                        text = text.slice(0, -1);
                    }
                    doc.text(text, cx + 1.5, y2 + rowH - 1.5);
                    cx += cols[index].w;
                });
                doc.setTextColor(0, 0, 0);

                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.1);
                doc.line(margin, y2 + rowH, margin + tableW, y2 + rowH);

                y2 += rowH;
                rowIndex += 1;
            }

            doc.setFillColor(220, 220, 220);
            doc.rect(margin, y2, tableW, 6, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.text(
                `Total: ${sorted.length} components  ·  ${usedRU} RU used  ·  ${state.rackHeightRU - usedRU} RU free  ·  ${totalPower} W`,
                margin + 1.5,
                y2 + 4
            );
            y2 += 14;

            const rackNotes = String(state.rackProfile.notes || "").trim();
            if (rackNotes) {
                const notesTitle = "Rack Notes";
                const notesMaxWidth = pageW - (margin * 2);
                const notesLines = doc.splitTextToSize(rackNotes, notesMaxWidth);
                const notesBlockHeight = 5 + (notesLines.length * 3.8);
                const notesBottomLimit = pageH - margin - 8;

                if (y2 + notesBlockHeight > notesBottomLimit) {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(7);
                    doc.setTextColor(130, 130, 130);
                    doc.text(`${state.rackProfile.tag} · Rev: ${revDate} · Rackmaster`, margin, pageH - 5);
                    doc.setTextColor(0, 0, 0);
                    doc.addPage();
                    y2 = margin + 5;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.text(notesTitle, margin, y2);
                y2 += 4.5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
                doc.text(notesLines, margin, y2);
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(130, 130, 130);
            doc.text(`${state.rackProfile.tag} · Rev: ${revDate} · Rackmaster`, margin, pageH - 5);
            doc.setTextColor(0, 0, 0);

            const safeName = ((state.rackProfile.tag || "rack") + "-" + (state.rackProfile.name || "rack"))
                .replace(/[^a-zA-Z0-9-]/g, "_")
                .replace(/_+/g, "_");
            doc.save(`${safeName}-drawing-${revDate.replace(/-/g, "")}.pdf`);
            setNotice("Drawing exported to PDF successfully.");
        } catch (err) {
            restorePlannerUi(savedView, savedSelectedId, savedSelectedSideItemId);
            setNotice(`PDF export failed: ${err.message}`);
        } finally {
            document.body.classList.remove("is-pdf-exporting");
            originalLabelTransformById.forEach((transformValue, labelEl) => {
                labelEl.style.transform = transformValue || "";
            });
            if (exportButton) {
                exportButton.disabled = false;
            }
        }
    };
}
