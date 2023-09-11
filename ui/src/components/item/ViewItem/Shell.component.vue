<template>
    <div class="flex flex-col h-screen">
        <NavbarComponent />
        <div class="px-6" v-if="data.userIsPermitted">
            <el-tabs v-model="data.activeTab" @tab-click="updateRouteOnTabSelect">
                <el-tab-pane label="View Item Content" name="view">
                    <view-item-content-component v-if="data.activeTab === 'view'" />
                </el-tab-pane>
                <el-tab-pane label="Item Metadata" name="metadata">
                    <MetadataComponent v-if="data.activeTab === 'metadata'" />
                </el-tab-pane>
                <el-tab-pane label="Upload Data" name="upload">
                    <upload-component v-if="data.activeTab === 'upload'" />
                </el-tab-pane>
                <el-tab-pane label="Publish" name="publish">
                    <publish-component v-if="data.activeTab === 'publish'" />
                </el-tab-pane>
                <el-tab-pane label="Administration" name="administration">
                    <administration-component v-if="data.activeTab === 'administration'" />
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script setup>
import { getItem } from "../item-services";
import ViewItemContentComponent from "./ViewItemContent/Shell.component.vue";
import UploadComponent from "./UploadComponent/Shell.component.vue";
import AdministrationComponent from "./Administration/Shell.component.vue";
import PublishComponent from "./PublishComponent/Shell.component.vue";
import NavbarComponent from "./Navbar.component.vue";
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
    tabs: ["view", "metadata", "associate", "upload", "administration", "publish"],
    activeTab: "view",
});
onBeforeMount(async () => {
    await checkUserAccess();
});
onMounted(() => {
    data.routeWatcher = watch(() => $route.path, updateRouteOnNav);
    updateRouteOnNav();
});
const metadataPanelHeight = computed(() => {
    return `${window.innerHeight - 140}px`;
});

async function checkUserAccess() {
    let response = await getItem({ $http, identifier: props.identifier });
    if (response.status === 403) {
        ElMessage.error(`You don't have permission to access that item`);
        return $router.push("/dashboard");
    }
    data.userIsPermitted = true;
}
function updateRouteOnNav() {
    if (!$route.name.match(/^items/)) {
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
