<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <el-pagination
                v-model:currentPage="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 30, 40]"
                layout="total, sizes, prev, pager, next"
                :total="total"
                @size-change="pageSizeChange"
                @current-change="init"
            >
            </el-pagination>
        </div>

        <div class="flex flex-row flex-wrap overflow-scroll" :style="{ height: panelHeight }">
            <view-item-component
                class="cursor-pointer m-2 h-80"
                v-for="r in data.resources"
                :key="r.name"
                :resource="r.name"
                @refresh="init"
            />
        </div>
    </div>
</template>

<script setup>
import ViewItemComponent from "./ViewItem.component.vue";
import { getItemResources } from "@/components/item/item-services";
import { reactive, onMounted, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
const router = useRouter();
const route = useRoute();
const $http = inject("$http");

let data = reactive({
    identifier: route.params.identifier,
    resources: [],
    total: 0,
    currentPage: 1,
    pageSize: 10,
    panelHeight: `${window.innerHeight - 180}px`,
});
onMounted(() => {
    init();
});
async function init() {
    let limit = data.pageSize;
    let offset = (data.currentPage - 1) * data.pageSize;

    let response = await getItemResources({
        $http,
        identifier: data.identifier,
        offset,
        limit,
    });
    if (response.status !== 200) {
        ElMessage.error(`There was an issue loading the item resources`);
        return;
    }
    let { resources, total } = await response.json();

    data.resources = [...resources];
    data.total = total;
}
function pageSizeChange() {
    data.currentPage = 1;
    init();
}
</script>

l
