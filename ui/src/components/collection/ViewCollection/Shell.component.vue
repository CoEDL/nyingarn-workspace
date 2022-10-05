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
                    <describo-crate-builder
                        v-if="data.activeTab === 'metadata'"
                        :style="{ height: metadataPanelHeight }"
                        class="overflow-scroll"
                        :crate="data.crate"
                        :profile="data.profile"
                        :lookup="lookup"
                        :enable-context-editor="false"
                        :enable-crate-preview="true"
                        :enable-browse-entities="true"
                        :purge-unlinked-entities-before-save="true"
                        @save:crate="saveCrate"
                    >
                    </describo-crate-builder>
                </el-tab-pane>
                <el-tab-pane label="Collection Members" name="members">
                    <view-collection-members-component
                        :collection="data.collection"
                        v-if="data.activeTab === 'members'"
                    />
                </el-tab-pane>
                <el-tab-pane label="Associate Collections and Items" name="associate">
                    <collection-members-component v-if="data.activeTab === 'associate'" />
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
import { ref, reactive, onMounted, onBeforeMount, inject, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { Lookup } from "../../lookup.js";
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
    tabs: ["members", "metadata", "associate", "administration"],
    activeTab: "metadata",
    collection: {},
    crate: {},
    profile: {},
});
onBeforeMount(async () => {
    await checkUserAccess();
});
onMounted(() => {
    data.routeWatcher = watch(() => $route.path, updateRouteOnNav);
    updateRouteOnNav();
    if (data.activeTab === "metadata") load();
});
const metadataPanelHeight = computed(() => {
    return `${window.innerHeight - 140}px`;
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
    if (data.activeTab === "metadata") load();
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
    if (tab.paneName === "metadata") load();
}
async function load() {
    // load the crate file
    let response = await $http.get({
        route: `/describo/rocrate/${$route.meta.type}/${$route.params.identifier}`,
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to retrieve RO Crate file`);
    }
    data.crate = (await response.json()).rocrateFile;

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
