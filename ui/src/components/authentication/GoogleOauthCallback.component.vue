<template>
    <div class="flex flex-col"></div>
</template>

<script>
export default {
    data() {
        return {
            error: false,
        };
    },
    mounted() {
        this.login();
    },
    methods: {
        async login() {
            let response = await this.$http.post({
                route: "/auth/google/code",
                body: { code: this.$route.query.code },
            });
            if (response.status !== 200) {
                this.error = true;
                await new Promise(setTimeout(resolve, 5000));
                await this.$router.push("/login");
            } else {
                await this.$router.push("/login");
            }
        },
    },
};
</script>
