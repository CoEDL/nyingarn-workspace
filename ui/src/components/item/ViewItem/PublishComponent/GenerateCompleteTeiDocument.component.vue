<template>
    <div>
        <div v-if="!data.showProcessingStatus">
            <el-button
                v-if="!data.disableTeiGeneration"
                @click="generateTeiDocument"
                type="primary"
            >
                Generate the complete TEI document
            </el-button>
            <div v-if="data.disableTeiGeneration" class="text-base">
                This item has pages with invalid TEI markup
            </div>
        </div>
        <div v-if="data.showProcessingStatus" class="text-blue-600">
            <span class="fa-stack">
                <i class="fa-solid fa-cog fa-spin" data-fa-transform=""></i>
                <i
                    class="fa-solid fa-cog fa-spin fa-spin-reverse"
                    data-fa-transform="left-2 down-8"
                ></i>
            </span>
        </div>
    </div>
</template>

<script setup>
import { reactive, inject, nextTick, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getFileUrl, getStatus as getItemStatus } from "../../item-services.js";
import { ElMessage } from "element-plus";

const $route = useRoute();
const $http = inject("$http");

const $emit = defineEmits(["tei-generated"]);

let data = reactive({
    disableTeiGeneration: false,
    identifier: $route.params.identifier,
    showProcessingStatus: false,
    downloadLink: undefined,
});

onMounted(() => {
    getStatus();
});

async function getStatus() {
    let response = await getItemStatus({
        $http,
        identifier: data.identifier,
    });
    if (response.status === 200) {
        response = await response.json();
        if (response.status.pages.bad !== 0) data.disableTeiGeneration = true;
    }
}

async function generateTeiDocument() {
    let response = await $http.post({
        route: `/process/assemble-tei/${data.identifier}`,
        body: {},
    });
    if (response.status === 200) {
        response = await response.json();
        data.showProcessingStatus = true;
        if (response.taskId) {
            const taskId = response.taskId;
            let status = await updateProcessingStatus({ taskId });
            while (status === "in progress") {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                status = await updateProcessingStatus({ taskId });
            }
            if (status === "failed") {
                ElMessage({
                    message: `There was an issue assembling the TEI file. It's likely one of the page transcriptions is invalid.`,
                    type: "error",
                });
                return;
            }
        }
        data.showProcessingStatus = false;
        $emit("tei-generated");
    }
}

async function updateProcessingStatus({ taskId }) {
    let response = await $http.post({
        route: `/items/${data.identifier}/resources/processing-status`,
        body: { taskIds: [taskId] },
    });
    let { tasks } = await response.json();
    const task = tasks.pop();
    return task.status;
}
</script>
