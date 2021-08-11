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
            let { code_verifier } = JSON.parse(window.localStorage.getItem("login-session-data"));
            window.localStorage.removeItem("login-session-data");
            let response = await this.$http.post({
                route: `/auth/${this.$route.query.state}/code`,
                body: { code: this.$route.query.code, code_verifier },
            });
            if (response.status !== 200) {
                this.error = true;
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await this.$router.push("/login");
            } else {
                await this.$router.push("/login");
            }
        },
    },
};
</script>
