import ShellComponent from "./components/Shell.component.vue";
import LoginComponent from "./components/Login.component.vue";
import CallbackOauthLogin from "./components/authentication/OauthCallback.component.vue";
import CallbackOtpLogin from "./components/authentication/OtpCallback.component.vue";
import DashboardComponent from "./components/dashboard/Shell.component.vue";
import ViewItemComponent from "./components/item/ViewItem/Shell.component.vue";
import ViewCollectionComponent from "./components/collection/ViewCollection/Shell.component.vue";
import ViewResourceComponent from "./components/item/ViewResource/Shell.component.vue";
import AdminComponent from "./components/admin/Shell.component.vue";
import AdminManageUsersComponent from "./components/admin/users/ManageUsers.component.vue";
import AdminCreateUserAccountsComponent from "./components/admin/users/CreateUserAccounts.component.vue";
import AdminLogsComponent from "./components/admin/Logs.component.vue";
import AdminAwaitingReviewComponent from "./components/admin/AwaitingReview.component.vue";
import AdminWorkspaceItemsComponent from "./components/admin/WorkspaceItems.component.vue";
import AdminRepositoryItemsComponent from "./components/admin/RepositoryItems.component.vue";
import AdminOperationsComponent from "./components/admin/AdminOperations.component.vue";
import AdminSearchConfig from "./components/admin/AdminSearchConfig.component.vue";
import HTTPService from "./http.service.js";
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
                meta: {
                    type: "item",
                },
                children: [
                    { path: "view", name: "items/:identifier/view", component: ViewItemComponent },
                    {
                        path: "metadata",
                        name: "items/:identifier/metadata",
                        component: ViewItemComponent,
                    },
                    {
                        path: "associate",
                        name: "items/:identifier/associate",
                        component: ViewItemComponent,
                    },
                    {
                        path: "upload",
                        name: "items/:identifier/upload",
                        component: ViewItemComponent,
                    },
                    {
                        path: "administration",
                        name: "items/:identifier/administration",
                        component: ViewItemComponent,
                    },
                    {
                        path: "publish",
                        name: "items/:identifier/publish",
                        component: ViewItemComponent,
                    },
                ],
            },
            {
                name: "collections/:identifier",
                path: "collections/:identifier",
                component: ViewCollectionComponent,
                props: true,
                meta: {
                    type: "collection",
                },
                children: [
                    {
                        path: "members",
                        name: "collections/:identifier/members",
                        component: ViewCollectionComponent,
                    },
                    {
                        path: "associate",
                        name: "collections/:identifier/associate",
                        component: ViewCollectionComponent,
                    },
                    {
                        path: "metadata",
                        name: "collections/:identifier/metadata",
                        component: ViewCollectionComponent,
                    },
                    {
                        path: "administration",
                        name: "collections/:identifier/administration",
                        component: ViewCollectionComponent,
                    },
                    {
                        path: "publish",
                        name: "collections/:identifier/publish",
                        component: ViewCollectionComponent,
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
                        path: "users/permitted",
                        component: AdminCreateUserAccountsComponent,
                        meta: { name: "permitted users" },
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
                        name: "admin.review",
                        path: "awaiting-review",
                        component: AdminAwaitingReviewComponent,
                        meta: { name: "items and collections Awaiting Review" },
                    },
                    {
                        name: "admin.items",
                        path: "workspace-items",
                        component: AdminWorkspaceItemsComponent,
                        meta: { name: "items and collections in the workspace" },
                    },
                    {
                        name: "admin.repositoryItems",
                        path: "repository-items",
                        component: AdminRepositoryItemsComponent,
                        meta: { name: "items and collections in the repository" },
                    },
                    {
                        name: "admin.operations",
                        path: "operations",
                        component: AdminOperationsComponent,
                        meta: { name: "administrator operations" },
                    },
                    {
                        name: "admin.searchConfig",
                        path: "search-config",
                        component: AdminSearchConfig,
                        meta: { name: "administrator search config" },
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
    {
        name: "callback-oauth-login",
        path: "/callback-oauth-login",
        component: CallbackOauthLogin,
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
router.beforeEach(onAuthRequired);
export const $http = new HTTPService({ router });

async function onAuthRequired(to, from, next) {
    if (to.meta?.requiresAuth) {
        let isAuthed;
        try {
            isAuthed = await isAuthenticated();
            if (!isAuthed && from.name !== "login") return next({ path: "/login" });
            return next();
        } catch (error) {
            if (from.name !== "login") {
                return next({ path: "/login" });
            }
        }
    } else {
        next();
    }
}

export async function isAuthenticated() {
    try {
        let response = await $http.get({ route: "/authenticated" });
        if (response.status === 200) {
            return true;
        }
        return false;
    } catch (error) {
        console.log("isAuthenticated failure", error);
        return false;
    }
}
