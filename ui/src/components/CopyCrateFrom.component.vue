<template>
    <div class="flex flex-col" v-loading="data.loading">
        <div class="text-gray-600">Select a crate from which to copy the metadata.</div>
        <el-autocomplete
            class="w-full"
            v-model="data.value"
            :fetch-suggestions="querySearch"
            clearable
            placeholder="Start typing to get a list of items"
            @select="copyCrate"
        />
    </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { reactive, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const props = defineProps({
    type: {
        type: String,
        required: true,
        validator: function (value) {
            return ["collections", "items"].includes(value);
        },
    },
});
const data = reactive({
    loading: false,
    value: undefined,
    items: [],
});
onMounted(async () => {
    await init();
});
async function init() {
    if (props.type === "items") {
        let items = await getMyItems();
        data.items = [...items];
    } else if (props.type === "collections") {
        let collections = await getMyCollections();
        data.items = [...collections];
    }
}
async function getMyItems() {
    let response = await $http.get({
        route: `/items`,
    });
    if (response.status === 200) {
        response = await response.json();
        let items = response.items.filter((c) => c.name !== $route.params.identifier);
        return items;
    }
}
async function getMyCollections() {
    let response = await $http.get({
        route: `/collections`,
    });
    if (response.status === 200) {
        response = await response.json();
        let collections = response.collections.filter((c) => c.name !== $route.params.identifier);
        return collections;
    }
}
function querySearch(queryString, cb) {
    const re = new RegExp(queryString, "ig");
    const results = data.items
        .filter((i) => {
            return i.name.match(re);
        })
        .map((r) => ({ name: r.name, value: r.name }));
    cb(results);
}
async function copyCrate() {
    data.loading = true;
    let response = await $http.post({
        route: "/describo/copy",
        body: {
            copy: {
                source: data.value,
                sourceType: $route.meta.type,
                target: $route.params.identifier,
            },
        },
    });
    if (response.status === 200) {
        ElMessage({
            message: "The crate was copied",
            type: "success",
        });
    } else {
        ElMessage({
            message: "There was an error copying the crate",
            type: "error",
        });
    }
    data.loading = false;
}
</script>
