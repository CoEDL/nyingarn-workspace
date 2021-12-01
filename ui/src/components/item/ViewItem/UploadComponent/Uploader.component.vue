<template>
    <dashboard :uppy="uppy" :props="{}" v-if="uppy && show" />
</template>

<script>
import { Dashboard } from "@uppy/vue";
import Tus from "@uppy/tus";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

import Uppy from "@uppy/core";

export default {
    components: {
        Dashboard,
    },
    props: {
        identifier: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            show: true,
            uppy: undefined,
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        init() {
            const identifier = this.identifier;
            const configuration = this.$store.state.configuration;
            let uppy = new Uppy({
                debug: false,
                autoProceed: false,

                onBeforeFileAdded: (currentFile, files) => {
                    if (configuration.ui.filename?.checkNameStructure) {
                        let regex = new RegExp(configuration.ui.filename.checkNameStructure);
                        if (!currentFile.name.match(regex)) {
                            uppy.info(
                                `Skipping file '${currentFile.name}' because the name is not in the expected format.`,
                                "error",
                                5000
                            );
                            return false;
                        }
                    }
                    if (configuration.ui.filename?.checkExtension) {
                        let regex = new RegExp(configuration.ui.filename.checkExtension);
                        if (!currentFile.name.match(regex)) {
                            uppy.info(
                                `Skipping file '${currentFile.name}' because the type is not an accepted type.`,
                                "error",
                                5000
                            );
                            return false;
                        }
                    }
                    let regex = new RegExp(`^${identifier}-.*`);
                    if (
                        !currentFile.name.match(regex) &&
                        configuration.ui.filename?.matchItemName
                    ) {
                        uppy.info(
                            `Skipping file '${currentFile.name}' because the name doesn't match the item name.`,
                            "error",
                            5000
                        );
                        return false;
                    }
                    return true;
                },
            });
            uppy.use(Tus, {
                endpoint: configuration.ui.tusEndpoint,
                // retryDelays: null,
            });
            const token = this.$http.getToken();
            uppy.setMeta({ itemId: this.identifier, token });
            // uppy.on("upload-success", (data) => {
            //     console.log(JSON.stringify(data, null, 2));
            // });
            this.uppy = uppy;
        },
    },
};
</script>
