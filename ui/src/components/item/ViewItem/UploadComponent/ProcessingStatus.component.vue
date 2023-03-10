<template>
    <div>
        <el-table :data="data.tasks" v-if="data.tasks.length" class="w-full">
            <el-table-column prop="updatedAt" label="" width="220">
                <template #default="scope">
                    {{ formatDate(scope.row.updatedAt) }}
                </template>
            </el-table-column>
            <el-table-column prop="status" width="70">
                <template #default="scope">
                    <div v-if="scope.row.status === 'in progress'" class="text-2xl text-blue-600">
                        <span class="fa-stack">
                            <i class="fa-solid fa-cog fa-spin" data-fa-transform=""></i>
                            <i
                                class="fa-solid fa-cog fa-spin fa-spin-reverse"
                                data-fa-transform="left-2 down-8"
                            ></i>
                        </span>
                    </div>
                    <div v-else-if="scope.row.status === 'failed'" class="text-2xl text-red-600">
                        <i class="fa-solid fa-xmark"></i>
                    </div>
                    <div v-else-if="scope.row.status === 'done'" class="text-2xl text-green-600">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="resource" label="" />
            <el-table-column type="expand" label="More Information" width="150">
                <template #default="scope">
                    <ErrorReporterComponent :error="scope.row" />
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup>
import ErrorReporterComponent from "./ErrorReporter.component.vue";
import { format, parseISO } from "date-fns";
import { reactive, onMounted, onBeforeUnmount, inject, computed } from "vue";
import { useRoute } from "vue-router";
import uniqBy from "lodash/uniqBy";
const $http = inject("$http");
const $route = useRoute();
const identifier = computed(() => $route.params.identifier);

const props = defineProps({
    taskIds: {
        type: Array,
        required: true,
    },
});
const emit = defineEmits(["failed-tasks"]);
const data = reactive({
    interval: undefined,
    tasks: [],
    taskStatus: {},
});
onMounted(() => {
    data.interval = setInterval(updateProcessingStatus, 3000);
    updateProcessingStatus();
});
onBeforeUnmount(() => {
    clearInterval(data.interval);
});

async function updateProcessingStatus() {
    let taskIds = props.taskIds.filter((id) => !["done", "failed"].includes(data.taskStatus[id]));

    if (taskIds.length) {
        let response = await $http.post({
            route: `/items/${identifier.value}/resources/processing-status`,
            body: { taskIds },
        });
        let { tasks } = await response.json();
        tasks.forEach((task) => {
            data.tasks.push(task);
            data.tasks = uniqBy(data.tasks.reverse(), "id");
            data.taskStatus[task.id] = task.status;
        });
    } else {
        clearInterval(data.interval);
    }
}
function formatDate(date) {
    return format(parseISO(date), "PPpp");
}
</script>
