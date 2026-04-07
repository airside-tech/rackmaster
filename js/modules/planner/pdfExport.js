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

        try {
            state.selectedComponentId = null;
            state.selectedSideItemId = null;

            state.currentView = "front";
            document.body.classList.remove("view-front", "view-rear");
            document.body.classList.add("view-front");
            renderRack();
            renderSideCompartments();
            renderSideView();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const frontCanvas = await html2canvas(rackFrameEl, {
                scale: 2,
                backgroundColor: "#1a1d1b",
                useCORS: true,
                logging: false
            });
            const sideCanvas = await html2canvas(sidePanelEl, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                logging: false
            });

            state.currentView = "rear";
            document.body.classList.remove("view-front", "view-rear");
            document.body.classList.add("view-rear");
            renderRack();
            renderSideCompartments();
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            const rearCanvas = await html2canvas(rackFrameEl, {
                scale: 2,
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
            const pageW = 297;
            const pageH = 210;
            const margin = 12;

            const footerY = pageH - 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(130, 130, 130);
            doc.text(`${state.rackProfile.tag} · Rev: ${revDate} · Rackmaster`, margin, footerY);
            doc.setTextColor(0, 0, 0);

            const metaW = 72;
            let my = margin + 5;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(state.rackProfile.name || "Rack", margin, my);
            my += 5;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`[${state.rackProfile.tag || "—"}]`, margin, my);
            doc.setTextColor(0, 0, 0);
            my += 6;

            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(margin, my, margin + metaW, my);
            my += 5;

            const metaRows = [
                ["Height:", `${state.rackHeightRU} RU`],
                ["Depth:", rackDepth > 0 ? `${rackDepth} cm` : "—"],
                ["Min. Clear.:", clearance > 0 ? `${clearance} cm` : "—"],
                ["Used:", `${usedRU} of ${state.rackHeightRU} RU`],
                ["Free:", `${state.rackHeightRU - usedRU} RU`],
                ["Total Power:", `${totalPower} W`]
            ];
            if (state.rackProfile.room) {
                metaRows.push(["Room / Site:", state.rackProfile.room]);
            }
            if (state.rackProfile.owner) {
                metaRows.push(["Description:", state.rackProfile.owner]);
            }
            if (state.rackProfile.notes) {
                const notesShort = state.rackProfile.notes.length > 38
                    ? state.rackProfile.notes.slice(0, 35) + "…"
                    : state.rackProfile.notes;
                metaRows.push(["Notes:", notesShort]);
            }

            doc.setFontSize(8.5);
            metaRows.forEach(([label, value]) => {
                doc.setFont("helvetica", "bold");
                doc.text(label, margin, my);
                doc.setFont("helvetica", "normal");
                doc.text(String(value), margin + 30, my);
                my += 5;
            });

            my += 2;
            doc.setFont("helvetica", "bold");
            doc.text("Conflicts:", margin, my);
            my += 5;
            doc.setFont("helvetica", "normal");
            if (conflictSet.size > 0) {
                doc.setTextColor(180, 30, 30);
                doc.text(`${conflictSet.size} component(s) in conflict`, margin, my);
            } else {
                doc.setTextColor(20, 140, 80);
                doc.text("None detected", margin, my);
            }
            doc.setTextColor(0, 0, 0);
            my += 8;

            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Revision: ${revDate}`, margin, my);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "normal");

            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.4);
            doc.line(margin + metaW + 4, margin, margin + metaW + 4, pageH - margin);

            const nativeFrontH = frontCanvas.height / 2;
            const nativeFrontW = frontCanvas.width / 2;
            const nativeSideW = sideCanvas.width / 2;
            const nativeSideH = sideCanvas.height / 2;
            const nativeRearW = rearCanvas.width / 2;
            const nativeRearH = rearCanvas.height / 2;

            const viewsX = margin + metaW + 10;
            const viewsAvailW = pageW - viewsX - margin;
            const viewsAvailH = pageH - margin - 18;
            const viewsY = margin + 10;
            const viewGap = 6;

            const viewH = Math.min(viewsAvailH, 155);
            const frontWRaw = viewH * nativeFrontW / nativeFrontH;
            const sideWRaw = viewH * nativeSideW / nativeSideH;
            const rearWRaw = viewH * nativeRearW / nativeRearH;
            const totalRaw = frontWRaw + sideWRaw + rearWRaw + viewGap * 2;
            const shrink = totalRaw > viewsAvailW ? viewsAvailW / totalRaw : 1;

            const frontW = frontWRaw * shrink;
            const sideW = sideWRaw * shrink;
            const rearW = rearWRaw * shrink;
            const actualVH = viewH * shrink;
            const gap = viewGap * shrink;

            const frontX = viewsX;
            const sideX = frontX + frontW + gap;
            const rearX = sideX + sideW + gap;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);

            const labelY = viewsY - 3;
            doc.text("FRONT VIEW", frontX + frontW / 2, labelY, { align: "center" });
            doc.text("SIDE VIEW (DEPTH)", sideX + sideW / 2, labelY, { align: "center" });
            doc.text("REAR VIEW", rearX + rearW / 2, labelY, { align: "center" });
            doc.setTextColor(0, 0, 0);

            doc.addImage(frontCanvas.toDataURL("image/png"), "PNG", frontX, viewsY, frontW, actualVH);
            doc.addImage(sideCanvas.toDataURL("image/png"), "PNG", sideX, viewsY, sideW, actualVH);
            doc.addImage(rearCanvas.toDataURL("image/png"), "PNG", rearX, viewsY, rearW, actualVH);

            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.2);
            doc.rect(frontX, viewsY, frontW, actualVH);
            doc.rect(sideX, viewsY, sideW, actualVH);
            doc.rect(rearX, viewsY, rearW, actualVH);

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
            if (exportButton) {
                exportButton.disabled = false;
            }
        }
    };
}
