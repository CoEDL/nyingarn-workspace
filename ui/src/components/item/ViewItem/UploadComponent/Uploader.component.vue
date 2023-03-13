<template>
    <div>
        <div v-if="data.error" class="bg-red-200 rounded p-2 w-96">
            The file uploader cannot be initialised at this time.
        </div>
        <div ref="dashboard"></div>
    </div>
</template>

<script setup>
import Dashboard from "@uppy/dashboard";
import Tus from "@uppy/tus";
import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";
import Uppy from "@uppy/core";
import { ref, reactive, onMounted, inject, onBeforeUnmount, watch } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
const store = useStore();
const $http = inject("$http");
const $route = useRoute();
const dashboard = ref(null);

const emit = defineEmits(["upload-started", "file-uploaded", "file-removed"]);
const data = reactive({
    specialFileNameChecks: ["-digivol.csv", "-tei.xml"],
    uppy: undefined,
    path: undefined,
    overwrite: true,
});

watch(
    () => $route.params.identifier,
    () => {
        if (data.uppy) {
            data.uppy.close();
            data.uppy = undefined;
        }
        if ($route.params.identifier) init();
    }
);
onMounted(() => {
    init();
});
onBeforeUnmount(() => {
    if (data.uppy) {
        data.uppy.close();
        data.uppy = undefined;
    }
});

async function init() {
    await getItemPath();
    if (!data.path) return;
    const identifier = $route.params.identifier;
    const configuration = store.state.configuration;
    let uppy = new Uppy({
        debug: true,
        autoProceed: false,

        onBeforeFileAdded: (file) => {
            // does the first part of the file match the identifier
            let regex = new RegExp(`^${identifier}-.*`);
            if (!file.name.match(regex) && configuration.ui.filename?.matchItemName) {
                uppy.info(
                    `Skipping file '${file.name}' because the name doesn't match the item name.`,
                    "error",
                    5000
                );
                return false;
            }

            // check the file extension to ensuire the file is an image file
            if (configuration.ui.filename?.checkExtension) {
                let regex = new RegExp(configuration.ui.filename.checkExtension, "i");
                if (!file.name.match(regex)) {
                    uppy.info(
                        `Skipping file '${file.name}' because it is not an image file.`,
                        "error",
                        5000
                    );
                    return false;
                }
            }

            if (configuration.ui.filename?.checkNameStructure) {
                let regex = new RegExp(configuration.ui.filename.checkNameStructure);
                if (!file.name.match(regex)) {
                    uppy.info(
                        `Skipping file '${file.name}' because the name is not in the expected format.`,
                        "error",
                        5000
                    );
                    return false;
                }
            }

            file.meta.bucket = data.bucket;
            file.meta.filename = `${data.path}/${file.name}`;
            file.meta.overwrite = data.overwrite;

            return true;
        },
    });
    uppy.use(Dashboard, {
        target: dashboard.value,
        inline: true,
    });
    uppy.use(Tus, {
        endpoint: configuration.ui.tusEndpoint,
        retryDelays: null,
        chunkSize: 64 * 1024 * 1024,
        headers: {
            authorization: $http.getHeaders().authorization,
        },
    });
    uppy.on("upload", () => {
        emit("upload-started");
    });
    uppy.on("upload-success", (data) => {
        emit("file-uploaded", { itemId: $route.params.identifier, name: data.name });
    });
    uppy.on("file-removed", ({ data }) => {
        emit("file-removed", { resource: data.name });
    });
    data.uppy = uppy;
}

async function getItemPath() {
    let response = await $http.get({
        route: `/upload/pre-create/item/${$route.params.identifier}`,
    });
    if (response.status === 200) {
        response = await response.json();
        data.path = response.path;
        data.bucket = response.bucket;
    } else {
        data.error = true;
    }
}
</script>
