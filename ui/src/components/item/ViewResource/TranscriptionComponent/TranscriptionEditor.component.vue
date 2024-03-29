<template>
    <div class="flex flex-row px-2" v-loading="data.extractTableProcessing">
        <div class="flex flex-col">
            <!-- left sidebar controls -->
            <div class="h-12"></div>
            <div class="flex flex-col space-y-2 items-end max-height">
                <div class="flex flex-row space-x-3">
                    <div class="text-2xl">
                        <i class="fa-solid fa-minus"></i>
                    </div>
                    <el-switch
                        v-model="data.markupControl"
                        active-value="add"
                        inactive-value="remove"
                    />
                    <div class="text-2xl">
                        <i class="fa-solid fa-plus"></i>
                    </div>
                </div>
                <el-tooltip
                    v-for="(control, idx) of data.controls"
                    :key="idx"
                    class="box-item"
                    effect="dark"
                    :content="data.markupControl === 'add' ? control.help : 'Remove the markup'"
                    raw-content
                    placement="left"
                >
                    <el-button
                        @click="
                            data.markupControl === 'add'
                                ? editorControls.add(control.markup)
                                : editorControls.remove(control.markup)
                        "
                        size="large"
                        :type="data.markupControl === 'add' ? 'primary' : 'danger'"
                    >
                        <span v-html="control.icon" v-if="control.icon"></span>
                        <span v-if="control.text">{{ control.text }}</span>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    v-if="data.markupControl === 'remove'"
                    class="box-item"
                    effect="dark"
                    content="Remove all XML markup from the document or selection."
                    raw-content
                    placement="left"
                >
                    <el-button @click="editorControls.removeAllMarkup()" size="large" type="danger">
                        <i class="fa-solid fa-code"></i>
                    </el-button>
                </el-tooltip>
            </div>
        </div>
        <div class="flex flex-col flex-grow px-2">
            <!-- topbar control -->
            <div class="flex flex-row space-x-2" :class="{ 'rounded bg-red-200 p-2': data.error }">
                <div v-loading="data.saving">
                    <el-button
                        @click="save"
                        :type="data.saved ? 'success' : 'primary'"
                        size="large"
                        :disabled="data.saved"
                    >
                        <div v-show="data.saved">
                            <i class="fa-solid fa-check"></i>
                            &nbsp;saved
                        </div>
                        <div v-show="!data.saved">
                            <i class="fa-solid fa-floppy-disk"></i>
                            &nbsp;save
                        </div>
                    </el-button>
                </div>
                <div v-if="data.error" class="text-3xl text-red-700">
                    <el-popover placement="top-start" :width="500" trigger="hover">
                        <template #reference>
                            <div>
                                <i class="fa-solid fa-circle-exclamation"></i>
                            </div>
                        </template>
                        <div class="bg-red-200 rounded p-4">
                            {{ data.error.message }}
                        </div>
                    </el-popover>
                </div>
                <div class="flex flex-grow"></div>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Mark the transcription as complete"
                    placement="top-start"
                >
                    <el-switch
                        v-model="data.status.complete"
                        active-text="Complete"
                        inactive-text="In progress"
                        @change="markComplete"
                    />
                </el-tooltip>
            </div>
            <div class="flex flex-row space-x-2 py-4 min-max-width overflow-scroll" ref="el">
                <div>
                    <el-button @click="undo" type="primary" size="large">
                        <i class="fa-solid fa-undo"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="redo" type="primary" size="large">
                        <i class="fa-solid fa-redo"></i>
                    </el-button>
                </div>
                <el-tooltip
                    v-if="showControls"
                    class="box-item"
                    effect="dark"
                    content="Delete the transcription"
                    placement="top-start"
                >
                    <el-button @click="deleteTranscription" type="primary" size="large">
                        <i class="fa-solid fa-trash-can"></i>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    v-if="showControls"
                    class="box-item"
                    effect="dark"
                    content="Convert the text to a TEI document"
                    placement="top-start"
                >
                    <el-button @click="convertToTei" type="primary" size="large">
                        <i class="fa-solid fa-code"></i>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Format the document"
                    placement="top-start"
                >
                    <el-button @click="format" type="primary" size="large">
                        format document
                    </el-button>
                </el-tooltip>
                <el-popconfirm
                    v-if="showControls"
                    title="This will delete the current transcription. Are you sure you want to do this?"
                    @confirm="reprocessPageAsTable"
                    width="300"
                >
                    <template #reference>
                        <el-button type="primary" size="large">
                            <i class="fa-solid fa-gears"></i>
                            &nbsp;extract table
                        </el-button>
                    </template>
                </el-popconfirm>
                <div v-if="showControls">
                    <el-button
                        @click="decreaseFontSize"
                        type="primary"
                        size="large"
                        v-if="showControls"
                    >
                        <span class="fa-stack">
                            <i class="fa-solid fa-font" data-fa-transform="down-12 right-4"></i>
                            <i class="fa-solid fa-minus" data-fa-transform="up-2 left-2"></i>
                        </span>
                    </el-button>
                </div>
                <div v-if="showControls">
                    <el-button @click="increaseFontSize" type="primary" size="large">
                        <span class="fa-stack">
                            <i class="fa-solid fa-font" data-fa-transform="down-12 right-4"></i>
                            <i class="fa-solid fa-plus" data-fa-transform="up-2 left-2"></i>
                        </span>
                    </el-button>
                </div>
            </div>
            <div class="editor min-max-width overflow-scroll" :class="data.fontSize">
                <div ref="codemirror"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useElementSize } from "@vueuse/core";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { xml, xmlLanguage } from "@codemirror/lang-xml";
