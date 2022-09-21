<template>
    <div>
        <a id="link" :href="data.download.link" download v-if="data.download.link" class="hidden">
            download file
        </a>
        <el-table :data="data.files" style="width: 100%">
            <el-table-column prop="name" label="Name" width="800" />
            <el-table-column label="Operations">
                <template #default="scope">
                    <el-button
                        @click="triggerDownload(scope.row)"
                        v-if="!disableDownload(scope.row)"
                    >
                        <i class="fa-solid fa-cloud-download-alt"></i
                    ></el-button>
                    <!-- <el-popconfirm
                        title="Are you sure you want to delete this file?"
                        @confirm="triggerDelete(scope.row)"
                    >
                        <template #reference>
                            <el-button type="danger">
                                <i class="fa-solid fa-trash"></i>
                            </el-button>
                        </template>
                    </el-popconfirm> -->
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script setup>
import { getResourceFiles, deleteResourceFile, getFileUrl } from "@/components/item/item-services";
import { ElMessage } from "element-plus";
import { reactive, onMounted, inject, nextTick } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    identifier: $route.params.identifier,
    resource: $route.params.resource,
    files: [],
    download: {
        link: undefined,
    },
});
onMounted(async () => {
    await init();
});
async function init() {
    await getResources();
}

function disableDownload(file) {
    return file.name.match("tei.xml");
}
async function getResources() {
    let response = await getResourceFiles({
        $http,
        identifier: data.identifier,
        resource: data.resource,
    });
    if (response.status === 200) {
        data.files = (await response.json()).files.map((f) => ({ name: f }));
    }
}
async function triggerDownload({ name }) {
    let response = await getFileUrl({
        $http,
        identifier: data.identifier,
        file: name,
        download: true,
    });
    if (response.status === 200) {
        let { link } = await response.json();
        data.download = {
            link,
        };
        nextTick(() => {
            let elem = document.getElementById("link");
            elem.click();
            data.download = {
                link: undefined,
            };
        });
    }
}
async function triggerDelete({ name }) {
    try {
        await deleteResourceFile({
            $http,
            identifier: data.identifier,
            resource: data.resource,
            file: name,
        });
        init();
    } catch (error) {
        ElMessage.error(`Something went wrong deleting this file`);
    }
}
</script>
