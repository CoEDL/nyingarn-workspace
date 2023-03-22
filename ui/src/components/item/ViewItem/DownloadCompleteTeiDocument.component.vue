<template>
    <div>
        <div v-if="!data.showProcessingStatus">
            <el-button @click="downloadTeiDocument" type="primary">
                Download the TEI document
            </el-button>
        </div>
        <div v-if="data.showProcessingStatus" class="text-blue-600">
            <span class="fa-stack">
                <i class="fa-solid fa-cog fa-spin" data-fa-transform=""></i>
                <i
                    class="fa-solid fa-cog fa-spin fa-spin-reverse"
                    data-fa-transform="left-2 down-8"
                ></i>
            </span>
            <a v-if="data.downloadLink" id="link" :href="data.downloadLink" download class="hidden">
                download file
            </a>
        </div>
    </div>
</template>

<script setup>
import { reactive, inject, nextTick } from "vue";
import { useRoute } from "vue-router";
import { getFileUrl } from "../item-services.js";

const $route = useRoute();
const $http = inject("$http");

let data = reactive({
    identifier: $route.params.identifier,
    showProcessingStatus: false,
    downloadLink: undefined,
});

async function downloadTeiDocument() {
    let response = await $http.post({
        route: `/process/assemble-tei/${data.identifier}`,
        body: {},
    });
    if (response.status === 200) {
        response = await response.json();
        const taskId = response.taskId;
        data.showProcessingStatus = true;

        let status = await updateProcessingStatus({ taskId });
        while (status === "in progress") {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            status = await updateProcessingStatus({ taskId: response.taskId });
        }
        await triggerDownload({ name: `${data.identifier}-tei-complete.xml` });
        data.showProcessingStatus = false;
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

async function triggerDownload({ name }) {
    let response = await getFileUrl({
        $http,
        identifier: data.identifier,
        file: name,
        download: true,
    });
    if (response.status === 200) {
        let { link } = await response.json();
        data.downloadLink = link;
        nextTick(() => {
            let elem = document.getElementById("link");
            elem.click();
            data.downloadLink = undefined;
        });
    }
}
</script>
