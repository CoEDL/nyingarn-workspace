<template>
    <div class="my-2 flex flex-col space-y-2">
        <div class="flex flex-row">
            <uploader-component class="w-2/3" :identifier="identifier" />

            <div class="px-2">
                <digi-vol-help-component v-if="help === 'digivol'" />
                <ftp-help-component v-if="help === 'ftp'" />
                <image-help-component v-if="help === 'images'" />
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

export default {
    components: {
        UploaderComponent,
        UploadWizardComponent,
        DigiVolHelpComponent,
        FtpHelpComponent,
        ImageHelpComponent,
    },
    data() {
        return {
            helpFileExtension: this.$store.state.configuration.ui?.filename?.helpExtension,
            identifier: this.$route.params.identifier,
            help: undefined,
        };
    },
    methods: {
        showHelp({ type }) {
            this.help = type;
        },
    },
};
</script>
