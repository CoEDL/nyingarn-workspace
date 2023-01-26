<template>
    <div class="flex flex-row relative">
        <div class="relative bg-gray-800 h-screen" :style="sidebarWidth">
            <sidebar-component class="w-full bg-gray-800 h-screen" v-show="data.expanded" />
        </div>
        <div
            class="relative flex flex-col justify-center -left-5 top-20 z-10 p-2 h-52 text-2xl text-white bg-gray-800 rounded border-solid border-black cursor-pointer"
            @click="data.expanded = !data.expanded"
        >
            <div v-show="data.expanded"><i class="fa-solid fa-chevron-left"></i></div>
            <div v-show="!data.expanded"><i class="fa-solid fa-chevron-right"></i></div>
        </div>
        <div class="w-full relative -ml-8">
            <router-view />
        </div>
    </div>
</template>

<script setup>
import { tokenSessionKey, getLocalStorage } from "./storage.js";
import SidebarComponent from "./Sidebar.component.vue";
import { reactive, onMounted, inject, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "vuex";
import { round } from "lodash";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();
const $store = useStore();
const data = reactive({
    expanded: true,
});
onMounted(() => {
    init();
});

let sidebarWidth = computed(() => {
    if (data.expanded) {
        return { "min-width": `250px` };
    } else {
        return { width: `10px` };
    }
});
async function init() {
    let response = await $http.get({ route: "/authenticated" });
    if (response.status === 200) {
        let { token } = getLocalStorage({ key: tokenSessionKey });
        let user = JSON.parse(atob(token.split(".")[1]));
        $store.commit("setUserData", user);
    }
    if ($route.path === "/") $router.push("/dashboard");
}
</script>
