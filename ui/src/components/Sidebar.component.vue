<template>
    <div class="text-white flex flex-col space-y-2 h-screen text-lg">
        <div class="text-center py-6">
            <router-link to="/dashboard" class="text-2xl text-white">{{ siteName }}</router-link>
        </div>
        <div class="flex flex-col space-y-4 pl-4">
            <create-item-component />
        </div>
        <span v-if="user.administrator">
            <div class="border-b border-white pt-20"></div>
            <div class="flex flex-col space-y-4 pl-4">
                <div>Administrators</div>
                <div
                    @click="$router.push('/admin/users')"
                    class="cursor-pointer"
                    :class="{ 'text-green-400': current === '/admin/users' }"
                >
                    <i class="fas fa-users"></i>
                    Manage Users
                </div>
            </div>
        </span>
        <div class="flex-grow"></div>
        <div class="border-b border-white pt-20"></div>
        <div class="flex flex-col space-y-4 pl-4">
            <who-am-i-component />
            <div @click="logout" class="cursor-pointer">
                <i class="fas fa-sign-out-alt"></i>
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
        };
    },
    computed: {
        user: function () {
            return this.$store.state.userData;
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
