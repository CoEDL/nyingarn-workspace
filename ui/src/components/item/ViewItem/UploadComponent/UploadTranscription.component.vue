<template>
    <div class="flex flex-row border-2 rounded p-2 border-blue-200">
        <div class="w-1/2 lg:w-2/5">
            <div class="ml-1 my-2">Upload a transcription</div>
            <FileUploadComponent
                :filename-pattern="['-tei.xml', '-digivol.csv']"
                @upload-started="data.showProcessingStatus = false"
                @file-uploaded="handleUploadedTranscription"
            />
        </div>
        <div class="w-1/2 lg:w-3/5 px-2">
            <HelpTranscriptionComponent
                :identifier="identifier"
                v-if="!data.showProcessingStatus"
            />
            <ProcessingStatusComponent v-if="data.showProcessingStatus" :taskIds="data.taskIds" />
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, inject, defineAsyncComponent } from "vue";
import HelpTranscriptionComponent from "./HelpTranscription.component.vue";
import ProcessingStatusComponent from "../ProcessingStatus.component.vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");
const FileUploadComponent = defineAsyncComponent(() => import("./FileUpload.component.vue"));

const data = reactive({
    showProcessingStatus: false,
    taskIds: [],
});
const identifier = computed(() => $route.params.identifier);

async function handleUploadedTranscription(file) {
    let response = await $http.post({
        route: `/process/post-finish/${identifier.value}/${file.name}`,
        body: {},
    });
    response = await response.json();
    data.showProcessingStatus = true;
    data.taskIds = [response.taskId];
}
</script>

<style scoped></style>
