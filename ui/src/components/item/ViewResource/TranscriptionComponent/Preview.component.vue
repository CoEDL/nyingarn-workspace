<template>
    <div ref="previewPanel" :class="maxHeight" class="text-gray-200 font-light bg-gray-800"></div>
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
let maxHeight = computed(() => {
    return { "max-height": `${window.innerHeight - 300}px` };
});
let color = computed(() => {
    return { color: `x` };
});

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
