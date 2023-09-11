<template>
    <div class="flex flex-col h-screen">
        <div class="text-xl mb-2 bg-indigo-200 p-4 text-gray-700">
            <span class="fa-layers fa-fw">
                <i class="fa-solid fa-file-image" data-fa-transform="left-4 up-4"></i>
                <i class="fa-solid fa-file-image" data-fa-transform="right-4 down-4"></i>
            </span>
            {{ props.identifier }}
        </div>
        <div class="px-6" v-if="data.userIsPermitted">
            <el-tabs v-model="data.activeTab" @tab-click="updateRouteOnTabSelect">
                <el-tab-pane label="Collection Metadata" name="metadata">
                    <MetadataComponent v-if="data.activeTab === 'metadata'" />
                </el-tab-pane>
                <el-tab-pane label="Collection Members" name="members">
                    <view-collection-members-component v-if="data.activeTab === 'members'" />
                </el-tab-pane>
                <el-tab-pane label="Associate Collections and Items" name="associate">
                    <collection-members-component v-if="data.activeTab === 'associate'" />
                </el-tab-pane>
                <el-tab-pane label="Publish" name="publish">
                    <publish-component v-if="data.activeTab === 'publish'" type="collection" />
                </el-tab-pane>
                <el-tab-pane label="Administration" name="administration">
                    <administration-component v-if="data.activeTab === 'administration'" />
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script setup>
import { getCollection } from "../collection-services";
import AdministrationComponent from "./Administration/Shell.component.vue";
import CollectionMembersComponent from "./CollectionMembers.component.vue";
import ViewCollectionMembersComponent from "./ViewCollectionMembers.component.vue";
import PublishComponent from "./PublishComponent/Shell.component.vue";
import MetadataComponent from "../../Metadata.component.vue";
import { reactive, onMounted, onBeforeMount, inject, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");

let props = defineProps({
    identifier: {
        type: String,
    },
});

let data = reactive({
    userIsPermitted: false,
    routeWatcher: undefined,
    tabs: ["members", "metadata", "associate", "administration", "publish"],
    activeTab: "metadata",
    collection: {},
});
onBeforeMount(async () => {
    await checkUserAccess();
});
onMounted(() => {
    data.routeWatcher = watch(() => $route.path, updateRouteOnNav);
    updateRouteOnNav();
});

async function checkUserAccess() {
    let response = await getCollection({ $http, identifier: props.identifier });
    if (response.status === 403) {
        ElMessage.error(`You don't have permission to access that collection`);
        return router.push("/dashboard");
    }
    response = await response.json();
    data.collection = response.collection;
    data.userIsPermitted = true;
}
function updateRouteOnNav() {
    if (!$route.name.match(/^collections/)) {
        data.routeWatcher();
        return;
    }
    let currentRouteEndpoint = $route.path.split("/").pop();
    if (data.tabs.includes(currentRouteEndpoint)) {
        data.activeTab = currentRouteEndpoint;
    } else {
        $router.replace(`${$route.path}/${data.activeTab}`);
    }
}
function updateRouteOnTabSelect(tab) {
    $router.push(tab.paneName);
}
</script>
