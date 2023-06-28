<template>
    <div class="overflow-scroll document">
        <div ref="previewPanel"></div>
    </div>
</template>

<script setup>
import "./tei.css";
import { ref, watch } from "vue";

const props = defineProps({
    document: { required: true },
});

const previewPanel = ref(null);

watch(
    () => props.document,
    () => {
        if (props.document) renderDocumentPreview();
    }
);
async function renderDocumentPreview() {
    previewPanel.value.innerHTML = "";
    if (document) {
        previewPanel.value.insertAdjacentHTML("beforeend", props.document);
    } else {
        previewPanel.value.insertAdjacentHTML("beforeend", error.message);
    }
}
</script>

<style>
.document {
    height: 800px;
}
</style>
