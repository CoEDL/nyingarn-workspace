<template>
    <div class="flex flex-col"></div>
</template>

<script>
import {
    loginSessionKey,
    tokenSessionKey,
    putLocalStorage,
    getLocalStorage,
    removeLocalStorage,
} from "@/components/storage";
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
            let { code_verifier } = getLocalStorage({ key: loginSessionKey });
            removeLocalStorage({ key: loginSessionKey });
            let response = await this.$http.post({
                route: `/auth/${this.$route.query.state}/code`,
                body: { code: this.$route.query.code, code_verifier },
            });
            if (response.status !== 200) {
                this.error = true;
                await new Promise((resolve) => setTimeout(resolve, 2000));
                await this.$router.push("/login");
            } else {
                let { token } = await response.json();
                let userData = JSON.parse(atob(token.split(".")[1]));
                this.$store.commit("setUserData", userData);

                putLocalStorage({ key: tokenSessionKey, data: { token } });
                await this.$router.push("/");
            }
        },
    },
};
</script>
