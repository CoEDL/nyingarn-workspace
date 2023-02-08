<template>
    <div class="flex flex-col space-y-10">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <div class="pt-1">Collections</div>
                </div>
            </template>
            <div v-for="(collection, idx) in data.collections" :key="idx" v-loading="data.loading">
                <div class="flex flex-row space-x-20 my-1">
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
                    <div>
                        <el-button @click="needsWork('collections', collection)" type="danger">
                            Needs Work
                        </el-button>
                    </div>
                </div>
            </div>
            <div v-if="data.depositLogs.length">
                <el-table :data="data.depositLogs">
                    <el-table-column prop="msg" label="" />
                    <el-table-column prop="date" label="Date" width="250" />
                </el-table>
            </div>
        </el-card>
    </div>
</template>

<script setup>
import { reactive, inject, onMounted } from "vue";
import { getAwaitingReview } from "./admin-services.js";
import * as lib from "./lib.js";
import { useRouter } from "vue-router";
import { parseISO, format } from "date-fns";
import { io } from "socket.io-client";
const $socket = io();
$socket.on("deposit-collection", ({ msg, date }) => {
    if (msg.match(/Batch.*/)) data.depositLogs = data.depositLogs.slice(0, -1);
    data.depositLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});

const $http = inject("$http");
const $router = useRouter();

const data = reactive({
    loading: false,
    collections: [],
    depositLogs: [],
});

onMounted(() => {
    init();
});
async function init() {
    let [items, collections] = await getAwaitingReview();
    data.collections = [...collections];
}
async function loadCollection(identifier) {
    await lib.connectCollection({ $http, identifier });
    lib.loadCollection({ $router, identifier });
}
async function deposit(type, item) {
    data.depositLogs = [];
    data.loading = true;
    let { identifier, version } = item;
    let response = await $http.put({
        route: `/admin/${type}/${identifier}/deposit`,
        params: { clientId: $socket.id },
        body: { version },
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    data.depositLogs = [];
    data.loading = false;
    init();
}
async function needsWork(type, item) {
    let { identifier } = item;
    let response = await $http.put({ route: `/admin/${type}/${identifier}/needs-work` });
    if (response.status === 200) {
        init();
    }
}
</script>
