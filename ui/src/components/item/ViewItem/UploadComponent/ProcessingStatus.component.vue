<template>
    <div>
        <el-table :data="tasks" v-if="tasks.length" class="w-full">
            <el-table-column prop="updatedAt" label="Date" width="220">
                <template #default="props">
                    {{ formatDate(props.row.updatedAt) }}
                </template>
            </el-table-column>
            <el-table-column prop="status" label="Status" width="150" />
            <el-table-column prop="data" label="Data" width="150" type="expand">
                <template #default="props">
                    <pre>{{ props.row.data }}</pre>
                </template>
            </el-table-column>
            <el-table-column prop="resource" label="Resource" />
        </el-table>
    </div>
</template>

<script>
import { format, parseISO } from "date-fns";

export default {
    props: {
        uploads: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            interval: undefined,
            tasks: [],
        };
    },
    mounted() {
        this.interval = setInterval(this.updateProcessingStatus, 2000);
    },
    unmounted() {
        clearInterval(this.interval);
    },
    methods: {
        async updateProcessingStatus() {
            let response = await this.$http.post({
                route: `/items/${this.identifier}/resources/processing-status`,
                body: { resources: this.uploads },
            });
            let { tasks } = await response.json();
            let failedTasks = tasks.filter((t) => t.status === "failed");
            if (failedTasks.length) this.$emit("failed-tasks", failedTasks);
            this.tasks = [...tasks];
        },
        formatDate(date) {
            return format(parseISO(date), "PPpp");
        },
    },
};
</script>
