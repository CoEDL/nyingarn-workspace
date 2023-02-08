<template>
    <div class="flex flex-col space-y-10">
        <el-card class="box-card">
            <template #header>
                <div class="card-header">
                    <div class="pt-1">Items</div>
                </div>
            </template>
            <div v-loading="data.loading">
                <div v-for="(item, idx) in data.items" :key="idx">
                    <div class="flex flex-row space-x-20 my-1">
                        <div
                            class="flex flex-grow cursor-pointer"
                            @click="loadItem(item.identifier)"
                        >
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
                        <div>
                            <el-button @click="needsWork('items', item)" type="danger">
                                Needs Work
                            </el-button>
                        </div>
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
$socket.on("deposit-item", ({ msg, date }) => {
    if (msg.match(/Batch.*/)) data.depositLogs = data.depositLogs.slice(0, -1);
    data.depositLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});

const $http = inject("$http");
const $router = useRouter();

const data = reactive({
    loading: false,
    items: [],
    depositLogs: [],
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
