<template>
    <div class="flex flex-col">
        <el-button @click="getMyCollections">load</el-button>
        <el-table :data="data.items" v-loading="data.loading">
            <template #empty>You have no items. Get started by creating an item.</template>
            <el-table-column prop="name" label="Name"> </el-table-column>
            <el-table-column prop="type" label="Type" width="150"> </el-table-column>
            <el-table-column label="Actions" width="100">
                <template #default="scope">
                    <el-button
                        type="primary"
                        v-if="!isLinked(scope.row)"
                        @click="linkItemToCollection(scope.row)"
                        :disabled="data.loading"
                    >
                        <i class="fa-solid fa-link"></i>
                    </el-button>
                    <el-button
                        v-if="isLinked(scope.row)"
                        type="danger"
                        @click="unlinkItemFromCollection(scope.row)"
                        :disabled="data.loading"
                    >
                        <i class="fa-solid fa-unlink"></i>
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
    await init();
});
function isLinked(item) {
    return item?.items?.[$route.params.identifier] || item?.collections?.[$route.params.identifier];
}

async function init() {
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
async function linkItemToCollection(item) {
    toggleLink({
        item,
        url: "/describo/link",
        successMsg: "item linked",
        errorMsg: "The was an issue linking the item",
    });
}
async function unlinkItemFromCollection(item) {
    toggleLink({
        item,
        url: "/describo/unlink",
        successMsg: "item unlinked",
        errorMsg: "The was an issue unlinking the item",
    });
}

async function toggleLink({ item, url, successMsg, ErrorMsg }) {
    data.loading = true;
    let reverseProperty = props.property === "hasMember" ? "memberOf" : "hasMember";
    const updates = [
        {
            source: $route.params.identifier,
            sourceType: $route.meta.type,
            property: props.property,
            target: item.name,
            targetType: item.type,
        },
        {
            source: item.name,
            sourceType: item.type,
            property: reverseProperty,
            target: $route.params.identifier,
            targetType: $route.meta.type,
        },
    ];

    let response = await $http.post({
        route: url,
        body: { updates },
    });
    if (response.status === 200) {
        ElMessage({
            message: successMsg,
            type: "success",
        });
    } else {
        ElMessage({
            message: ErrorMsg,
            type: "error",
        });
    }

    data.loading = false;
    init();
}
</script>
