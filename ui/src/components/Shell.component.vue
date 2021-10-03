<template>
    <div class="flex flex-row">
        <sidebar-component class="bg-gray-800 w-1/3 lg:w-1/5 h-screen" />
        <div class="flex flex-col p-2 w-2/3 lg:w-4/5">
            <router-view />
        </div>
    </div>
</template>

<script>
import SidebarComponent from "./Sidebar.component.vue";
export default {
    components: {
        SidebarComponent,
    },
    data() {
        return {};
    },
    mounted() {
        if (this.$route.path === "/") this.$router.push("/dashboard");
    },
};
</script>
