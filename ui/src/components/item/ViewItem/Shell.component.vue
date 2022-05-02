<template>
    <div class="flex flex-col h-screen">
        <div class="text-xl mb-2 bg-indigo-200 p-4 text-gray-700">
            <i class="fa-solid fa-file-image"></i>
            {{ identifier }}
        </div>
        <div class="p-4">
            <el-tabs v-model="activeTab" @tab-click="updateRouteOnTabSelect">
                <el-tab-pane label="View Item Content" name="view">
                    <view-item-content-component v-if="activeTab === 'view'" />
                </el-tab-pane>
                <el-tab-pane label="Item Metadata" name="metadata">
                    <describo-metadata-component v-if="activeTab === 'metadata'" />
                </el-tab-pane>
                <el-tab-pane label="Associate to Collection" name="associate">
                    <item-members-component v-if="activeTab === 'associate'" />
                </el-tab-pane>
                <el-tab-pane label="Upload Data" name="upload">
                    <upload-component v-if="activeTab === 'upload'" />
                </el-tab-pane>
                <el-tab-pane label="Administration" name="administration">
                    <administration-component v-if="activeTab === 'administration'" />
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script>
import DescriboMetadataComponent from "@/components/DescriboMetadata.component.vue";
import ViewItemContentComponent from "./ViewItemContent/Shell.component.vue";
import UploadComponent from "./UploadComponent/Shell.component.vue";
import AdministrationComponent from "./Administration/Shell.component.vue";
import ItemMembersComponent from "./ItemMembers.component.vue";

export default {
    components: {
        DescriboMetadataComponent,
        ViewItemContentComponent,
        UploadComponent,
        AdministrationComponent,
        ItemMembersComponent,
    },
    props: {
        identifier: {
            type: String,
        },
    },

    data() {
        return {
            routeWatcher: undefined,
            tabs: ["view", "metadata", "associate", "upload", "administration"],
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
