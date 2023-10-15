<template>
    <el-card>
        <template #header>Delete a specific item or collection in the repository</template>
        <div class="flex flex-row space-x-1" v-loading="data.loading">
            <el-select
                class="w-full"
                v-model="data.selectedItemIdentifier"
                filterable
                remote
                reserve-keyword
                placeholder="Search for an item to index"
                :remote-method="findItem"
                :loading="data.loading"
            >
                <el-option
                    v-for="item in data.options"
                    :key="item.identifier"
                    :label="item.identifier"
                    :value="item.id"
                >
                    {{ item.identifier }} ({{ item.type }})
                </el-option>
            </el-select>
            <div>
                <el-button @click="deleteItem" type="danger">Delete item</el-button>
            </div>
        </div>
    </el-card>
</template>

<script setup>
import { ElCard, ElSelect, ElOption, vLoading } from "element-plus";
import * as lib from "./lib.js";
import { reactive, inject, onMounted } from "vue";
const $http = inject("$http");

const data = reactive({
    loading: false,
    selectedItem: undefined,
    options: [],
});

onMounted(() => {
    findItem();
});

async function findItem(prefix) {
    data.loading = true;
    let { rows, total } = await lib.lookupRepositoryContent({ $http, offset: 0, prefix });
    data.options = [...rows];
    data.loading = false;
    return rows;
}
async function deleteItem() {
    data.loading = true;
    const item = data.options.filter((i) => i.id === data.selectedItemIdentifier)[0];
    await lib.deleteItemFromRepository({ $http, ...item });
    data.selectedItemIdentifier = undefined;
    data.options = [];
    data.loading = false;
}
</script>
