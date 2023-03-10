<template>
    <div class="flex flex-col border border-solid p-2">
        <div class="flex flex-row space-x-2">
            <div class="pt-1">Associate items</div>
            <div class="flex-grow">
                <el-input
                    v-model="data.items.prefix"
                    placeholder="Filter items by prefix"
                    @change="getMyItems"
                    clearable
                ></el-input>
            </div>
            <el-pagination
                layout="prev, pager, next, total"
                :total="data.items.total"
                :page-size="data.pageSize"
                :current-page="data.items.page"
                @current-change="handleItemPageChange"
            />
        </div>

        <el-table :data="data.items.results" v-loading="data.loading">
            <template #empty>You have no items. Get started by creating an item.</template>
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
    pageSize: 10,
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
    await getMyItems({ page: data.items.page });
}
async function getMyItems() {
    let response = await $http.get({
        route: `/items`,
        params: {
            offset: (data.items.page - 1) * data.pageSize,
            limit: data.pageSize,
            match: data.items.prefix,
        },
    });
    if (response.status === 200) {
        response = await response.json();
        // data.items.results = response.items.filter(
        //     (c) => c.identifier !== $route.params.identifier
        // );
        data.items.total = response.total;
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
async function handleItemPageChange(page) {
    data.items.page = page;
    await getMyItems();
}
</script>
