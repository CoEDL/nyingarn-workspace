<template>
    <div class="flex flex-col p-2">
        <div class="flex flex-row mb-2 space-x-1">
            <div>
                <el-button @click="undo" size="small">
                    <i class="fas fa-undo"></i>
                </el-button>
            </div>
            <div>
                <el-button @click="redo" size="small">
                    <i class="fas fa-redo"></i>
                </el-button>
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
import HTTPService from "@/http.service";
const httpService = new HTTPService();
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/blackboard.css";
import { debounce } from "lodash";

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
            tei: this.$store.state.configuration.teiMarkupControls.controls,
        };
    },
    computed: {
        rows: function () {
            return (window.innerHeight - 60) / 30;
        },
    },
    mounted() {
        this.loadTranscription();
    },
    methods: {
        async loadTranscription() {
            let masterTranscription = `${this.resource}.master_transcription-ADMIN.xml`;
            let tesseractTranscription = `${this.resource}.tesseract_ocr-ADMIN.txt`;
            if (this.data.includes(masterTranscription)) {
                this.transcription = "";
            } else if (this.data.includes(tesseractTranscription)) {
                this.transcription = await this.getTranscription({ file: tesseractTranscription });
            } else {
                this.transcription = "";
            }
            this.codemirror = CodeMirror.fromTextArea(this.$refs.textarea, {});
            this.codemirror.setSize("100%", "100%");
            this.codemirror.setOption("mode", "text/xml");
            this.codemirror.setOption("theme", "blackboard");
            this.codemirror.setValue(this.transcription);
        },
        async getTranscription({ file }) {
            let response = await httpService.get({
                route: `/items/${this.identifier}/resources/${file}`,
            });
            if (response.status !== 200) {
                // can't get link right now
            }
            let transcription = (await response.json()).content;
            // return `<TEI xml:lang="en" xmlns="http://www.tei-c.org/ns/1.0">${transcription}\n
            // </TEI>`;
            return transcription;
        },
        addElement(t) {
            let text = this.codemirror.getSelection();
            let attributes;
            if (t?.attributes && t.attributes.length) {
                attributes = " " + t?.attributes.map((a) => `${a}=""`).join(" ");
            } else {
                attributes = "";
            }
            if (t.element) {
                this.codemirror.replaceSelection(
                    `<${t.element}${attributes}>${text}</${t.element}>`
                );
            } else if (t.open && t.close) {
                this.codemirror.replaceSelection(`${t.open}${attributes}${text}${t.close}`);
            }
        },
        undo() {
            if (this.codemirror.historySize().undo === 1) return;
            this.codemirror.undo();
        },
        redo() {
            this.codemirror.redo();
        },
        clearHistory() {
            this.codemirror.clearHistory();
        },
    },
};
</script>
