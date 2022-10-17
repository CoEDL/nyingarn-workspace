<template>
    <div class="overflow-scroll" :style="{ height: height }">
        <div ref="previewPanel" class="text-gray-200 font-light bg-gray-800"></div>
    </div>
</template>

<script setup>
import "@/assets/tei.css";
import { ref, onMounted, inject, computed } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const previewPanel = ref(null);

onMounted(() => {
    renderDocumentPreview();
});
let height = `${window.innerHeight - 250}px`;

async function renderDocumentPreview() {
    let response = await $http.get({
        route: `/items/${$route.params.identifier}/resources/${$route.params.resource}/transform`,
    });
    if (response.status !== 200) {
    }
    let { document } = await response.json();
    previewPanel.value.insertAdjacentHTML("beforeend", document);
}
</script>
