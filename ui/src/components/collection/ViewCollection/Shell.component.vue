<template>
    <div class="flex flex-col h-screen">
        <div class="text-xl mb-2 bg-indigo-200 p-4 text-gray-700">
            <span class="fa-layers fa-fw">
                <i class="fa-solid fa-file-image" data-fa-transform="left-4 up-4"></i>
                <i class="fa-solid fa-file-image" data-fa-transform="right-4 down-4"></i>
            </span>
            {{ identifier }}
        </div>
        <div class="p-4">
            <el-tabs v-model="activeTab" @tab-click="updateRouteOnTabSelect">
                <el-tab-pane label="Collection Metadata" name="metadata">
                    <describo-metadata-component v-if="activeTab === 'metadata'" />
                </el-tab-pane>
                <el-tab-pane label="Associate Collections and Items" name="associate">
                    <collection-members-component v-if="activeTab === 'associate'" />
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
import AdministrationComponent from "./Administration/Shell.component.vue";
import CollectionMembersComponent from "./CollectionMembers.component.vue";

export default {
    components: {
        DescriboMetadataComponent,
        AdministrationComponent,
        CollectionMembersComponent,
    },
    props: {
        identifier: {
            type: String,
        },
    },

    data() {
        return {
            routeWatcher: undefined,
            tabs: ["metadata", "associate", "administration"],
            activeTab: "metadata",
        };
    },
    mounted() {
        this.routeWatcher = this.$watch("$route.path", this.updateRouteOnNav);
        this.updateRouteOnNav();
    },
    methods: {
        updateRouteOnNav() {
            if (!this.$route.name.match(/^collections/)) {
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
