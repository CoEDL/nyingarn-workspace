<template>
    <div class="flex flex-col h-40" v-loading="data.loading"></div>
</template>

<script setup>
import {
    loginSessionKey,
    tokenSessionKey,
    putLocalStorage,
    removeLocalStorage,
} from "../../storage.js";

import { reactive, onMounted, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const $http = inject("$http");

const data = reactive({
    error: false,
    loading: true,
});
onMounted(() => {
    login();
});
async function login() {
    const { otp } = $route.params;
    removeLocalStorage({ key: loginSessionKey });
    let response = await $http.post({
        route: `/auth/otp`,
        body: { otp },
    });
    if (response.status !== 200) {
        await $router.push("/");
    } else {
        let { token } = await response.json();
        let user = JSON.parse(atob(token.split(".")[1]));
        $store.commit("setUserData", user);

        putLocalStorage({ key: tokenSessionKey, data: { token } });
        await $router.push("/");
    }
}
</script>
