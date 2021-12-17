<template>
    <div class="flex flex-row">
        <sidebar-component class="bg-gray-800 w-2/6 xl:w-1/6 h-screen" />
        <div class="w-4/6 xl:w-5/6">
            <router-view />
        </div>
    </div>
</template>

<script>
import { tokenSessionKey, getLocalStorage } from "@/components/storage";
import SidebarComponent from "./Sidebar.component.vue";
export default {
    components: {
        SidebarComponent,
    },
    data() {
        return {};
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            let response = await this.$http.get({ route: "/authenticated" });
            if (response.status === 200) {
                let { token } = getLocalStorage({ key: tokenSessionKey });
                let user = JSON.parse(atob(token.split(".")[1]));
                this.$store.commit("setUserData", user);
            }
            if (this.$route.path === "/") this.$router.push("/dashboard");
        },
    },
};
</script>
