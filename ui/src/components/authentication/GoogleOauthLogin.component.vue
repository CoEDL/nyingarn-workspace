<template>
    <div>
        <el-button @click="login"><i class="fab fa-google"></i> sign with Google</el-button>
    </div>
</template>

<script>
export default {
    data() {
        return {
            configuration: this.$store.state.configuration.services.google,
            scope: "openid profile email",
        };
    },
    mounted() {},
    methods: {
        login() {
            let url = `${this.configuration.authorizationEndpoint}?`;
            url += `client_id=${this.configuration.clientId}&`;
            url += `response_type=code&`;
            url += `scope=${encodeURIComponent(this.scope)}&`;
            url += `redirect_uri=${window.location.origin}/callback-google-login`;
            window.location.href = url;
        },
    },
};
</script>
