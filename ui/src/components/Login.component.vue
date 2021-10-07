<template>
    <div class="flex h-screen">
        <div class="w-full m-auto">
            <div class="flex flex-row">
                <div
                    class="
                        w-1/2
                        text-right
                        pr-4
                        text-gray-600 text-4xl
                        flex flex-col
                        justify-center
                    "
                >
                    <div>
                        {{ siteName }}
                    </div>
                </div>
                <div class="w-1/2 pl-4 flex flex-col space-y-4">
                    <!-- <div
                        ref="recaptcha"
                        :data-sitekey="recaptchaSiteKey"
                        :data-callback="handleRecaptcha"
                        v-if="!enableAuthenticationMethods"
                    ></div> -->
                    <span v-if="enableAuthenticationMethods">
                        <oauth-login-component
                            v-if="enableAafLogin"
                            provider="aaf"
                            image="aaf.png"
                            button-text="Login with the AAF"
                            class="
                                border-l-4 border-solid
                                p-4
                                cursor-pointer
                                hover:border-yellow-400 hover:bg-yellow-100
                                focus:ring-2 focus:ring-yellow-100
                            "
                        />
                        <oauth-login-component
                            v-if="enableGoogleLogin"
                            provider="google"
                            image="google.png"
                            button-text="Login with Google"
                            class="
                                border-l-4 border-solid
                                p-4
                                cursor-pointer
                                hover:border-yellow-400 hover:bg-yellow-100
                                focus:ring-2 focus:ring-yellow-100
                            "
                        />
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { defineAsyncComponent } from "vue";
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    components: {
        OauthLoginComponent: defineAsyncComponent(() =>
            import("@/components/authentication/OauthLogin.component.vue")
        ),
    },
    data() {
        return {
            siteName: this.$store.state.configuration.ui.siteName,
            recaptchaSiteKey: this.$store.state.configuration.ui.recaptcha.siteKey,
            enableAuthenticationMethods: true,
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
    mounted() {
        // this.initRecaptcha();
    },
    methods: {
        // initRecaptcha() {
        //     grecaptcha.render(this.$refs.recaptcha, {
        //         sitekey: this.recaptchaSiteKey,
        //         callback: this.handleRecaptcha,
        //     });
        // },
        // async handleRecaptcha(token) {
        //     let response = await httpService.post({ route: "/recaptcha", body: { token } });
        //     if (response.status === 200) {
        //         this.enableAuthenticationMethods = true;
        //     }
        // },
    },
};
</script>
