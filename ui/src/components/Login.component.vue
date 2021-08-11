<template>
    <div class="flex flex-col">
        <google-login-component v-if="enableGoogleLogin" />
    </div>
</template>

<script>
import { has } from "lodash";
import GoogleLoginComponent from "@/components/authentication/GoogleOauthLogin.component.vue";
export default {
    components: {
        GoogleLoginComponent,
    },
    data() {
        return {};
    },
    computed: {
        enableGoogleLogin() {
            return has(this.$store.state.configuration.services, "google");
        },
    },
    mounted() {},
    methods: {},
};
</script>
