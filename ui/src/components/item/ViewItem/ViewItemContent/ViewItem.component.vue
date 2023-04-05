<template>
    <div
        class="flex flex-row space-x-2 border border-gray-400 p-4"
        :class="{
            'bg-green-100 border-green-200':
                props.resource.status.complete &&
                props.resource.status.tei.exists &&
                props.resource.status.tei.wellFormed,
            'bg-red-100 border-red-200':
                !props.resource.status.tei.exists || !props.resource.status.tei.wellFormed,
        }"
    >
        <display-image-thumbnail-component
            class="w-36 cursor-pointer"
            v-if="data.thumbnail"
            :thumbnail="data.thumbnail"
            @click="viewResource"
        />
        <div class="flex flex-col">
            <div @click="viewResource" class="flex flex-col flex-grow cursor-pointer">
                <div class="text-center my-4 text-lg">{{ props.resource.name }}</div>
                <display-status-property-component
                    property="Thumbnail"
                    :value="props.resource.status.thumbnail"
                />
                <display-status-property-component
                    property="Webformats"
                    :value="props.resource.status.webformats"
                />
                <display-status-property-component
                    property="OCR"
                    :value="props.resource.status.textract"
                />
                <display-status-property-component
                    property="TEI"
                    :value="props.resource.status.tei.exists"
                />
            </div>
            <div class="flex flex-row">
                <div class="flex-grow"></div>
                <div>
                    <el-popconfirm
                        title="Are you sure you want to delete this resource?"
                        @confirm="deleteResource"
                        width="300"
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

<script setup>
import { ElMessage } from "element-plus";
import DisplayImageThumbnailComponent from "./DisplayImageThumbnail.component.vue";
import DisplayStatusPropertyComponent from "./DisplayStatusProperty.component.vue";
import {
    getResourceFiles,
    getStatus as getItemStatus,
    getFileUrl,
    deleteResource as deleteItemResource,
} from "../../item-services.js";
import { reactive, onMounted, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
const $http = inject("$http");
const $route = useRoute();
const $router = useRouter();

const props = defineProps({
    resource: {
        type: Object,
        required: true,
    },
});
const $emit = defineEmits(["refresh"]);

const data = reactive({
    identifier: $route.params.identifier,
    status: { complete: undefined, tei: {} },
    files: [],
    thumbnail: undefined,
});
getImageThumbnailUrl();
async function getImageThumbnailUrl() {
    let response = await getFileUrl({
        $http,
        identifier: data.identifier,
        file: `${props.resource.name}.thumbnail_h300.jpg`,
    });
    if (response.status == 200) {
        let link = (await response.json()).link;
        data.thumbnail = link;
    }
}
function viewResource() {
    $router.push(`/resource/${data.identifier}/${props.resource}`);
}
async function deleteResource() {
    try {
        await deleteItemResource({
            $http,
            identifier: data.identifier,
            resource: props.resource,
        });
        $emit("refresh");
    } catch (error) {
        ElMessage.error(`Something went wrong deleting this resource`);
    }
}
</script>
