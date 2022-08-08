<template>
    <div class="flex flex-col space-y-2 xl:flex-row xl:space-x-2 xl:space-y-0">
        <el-card class="box-card xl:w-1/2">
            <template #header>
                <div class="card-header flex flex-row">
                    <div>Items</div>
                </div>
            </template>
            <el-table :data="data.items" :height="tableHeight" size="small">
                <template #empty> No items have been found. </template>
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <div class="flex flex-row">
                            <el-button type="primary" @click="connectItem(scope.row)" size="small">
                                connect
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
        <el-card class="box-card xl:w-1/2">
            <template #header>
                <div class="card-header flex flex-row">
                    <div>Collections</div>
                </div>
            </template>
            <el-table :data="data.collections" :height="tableHeight" size="small">
                <template #empty> No collections have been found. </template>
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <div class="flex flex-row">
                            <el-button
                                type="primary"
                                @click="connectCollection(scope.row)"
                                size="small"
                            >
                                connect
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup>
import { ElLoading } from "element-plus";
import { reactive, computed, onMounted, inject, nextTick } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
const $http = inject("$http");

let data = reactive({
    items: [],
    collections: [],
});
let tableHeight = computed(() => {
    if (window.innerWidth > 1280) {
        return window.innerHeight - 250;
    } else {
        return 300;
    }
});
onMounted(() => {
    init();
});

async function init() {
    const loading = ElLoading.service({
        lock: true,
        text: "Loading",
        background: "rgba(0, 0, 0, 0.7)",
    });
    let response = await $http.get({ route: "/admin/entries" });
    if (response.status !== 200) {
        // report error
    }
    let { items, collections } = await response.json();
    data.items = [...items];
    data.collections = [...collections];

    nextTick(() => {
        loading.close();
    });
}
async function connectItem(item) {
    await $http.put({ route: `/admin/items/${item.name}/connect-user` });
    router.push(`/items/${item.name}/view`);
}
async function connectCollection(collection) {
    await $http.put({ route: `/admin/collections/${collection.name}/connect-user` });
    router.push(`/collections/${collection.name}/metadata`);
}
</script>
