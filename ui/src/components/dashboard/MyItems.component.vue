<template>
    <el-card class="box-card flex flex-col">
        <template #header>
            <div class="card-header flex flex-row">
                <div>Items</div>
                <div class="flex-grow"></div>
                <el-pagination
                    layout="prev, pager, next"
                    :page-size="data.limit"
                    :total="data.total"
                    @current-change="loadItems"
                >
                </el-pagination></div
        ></template>
        <div class="w-full">
            <el-table :data="data.items" :height="tableHeight" size="small">
                <template #empty>You have no items. Get started by creating an item.</template>
                <el-table-column prop="name" label="">
                    <template #default="scope">
                        <router-link :to="scope.row.link" class="text-base">{{
                            scope.row.name
                        }}</router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="total" label="Pages" width="100"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
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
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-card>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { orderBy } from "lodash";
import * as itemServices from "../item/item-services";
import { reactive, computed, onMounted, inject } from "vue";
const $http = inject("$http");

const data = reactive({
    page: 1,
    limit: 10,
    total: 0,
    items: [],
});
let tableHeight = computed(() => {
    if (window.innerWidth > 1280) {
        return window.innerHeight - 250;
    } else {
        return 300;
    }
});
onMounted(() => {
    loadItems();
});
async function loadItems(p) {
    if (p) data.page = p;
    let offset = (data.page - 1) * data.limit;
    let response = await itemServices.getMyItems({ $http, offset, limit: data.limit });
    if (response.status !== 200) {
        return;
    }
    response = await response.json();
    data.total = response.total;
    let items = response.items.map((i) => ({
        ...i,
        link: `/items/${i.name}/view`,
        statistics: {},
    }));
    items = orderBy(items, "name");
    data.items = [...items];

    for (let item of data.items) {
        response = await itemServices.getStatus({ $http, identifier: item.name });
        if (response.status == 200) {
            let { statistics } = await response.json();
            item = {
                ...item,
                ...statistics,
            };
            data.items = data.items.map((i) => {
                return i.name === item.name ? item : i;
            });
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }
}
async function deleteItem(item) {
    try {
        await itemServices.deleteItem({ $http, identifier: item.name });
        loadItems();
    } catch (error) {
        ElMessage.error(`Something went wrong deleting this item`);
    }
}
</script>
