<template>
    <div class="flex flex-col space-y-4" v-loading="data.loading">
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
                index. This should only be done once and only if you know that it's required. It
                doesn't hurt if you do run it but it can take a long time as it walks the whole
                repository and reindexes all of the content.
            </div>
            <div>
                <el-button @click="indexRepository"> index the repository</el-button>
            </div>
        </div>
        <div class="p-8 bg-yellow-200 rounded">
            <div>
                Build or rebuild the workspace search index. This indexes all workspace items
                so they can be searched by language, text, and location.
            </div>
            <div>
                <el-button @click="indexWorkspace"> index the workspace</el-button>
            </div>
        </div>
        <!-- <div>
            <el-button @click="migrate">migrate backend</el-button>
        </div> -->
    </div>
</template>

<script setup>
import { reactive, inject } from "vue";
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
async function indexWorkspace() {
    data.loading = true;
    await $http.get({ route: `/admin/index-all-workspace-content` });
    data.loading = false;
}
async function migrate() {
    await $http.get({ route: `/admin/migrate` });
}
</script>
