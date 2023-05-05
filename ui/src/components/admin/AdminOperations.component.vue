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
async function importObjectsInTheStore() {
    data.loading = true;
    await $http.get({ route: `/admin/items/import` });
    await $http.get({ route: `/admin/collections/import` });
    await loadItems();
    await loadCollections();
    data.loading = false;
}
async function migrate() {
    await $http.get({ route: `/admin/migrate` });
}
</script>
