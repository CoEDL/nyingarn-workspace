<template>
    <div>
        <div v-if="data.error" class="bg-red-200 rounded p-2 w-96">
            The file uploader cannot be initialised at this time.
        </div>
        <div class="flex flex-col" v-loading="data.loading">
            <div class="flex flex-row">
                <div ref="input"></div>
            </div>
            <div class="p-2" v-if="data.fileNotExpectedError">
                {{ data.fileNotExpectedError }}
            </div>
            <div class="p-2" v-if="data.fileUploaded && props.showUpload">
                {{ data.fileUploaded }}
            </div>
        </div>
    </div>
</template>

<script setup>
import FileInput from "@uppy/file-input";
import Tus from "@uppy/tus";
import "@uppy/file-input/dist/style.css";
import Uppy from "@uppy/core";
import { ref, reactive, onMounted, inject, onBeforeUnmount, watch } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
const store = useStore();
const $http = inject("$http");
const $route = useRoute();
const input = ref(null);
const progress = ref(null);

const props = defineProps({
    filenamePattern: {
        type: Array,
        required: true,
    },
    showUpload: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits(["upload-started", "file-uploaded", "file-removed"]);
const data = reactive({
    loading: false,
    show: true,
    uppy: undefined,
    path: undefined,
    error: false,
    overwrite: true,
    fileNotExpectedError: undefined,
    fileUploaded: undefined,
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
        debug: false,
        autoProceed: true,
        restrictions: {
            maxNumberOfFiles: 1,
        },

        onBeforeFileAdded: (file) => {
            data.fileNotExpectedError = undefined;
            data.fileUploaded = undefined;

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

            // does it match the provided filename pattern
            let match = [];
            for (let pattern of props.filenamePattern) {
                let regex = new RegExp(pattern, "i");
                match.push(file.name.match(regex) ? true : false);
            }
            if (!match.includes(true)) {
                data.fileNotExpectedError = `The file '${file.name}' is not allowed here.`;
                return false;
            }

            file.meta.bucket = data.bucket;
            file.meta.filename = `${data.path}/${file.name}`;
            file.meta.overwrite = data.overwrite;

            return true;
        },
    });
    uppy.use(FileInput, {
        target: input.value,
        inline: true,
    });
    uppy.use(Tus, {
        endpoint: configuration.ui.tusEndpoint,
        retryDelays: null,
        chunkSize: 64 * 1024 * 1024,
    });
    uppy.on("upload", () => {
        data.loading = true;
        emit("upload-started");
    });
    uppy.on("complete", () => {
        data.loading = false;
    });
    uppy.on("upload-success", (file) => {
        data.fileUploaded = `${file.name} successfully uploaded`;
        emit("file-uploaded", { itemId: $route.params.identifier, name: file.name });
        uppy.removeFile(file.id);
        data.loading = false;
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
