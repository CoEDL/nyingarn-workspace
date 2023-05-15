<template>
    <div class="flex flex-col space-y-2" v-loading="data.loading">
        <div class="p-8 bg-blue-200">
            <div>
                The Nyngarn Workspace stores all of the content (data, metadata and state) in the S3
                bucket. In order to use the service with the data in the bucket, the service first
                needs to be configured from the data. Whilst you should only do this when the
                service is first installed, nothing will break if you run this operation again.
            </div>
            <div>
                <el-button @click="importStore"> configure the service </el-button>
            </div>

            <!-- <div><el-button @click="init">init</el-button></div> -->
        </div>
        <!-- <div>
            <el-button @click="migrate">migrate backend</el-button>
        </div> -->
        <IndexItemComponent />
    </div>
</template>

<script setup>
import IndexItemComponent from "./IndexItem.component.vue";
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
async function importStore() {
    data.loading = true;
    await $http.get({ route: `/admin/setup-service` });
    data.loading = false;
}
async function migrate() {
    await $http.get({ route: `/admin/migrate` });
}
</script>
