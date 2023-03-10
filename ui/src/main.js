import "regenerator-runtime";
import "./assets/tailwind.css";
import "element-plus/theme-chalk/index.css";
import "@fortawesome/fontawesome-free/js/all";
import { config } from "@fortawesome/fontawesome-svg-core";
config.autoReplaceSvg = "nest";

import { createApp } from "vue";
import App from "./App.vue";
import { router, $http } from "./routes";
import { store } from "./store";
import ElementPlus from "element-plus";
import DescriboCrateBuilder from "@describo/crate-builder-component";

(async () => {
    let response = await fetch("/api/configuration");
    if (response.status === 200) {
        let configuration = await response.json();
        store.commit("saveConfiguration", { ...configuration });

        const app = createApp(App);
        app.use(store);
        app.use(router);
        app.use(ElementPlus);
        app.use(DescriboCrateBuilder);
        app.config.globalProperties.$http = $http;
        app.provide("$http", app.config.globalProperties.$http);
        app.mount("#app");
    }
})();
