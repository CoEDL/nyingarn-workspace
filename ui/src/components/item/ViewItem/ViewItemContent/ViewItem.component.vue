<template>
    <div
        class="flex flex-row space-x-2 border border-gray-400 p-4"
        :class="{ 'bg-green-100 border-green-200': completed.markedComplete }"
    >
        <display-image-thumbnail-component
            class="w-36 cursor-pointer"
            :thumbnail="thumbnail"
            v-if="thumbnail"
            @click="viewResource"
        />
        <div class="flex flex-col">
            <div @click="viewResource" class="flex flex-col flex-grow cursor-pointer">
                <div class="text-center my-4 text-lg">{{ resource }}</div>
                <display-status-property-component
                    property="Thumbnail"
                    :value="completed.thumbnail"
                />
                <display-status-property-component
                    property="Webformats"
                    :value="completed.webformats"
                />
                <display-status-property-component property="OCR" :value="completed.textract" />
                <display-status-property-component property="TEI" :value="completed.tei" />
            </div>
            <div class="flex flex-row">
                <div class="flex-grow"></div>
                <div>
                    <el-popconfirm
                        title="Are you sure you want to delete this resource?"
                        @confirm="deleteResource"
                    >
                        <template #reference>
                            <el-button type="danger">
                                <i class="fa-solid fa-trash"></i>
                            </el-button>
                        </template>
                    </el-popconfirm>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ElMessage } from "element-plus";
import DisplayImageThumbnailComponent from "./DisplayImageThumbnail.component.vue";
import DisplayStatusPropertyComponent from "./DisplayStatusProperty.component.vue";
import {
    getResourceFiles,
    getStatus,
    getFileUrl,
    deleteResource,
} from "@/components/item/item-services";
export default {
    components: {
        DisplayImageThumbnailComponent,
        DisplayStatusPropertyComponent,
    },
    props: {
        resource: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            completed: {},
            files: [],
            thumbnail: undefined,
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            await this.getResourceFiles();
            await this.getImageThumbnailUrl();
            await this.getStatus();
        },
        async getResourceFiles() {
            let response = await getResourceFiles({
                $http: this.$http,
                identifier: this.identifier,
                resource: this.resource,
            });
            if (response.status === 200) {
                this.files = (await response.json()).files;
            }
        },
        async getStatus() {
            let response = await getStatus({
                $http: this.$http,
                identifier: this.identifier,
                resource: this.resource,
            });
            if (response.status === 200) {
                this.completed = { ...(await response.json()).completed };
            }
        },
        async getImageThumbnailUrl() {
            let image = this.files.filter((image) => image.match("thumbnail"));
            let response = await getFileUrl({
                $http: this.$http,
                identifier: this.identifier,
                file: image,
            });
            if (response.status !== 200) {
                // can't get link right now
            }
            let link = (await response.json()).link;
            this.thumbnail = link;
        },
        viewResource() {
            this.$router.push(`/resource/${this.identifier}/${this.resource}`);
        },
        async deleteResource() {
            try {
                await deleteResource({
                    $http: this.$http,
                    identifier: this.identifier,
                    resource: this.resource,
                });
                this.$emit("refresh");
            } catch (error) {
                ElMessage.error(`Something went wrong deleting this resource`);
            }
        },
    },
};
</script>
