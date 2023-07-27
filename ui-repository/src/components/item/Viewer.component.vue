<template>
    <div class="bg-slate-200 p-4 border border-gray-400 rounded text-gray-800">
        <el-tabs v-model="data.activeTab" @tab-click="handleTabClick">
            <el-tab-pane label="Thumbnails" name="thumbnails" lazy>
                <ThumbnailGridViewComponent @display-image="displayImage" />
            </el-tab-pane>
            <el-tab-pane label="Manuscript Page" name="page" lazy>
                <span v-if="data.activeTab === 'page'">
                    <div
                        class="flex flex-row space-x-4 justify-center border-b border-gray-400 py-4 mb-4"
                    >
                        <el-button @click="back" :disabled="!data.resource.previous"
                            ><i class="fa-solid fa-arrow-left"></i
                        ></el-button>
                        <div class="text-xl">{{ data.resource.name }}</div>
                        <el-button @click="forward" :disabled="!data.resource.next"
                            ><i class="fa-solid fa-arrow-right"></i
                        ></el-button>
                    </div>

                    <PageViewComponent :resource="data.resource.name" />
                </span>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup>
import { ElTabs, ElTabPane, ElButton } from "element-plus";
import { onMounted, onBeforeUnmount, reactive, watch, inject } from "vue";
import ThumbnailGridViewComponent from "./ThumbnailGridView.component.vue";
import PageViewComponent from "./PageView.component.vue";
import { useRoute, useRouter } from "vue-router";
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");

const data = reactive({
    activeTab: "thumbnails",
    watchers: [],
    resources: [],
    resource: {},
});

onMounted(() => {
    if ($route.params.pageId) {
        data.activeTab = "page";
    }
    getItemResources();
    data.watchers[0] = watch(
        () => $route.path,
        (n, o) => {
            setActiveTab($route.name);
        }
    );
    data.watchers[1] = watch(
        () => $route.params.pageId,
        (n, o) => {
            if (!$route.params.pageId) return;
            data.resource = data.resources.filter((r) => r.name === $route.params.pageId)[0];
            setRoute("page", data.resource.name);
        }
    );
});

onBeforeUnmount(() => {
    data.watchers.forEach((watcher) => watcher());
});

async function getItemResources() {
    let response = await $http.get({
        route: `/repository/item/${$route.params.itemId}/resources`,
    });
    data.loading = false;
    if (response.status !== 200) {
        data.error = true;
        return;
    }
    response = await response.json();
    data.resources = response.resources;
    data.total = response.total;
    if ($route.params.pageId) {
        data.activeTab = "page";
        displayImage({ name: $route.params.pageId });
    }
}

function back() {
    if (data.resource.previous) {
        data.resource = data.resources.filter((r) => r.name === data.resource.previous)[0];
        setRoute("page", data.resource.name);
    }
}

function forward() {
    if (data.resource.next) {
        data.resource = data.resources.filter((r) => r.name === data.resource.next)[0];
        setRoute("page", data.resource.name);
    }
}

function setActiveTab(routeName) {
    if (routeName === "item") {
        data.activeTab = "thumbnails";
    } else if (routeName === "item-page") {
        data.activeTab = "page";
    }
}

function setRoute(tab, resource) {
    if (tab === "page") {
        $router.push({ path: `/item/${$route.params.itemId}/${resource}` });
    } else {
        $router.push({ name: "item" });
    }
}

function handleTabClick(tab) {
    if (!data.resource.name) data.resource = data.resources[0];
    setRoute(tab.paneName, data.resource.name);
    data.activeTab = tab.paneName;
}

function displayImage(page) {
    data.resource = data.resources.filter((r) => r.name === page.name)[0];
    setRoute("page", data.resource.name);
}
</script>
