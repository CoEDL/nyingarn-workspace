<template>
    <div class="flex flex-col">
        <navigation-component />
        <router-view />
    </div>
</template>

<script>
import NavigationComponent from "./Navigation.component.vue";
export default {
    components: {
        NavigationComponent,
    },
    data() {
        return {};
    },
    mounted() {
        if (this.$route.path === "/") this.$router.push("/dashboard");
    },
};
</script>
