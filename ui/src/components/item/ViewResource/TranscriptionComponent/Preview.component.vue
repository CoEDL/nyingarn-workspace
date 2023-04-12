<template>
    <div class="overflow-scroll" :style="{ height: height }">
        <div ref="previewPanel" class="text-gray-200 font-light bg-gray-800"></div>
    </div>
</template>

<script setup>
import "../../../../assets/tei.css";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { transformDocument } from "./codemirror-editor.js";
const $route = useRoute();

const previewPanel = ref(null);

onMounted(() => {
    renderDocumentPreview();
});
let height = `${window.innerHeight - 250}px`;

async function renderDocumentPreview() {
    let { document, error } = await transformDocument({
        identifier: $route.params.identifier,
        resource: $route.params.resource,
    });
    if (document) {
        previewPanel.value.insertAdjacentHTML("beforeend", document);
    } else {
        previewPanel.value.insertAdjacentHTML("beforeend", error.message);
    }
}
</script>
