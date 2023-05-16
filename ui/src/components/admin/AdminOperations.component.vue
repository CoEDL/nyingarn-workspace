<template>
    <div class="flex flex-col space-y-4" v-loading="data.loading">
        <IndexItemComponent />
        <div class="p-8 bg-blue-200 rounded">
            <div>
                The Nyngarn Workspace stores all of the content (data, metadata and state) in the S3
                bucket. In order to use the service with the data in the bucket, the service first
                needs to be configured from the data. Whilst you should only do this when the
                service is first installed, nothing will break if you run this operation again.
            </div>
            <div>
                <el-button @click="importStore"> configure the service </el-button>
            </div>
        </div>
        <div class="p-8 bg-red-200 rounded">
            <div>
                When the workspace is first initialised, it's also necessary to build the repository
                index. This should only be done once and only if you know that it's required. In
                other words, DON'T DO THIS UNLESS YOU ARE CERTAIN THAT YOU SHOULD!
            </div>
            <div>
                <el-button @click="indexRepository"> index the repository</el-button>
            </div>
        </div>
        <!-- <div>
            <el-button @click="migrate">migrate backend</el-button>
        </div> -->
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
async function indexRepository() {
    data.loading = true;
    await $http.get({ route: `/repository/index-all-content` });
    data.loading = false;
}
async function migrate() {
    await $http.get({ route: `/admin/migrate` });
}
</script>
