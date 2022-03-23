<template>
    <div class="text-white flex flex-col space-y-2 h-screen text-lg">
        <div class="text-center py-6">
            <router-link to="/dashboard" class="text-xl text-white">{{ siteName }}</router-link>
        </div>
        <div class="flex flex-col space-y-4 pl-4" v-if="canUpload">
            <create-item-component />
        </div>
        <span v-if="user.administrator">
            <div class="border-b border-white pt-20"></div>
            <div class="flex flex-col space-y-4 pl-4">
                <div>Administrators</div>
                <div v-for="(control, idx) of adminControls" :key="idx">
                    <div
                        @click="$router.push(control.path)"
                        class="cursor-pointer"
                        :class="{ 'text-green-400': current === control.path }"
                    >
                        <i :class="control.icon"></i>
                        {{ control.name }}
                    </div>
                </div>
            </div>
        </span>
        <div class="flex-grow"></div>
        <div class="border-b border-white pt-20"></div>
        <div class="flex flex-col space-y-4 pl-4">
            <who-am-i-component />
            <div @click="logout" class="cursor-pointer">
                <i class="fa-solid fa-sign-out-alt"></i>
                logout
            </div>
        </div>
        <div class="h-10"></div>
    </div>
</template>

<script>
import CreateItemComponent from "@/components/item/CreateItem.component.vue";
import WhoAmIComponent from "@/components/WhoAmI.component.vue";
import { tokenSessionKey, removeLocalStorage } from "@/components/storage";

export default {
    components: {
        CreateItemComponent,
        WhoAmIComponent,
    },
    data() {
        return {
            siteName: this.$store.state.configuration.ui.siteName,
            adminControls: [
                {
                    name: "Permitted Users",
                    path: "/admin/users/permitted",
                    icon: "fa-solid fa-user-tag",
                },
                { name: "Manage Users", path: "/admin/users", icon: "fa-solid fa-users" },
                { name: "System Logs", path: "/admin/logs", icon: "fa-solid fa-clipboard-list" },
                { name: "Workspace Items", path: "/admin/items", icon: "fa-solid fa-file-image" },
            ],
        };
    },
    computed: {
        canUpload() {
            return this.$store.state.user.upload;
        },
        user: function () {
            return this.$store.state.user;
        },
        current: function () {
            return this.$route.path;
        },
    },
    methods: {
        async logout() {
            await this.$http.get({ route: "/logout" });
            removeLocalStorage({ key: tokenSessionKey });
            this.$router.push("/login");
        },
    },
};
</script>

<style lang="scss">
.el-color-primary {
    color: "#ffffff" !important;
}
</style>
