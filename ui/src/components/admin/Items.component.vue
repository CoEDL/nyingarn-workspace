<template>
    <div class="flex flex-col space-y-2" v-loading="data.loading">
        <div class="p-8 bg-blue-200">
            <div>
                If this is a new system, then you first need to import the items and collections on
                the backend storage into the DB. You can do this with this control. You should only
                really do this once though nothing will break if you run it again.
            </div>
            <div>
                <el-button @click="importObjectsInTheStore">
                    Import items and collections on the storage backend
                </el-button>
            </div>

            <!-- <div><el-button @click="init">init</el-button></div> -->
        </div>
        <!-- <div>
            <el-button @click="migrate">migrate backend</el-button>
        </div> -->
        <div
            class="flex flex-col space-y-2 xl:flex-row xl:space-x-2 xl:space-y-0"
            v-loading="data.loading"
        >
            <el-card class="box-card xl:w-1/2">
                <template #header>
                    <div class="card-header flex flex-row space-x-2">
                        <div class="pt-1">Items</div>
                        <div class="flex-grow">
                            <el-input
                                v-model="data.items.prefix"
                                placeholder="Filter items by prefix"
                                @change="loadItems"
                                clearable
                            ></el-input>
                        </div>
                        <el-pagination
                            layout="prev, pager, next, total"
                            :total="data.items.total"
                            :page-size="10"
                            @current-change="pageItems"
                        />
                    </div>
                </template>
                <el-table :data="data.items.rows" :height="tableHeight">
                    <template #empty> No items have been found. </template>
                    <el-table-column prop="identifier" label="Identifier">
                        <template #default="scope">
                            <div
                                :class="{ 'cursor-pointer': scope.row.connected }"
                                @click="loadItem(scope.row)"
                            >
                                {{ scope.row.identifier }}
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
                    <div class="card-header flex flex-row space-x-2">
                        <div class="pt-1">Collections</div>
                        <div class="flex-grow">
                            <el-input
                                v-model="data.collections.prefix"
                                placeholder="Filter collections by prefix"
                                @change="loadCollections"
                                clearable
                            ></el-input>
                        </div>
                        <el-pagination
                            layout="prev, pager, next, total"
                            :total="data.collections.total"
                            :page-size="10"
                            @current-change="pageCollections"
                        />
                    </div>
                </template>
                <el-table :data="data.collections.rows" :height="tableHeight">
                    <template #empty> No collections have been found. </template>
                    <el-table-column prop="identifier" label="Identifier">
                        <template #default="scope">
                            <div
                                :class="{ 'cursor-pointer': scope.row.connected }"
                                @click="loadCollection(scope.row)"
                            >
                                {{ scope.row.identifier }}
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
    </div>
</template>

<script setup>
import { reactive, computed, onMounted, inject, nextTick } from "vue";
import * as lib from "./lib.js";
import { useRouter } from "vue-router";
const $router = useRouter();
const $http = inject("$http");

let data = reactive({
    loading: false,
    defaultProps: {
        label: "identifier",
    },
    items: {
        prefix: undefined,
        total: 0,
        currentPage: 1,
        rows: [],
    },
    collections: {
        prefix: undefined,
        total: 0,
        currentPage: 1,
        rows: [],
    },
});
let tableHeight = computed(() => {
    if (window.innerWidth > 1280) {
        return window.innerHeight - 450;
    } else {
        return 300;
    }
});
onMounted(() => {
    loadItems();
    loadCollections();
});

async function loadItems() {
    data.loading = true;
    const params = { offset: (data.items.currentPage - 1) * 10 };
    if (data.items.prefix) params.prefix = data.items.prefix;
    let response = await $http.get({
        route: "/admin/entries/items",
        params,
    });
    if (response.status !== 200) {
        // report error
        data.loading = false;
        return;
    }
    let { items, total } = await response.json();
    data.items.rows = [...items];
    data.items.total = total;

    data.loading = false;
}
function pageItems(page) {
    data.items.currentPage = page;
    loadItems();
}
async function loadCollections() {
    data.loading = true;
    const params = { offset: (data.collections.currentPage - 1) * 10 };
    if (data.collections.prefix) params.prefix = data.collections.prefix;
    let response = await $http.get({
        route: "/admin/entries/collections",
        params,
    });
    if (response.status !== 200) {
        // report error
        data.loading = false;
        return;
    }
    let { collections, total } = await response.json();
    data.collections.rows = [...collections];
    data.collections.total = total;

    data.loading = false;
}
function pageCollections(page) {
    data.collections.currentPage = page;
    loadCollections();
}
async function connectItem(item) {
    await lib.connectItem({ $http, identifier: item.identifier });
    data.items.rows = data.items.rows.map((i) => {
        if (i.identifier === item.identifier) i.connected = true;
        return i;
    });
}
function loadItem(item) {
    if (item.connected) lib.loadItem({ $router, identifier: item.identifier });
}
async function connectCollection(collection) {
    await lib.connectCollection({ $http, identifier: collection.identifier });
    data.collections.rows = data.collections.rows.map((c) => {
        if (c.identifier === collection.identifier) c.connected = true;
        return c;
    });
}
function loadCollection(collection) {
    if (collection.connected) lib.loadCollection({ $router, identifier: collection.identifier });
}
async function importObjectsInTheStore() {
    data.loading = true;
    await $http.get({ route: `/admin/items/import` });
    await $http.get({ route: `/admin/collections/import` });
    await loadItems();
    await loadCollections();
    data.loading = false;
}
// async function migrate() {
//     await $http.get({ route: `/admin/migrate` });
// }
</script>
