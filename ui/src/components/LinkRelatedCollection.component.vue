<template>
    <div class="flex flex-col border border-solid p-2">
        <div class="flex flex-row space-x-2">
            <div class="pt-1">Associate collections</div>
            <div class="flex-grow">
                <el-input
                    v-model="data.collections.prefix"
                    placeholder="Filter collections by prefix"
                    @change="getMyCollections"
                    clearable
                ></el-input>
            </div>
            <el-pagination
                layout="prev, pager, next, total"
                :total="data.collections.total"
                :current-page="data.collections.page"
                @current-change="handleCollectionPageChange"
            />
        </div>
        <el-table :data="data.collections.results" v-loading="data.loading">
            <template #empty
                >You have no collections. Get started by creating a collection.</template
            >
            <el-table-column prop="identifier" label="Identifier"> </el-table-column>
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
</template>

<script setup>
import { ElMessage } from "element-plus";
import { reactive, onMounted, inject, computed } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const props = defineProps({
    property: {
        type: String,
        required: true,
    },
    reverseProperty: {
        type: String,
        required: true,
    },
});

const data = reactive({
    type: $route.meta.type,
    loading: false,
    pageSize: 8,
    items: {
        page: 1,
        total: 0,
        results: [],
        prefix: "",
    },
    collections: {
        page: 1,
        total: 0,
        results: [],
        prefix: "",
    },
});
onMounted(async () => {
    await init();
});
function isLinked(item) {
    return item?.items?.[$route.params.identifier] || item?.collections?.[$route.params.identifier];
}

async function init() {
    getMyCollections({ page: data.collections.page });
}
async function getMyCollections() {
    let response = await $http.get({
        route: `/collections`,
        params: {
            offset: (data.collections.page - 1) * data.pageSize,
            limit: data.pageSize,
            match: data.collections.prefix,
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
            target: item.identifier,
            targetType: item.type,
        },
        {
            source: item.identifier,
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
async function handleCollectionPageChange(page) {
    data.collections.page = page;
    await getMyCollections();
}
</script>
