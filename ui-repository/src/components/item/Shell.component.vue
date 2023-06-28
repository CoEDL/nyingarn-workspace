<template>
    <div class="flex flex-col p-4 panel-height overflow-scroll">
        <div>
            <el-button @click="toggleDetailedMetadata" link>
                <div v-if="!data.detailedMetadata">show detailed metadata</div>
                <div v-if="data.detailedMetadata">hide detailed metadata</div>
            </el-button>
        </div>
        <div v-if="data.ready && !data.detailedMetadata">
            <simple-metadata-display-component :crate="data.crate" />
        </div>

        <div v-if="data.ready && data.detailedMetadata">
            <describo-crate-builder
                :crate="data.crate"
                :readonly="true"
                :enable-internal-routing="true"
            />
        </div>

        <div v-if="data.ready && !data.detailedMetadata">
            <ViewerComponent />
        </div>
    </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, reactive, watch, inject } from "vue";
import ViewerComponent from "./Viewer.component.vue";
import SimpleMetadataDisplayComponent from "./SimpleMetadataDisplay.component.vue";
import { ElButton } from "element-plus";
import { useRoute, useRouter } from "vue-router";
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");

const props = defineProps({
    itemId: {
        type: String,
        required: true,
    },
});
const data = reactive({
    watchers: [],
    ready: false,
    crate: {},
    detailedMetadata: false,
});

onMounted(() => {
    loadItemMetadata();
    data.watchers[0] = watch(
        () => props.itemId,
        () => {
            loadItemMetadata();
        }
    );
    data.watchers[1] = watch(
        () => $route.path,
        (n, o) => {
            data.detailedMetadata = $route.name === "item-rocrate-metadata" ? true : false;
        }
    );
});
onBeforeUnmount(() => {
    data.watchers.forEach((watcher) => watcher());
});

async function loadItemMetadata() {
    let response = await $http.get({ route: `/repository/item/${props.itemId}` });
    if (response.status === 200) {
        response = await response.json();
        data.crate = { ...response.crate };

        data.ready = true;
    }
}

function toggleDetailedMetadata() {
    const newMetadataState = !data.detailedMetadata;
    if (newMetadataState) {
        $router.push({ name: "item-rocrate-metadata" }).then(() => {
            data.detailedMetadata = newMetadataState;
        });
    } else {
        $router.push({ name: "item" }).then(() => {
            $router.replace({ query: {} });
            data.detailedMetadata = newMetadataState;
        });
    }
}
</script>

<style scoped>
.panel-height {
    height: calc(100vh - 120px);
}
</style>
