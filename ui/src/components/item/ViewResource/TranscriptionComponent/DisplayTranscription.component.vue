<template>
    <div class="flex flex-row px-2">
        <div class="flex flex-col">
            <div class="h-12"></div>
            <div class="flex flex-col space-y-2 items-end">
                <div>
                    <el-button @click="addElement('paragraph')" size="large" type="primary">
                        <i class="fa-solid fa-chevron-left"></i>
                        <span class="pb-1">p</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="addElement('underline')" size="large" type="primary">
                        <i class="fa-solid fa-underline"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="addElement('strikethrough')" size="large" type="primary">
                        <i class="fa-solid fa-strikethrough"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="addElement('linebreak')" size="large" type="primary">
                        <i class="fa-solid fa-chevron-left"></i>
                        <span class="">lb</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </el-button>
                </div>
            </div>
        </div>
        <div class="flex flex-col flex-grow px-2">
            <div class="flex flex-row mb-2 space-x-2">
                <div>
                    <el-button @click="undoButtonHandler" type="primary" size="large">
                        <i class="fa-solid fa-undo"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="redoButtonHandler" type="primary" size="large">
                        <i class="fa-solid fa-redo"></i>
                    </el-button>
                </div>
                <div v-show="!data.isComplete">
                    <el-button @click="markComplete({ status: true })" type="warning" size="large">
                        in progress
                    </el-button>
                </div>
                <div v-show="data.isComplete">
                    <el-button @click="markComplete({ status: false })" type="success" size="large">
                        complete
                    </el-button>
                </div>
                <div>
                    <el-button @click="deleteTranscription" type="primary" size="large">
                        <i class="fa-solid fa-trash-can"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="convertToTei" type="primary" size="large">
                        <i class="fa-solid fa-code"></i>
                    </el-button>
                </div>
                <div class="flex-grow"></div>
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
            </div>
            <div class="">
                <div ref="codemirror"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import {
    EditorView,
    keymap,
    highlightSpecialChars,
    drawSelection,
    highlightActiveLine,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    lineNumbers,
    highlightActiveLineGutter,
} from "@codemirror/view";
import { EditorState, Text, Transaction } from "@codemirror/state";
import {
    defaultHighlightStyle,
    syntaxHighlighting,
    indentOnInput,
    bracketMatching,
    foldGutter,
    foldKeymap,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { xml, xmlLanguage } from "@codemirror/lang-xml";
import { ref, reactive, inject, onMounted, onBeforeMount, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { isEmpty } from "lodash";
import format from "xml-formatter";

const $http = inject("$http");
const $route = useRoute();
const $store = useStore();

const props = defineProps({
    data: { type: Array, required: true },
});

let data = reactive({
    ...$route.params,
    transcription: undefined,
    isComplete: false,
    saved: false,
    tei: $store.state.configuration.teiMarkupControls.controls,
});

onBeforeMount(async () => {
    await resourceIsComplete();
});
onMounted(async () => {
    await loadTranscription();
    ({ view } = setupCodeMirror());
    nextTick(() => {
        formatDocument();
    });
});
onBeforeUnmount(async () => {
    await save();
});

const codemirror = ref(null);
let view;

function setupCodeMirror() {
    const initialState = EditorState.create({
        doc: data.transcription,
        extensions: [
            EditorView.lineWrapping,
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            closeBrackets(),
            autocompletion(),
            rectangularSelection(),
            crosshairCursor(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            oneDark,
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                ...completionKeymap,
            ]),
            xml(),
            xmlLanguage,
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
        data.transcription = (await response.json()).content;
    } catch (error) {
        data.transcription = "";
    }
}
function undoButtonHandler(e) {
    undo({
        state: view.state,
        dispatch: view.dispatch,
    });
}
function redoButtonHandler(e) {
    redo({
        state: view.state,
        dispatch: view.dispatch,
    });
}
async function markComplete({ status }) {
    let response = await $http.put({
        route: `/items/${data.identifier}/resources/${data.resource}/status`,
        params: { complete: status },
    });
    if (response.status === 200) {
        data.isComplete = !data.isComplete;
    }
}
async function resourceIsComplete() {
    let response = await $http.get({
        route: `/items/${data.identifier}/resources/${data.resource}/status`,
    });
    if (response.status === 200) {
        let { completed } = await response.json();
        data.isComplete = completed.markedComplete;
    }
}
function deleteTranscription() {
    let update = view.state.update({
        changes: {
            from: 0,
            to: view.state.doc.length,
            insert: "",
        },
    });
    view.update([update]);
}
function convertToTei() {
    let document = view.state.doc.toString().split("\n");
    if (document[0].match(/^\<surface xmlns=/)) return;
    let tei = [`<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="${$route.params.resource}">`];
    tei = [...tei, ...document.map((l) => `<p>${l}</p>`), "</surface>"];
    let update = view.state.update({
        changes: {
            from: 0,
            to: view.state.doc.length,
            insert: tei.join("\n"),
        },
    });
    view.update([update]);
    nextTick(() => {
        formatDocument();
    });
}
async function save() {
    let document = view.state.doc.toString();
    await $http.put({
        route: `/items/${data.identifier}/resources/${data.resource}/saveTranscription`,
        body: { datafiles: props.data, document },
    });
    data.saved = true;
    if (document) formatDocument();

    setTimeout(() => {
        data.saved = false;
    }, 1500);
}
function formatDocument() {
    let update = view.state.update({
        changes: {
            from: 0,
            to: view.state.doc.length,
            insert: format(view.state.doc.toString(), { indentation: "  ", collapseContent: true }),
        },
    });
    view.update([update]);
}
async function addElement(type) {
    let selections = view.state.selection.ranges.reverse();
    switch (type) {
        case "paragraph":
            selections.forEach((r) => {
                let changes = {
                    from: r.from,
                    to: r.to,
                    insert: `<p>${view.state.sliceDoc(r.from, r.to)}</p>`,
                };
                view.dispatch({ changes });
            });
            break;
        case "underline":
            selections.forEach((r) => {
                let changes = {
                    from: r.from,
                    to: r.to,
                    insert: `<u>${view.state.sliceDoc(r.from, r.to)}</u>`,
                };
                view.dispatch({ changes });
            });
            break;
        case "strikethrough":
            selections.forEach((r) => {
                let changes = {
                    from: r.from,
                    to: r.to,
                    insert: `<s>${view.state.sliceDoc(r.from, r.to)}</s>`,
                };
                view.dispatch({ changes });
            });
            break;
        case "linebreak":
            selections.forEach((r) => {
                let changes = {
                    from: r.to,
                    insert: `<lb/>`,
                };
                view.dispatch({ changes });
            });
            break;
    }
}
</script>

<style>
.cm-editor {
    font-size: 16px;
    height: calc(100vh - 400px);
    overflow: scroll;
}
</style>
