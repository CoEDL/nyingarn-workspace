<template>
    <div class="flex flex-col space-y-10">
        <el-table :data="data.items" style="width: 100%">
            <el-table-column prop="identifier" label="Identifier" width="300">
                <template #default="scope">
                    <div class="cursor-pointer" @click="loadItem(scope.row.identifier)">
                        {{ scope.row.identifier }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="publicationStatusLogs" label="Logs" />
            <el-table-column prop="actions" label="Actions" width="300">
                <template #default="scope">
                    <el-button @click="deposit('items', scope.row.identifier)" type="primary">
                        Deposit
                    </el-button>
                    <el-button @click="needsWork('items', scope.row.identifier)" type="danger">
                        Needs Work
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-table :data="data.collections" style="width: 100%">
            <el-table-column prop="identifier" label="Identifier" width="300">
                <template #default="scope">
                    <div class="cursor-pointer" @click="loadCollection(scope.row.identifier)">
                        {{ scope.row.identifier }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="publicationStatusLogs" label="Logs" />
            <el-table-column prop="actions" label="Actions" width="300">
                <template #default="scope">
                    <el-button @click="deposit('collections', scope.row.identifier)" type="primary">
                        Deposit
                    </el-button>
                    <el-button
                        @click="needsWork('collections', scope.row.identifier)"
                        type="danger"
                    >
                        Needs Work
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup>
import { reactive, inject, onMounted } from "vue";
import * as lib from "./lib.js";
import { useRouter } from "vue-router";
const $http = inject("$http");
const $router = useRouter();

const data = reactive({
    items: [],
    colllections: [],
});

onMounted(() => {
    getItemsAwaitingReview();
    getCollectionsAwaitingReview();
});
async function loadItem(identifier) {
    await lib.connectItem({ $http, identifier });
    lib.loadItem({ $router, identifier });
}
async function loadCollection(identifier) {
    await lib.connectCollection({ $http, identifier });
    lib.loadCollection({ $router, identifier });
}
async function getItemsAwaitingReview() {
    let response = await $http.get({ route: "/admin/items/awaiting-review" });
    if (response.status === 200) {
        response = await response.json();
        let items = response.items;
        data.items = items;
    }
}
async function getCollectionsAwaitingReview() {
    let response = await $http.get({ route: "/admin/collections/awaiting-review" });
    if (response.status === 200) {
        response = await response.json();
        let collections = response.collections;
        data.collections = collections;
    }
}
async function deposit(type, identifier) {
    let response = await $http.get({ route: `/admin/${type}/${identifier}/deposit` });
    if (response.status === 200) {
        getItemsAwaitingReview();
        getCollectionsAwaitingReview();
    }
}
async function needsWork(type, identifier) {
    let response = await $http.put({ route: `/admin/${type}/${identifier}/needsWork` });
    if (response.status === 200) {
        getItemsAwaitingReview();
        getCollectionsAwaitingReview();
    }
}
</script>
