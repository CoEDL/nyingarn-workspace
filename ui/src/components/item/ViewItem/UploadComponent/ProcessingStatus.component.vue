<template>
    <div>
        <el-table :data="data.tasks" v-if="data.tasks.length" class="w-full" height="300">
            <el-table-column prop="updatedAt" label="Date" width="220">
                <template #default="props">
                    {{ formatDate(props.row.updatedAt) }}
                </template>
            </el-table-column>
            <el-table-column prop="status" label="Status" width="150" />
            <el-table-column prop="resource" label="Resource" />
        </el-table>
        <div class="border-t-solid mt-4 h-72 overflow-scroll">
            <ul class="ml-10 list-disc">
                <li v-for="(error, idx) of data.failedTasks" :key="idx">
                    <error-reporter-component :error="error" />
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import ErrorReporterComponent from "./ErrorReporter.component.vue";
import { format, parseISO } from "date-fns";
import { reactive, onMounted, onBeforeUnmount, inject } from "vue";
import { useRoute } from "vue-router";
const $http = inject("$http");
const $route = useRoute();

const props = defineProps({
    uploads: {
        type: Array,
        required: true,
    },
});
const emit = defineEmits(["failed-tasks"]);
const data = reactive({
    identifier: $route.params.identifier,
    interval: undefined,
    tasks: [],
    failedTasks: [],
    dateFrom: new Date(),
});
onMounted(() => {
    data.interval = setInterval(updateProcessingStatus, 2000);
});
onBeforeUnmount(() => {
    clearInterval(data.interval);
});
async function updateProcessingStatus() {
    let response = await $http.post({
        route: `/items/${data.identifier}/resources/processing-status`,
        body: { resources: props.uploads, dateFrom: data.dateFrom },
    });
    let { tasks } = await response.json();
    data.failedTasks = tasks.filter((t) => t.status === "failed");
    data.tasks = tasks.filter((t) => t.status !== "failed");
}
function formatDate(date) {
    return format(parseISO(date), "PPpp");
}
</script>
