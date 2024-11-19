<template>
    <div class="flex h-screen">
        <div class="w-full m-auto">
            <div
                v-if="$store.state.configuration.ui?.notices?.workspace?.length"
                class="flex flex-col space-y-2 text-center m-10 p-10 bg-yellow-200 rounded text-xl"
            >
                <div v-for="notice of $store.state.configuration.ui.notices.workspace">
                    {{ notice }}
                </div>
            </div>
            <div class="flex flex-row">
                <div
                    class="w-1/2 text-right pr-4 text-gray-600 text-4xl flex flex-col justify-center"
                >
                    <div>
                        {{ data.siteName }}
                    </div>
                </div>
                <div class="w-1/2 pl-4 flex flex-col space-y-4">
                    <oauth-login-component
                        v-for="provider of data.loginProviders"
                        :key="provider.name"
                        :provider="provider.name"
                        :image="provider.icon"
                        :button-text="provider.text"
                        class="border-l-4 border-solid p-4 cursor-pointer hover:border-yellow-400 hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-100"
                    />
                    <MagicLinkComponent
                        class="border-l-4 border-solid p-4 cursor-pointer hover:border-yellow-400 hover:bg-yellow-100 focus:ring-2 focus:ring-yellow-100"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import MagicLinkComponent from "./authentication/MagicLink.component.vue";
import { defineAsyncComponent, reactive, computed, onMounted } from "vue";
import { useStore } from "vuex";
const $store = useStore();

const OauthLoginComponent = defineAsyncComponent(() =>
    import("./authentication/OauthLogin.component.vue")
);

let enableGoogleLogin = computed(() =>
    $store.state.configuration.authentication.includes("google")
);
let enableAafLogin = computed(() => $store.state.configuration.authentication.includes("aaf"));


const data = reactive({
    siteName: $store.state.configuration.ui.siteName,
    loginProviders: []
});

onMounted(() => {
    if ($store.state.configuration.authentication.includes("aaf")) {
        data.loginProviders.push({ name: "aaf", icon: "aaf.png", text: "Login with the AAF" })
    }
    if ($store.state.configuration.authentication.includes("google")) {
        data.loginProviders.push({ name: "google", icon: "google.png", text: "Login with Google" })
    }
})

</script>
