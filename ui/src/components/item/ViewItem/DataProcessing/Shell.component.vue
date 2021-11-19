<template>
    <div>
        <div v-for="process of processing" :key="process.name" class="flex flex-row my-2">
            <div class="w-1/7 pr-2">
                <el-button @click="triggerProcessing(process)" size="small">
                    Schedule Task
                </el-button>
            </div>
            <div class="w-6/7 pt-1">{{ process.description }}:</div>
        </div>
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();
export default {
    data() {
        return {
            processing: this.$store.state.configuration.processing.controls,
        };
    },
    methods: {
        async triggerProcessing(process) {
            await httpService.post({
                route: process.route,
                body: { identifier: this.$route.params.identifier },
            });
        },
    },
};
</script>
