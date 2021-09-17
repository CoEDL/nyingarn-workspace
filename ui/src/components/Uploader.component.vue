<template>
    <dashboard :uppy="uppy" :props="{}" v-if="show" />
</template>

<script>
import { Dashboard } from "@uppy/vue";
import Tus from "@uppy/tus";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

import Uppy from "@uppy/core";
import { ref } from "vue";
import { useStore } from "vuex";
import HTTPService from "@/http.service";
const httpService = new HTTPService();

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
    setup(props) {
        const store = useStore();

        let show = ref(true);
        let uppy = new Uppy({
            debug: false,
            autoProceed: false,

            onBeforeFileAdded: (currentFile, files) => {
                if (store.state.configuration.ui.filename?.checkNameStructure) {
                    let regex = new RegExp(
                        store.state.configuration.ui.filename.checkNameStructure
                    );
                    if (!currentFile.name.match(regex)) {
                        uppy.info(
                            `Skipping file '${currentFile.name}' because the name is not in the expected format.`,
                            "error",
                            5000
                        );
                        return false;
                    }
                }
                if (store.state.configuration.ui.filename?.checkExtension) {
                    let regex = new RegExp(store.state.configuration.ui.filename.checkExtension);
                    if (!currentFile.name.match(regex)) {
                        uppy.info(
                            `Skipping file '${currentFile.name}' because the type is not an accepted type.`,
                            "error",
                            5000
                        );
                        return false;
                    }
                }
                let regex = new RegExp(`^${props.identifier}-.*`);
                if (!currentFile.name.match(regex)) {
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
            endpoint: store.state.configuration.ui.tusEndpoint,
            // retryDelays: null,
        });
        const token = httpService.getToken();
        uppy.setMeta({ itemId: props.identifier, token });
        // uppy.on("upload-success", (data) => {
        //     console.log(JSON.stringify(data, null, 2));
        // });
        return { show, uppy };
    },
};
</script>
