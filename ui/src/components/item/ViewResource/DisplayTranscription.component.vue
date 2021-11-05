<template>
    <div class="flex flex-col p-2">
        <!-- <div><el-button @click="loadTranscription">load</el-button></div> -->
        <div>Transcription</div>
        <div>
            <el-input type="textarea" :rows="rows" v-model="transcription" :style="maxHeight" />
        </div>
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();

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
        };
    },
    computed: {
        maxHeight: function () {
            return { height: `${window.innerHeight - 60}px` };
        },
        rows: function () {
            return (window.innerHeight - 60) / 22;
        },
    },
    mounted() {
        this.loadTranscription();
    },
    methods: {
        async loadTranscription() {
            let masterTranscription = `${this.resource}-ADMIN_master_transcription.txt`;
            let tesseractTranscription = `${this.resource}-ADMIN_tesseract_ocr.txt`;
            if (this.data.includes(masterTranscription)) {
                this.transcription = "";
            } else if (this.data.includes(tesseractTranscription)) {
                this.transcription = await this.getTranscription({ file: tesseractTranscription });
            } else {
                this.transcription = "";
            }
        },
        async getTranscription({ file }) {
            let response = await httpService.get({
                route: `/items/${this.identifier}/resources/${file}`,
            });
            if (response.status !== 200) {
                // can't get link right now
            }
            return (await response.json()).content;
        },
    },
};
</script>
