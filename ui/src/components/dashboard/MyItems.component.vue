<template>
    <el-card class="box-card flex flex-col">
        <template #header>
            <div class="card-header flex flex-row space-x-2">
                <div class="pt-1">Items</div>
                <div class="flex-grow">
                    <el-input
                        v-model="data.prefix"
                        placeholder="Filter items by prefix"
                        @change="loadItems"
                        clearable
                    ></el-input>
                </div>
                <el-select
                    v-model="data.filterByStatus"
                    placeholder="Show"
                    @change="loadItems"
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
                    @current-change="pageItems"
                >
                </el-pagination></div
        ></template>
        <div class="w-full">
            <el-table :data="data.items" :height="550" size="small" v-loading="data.loading">
                <template #empty>You have no items. Get started by creating an item.</template>
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
                <el-table-column prop="total" label="Pages" width="100"> </el-table-column>
                <el-table-column label="Actions" width="200" align="center">
                    <template #default="scope">
                        <div class="flex flex-row space-x-1">
                            <div v-if="data.isAdmin && scope.row.publicationStatus === 'published'">
                                <el-button
                                    type="primary"
                                    size="small"
                                    @click="restoreItem(scope.row)"
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
                                    title="Are you sure you want to delete this item? All data will be removed and this can't be undone."
                                    @confirm="deleteItem(scope.row)"
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
        <div v-if="data.restoreLogs.length">
            <el-table :data="data.restoreLogs">
                <el-table-column prop="msg" label="Message" />
                <el-table-column prop="date" label="Date" width="250" />
            </el-table>
        </div>
    </el-card>
</template>

<script setup>
import StatusBadgeComponent from "../StatusBadge.component.vue";
import { ElMessage } from "element-plus";
import * as itemServices from "../item/item-services";
import { reactive, onMounted, inject } from "vue";
import { useStore } from "vuex";
import { parseISO, format } from "date-fns";
import { io } from "socket.io-client";
const $socket = io();
$socket.on("restore-item", ({ msg, date }) => {
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
    items: [],
    prefix: undefined,
    filterByStatus: undefined,
    isAdmin: $store.state.user.administrator,
    restoreLogs: [],
});
onMounted(() => {
    loadItems();
});
async function loadItems() {
    let offset = (data.page - 1) * data.limit;
    let response = await itemServices.getMyItems({
        $http,
        offset,
        limit: data.limit,
        prefix: data.prefix,
        publicationStatus: data.filterByStatus,
    });
    if (response.status !== 200) {
        return;
    }
    let { total, items } = await response.json();
    data.total = total;
    items = items.map((i) => ({
        ...i,
        link: `/items/${i.identifier}/view`,
        statistics: {},
    }));
    data.items = [...items];

    for (let item of data.items) {
        if (item.publicationStatus === "published") continue;
        response = await itemServices.getStatus({ $http, identifier: item.identifier });
        if (response.status == 200) {
            let { statistics } = await response.json();
            item = {
                ...item,
                ...statistics,
            };
            data.items = data.items.map((i) => {
                return i.identifier === item.identifier ? item : i;
            });
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }
}
function pageItems(page) {
    data.page = page;
    loadItems();
}
async function deleteItem(item) {
    try {
        await itemServices.deleteItem({ $http, identifier: item.identifier });
        loadItems();
    } catch (error) {
        ElMessage.error(`Something went wrong deleting this item`);
    }
}
async function unlinkMe(item) {
    try {
        await itemServices.detachUserFromItem({
            $http,
            identifier: item.identifier,
            userId: $store.state.user.id,
        });
        loadItems();
    } catch (error) {
        console.log(error);
        ElMessage.error(`Something went wrong detaching you from this item`);
    }
}
async function restoreItem(item) {
    data.restoreLogs = [];
    data.loading = true;
    await $http.put({
        route: `/admin/items/${item.identifier}/restore`,
        params: { clientId: $socket.id },
        body: {},
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    data.restoreLogs = [];
    data.loading = false;
    loadItems();
}
</script>
