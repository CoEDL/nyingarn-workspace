<template>
    <el-table :data="data.collection.members" class="w-full">
        <template #empty>This collection has no members defined.</template>
        <el-table-column prop="identifier" label="Name">
            <template #default="scope">
                <router-link :to="link(scope.row.type, scope.row.identifier)">{{
                    scope.row.identifier
                }}</router-link>
            </template>
        </el-table-column>
        <el-table-column prop="type" label="Type" width="150" />
    </el-table>
</template>

<script setup>
import { getCollection } from "../collection-services";
import { reactive, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    collection: {},
});
loadCollection();

async function loadCollection() {
    let response = await getCollection({ $http, identifier: $route.params.identifier });
    response = await response.json();
    data.collection = response.collection;
}

function link(type, name) {
    let basePath = type === "item" ? "items" : "collections";
    return `/${basePath}/${name}`;
}
</script>
