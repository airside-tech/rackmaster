import { initIndexPage } from "./js/modules/index/initIndexPage.js";
import { initPlannerPage } from "./js/modules/planner/initPlannerPage.js";
import { initializeCatalogStorage } from "./js/modules/storage.js";

document.addEventListener("DOMContentLoaded", async () => {
    await initializeCatalogStorage();

    if (document.body.classList.contains("index-page")) {
        initIndexPage();
        return;
    }

    await initPlannerPage();
});
