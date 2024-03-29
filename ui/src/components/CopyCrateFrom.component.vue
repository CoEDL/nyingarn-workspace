<template>
    <div class="flex flex-col" v-loading="data.loading">
        <div class="text-gray-600">Copy the metadata and access control list from this crate.</div>
        <el-autocomplete
            class="w-full"
            v-model="data.value"
            :fetch-suggestions="querySearch"
            :trigger-on-focus="false"
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
const $emit = defineEmits(["refresh"]);

const data = reactive({
    loading: false,
    value: undefined,
    items: [],
});

async function querySearch(queryString, cb) {
    let items;
    if (props.type === "items") {
        items = await getMyItems({ match: queryString });
    } else if (props.type === "collections") {
        items = await getMyCollections({ match: queryString });
    }
    const results = items.map((r) => ({ name: r.identifier, value: r.identifier }));
    cb(results);
}
async function getMyItems({ match }) {
    let response = await $http.get({
        route: `/items`,
        params: { match },
    });
    if (response.status === 200) {
        response = await response.json();
        let items = response.items.filter((c) => c.name !== $route.params.identifier);
        return items;
    }
    return [];
}
async function getMyCollections({ match }) {
    let response = await $http.get({
        route: `/collections`,
        params: { match },
    });
    if (response.status === 200) {
        response = await response.json();
        let collections = response.collections.filter((c) => c.name !== $route.params.identifier);
        return collections;
    }
    return [];
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
        ElMessage.success("The metadata and access control list was copied");
        $emit("refresh");
    } else {
        ElMessage.error("There was an error copying data from the other crate");
    }
    data.loading = false;
}
</script>
