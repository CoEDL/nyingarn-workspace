<template>
    <div class="flex flex-col p-4">
        <div class="text-2xl text-gray-800 tracking-wider border-b border-solid mb-10 py-2">
            <i class="text-yellow-600 fa-solid fa-user-shield"></i>
            Administrator: {{ $route.meta.name }}
        </div>

        <router-view v-if="enableRouterView"></router-view>
    </div>
</template>

<script>
export default {
    data() {
        return {
            enableRouterView: false,
        };
    },
    beforeMount() {
        this.checkAdminAccess();
    },
    methods: {
        async checkAdminAccess() {
            let response = await this.$http.get({ route: "/admin" });
            if (response.status !== 200) {
                this.$router.push("/dashboard").catch(() => {});
                return;
            }
            this.enableRouterView = true;
        },
    },
};
</script>
