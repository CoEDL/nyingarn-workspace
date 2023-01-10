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

        <div class="w-full">
            <el-table :data="data.collections" :height="tableHeight" size="small">
                <template #empty
                    >You have no collections. Get started by creating a collection.</template
                >
                <el-table-column prop="name" label="">
                    <template #default="scope">
                        <router-link :to="scope.row.link" class="text-base">{{
                            scope.row.name
                        }}</router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="status" label="Status" width="150">
                    <template #default="scope">
                        <status-badge-component :status="scope.row.publicationStatus" />
                    </template>
                </el-table-column>
                <el-table-column label="Actions" width="150" align="center">
                    <template #default="scope">
                        <div class="flex flex-row space-x-1">
                            <div>
                                <el-button
                                    type="primary"
                                    size="small"
                                    @click="toggleCollectionVisibility(scope.row)"
                                >
                                    <span v-show="scope.row.private">
                                        <i class="fa-solid fa-lock"></i>
                                    </span>
                                    <span v-show="!scope.row.private">
                                        <i class="fa-solid fa-lock-open"></i>
                                    </span>
                                </el-button>
                            </div>
                            <div class="flex flex-row space-x-1">
                                <div v-if="data.isAdmin">
                                    <el-button
                                        type="primary"
                                        size="small"
                                        @click="unlinkMe(scope.row)"
                                    >
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
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-card>
</template>

<script setup>
import StatusBadgeComponent from "../StatusBadge.component.vue";
import { ElMessage } from "element-plus";
import { orderBy } from "lodash";
import * as collectionServices from "../collection/collection-services";
import { reactive, computed, onMounted, inject } from "vue";
import { useStore } from "vuex";
const store = useStore();
const $http = inject("$http");

const data = reactive({
    page: 1,
    limit: 10,
    total: 0,
    collections: [],
    prefix: undefined,
    filterByStatus: undefined,
    isAdmin: store.state.user.administrator,
});
let tableHeight = computed(() => {
    if (window.innerWidth > 1280) {
        return window.innerHeight - 250;
    } else {
        return 300;
    }
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
        link: `/collections/${c.name}/metadata`,
    }));
    data.collections = [...collections];
}
function pageCollections(page) {
    data.page = page;
    loadCollections();
}
async function deleteCollection(collection) {
    try {
        await collectionServices.deleteCollection({ $http, identifier: collection.name });
        loadCollections();
    } catch (error) {
        ElMessage.error(`Something went wrong deleting this collection`);
    }
}
async function toggleCollectionVisibility(collection) {
    await collectionServices.toggleCollectionVisibility({
        $http,
        identifier: collection.name,
    });
    await loadCollections();
}
async function unlinkMe(collection) {
    try {
        await collectionServices.detachUserFromCollection({
            $http,
            identifier: collection.name,
            userId: store.state.user.id,
        });
        loadCollections();
    } catch (error) {
        ElMessage.error(`Something went wrong detaching you from this collection`);
    }
}
</script>
