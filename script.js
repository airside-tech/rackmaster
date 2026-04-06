import { initIndexPage } from "./js/modules/index/initIndexPage.js";
import { initPlannerPage } from "./js/modules/planner/initPlannerPage.js";

document.addEventListener("DOMContentLoaded", () => {
    if (document.body.classList.contains("index-page")) {
        initIndexPage();
        return;
    }

    initPlannerPage();
});
