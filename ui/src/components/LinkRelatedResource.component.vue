<template>
    <div class="flex flex-col">
        <el-table :data="data.items" v-loading="data.loading">
            <template #empty>You have no items. Get started by creating an item.</template>
            <el-table-column prop="name" label="Name"> </el-table-column>
            <el-table-column prop="type" label="Type" width="150"> </el-table-column>
            <el-table-column label="Actions" width="100">
                <template #default="scope">
                    <el-button
                        type="primary"
                        @click="linkItemToCollection(scope.row)"
                        :disabled="data.loading"
                    >
                        <i class="fa-solid fa-link"></i>
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { reactive, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const props = defineProps({
    link: {
        type: String,
        required: true,
        validator: function (value) {
            return ["collections", "items", "all"].includes(value);
        },
    },
    property: {
        type: String,
        required: true,
        validator: function (value) {
            return ["hasMember", "memberOf"].includes(value);
        },
    },
});
const data = reactive({
    loading: false,
    items: [],
});
onMounted(async () => {
    if (props.link === "items") {
        let items = await getMyItems();
        data.items = [...items];
    } else if (props.link === "collections") {
        let collections = await getMyCollections();
        data.items = [...collections];
    } else {
        let items = await getMyItems();
        let collections = await getMyCollections();
        data.items = [...items, ...collections];
    }
});
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
async function linkItemToCollection(item) {
    data.loading = true;
    let reverseProperty = props.property === "hasMember" ? "memberOf" : "hasMember";
    const updates = [
        {
            source: $route.params.identifier,
            sourceType: $route.meta.type,
            property: props.property,
            target: item.name,
            targetType: $route.meta.type === "item" ? "collection" : "item",
        },
        {
            source: item.name,
            sourceType: $route.meta.type === "item" ? "collection" : "item",
            property: reverseProperty,
            target: $route.params.identifier,
            targetType: $route.meta.type,
        },
    ];

    let response = await $http.post({
        route: "/describo/link",
        body: { updates },
    });
    if (response.status === 200) {
        ElMessage({
            message: "item linked",
            type: "success",
        });
    } else {
        ElMessage({
            message: "There was an issue creating the item link",
            type: "error",
        });
        console.error(await response.json());
    }
    data.loading = false;
}
</script>
