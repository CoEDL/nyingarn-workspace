<template>
    <div class="flex flex-col space-y-4">
        <div class="flex flex-col border border-solid p-2">
            <div class="flex flex-row">
                <div class="pt-1">Associate items</div>
                <el-pagination
                    layout="prev, pager, next"
                    :total="data.items.total"
                    :page-size="data.pageSize"
                    :current-page="data.items.page"
                    @current-change="handleItemPageChange"
                />
            </div>

            <el-table :data="data.items.results" v-loading="data.loading" :max-height="tableHeight">
                <template #empty>You have no items. Get started by creating an item.</template>
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column prop="type" label="Type" width="150"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <el-button
                            type="primary"
                            v-if="!isLinked(scope.row)"
                            @click="linkItemToCollection(scope.row)"
                            :disabled="data.loading"
                        >
                            <i class="fa-solid fa-link"></i>
                        </el-button>
                        <el-button
                            v-if="isLinked(scope.row)"
                            type="danger"
                            @click="unlinkItemFromCollection(scope.row)"
                            :disabled="data.loading"
                        >
                            <i class="fa-solid fa-unlink"></i>
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
        <div class="flex flex-col border border-solid p-2">
            <div class="flex flex-row">
                <div class="pt-1">Associate collections</div>
                <el-pagination
                    layout="prev, pager, next"
                    :total="data.collections.total"
                    :current-page="data.collections.page"
                    @current-change="handleCollectionPageChange"
                />
            </div>
            <el-table
                :data="data.collections.results"
                v-loading="data.loading"
                :max-height="tableHeight"
            >
                <template #empty
                    >You have no collection. Get started by creating a collection.</template
                >
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column prop="type" label="Type" width="150"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <el-button
                            type="primary"
                            v-if="!isLinked(scope.row)"
                            @click="linkItemToCollection(scope.row)"
                            :disabled="data.loading"
                        >
                            <i class="fa-solid fa-link"></i>
                        </el-button>
                        <el-button
                            v-if="isLinked(scope.row)"
                            type="danger"
                            @click="unlinkItemFromCollection(scope.row)"
                            :disabled="data.loading"
                        >
                            <i class="fa-solid fa-unlink"></i>
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { reactive, onMounted, inject, computed } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    property: $route.meta.type === "collection" ? "hasMember" : "memberOf",
    reverseProperty: $route.meta.type === "collection" ? "memberOf" : "hasMember",
    type: $route.meta.type,
    loading: false,
    pageSize: 8,
    items: {
        page: 1,
        total: 0,
        results: [],
    },
    collections: {
        page: 1,
        total: 0,
        results: [],
    },
});
let tableHeight = computed(() => {
    return (window.innerHeight - 300) / 2;
});
onMounted(async () => {
    await init();
});
function isLinked(item) {
    return item?.items?.[$route.params.identifier] || item?.collections?.[$route.params.identifier];
}

async function init() {
    await getMyItems({ page: data.items.page });
    if (data.type === "collection") {
        getMyCollections({ page: data.collections.page });
    }
}
async function getMyItems({ page }) {
    let response = await $http.get({
        route: `/items`,
        params: {
            offset: (page - 1) * data.pageSize,
            limit: data.pageSize,
        },
    });
    if (response.status === 200) {
        response = await response.json();
        data.items.results = response.items.filter((c) => c.name !== $route.params.identifier);
        data.items.total = response.total;
    }
}
async function getMyCollections({ page }) {
    let response = await $http.get({
        route: `/collections`,
        params: {
            offset: (page - 1) * data.pageSize,
            limit: data.pageSize,
        },
    });
    if (response.status === 200) {
        response = await response.json();
        data.collections.results = response.collections.filter(
            (c) => c.name !== $route.params.identifier
        );
        data.collections.total = response.total;
    }
}
async function linkItemToCollection(item) {
    toggleLink({
        item,
        url: "/describo/link",
        successMsg: "item linked",
        errorMsg: "The was an issue linking the item",
    });
}
async function unlinkItemFromCollection(item) {
    toggleLink({
        item,
        url: "/describo/unlink",
        successMsg: "item unlinked",
        errorMsg: "The was an issue unlinking the item",
    });
}
async function toggleLink({ item, url, successMsg, ErrorMsg }) {
    data.loading = true;
    const updates = [
        {
            source: $route.params.identifier,
            sourceType: $route.meta.type,
            property: data.property,
            target: item.name,
            targetType: item.type,
        },
        {
            source: item.name,
            sourceType: item.type,
            property: data.reverseProperty,
            target: $route.params.identifier,
            targetType: $route.meta.type,
        },
    ];

    let response = await $http.post({
        route: url,
        body: { updates },
    });
    if (response.status === 200) {
    } else {
        ElMessage({
            message: ErrorMsg,
            type: "error",
        });
    }

    data.loading = false;
    init();
}
async function handleItemPageChange(page) {
    data.items.page = page;
    await getMyItems({ page });
}
async function handleCollectionPageChange(page) {
    data.collections.page = page;
    await getMyCollections({ page });
}
</script>
