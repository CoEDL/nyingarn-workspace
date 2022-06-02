<template>
    <div class="flex flex-col p-2">
        <div class="flex flex-row mb-2 space-x-1">
            <div>
                <el-button @click="undo" size="small">
                    <i class="fa-solid fa-undo"></i>
                </el-button>
            </div>
            <div>
                <el-button @click="redo" size="small">
                    <i class="fa-solid fa-redo"></i>
                </el-button>
            </div>
            <div v-show="!isComplete">
                <el-button @click="markComplete({ status: true })" size="small">
                    mark complete
                </el-button>
            </div>
            <div v-show="isComplete">
                <el-button @click="markComplete({ status: false })" size="small">
                    mark in progress
                </el-button>
            </div>
            <div class="flex flex-grow"></div>
            <div>
                <div v-if="saved" class="text-green-400 mx-4">
                    <i class="fa-solid fa-check"></i>
                    saved
                </div>
            </div>
        </div>
        <div class="flex flex-row">
            <textarea ref="textarea" class="w-full"></textarea>
            <div class="flex flex-col w-64">
                <div class="flex flex-row flex-wrap pl-1">
                    <div v-for="(t, idx) of tei" :key="idx" class="pl-1 mb-1">
                        <el-button @click="addElement(t)">
                            <span v-if="t.icon"><i :class="t.icon"></i></span>
                            {{ t.name }}
                        </el-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/blackboard.css";
import { debounce, isEmpty } from "lodash";
import { ElMessage } from "element-plus";

export default {
    props: {
        data: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            ...this.$route.params,
            transcription: "",
            debouncedLog: debounce(console.log, 1000),
            debouncedSave: debounce(this.save, 1000),
            tei: this.$store.state.configuration.teiMarkupControls.controls,
            saved: false,
            isComplete: undefined,
        };
    },
    computed: {
        rows: function () {
            return (window.innerHeight - 60) / 30;
        },
    },
    mounted() {
        this.loadTranscription();
        this.resourceIsComplete();
    },
    methods: {
        async loadTranscription() {
            this.transcription = await this.getTranscription();
            this.codemirror = CodeMirror.fromTextArea(this.$refs.textarea, {});
            this.codemirror.setSize("100%", window.innerHeight - 200);
            this.codemirror.setOption("mode", "text/xml");
            this.codemirror.setOption("theme", "blackboard");
            this.codemirror.setOption("lineWrapping", true);
            this.codemirror.setValue(this.transcription);
            this.codemirror.on("change", this.debouncedSave);
            this.save();
        },
        async getTranscription() {
            let response = await this.$http.get({
                route: `/items/${this.identifier}/resources/${this.resource}/transcription`,
            });
            if (response.status !== 200) {
                // can't get item content
                ElMessage.error(`There was a problem loading the transcription.`);
                return "";
            }
            let transcription = (await response.json()).content;
            return transcription;
        },
        addElement(t) {
            let selections = this.codemirror.getSelections();
            let replacements = selections.map((selection) => {
                let attributes;
                if (t?.attributes && t.attributes.length) {
                    attributes = " " + t?.attributes.map((a) => `${a}=""`).join(" ");
                } else {
                    attributes = "";
                }
                if (t.element) {
                    return `<${t.element}${attributes}>${selection}</${t.element}>`;
                } else if (t.open && t.close) {
                    return `${t.open}${attributes}${selection}${t.close}`;
                }
            });
            this.codemirror.replaceSelections(replacements);
        },
        undo() {
            if (this.codemirror.historySize().undo === 1) return;
            this.codemirror.undo();
        },
        redo() {
            this.codemirror.redo();
        },
        async markComplete({ status }) {
            const { identifier, resource } = this.$route.params;
            await this.$http.put({
                route: `/items/${identifier}/resources/${resource}/status`,
                params: { complete: status },
            });
            await this.resourceIsComplete();
        },
        async resourceIsComplete() {
            const { identifier, resource } = this.$route.params;
            let response = await this.$http.get({
                route: `/items/${identifier}/resources/${resource}/status`,
            });
            if (response.status === 200) {
                let { completed } = await response.json();
                this.isComplete = completed.markedComplete;
            }
        },
        clearHistory() {
            this.codemirror.clearHistory();
        },
        async save() {
            const { identifier, resource } = this.$route.params;

            let document = this.codemirror.getValue();
            if (isEmpty(document)) {
                return;
            }
            await this.$http.put({
                route: `/items/${identifier}/resources/${resource}/saveTranscription`,
                body: { datafiles: this.data, document: this.codemirror.getValue() },
            });

            this.saved = true;
            setTimeout(() => {
                this.saved = false;
            }, 1500);
        },
    },
};
</script>
