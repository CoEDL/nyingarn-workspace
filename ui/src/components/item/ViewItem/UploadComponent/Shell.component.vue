<template>
    <div class="my-2 flex flex-col space-y-2">
        <div class="flex flex-row">
            <uploader-component
                :identifier="data.identifier"
                @upload-started="data.failedTasks = []"
                @file-uploaded="fileUploaded"
                @file-removed="fileRemoved"
            />
            <processing-status-component
                class="px-2 flex-grow"
                v-if="data.uploads.length"
                :uploads="data.uploads"
            />

            <div class="px-2" v-if="!data.uploads.length">
                <digi-vol-help-component v-if="data.help === 'digivol'" />
                <tei-help-component v-if="data.help === 'ftp'" type="ftp" />
                <tei-help-component v-if="data.help === 'tei'" type="tei" />
                <tei-help-component v-if="data.help === 'word'" type="word" />
                <image-help-component v-if="data.help === 'images'" />
                <div class="bg-yellow-100 p-2 rounded flex flex-row">
                    <div class="text-3xl p-4 text-red-600">
                        <i class="fa-solid fa-exclamation-circle"></i>
                    </div>
                    <div class="text-base py-2">
                        Files larger than 10MB are not able to be processed with OCR.
                    </div>
                </div>
            </div>
        </div>
        <upload-wizard-component @show-help="showHelp" />
    </div>
</template>

<script setup>
import UploaderComponent from "./Uploader.component.vue";
import UploadWizardComponent from "./UploadWizard.component.vue";
import DigiVolHelpComponent from "./HelpDigivol.component.vue";
import TeiHelpComponent from "./HelpTEI.component.vue";
import ImageHelpComponent from "./HelpImages.component.vue";
import ProcessingStatusComponent from "./ProcessingStatus.component.vue";
import { uniqBy } from "lodash";
import { reactive } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
const $store = useStore();
const $route = useRoute();

const data = reactive({
    helpFileExtension: $store.state.configuration.ui?.filename?.helpExtension,
    identifier: $route.params.identifier,
    help: undefined,
    uploads: [],
    failedTasks: [],
});
function showHelp({ type }) {
    data.help = type;
}
function fileUploaded(file) {
    data.uploads = uniqBy([...data.uploads, file], "resource");
}
function fileRemoved(file) {
    data.uploads = data.uploads.filter((r) => r.resource !== file.resource);
}
</script>
