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
            <div class="flex flex-row space-x-2">
                <div>
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
                <div class="flex flex-grow"></div>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Mark the transcription as complete"
                    placement="top-start"
                >
                    <el-switch
                        v-model="data.isComplete"
                        active-text="Complete"
                        inactive-text="In progress"
                        @change="markComplete"
                    />
                </el-tooltip>
            </div>
            <div class="flex flex-row space-x-2 py-4 min-max-width overflow-scroll">
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
            </div>
            <div class="editor min-max-width overflow-scroll">
                <div ref="codemirror"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { xml, xmlLanguage } from "@codemirror/lang-xml";
import { CodemirrorEditorControls, formatDocument } from "./codemirror-editor.js";
import { ref, reactive, inject, onMounted, onBeforeMount, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { ElMessage } from "element-plus";

const $http = inject("$http");
const $route = useRoute();
const $store = useStore();

const props = defineProps({
    data: { type: Array, required: true },
});

let data = reactive({
    extractTableProcessing: false,
    ...$route.params,
    transcription: undefined,
    isComplete: false,
    saved: false,
    markupControl: "add",
    editorContols: {},
    controls: $store.state.configuration.ui.teiEditorControls,
});

const codemirror = ref(null);
let view;
let editorControls;

onBeforeMount(async () => {
    await checkIfResourceIsComplete();
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

function setupCodeMirror() {
    const initialState = EditorState.create({
        doc: data.transcription,
        extensions: [basicSetup, EditorView.lineWrapping, oneDark, xml(), xmlLanguage],
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
        params: { complete: status },
    });
    if (response.status === 200) {
        data.isComplete = status;
    }
}
async function checkIfResourceIsComplete() {
    let response = await $http.get({
        route: `/items/${data.identifier}/resources/${data.resource}/status`,
    });
    if (response.status === 200) {
        let { completed } = await response.json();
        data.isComplete = completed.markedComplete;
    }
}
function deleteTranscription() {
    editorControls.delete();
}
function convertToTei() {
    editorControls.convertToTei({ $route });
}
function format() {
    let { error } = formatDocument({ view });
}
async function save() {
    let document = view.state.doc.toString();
    await $http.put({
        route: `/items/${data.identifier}/resources/${data.resource}/saveTranscription`,
        body: { datafiles: props.data, document },
    });
    data.saved = true;
    format();

    setTimeout(() => {
        data.saved = false;
    }, 1500);
}
async function reprocessPageAsTable() {
    const dateFrom = new Date();
    let response = await $http.post({
        route: `/process/extract-table/${$route.params.identifier}/${$route.params.resource}`,
    });
    if (response.status !== 200) {
        return;
    }
    let taskId = (await response.json()).taskId;

    data.extractTableProcessing = true;
    await new Promise((resolve) => setTimeout(resolve, 6000));
    await checkProcessingStatus({
        $http,
        identifier: $route.params.identifier,
        resources: [
            { itemId: $route.params.identifier, resource: `${$route.params.resource}.jpg` },
        ],
        taskId,
        dateFrom,
    });

    let document = await loadTranscription();
    formatDocument({ view, document });
    data.extractTableProcessing = false;

    async function checkProcessingStatus({ $http, identifier, resources, taskId, dateFrom }) {
        let response = await $http.post({
            route: `/items/${identifier}/resources/processing-status`,
            body: { resources, dateFrom },
        });
        let { tasks } = await response.json();
        let task = tasks.filter((task) => task.id === taskId)[0];
        if (!task) {
            // no task found - do nothing
        } else if (task.status !== "done" && task.status !== "failed") {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            await checkProcessingStatus({
                $http,
                identifier: $route.params.identifier,
                resources: [
                    { itemId: $route.params.identifier, resource: `${$route.params.resource}.jpg` },
                ],
                taskId,
                dateFrom,
            });
        }
    }
}
</script>

<style scoped>
.editor {
    font-size: 16px;
    height: calc(100vh - 320px);
}

.min-max-width {
    min-width: 500px;
    /* max-width: calc(100vw / 2); */
}
.max-height {
    max-height: calc(100vh - 300px);
    overflow: scroll;
}
</style>
