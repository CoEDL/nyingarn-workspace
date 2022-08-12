<template>
    <div>
        <iframe :src="data.url" class="h-full" :style="frameStyle" />
    </div>
</template>

<script setup>
import { reactive, computed, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
const route = useRoute();
const $http = inject("$http");
import { ElLoading } from "element-plus";

const data = reactive({
    url: undefined,
    loading: true,
    windowWidth: window.innerWidth,
});

let frameStyle = computed(() => {
    if (data.windowWidth <= 1100) {
        return {
            width: `${data.windowWidth * (4 / 6) - 60}px`,
            height: `${window.innerHeight - 160}px`,
        };
    } else {
        return {
            width: `${data.windowWidth * (5 / 6) - 40}px`,
            height: `${window.innerHeight - 160}px`,
        };
    }
});
onMounted(() => {
    window.addEventListener("resize", () => {
        data.windowWidth = window.innerWidth;
    });
    init();
});
async function init() {
    let loading = ElLoading.service({
        lock: true,
        text: "Loading",
        background: "rgba(0, 0, 0, 0.7)",
    });
    let response = await $http.post({
        route: "/describo",
        body: { identifier: route.params.identifier, type: route.meta.type },
    });
    data.url = (await response.json()).url;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    loading.close();
}
</script>
