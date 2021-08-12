<template>
    <div class="flex flex-row border-b border-solid py-4">
        <div class="text-xl text-gray-600 pl-4">{{ siteName }}</div>
        <div class="flex-grow"></div>
        <div>
            <el-button size="small" @click="logout"><i class="fas fa-sign-out-alt"></i></el-button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            siteName: this.$store.state.configuration.ui.siteName,
        };
    },
    methods: {
        async logout() {
            await this.$http.get({ route: "/logout" });
            this.$router.push("/login");
        },
    },
};
</script>
