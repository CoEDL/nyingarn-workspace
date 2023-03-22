<template>
    <div class="flex flex-row bg-indigo-200 p-4 text-xl text-gray-700">
        <div>
            <i class="fa-solid fa-file-image"></i>
            {{ data.identifier }}
        </div>
        <div class="flex-grow"></div>
        <DownloadCompleteTeiDocumentComponent />
    </div>
</template>

<script setup>
import DownloadCompleteTeiDocumentComponent from "./DownloadCompleteTeiDocument.component.vue";
import { reactive, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();

let data = reactive({
    identifier: $route.params.identifier,
    taskIds: [],
    showProcessingStatus: false,
});
</script>
