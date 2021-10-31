<template>
    <div class="flex flex-col px-4">
        <div class="text-xl my-4">Item: {{ identifier }}</div>
        <el-tabs v-model="activeTab">
            <el-tab-pane label="Metadata" name="metadata">
                <metadata-component />
            </el-tab-pane>
            <el-tab-pane label="Content" name="content">
                <content-component v-if="activeTab === 'content'" />
            </el-tab-pane>
            <el-tab-pane label="Data Processing" name="dataprocessing">
                <data-processing-component v-if="activeTab === 'dataprocessing'" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import MetadataComponent from "./MetadataComponent/Shell.component.vue";
import ContentComponent from "./ContentComponent/Shell.component.vue";
import DataProcessingComponent from "./DataProcessing/Shell.component.vue";

export default {
    components: {
        ContentComponent,
        MetadataComponent,
        DataProcessingComponent,
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            activeTab: "metadata",
        };
    },
};
</script>
