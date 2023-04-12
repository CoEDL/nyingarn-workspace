<template>
    <div class="flex flex-col">
        <div class="flex flex-col border-2 rounded p-2 border-blue-200">
            <div class="ml-1 my-2">Upload the manuscript images</div>
            <div class="flex flex-row">
                <uploader-component
                    :overwrite="data.overwrite"
                    @upload-started="data.showProcessingStatus = false"
                    @file-uploaded="processUploadedImage"
                    @file-removed="fileRemoved"
                />
                <div class="flex flex-col space-y-2 px-2" v-if="!data.showProcessingStatus">
                    <image-help-component :identifier="identifier" />
                    <WarningBoxComponent
                        msg="Files larger than 10MB are not able to be processed with OCR."
                    />

                    <div class="flex flex-row space-x-4">
                        <div class="pt-1">Send images through OCR?</div>
                        <el-switch
                            v-model="data.ocr"
                            active-text="Yes"
                            :active-value="true"
                            inactive-text="No"
                            :inactive-value="false"
                        />
                    </div>
                </div>
                <ProcessingStatusComponent
                    class="w-full overflow-scroll processing-panel-height"
                    v-if="data.showProcessingStatus"
                    :taskIds="data.taskIds"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, inject } from "vue";
import UploaderComponent from "./Uploader.component.vue";
import ImageHelpComponent from "./HelpImages.component.vue";
import WarningBoxComponent from "../../../WarningBox.component.vue";
import ProcessingStatusComponent from "../ProcessingStatus.component.vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    showProcessingStatus: false,
    taskIds: [],
    overwrite: false,
    ocr: true,
});
const identifier = computed(() => $route.params.identifier);

function fileRemoved(file) {
    data.showProcessingStatus = false;
    data.taskIds = [];
}
async function processUploadedImage(file) {
    let action;
    if (!data.ocr) action = "process-image-without-ocr";
    let response = await $http.post({
        route: `/process/post-finish/${identifier.value}/${file.name}`,
        body: { action },
    });
    response = await response.json();
    data.showProcessingStatus = true;
    data.taskIds = [...data.taskIds, response.taskId];
}
</script>

<style scoped>
.processing-panel-height {
    height: 500px;
}
</style>
