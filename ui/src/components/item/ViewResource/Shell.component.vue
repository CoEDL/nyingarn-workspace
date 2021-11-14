<template>
    <div class="flex flex-col">
        <div class="text-xl mb-2 flex flex-row space-x-4">
            <router-link link :to="itemUrl">item: {{ identifier }}</router-link>
            <div>resource: {{ resource }}</div>
        </div>

        <div class="flex flex-row">
            <display-image-component class="w-1/2" :data="data" v-if="data.length" />
            <display-transcription-component class="w-1/2" :data="data" v-if="data.length" />
        </div>
    </div>
</template>

<script>
import { getResourceObjects } from "@/components/item/load-item-data";
import DisplayImageComponent from "./DisplayImage.component.vue";
import DisplayTranscriptionComponent from "./DisplayTranscription.component.vue";
export default {
    components: {
        DisplayImageComponent,
        DisplayTranscriptionComponent,
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            resource: this.$route.params.resource,
            data: [],
        };
    },
    computed: {
        itemUrl: function () {
            return `/items/${this.identifier}/view`;
        },
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            this.data = (
                await getResourceObjects({
                    identifier: this.identifier,
                    resource: this.resource,
                })
            ).objects;
        },
    },
};
</script>