import { CodemirrorEditorControls, formatDocument } from "./codemirror-editor.js";
import { unclearHighlight } from "./decorators";
import { Prec } from "@codemirror/state";
import { ref, reactive, computed, inject, onMounted, onBeforeMount, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { ElMessage } from "element-plus";

const $http = inject("$http");
const $route = useRoute();
const $store = useStore();

const el = ref(null);

const props = defineProps({
    data: { type: Array, required: true },
});

let data = reactive({
    extractTableProcessing: false,
    ...$route.params,
    transcription: undefined,
    status: {},
    saved: false,
    saving: false,
    markupControl: "add",
    editorContols: {},
    controls: $store.state.configuration.ui.teiEditorControls,
    fontSize: "text-base",
    sizes: [
        "text-xs",
        "text-sm",
        "text-base",
        "text-lg",
        "text-xl",
        "text-2xl",
        "text-3xl",
        "text-4xl",
        "text-5xl",
        "text-6xl",
    ],
    error: undefined,
});

const codemirror = ref(null);
let view;
let editorControls;

onBeforeMount(async () => {
    await getResourceStatus();
});
onMounted(async () => {
    data.transcription = await loadTranscription();
    ({ view } = setupCodeMirror());
    editorControls = new CodemirrorEditorControls({ view });
    format();
});
onBeforeUnmount(async () => {
    await save();
});

let size = useElementSize(el);
let showControls = computed(() => {
    return size.width.value > 750 ? true : false;
});

function setupCodeMirror() {
    const initialState = EditorState.create({
        doc: data.transcription,
        extensions: [
            basicSetup,
            EditorView.lineWrapping,
            oneDark,
            xml(),
            xmlLanguage,
            Prec.highest(unclearHighlight),
        ],
    });

    const view = new EditorView({
        state: initialState,
        parent: codemirror.value,
    });

    return { view };
}
async function loadTranscription() {
    let response = await $http.get({
        route: `/items/${$route.params.identifier}/resources/${$route.params.resource}/transcription`,
    });
    if (response.status !== 200) {
        // can't get item content
        ElMessage.error(`There was a problem loading the transcription.`);
        data.transcription = "";
        return;
    }
    try {
        return (await response.json()).content;
    } catch (error) {
        return "";
    }
}
function undo() {
    editorControls.undo();
}
function redo() {
    editorControls.redo();
}
async function markComplete(status) {
    let response = await $http.put({
        route: `/items/${data.identifier}/resources/${data.resource}/status`,
        params: { complete: status ?? false },
    });
    await getResourceStatus();
}
async function getResourceStatus() {
    let response = await $http.get({
        route: `/items/${data.identifier}/resources/${data.resource}/status`,
    });
    if (response.status === 200) {
        response = await response.json();
        data.status = response?.status ?? false;
    }
}
function deleteTranscription() {
    editorControls.delete();
}
function convertToTei() {
    editorControls.convertToTei({ $route });
    format();
}
function format() {
    let { error } = formatDocument({ view });
    data.error = error ? { message: error } : undefined;
}
async function save() {
    data.saving = true;
    try {
        let document = view.state.doc.toString();
        let response = await $http.put({
            route: `/items/${data.identifier}/resources/${data.resource}/saveTranscription`,
            body: { datafiles: props.data, document },
        });

        data.saved = true;
        data.saving = false;
        format();

        setTimeout(() => {
            data.saved = false;
        }, 1500);
    } catch (error) {
        // swallow errors - likely this is because the user navigated away
    }
}
async function reprocessPageAsTable() {
    const { identifier, resource } = $route.params;
    let response = await $http.post({
        route: `/process/extract-table/${identifier}/${resource}`,
    });
    if (response.status !== 200) {
        return;
    }
    const taskId = (await response.json()).taskId;

    data.extractTableProcessing = true;
    let status = await updateProcessingStatus({ taskId });
    while (status === "in progress") {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        status = await updateProcessingStatus({ taskId });
    }

    let document = await loadTranscription();
    formatDocument({ view, document });
    data.extractTableProcessing = false;

    async function updateProcessingStatus({ taskId }) {
        let response = await $http.post({
            route: `/items/${identifier}/resources/processing-status`,
            body: { taskIds: [taskId] },
        });
        let { tasks } = await response.json();
        const task = tasks.pop();
        return task.status;
    }
}
function decreaseFontSize() {
    let next = data.sizes.indexOf(data.fontSize) - 1;
    next = next < 0 ? 0 : next;
    data.fontSize = data.sizes[next];
}
function increaseFontSize() {
    let next = data.sizes.indexOf(data.fontSize) + 1;
    next = next > 9 ? 9 : next;
    data.fontSize = data.sizes[next];
}
</script>

<style scoped>
.editor {
    height: calc(100vh - 340px);
}

.min-max-width {
    min-width: 350px;
    /* max-width: calc(100vw / 2); */
}
.max-height {
    max-height: calc(100vh - 300px);
    overflow: scroll;
}
</style>
