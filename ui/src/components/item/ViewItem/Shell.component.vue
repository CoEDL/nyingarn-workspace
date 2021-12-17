<template>
    <div class="flex flex-col">
        <div class="text-xl mb-2 bg-indigo-200 p-4">
            {{ identifier }}
        </div>
        <div class="p-4">
            <el-tabs v-model="activeTab" @tab-click="updateRouteOnTabSelect">
                <el-tab-pane label="View Item Content" name="view">
                    <view-item-content-component v-if="activeTab === 'view'" />
                </el-tab-pane>
                <el-tab-pane label="Item Metadata" name="metadata">
                    <metadata-component />
                </el-tab-pane>
                <el-tab-pane label="Upload Data" name="upload">
                    <upload-component v-if="activeTab === 'upload'" />
                </el-tab-pane>
                <el-tab-pane label="Data Processing" name="processing">
                    <data-processing-component v-if="activeTab === 'processing'" />
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script>
import MetadataComponent from "./MetadataComponent/Shell.component.vue";
import ViewItemContentComponent from "./ViewItemContent/Shell.component.vue";
import UploadComponent from "./UploadComponent/Shell.component.vue";
import DataProcessingComponent from "./DataProcessing/Shell.component.vue";

export default {
    components: {
        MetadataComponent,
        ViewItemContentComponent,
        UploadComponent,
        DataProcessingComponent,
    },
    props: {
        identifier: {
            type: String,
        },
    },

    data() {
        return {
            routeWatcher: undefined,
            tabs: ["view", "metadata", "upload", "processing"],
            activeTab: "view",
        };
    },
    mounted() {
        this.routeWatcher = this.$watch("$route.path", this.updateRouteOnNav);
        this.updateRouteOnNav();
    },
    methods: {
        updateRouteOnNav() {
            if (!this.$route.name.match(/^items/)) {
                this.routeWatcher();
                return;
            }
            let currentRouteEndpoint = this.$route.path.split("/").pop();
            if (this.tabs.includes(currentRouteEndpoint)) {
                this.activeTab = currentRouteEndpoint;
            } else {
                this.$router.replace(`${this.$route.path}/${this.activeTab}`);
            }
        },
        updateRouteOnTabSelect(tab) {
            this.$router.push(tab.paneName);
        },
    },
};
</script>
