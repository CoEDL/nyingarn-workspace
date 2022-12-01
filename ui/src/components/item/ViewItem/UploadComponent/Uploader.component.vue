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
import { ref, reactive, onMounted, inject, onBeforeUnmount } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
const store = useStore();
const $http = inject("$http");
const $route = useRoute();
const dashboard = ref(null);

const emit = defineEmits(["upload-started", "file-uploaded", "file-removed"]);
const data = reactive({
    specialFileNameChecks: ["-digivol.csv", "-tei.xml"],
    show: true,
    uppy: undefined,
    path: undefined,
    error: false,
});

onMounted(() => {
    init();
});
onBeforeUnmount(() => {
    // data.uppy.close();
});
async function init() {
    await getItemPath();
    if (!data.path) return;
    const identifier = $route.params.identifier;
    const configuration = store.state.configuration;
    let uppy = new Uppy({
        debug: false,
        autoProceed: false,

        onBeforeFileAdded: (currentFile, files) => {
            // does the first part of the file match the identifier
            let regex = new RegExp(`^${identifier}-.*`);
            if (!currentFile.name.match(regex) && configuration.ui.filename?.matchItemName) {
                uppy.info(
                    `Skipping file '${currentFile.name}' because the name doesn't match the item name.`,
                    "error",
                    5000
                );
                return false;
            }

            // is it a special file
            for (let specialFileNameCheck of data.specialFileNameChecks) {
                let regex = new RegExp(specialFileNameCheck, "i");
                if (currentFile.name.match(regex)) {
                    return true;
                }
            }

            if (configuration.ui.filename?.checkNameStructure) {
                let regex = new RegExp(configuration.ui.filename.checkNameStructure);
                if (!currentFile.name.match(regex)) {
                    uppy.info(
                        `Skipping file '${currentFile.name}' because the name is not in the expected format.`,
                        "error",
                        5000
                    );
                    return false;
                }
            }
            if (configuration.ui.filename?.checkExtension) {
                let regex = new RegExp(configuration.ui.filename.checkExtension, "i");
                if (!currentFile.name.match(regex)) {
                    uppy.info(
                        `Skipping file '${currentFile.name}' because the type is not an accepted type.`,
                        "error",
                        5000
                    );
                    return false;
                }
            }

            return true;
        },
    });
    uppy.use(Dashboard, {
        target: dashboard.value,
        inline: true,
    });
    uppy.use(Tus, {
        endpoint: configuration.ui.tusEndpoint,
        // retryDelays: null,
    });
    const token = $http.getToken();
    uppy.setMeta({ identifier: $route.params.identifier, path: data.path, token });
    uppy.on("upload", () => {
        emit("upload-started");
    });
    uppy.on("upload-success", (data) => {
        emit("file-uploaded", { itemId: $route.params.identifier, resource: data.name });
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
        data.path = (await response.json()).path;
    } else {
        data.error = true;
    }
}
</script>
