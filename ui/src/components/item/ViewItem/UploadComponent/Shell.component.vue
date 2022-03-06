<template>
    <div class="my-2 flex flex-col space-y-2">
        <div class="flex flex-row">
            <uploader-component
                :identifier="identifier"
                @file-uploaded="fileUploaded"
                @file-removed="fileRemoved"
            />
            <processing-status-component
                class="px-2 flex-grow"
                :uploads="uploads"
                v-if="uploads.length"
            />

            <div class="px-2" v-if="!uploads.length">
                <digi-vol-help-component v-if="help === 'digivol'" />
                <ftp-help-component v-if="help === 'ftp'" />
                <image-help-component v-if="help === 'images'" />
                <div class="bg-yellow-100 p-2 rounded flex flex-row">
                    <div class="text-3xl p-4 text-red-600">
                        <i class="fas fa-exclamation-circle"></i>
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

<script>
import UploaderComponent from "./Uploader.component.vue";
import UploadWizardComponent from "./UploadWizard.component.vue";
import DigiVolHelpComponent from "./HelpDigivol.component.vue";
import FtpHelpComponent from "./HelpFTP.component.vue";
import ImageHelpComponent from "./HelpImages.component.vue";
import ProcessingStatusComponent from "./ProcessingStatus.component.vue";
import { uniqBy } from "lodash";

export default {
    components: {
        UploaderComponent,
        UploadWizardComponent,
        DigiVolHelpComponent,
        FtpHelpComponent,
        ImageHelpComponent,
        ProcessingStatusComponent,
    },
    data() {
        return {
            helpFileExtension: this.$store.state.configuration.ui?.filename?.helpExtension,
            identifier: this.$route.params.identifier,
            help: undefined,
            uploads: [],
        };
    },
    methods: {
        showHelp({ type }) {
            this.help = type;
        },
        fileUploaded(data) {
            this.uploads = uniqBy([...this.uploads, data], "resource");
        },
        fileRemoved(data) {
            this.uploads = this.uploads.filter((r) => r.resource !== data.resource);
        },
    },
};
</script>
