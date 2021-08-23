<template>
    <div>
        <dashboard :uppy="uppy" :props="props" v-if="show" />
    </div>
</template>

<script>
import { Dashboard } from "@uppy/vue";
import Tus from "@uppy/tus";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

import Uppy from "@uppy/core";
import { ref } from "vue";
import { useStore } from "vuex";

export default {
    components: {
        Dashboard,
    },
    props: {
        itemId: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const store = useStore();
        let show = ref(true);
        let uppy = new Uppy({ debug: true, autoProceed: false });
        uppy.use(Tus, {
            endpoint: store.state.configuration.ui.tusEndpoint,
            retryDelays: [0, 1000],
        });
        uppy.setMeta({ itemId: props.itemId });
        // uppy.on("upload-success", (data) => {
        //     console.log(JSON.stringify(data, null, 2));
        // });
        return { show, uppy };
    },
};
</script>
