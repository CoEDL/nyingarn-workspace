<template>
    <div class="flex flex-row px-2">
        <div class="flex flex-col">
            <div class="h-12"></div>
            <div class="flex flex-col space-y-2 items-end">
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Add a paragraph"
                    placement="left"
                >
                    <el-button @click="addElement('paragraph')" size="large" type="primary">
                        <i class="fa-solid fa-chevron-left"></i>
                        <span class="pb-1">p</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Underline the selection"
                    placement="left"
                >
                    <el-button @click="addElement('underline')" size="large" type="primary">
                        <i class="fa-solid fa-underline"></i>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Strikethrough the selection"
                    placement="left"
                >
                    <el-button @click="addElement('strikethrough')" size="large" type="primary">
                        <i class="fa-solid fa-strikethrough"></i>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Add a linebreak"
                    placement="left"
                >
                    <el-button @click="addElement('linebreak')" size="large" type="primary">
                        <i class="fa-solid fa-chevron-left"></i>
                        <span class="">lb</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </el-button>
                </el-tooltip>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Mark text as unclear"
                    placement="left"
                >
                    <el-button @click="addElement('unclear')" size="large" type="primary">
                        unclear
                    </el-button>
                </el-tooltip>
            </div>
        </div>
        <div class="flex flex-col flex-grow px-2">
            <div class="flex flex-row mb-2 space-x-2">
                <div>
                    <el-button @click="undoButton" type="primary" size="large">
                        <i class="fa-solid fa-undo"></i>
                    </el-button>
                </div>
                <div>
                    <el-button @click="redoButton" type="primary" size="large">
                        <i class="fa-solid fa-redo"></i>
                    </el-button>
                </div>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Mark the transcription as in progress"
                    placement="top-start"
                >
                    <div v-show="!data.isComplete">
                        <el-button
                            @click="markComplete({ status: true })"
                            type="warning"
                            size="large"
                        >
                            in progress
                        </el-button>
                    </div>
                </el-tooltip>
                <el-tooltip
                    class="box-item"
                    effect="dark"
                    content="Mark the transcription as complete"
                    placement="top-start"
                >
                    <div v-show="data.isComplete">
                        <el-button
                            @click="markComplete({ status: false })"
                            type="success"
                            size="large"
                        >
                            complete
                        </el-button>
                    </div>
                </el-tooltip>
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
                <div ref="codemirror" class="cm-editor"></div>
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
function undoButton() {
    undo({
        state: view.state,
        dispatch: view.dispatch,
    });
}
function redoButton() {
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
    let formattedDocument;
    try {
        formattedDocument = format(view.state.doc.toString(), {
            indentation: "  ",
            collapseContent: true,
        });
        let update = view.state.update({
            changes: {
                from: 0,
                to: view.state.doc.length,
                insert: formattedDocument,
            },
        });
        view.update([update]);
    } catch (error) {
        // couldn't format - likely not an XML document
    }
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
                    insert: `<hi rend="underline">${view.state.sliceDoc(r.from, r.to)}</hi>`,
                };
                view.dispatch({ changes });
            });
            break;
        case "strikethrough":
            selections.forEach((r) => {
                let changes = {
                    from: r.from,
                    to: r.to,
                    insert: `<hi rend="strikethrough"> ${view.state.sliceDoc(r.from, r.to)}</hi>`,
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
        case "unclear":
            selections.forEach((r) => {
                let changes = {
                    from: r.from,
                    to: r.to,
                    insert: `<unclear>${view.state.sliceDoc(r.from, r.to)}</unclear>`,
                };
                view.dispatch({ changes });
            });
            break;
    }
}
</script>

<style scoped>
.cm-editor {
    font-size: 16px;
    height: calc(100vh - 200px);
    overflow: scroll;
}
</style>
