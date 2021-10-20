<template>
    <div class="flex flex-row">
        <sidebar-component class="bg-gray-800 w-2/6 xl:w-1/6 h-screen" />
        <div class="w-4/6 xl:w-5/6">
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
