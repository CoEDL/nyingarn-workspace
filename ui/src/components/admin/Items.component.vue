<template>
    <div
        class="flex flex-col space-y-2 xl:flex-row xl:space-x-2 xl:space-y-0"
        v-loading="data.loading"
    >
        <el-card class="box-card xl:w-1/2">
            <template #header>
                <div class="card-header flex flex-row">
                    <div>Items</div>
                </div>
            </template>
            <el-table :data="data.items" :height="tableHeight">
                <template #empty> No items have been found. </template>
                <el-table-column prop="name" label="Name">
                    <template #default="scope">
                        <div
                            :class="{ 'cursor-pointer': scope.row.connected }"
                            @click="loadItem(scope.row)"
                        >
                            {{ scope.row.name }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="Actions" width="200">
                    <template #default="scope">
                        <div class="flex flex-row space-x-2">
                            <div v-if="!scope.row.connected">
                                <el-button type="primary" @click="connectItem(scope.row)">
                                    connect
                                </el-button>
                            </div>
                            <div v-else>connected</div>
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
            <el-table :data="data.collections" :height="tableHeight">
                <template #empty> No collections have been found. </template>
                <el-table-column prop="name" label="Name">
                    <template #default="scope">
                        <div
                            :class="{ 'cursor-pointer': scope.row.connected }"
                            @click="loadCollection(scope.row)"
                        >
                            {{ scope.row.name }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <div class="flex flex-row">
                            <div v-if="!scope.row.connected">
                                <el-button type="primary" @click="connectCollection(scope.row)">
                                    connect
                                </el-button>
                            </div>
                            <div v-else>connected</div>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script setup>
import { reactive, computed, onMounted, inject, nextTick } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
const $http = inject("$http");

let data = reactive({
    loading: false,
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
    data.loading = true;
    let response = await $http.get({ route: "/admin/entries" });
    if (response.status !== 200) {
        // report error
        data.loading = false;
        return;
    }
    let { items, collections } = await response.json();
    data.items = [...items];
    data.collections = [...collections];

    data.loading = false;
}
async function connectItem(item) {
    await $http.put({ route: `/admin/items/${item.name}/connect-user` });
    data.items = data.items.map((i) => {
        if (i.name === item.name) i.connected = true;
        return i;
    });
}
function loadItem(item) {
    router.push(`/items/${item.name}/view`);
}
async function connectCollection(collection) {
    await $http.put({ route: `/admin/collections/${collection.name}/connect-user` });
    data.collections = data.collections.map((c) => {
        if (c.name === collection.name) c.connected = true;
        return c;
    });
}
function loadCollection(collection) {
    router.push(`/collections/${collection.name}/metadata`);
}
</script>
