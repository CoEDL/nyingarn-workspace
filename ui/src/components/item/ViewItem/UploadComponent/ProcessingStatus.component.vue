<template>
    <div>
        <el-table :data="data.tasks" v-if="data.tasks.length" class="w-full" height="500">
            <el-table-column prop="updatedAt" label="Date" width="220">
                <template #default="props">
                    {{ formatDate(props.row.updatedAt) }}
                </template>
            </el-table-column>
            <el-table-column prop="status" label="Status" width="150" />
            <!-- <el-table-column prop="data" label="Data" width="150" type="expand">
                <template #default="props">
                    <pre>{{ props.row.data }}</pre>
                </template>
            </el-table-column> -->
            <el-table-column prop="resource" label="Resource" />
        </el-table>
    </div>
</template>

<script setup>
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
        body: { resources: props.uploads },
    });
    let { tasks } = await response.json();
    let failedTasks = tasks.filter((t) => t.status === "failed");
    if (failedTasks.length) emit("failed-tasks", failedTasks);
    data.tasks = [...tasks];
}
function formatDate(date) {
    return format(parseISO(date), "PPpp");
}
</script>
