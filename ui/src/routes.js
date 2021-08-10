import Vue from "vue";
import VueRouter from "vue-router";
import ShellComponent from "@/components/Shell.component.vue";
import LogoutComponent from "@/components/Logout.component.vue";
import LoginComponent from "@/components/Login.component.vue";
import CallbackGoogleLogin from "@/components/authentication/GoogleOauthCallback.component.vue";
// import { isAuthenticated } from "./components/auth.service";

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
        component: CallbackGoogleLogin,
    },
];

const router = new VueRouter({
    mode: "history",
    base: "/",
    routes,
});
// router.beforeEach(onAuthRequired);

// async function onAuthRequired(to, from, next) {
//     if (to.meta?.requiresAuth) {
//         let isAuthed;
//         try {
//             isAuthed = await isAuthenticated();
//             if (!isAuthed && from.path !== "/login") return next({ path: "/login" });
//         } catch (error) {
//             if (!isAuthed && from.path !== "/login") return next({ path: "/login" });
//         }
//     }
//     next();
// }

export default router;
