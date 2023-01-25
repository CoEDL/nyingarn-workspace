<template>
    <div class="flex flex-col space-y-10">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <div class="pt-1">Items</div>
                </div>
            </template>
            <div v-for="(item, idx) in data.items" :key="idx" v-loading="data.loading">
                <div class="flex flex-row space-x-6">
                    <div class="flex flex-grow cursor-pointer" @click="loadItem(item.identifier)">
                        {{ item.identifier }}
                    </div>
                    <div class="flex flex-row space-x-2">
                        <div class="pt-1">version:</div>
                        <el-checkbox v-model="item.version.metadata" label="metadata" />
                        <el-checkbox v-model="item.version.documents" label="documents" />
                        <el-checkbox v-model="item.version.images" label="images" />
                        <el-button @click="deposit('items', item)" type="primary">
                            Deposit
                        </el-button>
                    </div>
                    <div class="flex-grow"></div>
                    <div>
                        <el-button @click="needsWork('items', item)" type="danger">
                            Needs Work
                        </el-button>
                    </div>
                </div>
            </div>
        </el-card>
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <div class="pt-1">Collections</div>
                </div>
            </template>
            <div v-for="(collection, idx) in data.collections" :key="idx" v-loading="data.loading">
                <div class="flex flex-row space-x-6">
                    <div
                        class="flex flex-grow cursor-pointer"
                        @click="loadCollection(collection.identifier)"
                    >
                        {{ collection.identifier }}
                    </div>
                    <div class="flex flex-row space-x-2">
                        <div class="pt-1">version:</div>
                        <el-checkbox v-model="collection.version.metadata" label="metadata" />
                        <el-button @click="deposit('collections', collection)" type="primary">
                            Deposit
                        </el-button>
                    </div>
                    <div class="flex-grow"></div>
                    <div>
                        <el-button @click="needsWork('collections', collection)" type="danger">
                            Needs Work
                        </el-button>
                    </div>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { reactive, inject, onMounted } from "vue";
import { getAwaitingReview } from "./admin-services.js";
import * as lib from "./lib.js";
import { useRouter } from "vue-router";
const $http = inject("$http");
const $router = useRouter();

const data = reactive({
    loading: false,
    items: [],
    colllections: [],
});

onMounted(() => {
    init();
});
async function init() {
    let [items, collections] = await getAwaitingReview();
    data.items = [...items];
    data.collections = [...collections];
}
async function loadItem(identifier) {
    await lib.connectItem({ $http, identifier });
    lib.loadItem({ $router, identifier });
}
async function loadCollection(identifier) {
    await lib.connectCollection({ $http, identifier });
    lib.loadCollection({ $router, identifier });
}
async function deposit(type, item) {
    data.loading = true;
    let { identifier, version } = item;
    let response = await $http.put({
        route: `/admin/${type}/${identifier}/deposit`,
        body: { version },
    });
    if (response.status === 200) {
        init();
    }
    data.loading = false;
}
async function needsWork(type, item) {
    let { identifier } = item;
    let response = await $http.put({ route: `/admin/${type}/${identifier}/needs-work` });
    if (response.status === 200) {
        init();
    }
}
</script>
