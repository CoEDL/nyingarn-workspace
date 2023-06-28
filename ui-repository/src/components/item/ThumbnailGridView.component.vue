<template>
    <div class="flex flex-col space-y-2 items-around">
        <div v-if="data.error">Thumbnails can't be shown at this time</div>
        <div class="flex flex-row">
            <el-pagination
                v-loading="data.loading"
                :current-page="data.page"
                :page-size="data.pageSize"
                layout="prev, pager, next"
                :total="data.total"
                @current-change="changePage"
            />
            <div class="flex-grow"></div>
        </div>
        <div class="flex-grow grid grid-cols-2 md:grid-cols-6 gap-2">
            <div
                v-for="thumbnail of data.thumbnails"
                :key="thumbnail.url"
                class="border border-slate-400 p-1 flex flex-row place-content-center cursor-pointer hover:bg-nyingarn-dark"
                @click="$emit('display-image', thumbnail)"
            >
                <el-image :src="thumbnail.url" />
            </div>
        </div>
        <div v-if="data.message?.code === 'Access Denied'" class="text-center">
            {{ data.message.code }}: {{ data.message.reason }}
        </div>
    </div>
</template>

<script setup>
import { vLoading, ElPagination, ElImage } from "element-plus";
import { reactive, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    error: false,
    thumbnails: [],
    total: 0,
    page: 1,
    pageSize: 18,
    loading: false,
    message: undefined,
    reason: undefined,
});

const $emit = defineEmits(["display-image"]);

getThumbnails();
async function getThumbnails() {
    data.loading = true;
    let response = await $http.get({
        route: `/repository/item/${$route.params.itemId}/thumbnails`,
        params: { offset: (data.page - 1) * data.pageSize, pageSize: data.pageSize },
    });
    data.loading = false;
    if (response.status !== 200) {
        data.error = true;
        return;
    }
    response = await response.json();
    data.total = response.total;
    data.thumbnails = response.thumbnails;
    data.message = response.message;
}

function changePage(page) {
    data.page = page;
    getThumbnails();
}
</script>
