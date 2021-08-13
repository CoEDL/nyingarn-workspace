import Vue from "vue";
import VueRouter from "vue-router";
import ShellComponent from "@/components/Shell.component.vue";
import LoginComponent from "@/components/Login.component.vue";
import CallbackOauthLogin from "@/components/authentication/OauthCallback.component.vue";
import HTTPService from "./http.service";

Vue.use(VueRouter);

const routes = [
    {
        path: "/",
        name: "root",
        component: ShellComponent,
        meta: {
            requiresAuth: true,
        },
    },
    {
        name: "login",
        path: "/login",
        component: LoginComponent,
    },
    {
        name: "callback-google-login",
        path: "/callback-google-login",
        component: CallbackOauthLogin,
    },
    {
        name: "callback-aaf-login",
        path: "/callback-aaf-login",
        component: CallbackOauthLogin,
    },
];

const router = new VueRouter({
    mode: "history",
    base: "/",
    routes,
});
router.beforeEach(onAuthRequired);

async function onAuthRequired(to, from, next) {
    const httpService = new HTTPService();
    let isAuthed = await httpService.get({ route: "/authenticated" });
    if (isAuthed.status === 200 && to.path === "/login") return next({ path: "/" });
    if (to.meta?.requiresAuth) {
        try {
            if (isAuthed.status === 401 && from.path !== "/login") return next({ path: "/login" });
        } catch (error) {
            if (from.path !== "/login") return next({ path: "/login" });
        }
    }
    next();
}

export default router;
