import ShellComponent from "@/components/Shell.component.vue";
import LoginComponent from "@/components/Login.component.vue";
import CallbackOauthLogin from "@/components/authentication/OauthCallback.component.vue";
import DashboardComponent from "@/components/dashboard/Shell.component.vue";
import ViewItemComponent from "@/components/item/ViewItem/Shell.component.vue";
import ViewResourceComponent from "@/components/item/ViewResource/Shell.component.vue";
import AdminComponent from "@/components/admin/Shell.component.vue";
import AdminManageUsersComponent from "@/components/admin/users/ManageUsers.component.vue";
import AdminWhitelistUsersComponent from "@/components/admin/users/WhitelistUsers.component.vue";
import AdminLogsComponent from "@/components/admin/Logs.component.vue";
import AdminItemsComponent from "@/components/admin/Items.component.vue";
import HTTPService from "./http.service";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: "/",
        name: "root",
        component: ShellComponent,
        meta: {
            requiresAuth: true,
        },
        children: [
            { name: "dashboard", path: "dashboard", component: DashboardComponent },
            {
                name: "items/:identifier",
                path: "items/:identifier",
                component: ViewItemComponent,
                props: true,
                children: [
                    { path: "view", name: "items/:identifier/view", component: ViewItemComponent },
                    {
                        path: "metadata",
                        name: "items/:identifier/metadata",
                        component: ViewItemComponent,
                    },
                    {
                        path: "upload",
                        name: "items/:identifier/upload",
                        component: ViewItemComponent,
                    },
                    {
                        path: "processing",
                        name: "items/:identifier/processing",
                        component: ViewItemComponent,
                    },
                ],
            },
            {
                name: "resource/:identifier/:resource",
                path: "resource/:identifier/:resource",
                component: ViewResourceComponent,
            },
            {
                name: "admin",
                path: "admin",
                component: AdminComponent,
                children: [
                    {
                        name: "admin.users.invite",
                        path: "users/whitelist",
                        component: AdminWhitelistUsersComponent,
                        meta: { name: "whitelist users" },
                    },
                    {
                        name: "admin.users.manage",
                        path: "users",
                        component: AdminManageUsersComponent,
                        meta: { name: "manage users" },
                    },
                    {
                        name: "admin.logs",
                        path: "logs",
                        component: AdminLogsComponent,
                        meta: { name: "view system logs" },
                    },
                    {
                        name: "admin.items",
                        path: "items",
                        component: AdminItemsComponent,
                        meta: { name: "items in the workspace" },
                    },
                ],
            },
        ],
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

const router = createRouter({
    history: createWebHistory("/"),
    routes,
});
router.beforeEach(onAuthRequired);

async function onAuthRequired(to, from, next) {
    if (to.meta?.requiresAuth) {
        let isAuthed;
        try {
            isAuthed = await isAuthenticated();
            if (!isAuthed && from.name !== "login") return next({ path: "/login" });
            return next();
        } catch (error) {
            if (from.name !== "login") return next({ path: "/login" });
        }
    } else {
        next();
    }
}

export async function isAuthenticated() {
    try {
        const httpService = new HTTPService({ router });
        let response = await httpService.get({ route: "/authenticated" });
        if (response.status === 200) {
            return true;
        }
        return false;
    } catch (error) {
        console.log("isAuthenticated failure", error);
        return false;
    }
}

export default router;
