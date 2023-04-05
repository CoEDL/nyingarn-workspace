<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <el-pagination
                v-model:currentPage="data.currentPage"
                v-model:page-size="data.pageSize"
                :page-sizes="[10, 20, 30, 40]"
                layout="total, sizes, prev, pager, next"
                :total="data.total"
                @size-change="pageSizeChange"
                @current-change="init"
            >
            </el-pagination>
        </div>

        <div :style="{ height: data.panelHeight }" class="overflow-scroll">
            <div class="flex flex-row flex-wrap overflow-scroll">
                <view-item-component
                    class="cursor-pointer m-2 h-80"
                    v-for="(resource, idx) in data.resources"
                    :key="resource.name"
                    :resource="resource"
                    :idx="idx"
                    @refresh="init"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import ViewItemComponent from "./ViewItem.component.vue";
import { getItemResources, getStatus as getItemStatus } from "../../item-services.js";
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
    data.resources = [];
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

    for (let resource of resources) {
        let status = (await getStatus({ resource: resource.name })) ?? {
            complete: false,
            thumbnail: false,
            webformats: false,
            textract: false,
            tei: { exists: true, wellFormed: false },
        };
        data.resources.push({
            ...resource,
            status,
        });
    }

    data.total = total;
}
function pageSizeChange() {
    data.currentPage = 1;
    init();
}

async function getStatus({ resource }) {
    let response = await getItemStatus({
        $http,
        identifier: data.identifier,
        resource,
    });
    if (response.status === 200) {
        response = await response.json();
        return response.status;
    }
}
</script>
