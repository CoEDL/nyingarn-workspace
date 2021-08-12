<template>
    <div class="flex h-screen">
        <div class="w-full m-auto">
            <div class="flex flex-row">
                <div
                    class="w-1/2 text-right pr-4 text-gray-600 text-4xl flex flex-col justify-center"
                >
                    <div>
                        {{ siteName }}
                    </div>
                </div>
                <div class="w-1/2 pl-4 flex flex-col space-y-4">
                    <oauth-login-component
                        v-if="enableAafLogin"
                        provider="aaf"
                        image="aaf.png"
                        button-text="Login with the AAF"
                        class="border-l-4 border-solid p-4 cursor-pointer hover:border-yellow-400 hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-100"
                    />
                    <oauth-login-component
                        v-if="enableGoogleLogin"
                        provider="google"
                        image="google.png"
                        button-text="Login with Google"
                        class="border-l-4 border-solid p-4 cursor-pointer hover:border-yellow-400 hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-100"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    components: {
        OauthLoginComponent: () => import("@/components/authentication/OauthLogin.component.vue"),
    },
    data() {
        return {
            siteName: this.$store.state.configuration.ui.siteName,
        };
    },
    computed: {
        enableGoogleLogin() {
            return this.$store.state.configuration.authentication.includes("google");
        },
        enableAafLogin() {
            return this.$store.state.configuration.authentication.includes("aaf");
        },
    },
    mounted() {},
    methods: {},
};
</script>
