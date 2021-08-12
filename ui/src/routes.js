import Vue from "vue";
import VueRouter from "vue-router";
import ShellComponent from "@/components/Shell.component.vue";
import LogoutComponent from "@/components/Logout.component.vue";
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
        name: "logout",
        path: "/logout",
        component: LogoutComponent,
        meta: {
            requiresAuth: true,
        },
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
    if (to.meta?.requiresAuth) {
        let isAuthed;
        try {
            isAuthed = await httpService.get({ route: "/authenticated" });
            if (isAuthed.status === 401 && from.path !== "/login") return next({ path: "/login" });
        } catch (error) {
            if (from.path !== "/login") return next({ path: "/login" });
        }
    }
    next();
}

export default router;
