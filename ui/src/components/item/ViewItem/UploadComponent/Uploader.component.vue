<template>
    <div ref="dashboard"></div>
</template>

<script>
import Dashboard from "@uppy/dashboard";
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
            specialFileNameChecks: ["digivol.csv", "ftp.xml"],
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
                    // does the first part of the file match the identifier
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

                    // is it a special file
                    for (let specialFileNameCheck of this.specialFileNameChecks) {
                        let regex = new RegExp(specialFileNameCheck, "i");
                        if (currentFile.name.match(regex)) {
                            return true;
                        }
                    }

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
                        let regex = new RegExp(configuration.ui.filename.checkExtension, "i");
                        if (!currentFile.name.match(regex)) {
                            uppy.info(
                                `Skipping file '${currentFile.name}' because the type is not an accepted type.`,
                                "error",
                                5000
                            );
                            return false;
                        }
                    }

                    return true;
                },
            });
            uppy.use(Dashboard, {
                target: this.$refs.dashboard,
                inline: true,
            });
            uppy.use(Tus, {
                endpoint: configuration.ui.tusEndpoint,
                // retryDelays: null,
            });
            const token = this.$http.getToken();
            uppy.setMeta({ itemId: this.identifier, token });
            uppy.on("upload-success", (data) => {
                this.$emit("file-uploaded", { itemId: this.identifier, resource: data.name });
            });
            uppy.on("file-removed", ({ data }) => {
                this.$emit("file-removed", { resource: data.name });
            });
            this.uppy = uppy;
        },
    },
};
</script>
