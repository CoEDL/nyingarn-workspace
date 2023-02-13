<template>
    <el-card class="box-card flex flex-col">
        <template #header>
            <div class="card-header flex flex-row space-x-2">
                <div class="pt-1">Collections</div>
                <div class="flex-grow">
                    <el-input
                        v-model="data.prefix"
                        placeholder="Filter collections by prefix"
                        @change="loadCollections"
                        clearable
                    ></el-input>
                </div>
                <el-select
                    v-model="data.filterByStatus"
                    placeholder="Show"
                    @change="loadCollections"
                    clearable
                >
                    <el-option label="In Progress" value="inProgress" />
                    <el-option label="Awaiting Review" value="awaitingReview" />
                    <el-option label="Published" value="published" />
                    <el-option label="Needs Work" value="needsWork" />
                </el-select>
                <el-pagination
                    layout="prev, pager, next, total"
                    :page-size="data.limit"
                    :total="data.total"
                    @current-change="pageCollections"
                >
                </el-pagination>
            </div>
        </template>

        <div class="w-full" :class="{ 'h-40': data.loading }" v-loading="data.loading">
            <el-table :data="data.collections" :height="550" size="small" v-show="!data.loading">
                <template #empty
                    >You have no collections. Get started by creating a collection.</template
                >
                <el-table-column prop="identifier" label="">
                    <template #default="scope">
                        <router-link
                            :to="scope.row.link"
                            class="text-base"
                            v-if="scope.row.publicationStatus !== 'published'"
                            >{{ scope.row.identifier }}</router-link
                        >
                        <div v-else class="text-base">{{ scope.row.identifier }}</div>
                    </template>
                </el-table-column>
                <el-table-column prop="status" label="Status" width="150">
                    <template #default="scope">
                        <status-badge-component :status="scope.row.publicationStatus" />
                    </template>
                </el-table-column>
                <el-table-column label="Actions" width="200">
                    <template #default="scope">
                        <div class="flex flex-row space-x-1">
                            <div v-if="data.isAdmin && scope.row.publicationStatus === 'published'">
                                <el-button
                                    type="primary"
                                    size="small"
                                    @click="restoreCollection(scope.row)"
                                >
                                    <i class="fa-solid fa-rotate-left"></i>&nbsp; restore
                                </el-button>
                            </div>
                            <div v-if="data.isAdmin">
                                <el-button type="primary" size="small" @click="unlinkMe(scope.row)">
                                    <i class="fa-solid fa-unlink"></i>
                                </el-button>
                            </div>
                            <div>
                                <el-popconfirm
                                    title="Are you sure you want to delete this collection? All data will be removed and this can't be undone."
                                    @confirm="deleteCollection(scope.row)"
                                    confirmButtonType="danger"
                                    cancelButtonType="primary"
                                    width="300"
                                >
                                    <template #reference>
                                        <el-button type="danger" size="small">
                                            <i class="fa-solid fa-trash"></i>
                                        </el-button>
                                    </template>
                                </el-popconfirm>
                            </div>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
        <div v-if="data.loading && data.restoreLogs.length">
            <el-table :data="data.restoreLogs">
                <el-table-column prop="msg" label="" />
                <el-table-column prop="date" label="Date" width="250" />
            </el-table>
        </div>
    </el-card>
</template>

<script setup>
import StatusBadgeComponent from "../StatusBadge.component.vue";
import { ElMessage } from "element-plus";
import * as collectionServices from "../collection/collection-services";
import { reactive, onMounted, inject } from "vue";
import { useStore } from "vuex";
import { parseISO, format } from "date-fns";
import { io } from "socket.io-client";
const $socket = io();
$socket.on("restore-collection", ({ msg, date }) => {
    if (msg.match(/Batch.*/)) data.restoreLogs = data.restoreLogs.slice(0, -1);
    data.restoreLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});
const $store = useStore();
const $http = inject("$http");

const data = reactive({
    loading: false,
    page: 1,
    limit: 10,
    total: 0,
    collections: [],
    prefix: undefined,
    filterByStatus: undefined,
    isAdmin: $store.state.user.administrator,
    restoreLogs: [],
});
onMounted(() => {
    loadCollections();
});
async function loadCollections() {
    let offset = (data.page - 1) * data.limit;
    let response = await collectionServices.getMyCollections({
        $http: $http,
        offset,
        limit: data.limit,
        prefix: data.prefix,
        publicationStatus: data.filterByStatus,
    });
    if (response.status !== 200) {
        return;
    }
    let { total, collections } = await response.json();
    data.total = total;
    collections = collections.map((c) => ({
        ...c,
        link: `/collections/${c.identifier}/metadata`,
    }));
    data.collections = [...collections];
}
function pageCollections(page) {
    data.page = page;
    loadCollections();
}
async function deleteCollection(collection) {
    try {
        await collectionServices.deleteCollection({ $http, identifier: collection.identifier });
        loadCollections();
    } catch (error) {
        ElMessage.error(`Something went wrong deleting this collection`);
    }
}
async function unlinkMe(collection) {
    try {
        await collectionServices.detachUserFromCollection({
            $http,
            identifier: collection.identifier,
            userId: store.state.user.id,
        });
        loadCollections();
    } catch (error) {
        ElMessage.error(`Something went wrong detaching you from this collection`);
    }
}
async function restoreCollection(item) {
    data.restoreLogs = [];
    data.loading = true;
    await $http.put({
        route: `/admin/collections/${item.identifier}/restore`,
        params: { clientId: $socket.id },
        body: {},
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    data.restoreLogs = [];
    data.loading = false;
    loadCollections();
}
</script>
