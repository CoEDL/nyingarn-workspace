<template>
    <div>
        <a id="link" :href="download.link" download v-if="download.link" class="hidden">
            download file
        </a>
        <el-table :data="files" style="width: 100%">
            <el-table-column prop="name" label="Name" width="800" />
            <el-table-column label="Operations">
                <template #default="scope">
                    <el-button @click="triggerDownload(scope.row)">
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

<script>
import { getResourceFiles, deleteResourceFile, getFileUrl } from "@/components/item/load-item-data";
import { ElMessage } from "element-plus";

export default {
    data() {
        return {
            identifier: this.$route.params.identifier,
            resource: this.$route.params.resource,
            files: [],
            download: {
                link: undefined,
            },
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            await this.getResourceFiles();
        },
        async getResourceFiles() {
            let response = await getResourceFiles({
                $http: this.$http,
                identifier: this.identifier,
                resource: this.resource,
            });
            if (response.status === 200) {
                this.files = (await response.json()).files.map((f) => ({ name: f }));
            }
        },
        async triggerDownload({ name }) {
            let response = await getFileUrl({
                $http: this.$http,
                identifier: this.identifier,
                file: name,
                download: true,
            });
            if (response.status === 200) {
                let { link } = await response.json();
                this.download = {
                    link,
                };
                this.$nextTick(() => {
                    let elem = document.getElementById("link");
                    elem.click();
                    this.download = {
                        link: undefined,
                    };
                });
            }
        },
        async triggerDelete({ name }) {
            try {
                await deleteResourceFile({
                    $http: this.$http,
                    identifier: this.identifier,
                    resource: this.resource,
                    file: name,
                });
                this.init();
            } catch (error) {
                ElMessage.error(`Something went wrong deleting this file`);
            }
        },
    },
};
</script>
