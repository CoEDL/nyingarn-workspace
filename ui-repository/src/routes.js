import HTTPService from "./http.service.js";
import HomePageShellComponent from "./components/home-page/Shell.component.vue";
import ItemViewComponent from "./components/item/Shell.component.vue";
import CallbackOtpLogin from "./components/authentication/OtpCallback.component.vue";
import { createRouter, createWebHistory } from "vue-router";
const routes = [
    {
        path: "/",
        name: "root",
        component: HomePageShellComponent,
        children: [],
    },
    {
        path: "/item/:itemId",
        name: "item",
        component: ItemViewComponent,
        props: true,
        children: [
            {
                path: "crate",
                name: "item-rocrate-metadata",
                component: ItemViewComponent,
                props: true,
            },
            {
                path: ":pageId",
                name: "item-page",
                component: ItemViewComponent,
                props: true,
            },
        ],
    },
    {
        name: "otp-login",
        path: "/otp/:otp",
        component: CallbackOtpLogin,
    },
];

export const router = createRouter({
    history: createWebHistory("/"),
    routes,
});
export const $http = new HTTPService({ router });
