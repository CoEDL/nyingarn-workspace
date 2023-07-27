<template>
    <el-autocomplete
        class="w-full"
        size="large"
        :trigger-on-focus="false"
        v-model="data.query"
        :fetch-suggestions="search"
        clearable
        placeholder="search for items and collections in the Nyingarn Repository"
        @select="loadItem"
    >
        <template #default="{ item }"> {{ item.fields.name[0] }} ({{ item._id }}) </template>
    </el-autocomplete>
</template>

<script setup>
import { ElAutocomplete } from "element-plus";
import { reactive, inject } from "vue";
import { useRouter } from "vue-router";
const $http = inject("$http");
const $router = useRouter();

const data = reactive({
    query: "",
});

async function search(queryString, cb) {
    let response = await $http.get({
        route: "/repository/search",
        params: { query: queryString },
    });
    if (response.status === 200) {
        response = await response.json();
        cb(response.hits);
    }
}

async function loadItem(item) {
    $router.push({ path: item._id });
}
</script>
