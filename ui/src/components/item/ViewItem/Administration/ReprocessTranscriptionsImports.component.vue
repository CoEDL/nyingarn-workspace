<template>
    <div class="flex flex-col space-y-2">
        <div class="text-gray-600">
            If you delete a resource, reprocess the transcription files to re-extract the Digivol or
            TEI transcription.
        </div>
        <div>
            <el-button @click="reprocessImports" :disabled="disabled">
                Reprocess transcription files
            </el-button>
        </div>
    </div>
</template>

<script>
import { ElMessage } from "element-plus";
import { reprocessImports } from "../../item-services.js";
export default {
    data() {
        return {
            identifier: this.$route.params.identifier,
            disabled: false,
        };
    },
    methods: {
        async reprocessImports() {
            this.disabled = true;
            let response = await reprocessImports({
                $http: this.$http,
                identifier: this.identifier,
            });
            let { imports } = await response.json();

            for (let file of imports) {
                await this.$http.post({ route: `/process/post-finish/${this.identifier}/${file}` });
            }
            ElMessage({
                message: "Reprocessing tasks have been submitted. They should complete soon.",
                type: "success",
            });
        },
    },
};
</script>
