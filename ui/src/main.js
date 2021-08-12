import "regenerator-runtime";
import "@/assets/tailwind.css";
import "element-ui/lib/theme-chalk/index.css";
import "@fortawesome/fontawesome-free/js/all";
import { config } from "@fortawesome/fontawesome-svg-core";
config.autoReplaceSvg = "nest";

import Vue from "vue";
import App from "./App.vue";
import router from "./routes";
import { store } from "./store";
import ElementUI from "element-ui";
import locale from "element-ui/lib/locale/lang/en";
import log from "loglevel";
import prefix from "loglevel-plugin-prefix";
const level = process.env.NODE_ENV === "development" ? "debug" : "warn";
log.setLevel(level);
const prefixer = prefix.noConflict();
prefixer.reg(log);
prefixer.apply(log);
import { io } from "socket.io-client";
import HTTPService from "./http.service";

(async () => {
    let response = await fetch("/api/configuration");
    if (response.status === 200) {
        let { ui, authentication } = await response.json();
        store.commit("saveConfiguration", { ui, authentication });

        Vue.prototype.$http = new HTTPService();
        Vue.prototype.$log = log;
        // Vue.prototype.$socket = io();

        Vue.use(ElementUI, { locale });

        Vue.config.productionTip = false;

        new Vue({
            router,
            store,
            render: (h) => h(App),
        }).$mount("#app");
    }
})();
