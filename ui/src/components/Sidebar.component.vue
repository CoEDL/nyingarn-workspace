<template>
    <div class="text-white flex flex-col space-y-2 h-screen">
        <div class="text-center py-6">
            <router-link to="/dashboard" class="text-2xl text-white">{{ siteName }}</router-link>
        </div>
        <div class="flex flex-col space-y-4 pl-4">
            <create-item-component />
        </div>
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
        height: function () {
            return `${window.innerHeight - 150}px`;
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
