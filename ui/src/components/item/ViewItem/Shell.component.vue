<template>
    <div class="flex flex-col h-screen">
        <div class="text-xl mb-2 bg-indigo-200 p-4 text-gray-700">
            <i class="fa-solid fa-file-image"></i>
            {{ props.identifier }}
        </div>
        <div class="px-6" v-if="data.userIsPermitted">
            <el-tabs v-model="data.activeTab" @tab-click="updateRouteOnTabSelect">
                <el-tab-pane label="View Item Content" name="view">
                    <view-item-content-component v-if="data.activeTab === 'view'" />
                </el-tab-pane>
                <el-tab-pane label="Item Metadata" name="metadata">
                    <describo-crate-builder
                        v-if="data.activeTab === 'metadata' && data.metadataComponent.display"
                        v-loading="data.metadataComponent.loading"
                        :style="{ height: metadataPanelHeight }"
                        class="overflow-scroll"
                        :crate="data.crate"
                        :profile="data.profile"
                        :lookup="lookup"
                        :enable-context-editor="false"
                        :enable-crate-preview="true"
                        :enable-browse-entities="true"
                        :purge-unlinked-entities-before-save="true"
                        @ready="data.metadataComponent.loading = false"
                        @save:crate="saveCrate"
                    >
                    </describo-crate-builder>
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
import { reactive, onMounted, onBeforeMount, inject, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useStore } from "vuex";
import { ElMessage } from "element-plus";
import { Lookup } from "../../lookup.js";
import { debounce } from "lodash";
const $store = useStore();
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");
const lookup = new Lookup({ $http });

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
    metadataComponent: {
        display: false,
        loading: false,
    },
    crate: {},
    profile: {},
    debouncedLoad: debounce(load, 300),
    isAdmin: $store.state.user.administrator,
});
onBeforeMount(async () => {
    await checkUserAccess();
});
onMounted(() => {
    data.routeWatcher = watch(() => $route.path, updateRouteOnNav);
    updateRouteOnNav();
    if (data.activeTab === "metadata") loadMetadata();
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
    data.metadataComponent.display = false;
    if (data.activeTab === "metadata") loadMetadata();
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
    data.metadataComponent.display = false;
    $router.push(tab.paneName);
    if (tab.paneName === "metadata") loadMetadata();
}
async function loadMetadata() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    data.metadataComponent.display = true;
    await data.debouncedLoad();
}
async function load() {
    if (!$route.meta.type && !$route.params.identifier) return;
    data.metadataComponent.loading = true;

    // load the crate file
    let response = await $http.get({
        route: `/describo/rocrate/${$route.meta.type}/${$route.params.identifier}`,
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to retrieve RO Crate file`);
    }
    data.crate = (await response.json()).crate;

    // load the profile
    response = await $http.get({
        route: `/describo/profile/${$route.meta.type}`,
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to retrieve profile`);
    }
    data.profile = (await response.json()).profile;
}
async function saveCrate(data) {
    let response = await $http.put({
        route: `/describo/rocrate/${$route.meta.type}/${$route.params.identifier}`,
        body: { data },
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to save RO Crate file`);
    }
    // console.log("SAVE CRATE", JSON.stringify(data, null, 2));
}
function saveTemplate(template) {
    // console.log("SAVE TEMPLATE", JSON.stringify(template, null, 2));
    data.templates.push(template);
    console.log(JSON.stringify(data.templates, null, 2));
}
</script>
