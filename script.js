import { initializeCatalogStorage } from "./js/modules/storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initializeCatalogStorage();

        if (document.body.classList.contains("index-page")) {
            const { initIndexPage } = await import("./js/modules/index/initIndexPage.js");
            initIndexPage();
            return;
        }

        const { initPlannerPage } = await import("./js/modules/planner/initPlannerPage.js");
        await initPlannerPage();
    } catch (error) {
        console.error("RackMaster startup failed:", error);
        const plannerNoticeEl = document.getElementById("plannerNotice");
        const indexStatusEl = document.getElementById("indexStatus");
        const message = `RackMaster startup failed: ${error?.message || "Unknown error"}`;

        if (plannerNoticeEl) {
            plannerNoticeEl.textContent = message;
            plannerNoticeEl.classList.remove("planner-notice--info", "planner-notice--success", "planner-notice--warning");
            plannerNoticeEl.classList.add("planner-notice--error");
        } else if (indexStatusEl) {
            indexStatusEl.textContent = message;
        }
    }
});
